// Índice de la carta: qué línea de texto está en qué caja de la imagen.
// Vive en S3 (files-bot/cartas-idx/), NUNCA en sede_costo_delivery.parametros:
// el PUT update-config-delivery del panel reemplaza ese JSON completo y lo pisaría.
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { detectarTexto, extraerLineas, type LineaCarta } from './carta.ocr.service';
import { matchLineas } from './carta.match.service';

const bucket = () => process.env.AWS_BUCKET_NAME || 'papaya-comercio-files';
const region = () => process.env.AWS_REGION || 'us-east-2';

export type LineaIndexada = LineaCarta & { iditem: number | null; agotado: boolean };
export type IndiceCarta = {
    archivo: string; etag: string; width: number; height: number;
    lineas: LineaIndexada[]; actualizado: string;
};

const idxKey = (idsede: number) => `files-bot/cartas-idx/idx-${idsede}.json`;
export const urlCartaBase = (archivo: string) =>
    `https://${bucket()}.s3.${region()}.amazonaws.com/files-bot/${archivo}`;

export const leerIndice = async (idsede: number): Promise<IndiceCarta | null> => {
    try {
        const s3 = new S3Client({ region: region() });
        const r = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: idxKey(idsede) }));
        return JSON.parse(await r.Body!.transformToString());
    } catch { return null; } // NoSuchKey o parse: sin índice
};

export const guardarIndice = async (idsede: number, idx: IndiceCarta): Promise<boolean> => {
    try {
        const s3 = new S3Client({ region: region() });
        await s3.send(new PutObjectCommand({
            Bucket: bucket(), Key: idxKey(idsede),
            Body: JSON.stringify(idx), ContentType: 'application/json'
        }));
        return true;
    } catch (e) { console.error('[carta-idx] guardar fallo', e); return false; }
};

// ETag del objeto S3 = versión de la imagen. Mismo ETag => índice vigente, no se re-OCRea.
const etagCarta = async (archivo: string): Promise<string | null> => {
    try {
        const s3 = new S3Client({ region: region() });
        const h = await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: `files-bot/${archivo}` }));
        return h.ETag || null;
    } catch { return null; }
};

// Idempotente: si la imagen no cambió (ETag), devuelve el índice existente.
// Al reindexar se conservan los "agotado" manuales de líneas cuyo texto se mantiene.
export const construirIndice = async (idsede: number, prisma: any): Promise<IndiceCarta | null> => {
    try {
        const categoria = await prisma.categoria.findFirst({
            where: { idsede: Number(idsede), estado: 0, visible_cliente: '1', url_carta: { not: null } },
            select: { url_carta: true }
        });
        const archivo = categoria?.url_carta;
        if (!archivo) return null;
        const etag = await etagCarta(archivo);
        const previo = await leerIndice(idsede);
        if (previo && etag && previo.etag === etag && previo.archivo === archivo) return previo;

        const respuesta = await detectarTexto(urlCartaBase(archivo));
        const extraido = respuesta ? extraerLineas(respuesta) : null;
        if (!extraido) return null;

        // OJO: en carta_lista el flag está INVERTIDO respecto a categoria.visible_cliente.
        // Es un Boolean @default(false) (schema.prisma) y las queries de producción del repo
        // leen 0 = visible al cliente (ver chat.bot.ts:660). Con '1' la lista sale casi vacía
        // y ninguna línea de la carta llega a enlazarse con su item.
        // i.estado = 0 excluye items dados de baja que siguen en carta_lista: si no, uno de
        // ellos puede ganarle el match greedy al item correcto y el tachado cae en la línea mala.
        const items = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT i.iditem, i.descripcion
             FROM carta_lista cl JOIN item i ON i.iditem = cl.iditem
             WHERE i.idsede = ? AND cl.estado = 0 AND i.estado = 0 AND cl.is_visible_cliente = 0`,
            Number(idsede)
        ) as { iditem: number; descripcion: string }[];

        const agotadosPrevios = new Set(
            (previo?.lineas || []).filter((l) => l.agotado).map((l) => l.texto)
        );
        const lineas: LineaIndexada[] = matchLineas(extraido.lineas, items || []).map((l) => ({
            ...l, agotado: agotadosPrevios.has(l.texto)
        }));
        const idx: IndiceCarta = {
            archivo, etag: etag || '', width: extraido.width, height: extraido.height,
            lineas, actualizado: new Date().toISOString()
        };
        await guardarIndice(idsede, idx);
        return idx;
    } catch (e) { console.error('[carta-idx] construir fallo', e); return null; }
};
