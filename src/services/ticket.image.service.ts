// Renderiza el ticket SVG a PNG (sharp) y lo sube a S3 con key FIJA por
// sesión (se sobreescribe: no acumula espacio). Cualquier fallo devuelve
// null y el resumen sale como texto — la imagen nunca rompe el pedido.
import axios from 'axios';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { construirTicketSVG, DatosTicket } from './ticket.svg';

const bucket = () => process.env.AWS_BUCKET_NAME || 'papaya-comercio-files';
const region = () => process.env.AWS_REGION || 'us-east-2';
// Base de la carpeta legacy /restobar/print/logo/ donde vive el archivo cuyo
// nombre guarda conf_print.logo. Debe terminar en "/". Dev:
// http://192.168.1.65/restobar/print/logo/
const LOGO_BASE = () => process.env.RESTOBAR_LOGO_BASE_URL || 'https://restobar.papaya.com.pe/print/logo/';

// El filesystem del servidor legacy está en latin-1: una "í" en el nombre de
// archivo se pide como %ED (percent-encoding latin-1), NO %C3%AD (UTF-8) —
// verificado con curl contra la sede 13 ("1613Sin título.jpg" → 200 solo con
// %ED). Codificamos byte a byte interpretando el string como latin-1.
const encodeLatin1 = (s: string) => Array.from(Buffer.from(s, 'latin1')).map(b => (b <= 0x20 || b > 0x7e || '%#?"<>\\^`{|}'.includes(String.fromCharCode(b))) ? '%' + b.toString(16).toUpperCase().padStart(2, '0') : String.fromCharCode(b)).join('');

// Algunos logos guardados en BD (sede.logo64) son PNG/JPEG malformados que
// los navegadores toleran pero libpng no ("vipspng: libpng read error").
// librsvg entonces dropea la imagen en silencio y el ticket sale con un
// hueco en blanco arriba. Re-encodeamos el logo con sharp({failOn:'none'})
// -que sí lee bytes tolerantes- para producir un PNG limpio antes de
// insertarlo en el SVG. Si cualquier paso falla, devolvemos null: el
// builder ya omite el <image> y no reserva el hueco.
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

// El logo real del restaurante se administra en x-configuraciones: el
// NOMBRE de archivo queda en conf_print.logo (ej. "1613Sin título.jpg") y el
// archivo se sirve en `${LOGO_BASE}${nombreArchivo}` (carpeta del servidor
// legacy, no en BD). sede.logo64 es el logo de IMPRESIÓN de respaldo (baja
// calidad, para tickets de cocina) — se usa solo si no hay nombreArchivo o
// la descarga falla. Ningún paso lanza: siempre null en vez de romper el
// ticket.
export const obtenerLogo = async (
    nombreArchivo: string | null | undefined,
    logo64: string | null | undefined
): Promise<string | null> => {
    if (nombreArchivo) {
        // Primer intento: encoding latin-1 (el real, confirmado con curl).
        // Reintento: encodeURIComponent (UTF-8) por si el servidor cambia.
        const intentos = [encodeLatin1(nombreArchivo), encodeURIComponent(nombreArchivo)];
        for (const nombreCodificado of intentos) {
            try {
                const url = `${LOGO_BASE()}${nombreCodificado}`;
                const respuesta = await axios.get(url, { timeout: 5000, responseType: 'arraybuffer' });
                const png = await sharp(Buffer.from(respuesta.data), { failOn: 'none' }).png().toBuffer();
                return `data:image/png;base64,${png.toString('base64')}`;
            } catch (error: any) {
                console.error('ticket-imagen: fallo obteniendo logo real (conf_print.logo):', error.message);
            }
        }
    }
    return normalizarLogo(logo64);
};

export type DatosTicketConLogo = Omit<DatosTicket, 'logoDataUrl'> & {
    logoArchivo?: string | null;
    logo64?: string | null;
};

export const generarYSubirTicket = async (
    sessionId: string,
    datos: DatosTicketConLogo
): Promise<string | null> => {
    try {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.error('ticket-imagen: faltan credenciales AWS en el env');
            return null;
        }
        const { logoArchivo, logo64, ...resto } = datos;
        const logoDataUrl = await obtenerLogo(logoArchivo, logo64);
        const { svg } = construirTicketSVG({ ...resto, logoDataUrl });
        const png = await sharp(Buffer.from(svg)).png().toBuffer();

        // Key ÚNICA por resumen (timestamp): el dashboard del chatbot guarda la
        // URL en el historial de la conversación, así que cada ticket debe
        // conservarse tal como se envió. El espacio lo controla la lifecycle
        // rule del bucket (prefijo files-bot/tickets/, expira a 30 días).
        const key = `files-bot/tickets/ticket-${String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '')}-${Date.now()}.png`;
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
