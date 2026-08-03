// Renderiza el ticket SVG a PNG (sharp) y lo sube a S3 con key FIJA por
// sesión (se sobreescribe: no acumula espacio). Cualquier fallo devuelve
// null y el resumen sale como texto — la imagen nunca rompe el pedido.
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { construirTicketSVG, DatosTicket } from './ticket.svg';

const bucket = () => process.env.AWS_BUCKET_NAME || 'papaya-comercio-files';
const region = () => process.env.AWS_REGION || 'us-east-2';

// El logo del ticket vive únicamente en sede.logo64 (se sube desde
// x-configuraciones vía canvas, op=208 en el legacy). Algunos logo64
// guardados son PNG/JPEG malformados que los navegadores toleran pero
// libpng no ("vipspng: libpng read error"). librsvg entonces dropea la
// imagen en silencio y el ticket sale con un hueco en blanco arriba.
// Re-encodeamos el logo con sharp({failOn:'none'}) -que sí lee bytes
// tolerantes- para producir un PNG limpio antes de insertarlo en el SVG.
// Si cualquier paso falla, devolvemos null: el builder ya omite el
// <image> y no reserva el hueco.
const normalizarLogo = async (logoDataUrl?: string | null): Promise<string | null> => {
    if (!logoDataUrl) return null;
    try {
        const partes = logoDataUrl.split(',');
        if (partes.length !== 2 || !partes[0].startsWith('data:image')) return null;
        const buffer = Buffer.from(partes[1], 'base64');
        const png = await sharp(buffer, { failOn: 'none' }).png().toBuffer();
        return `data:image/png;base64,${png.toString('base64')}`;
    } catch (error: any) {
        console.error('ticket-imagen: logo malformado, se omite:', error.message);
        return null;
    }
};

export const generarYSubirTicket = async (
    sessionId: string,
    datos: DatosTicket
): Promise<string | null> => {
    try {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.error('ticket-imagen: faltan credenciales AWS en el env');
            return null;
        }
        const logoDataUrl = await normalizarLogo(datos.logoDataUrl);
        const { svg } = construirTicketSVG({ ...datos, logoDataUrl });
        const png = await sharp(Buffer.from(svg)).png().toBuffer();

        // Key fija por sesión: el ticket anterior de la misma conversación se
        // sobreescribe (requisito: no llenar el bucket).
        const key = `files-bot/tickets/ticket-${String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '')}.png`;
        const s3 = new S3Client({ region: region() });
        await s3.send(new PutObjectCommand({
            Bucket: bucket(),
            Key: key,
            Body: png,
            ContentType: 'image/png'
        }));

        return `https://${bucket()}.s3.${region()}.amazonaws.com/${key}`;
    } catch (error: any) {
        console.error('ticket-imagen: error generando/subiendo:', error.message);
        return null;
    }
};
