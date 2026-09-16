// Genera la carta con platos agotados tachados. Regeneración perezosa:
// solo cuando un cliente la pide, como máximo una vez cada 5 min por sede,
// y solo si el set de agotados cambió (key S3 determinística por hash).
import { createHash } from 'crypto';
import axios from 'axios';
import path from 'path';
process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || path.join(__dirname, '..', '..', 'fonts');
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { leerIndice, urlCartaBase, type IndiceCarta, type LineaIndexada } from './carta.indice.service';
import type { Caja } from './carta.ocr.service';

const bucket = () => process.env.AWS_BUCKET_NAME || 'papaya-comercio-files';
const region = () => process.env.AWS_REGION || 'us-east-2';

export const resolverCartaTachado = (parametros: any): 'off' | 'manual' | 'auto' =>
    parametros?.carta_tachado === 'manual' ? 'manual'
    : parametros?.carta_tachado === 'auto' ? 'auto'
    : 'off';

export const construirOverlaySVG = (width: number, height: number, cajas: Caja[]): string => {
    const lineas = cajas.map((b) => {
        const x1 = Math.max(0, (b.x - 0.015) * width);
        const x2 = Math.min(width, (b.x + b.w + 0.015) * width);
        const y = (b.y + b.h / 2) * height;
        const sw = Math.max(3, b.h * height * 0.16);
        return `<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#c62828" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="0.9"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lineas.join('')}</svg>`;
};

export const hashAgotados = (nombres: string[]): string =>
    createHash('sha1').update([...nombres].sort().join('|')).digest('hex').slice(0, 10);

export const obtenerAgotados = async (
    idsede: number, modo: 'manual' | 'auto', idx: IndiceCarta, prisma: any
): Promise<LineaIndexada[]> => {
    if (modo === 'manual') return idx.lineas.filter((l) => l.agotado);
    // auto: stock del día en carta_lista.cantidad <= 0, cruzado por iditem del match.
    // is_visible_cliente invertido en carta_lista: 0 = visible (ver Task 3).
    const rows = await prisma.$queryRawUnsafe(
        `SELECT DISTINCT cl.iditem
         FROM carta_lista cl JOIN item i ON i.iditem = cl.iditem
         WHERE i.idsede = ? AND cl.estado = 0 AND i.estado = 0 AND cl.is_visible_cliente = 0
           AND cl.cantidad IS NOT NULL AND CAST(cl.cantidad AS DECIMAL(10,2)) <= 0`,
        Number(idsede)
    ) as { iditem: number }[];
    const agotados = new Set((rows || []).map((r) => Number(r.iditem)));
    return idx.lineas.filter((l) => l.iditem !== null && agotados.has(l.iditem));
};

// ponytail: ventana en memoria por proceso (pm2 single). Si algún día hay cluster,
// mover a S3/Redis; el peor caso hoy es una regeneración extra tras restart.
const ventana = new Map<number, { hash: string; url: string; agotados: string[]; en: number }>();
const VENTANA_MS = 5 * 60 * 1000;

export const generarCartaTachada = async (
    idsede: number, prisma: any
): Promise<{ tipo: 'imagen'; imagen_url: string; agotados: string[] } | { tipo: 'link'; link_carta: string | null }> => {
    try {
        const config = await prisma.sede_costo_delivery.findFirst({
            where: { idsede: Number(idsede), estado: '0' }, select: { parametros: true }
        });
        const modo = resolverCartaTachado(config?.parametros);
        const idx = modo === 'off' ? null : await leerIndice(Number(idsede));
        if (!idx || modo === 'off') return await fallbackLink(idsede, prisma);

        // ventana de 5 min: se comparte tal cual, sin recalcular agotados
        const cache = ventana.get(Number(idsede));
        if (cache && Date.now() - cache.en < VENTANA_MS) {
            return { tipo: 'imagen', imagen_url: cache.url, agotados: cache.agotados };
        }

        const lineasAgotadas = await obtenerAgotados(Number(idsede), modo, idx, prisma);
        const nombres = lineasAgotadas.map((l) => l.texto);
        const hash = hashAgotados(nombres);
        const key = `files-bot/cartas-gen/carta-${Number(idsede)}-${hash}.png`;
        const url = `https://${bucket()}.s3.${region()}.amazonaws.com/${key}`;

        if (cache?.hash !== hash) {
            // sin agotados igual generamos (copia limpia) para URL consistente y cache simple
            const base = await axios.get(urlCartaBase(idx.archivo), { responseType: 'arraybuffer', timeout: 15000 });
            let img = sharp(Buffer.from(base.data), { failOn: 'none' });
            const meta = await img.metadata();
            const W = meta.width || idx.width, H = meta.height || idx.height;
            if (nombres.length) {
                const overlay = Buffer.from(construirOverlaySVG(W, H, lineasAgotadas.map((l) => l.box)));
                img = img.composite([{ input: overlay }]);
            }
            const png = await img.png().toBuffer();
            const s3 = new S3Client({ region: region() });
            await s3.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: png, ContentType: 'image/png' }));
        }
        ventana.set(Number(idsede), { hash, url, agotados: nombres, en: Date.now() });
        return { tipo: 'imagen', imagen_url: url, agotados: nombres };
    } catch (e) {
        console.error('[carta-tachado] fallo, fallback a link', e);
        return await fallbackLink(idsede, prisma);
    }
};

export const invalidarVentana = (idsede: number) => { ventana.delete(Number(idsede)); };

const fallbackLink = async (idsede: number, prisma: any) => {
    try {
        const categoria = await prisma.categoria.findFirst({
            where: { idsede: Number(idsede), estado: 0, visible_cliente: '1', url_carta: { not: null } },
            select: { url_carta: true }
        });
        return { tipo: 'link' as const, link_carta: categoria?.url_carta ? urlCartaBase(categoria.url_carta) : null };
    } catch { return { tipo: 'link' as const, link_carta: null }; }
};
