// OCR de la imagen de la carta con Google Cloud Vision (REST + API key).
// Se llama UNA vez por imagen subida (indexado), nunca por request de cliente.
import axios from 'axios';

export type Caja = { x: number; y: number; w: number; h: number }; // relativas 0-1
export type LineaCarta = { texto: string; box: Caja };

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Llama a Vision con la URL pública de S3 (imageUri: Vision descarga la imagen, aquí no).
export const detectarTexto = async (imageUrl: string): Promise<any | null> => {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) {
        console.warn('[carta-ocr] GOOGLE_VISION_API_KEY no configurada, indexado omitido');
        return null;
    }
    try {
        const { data } = await axios.post(
            `${VISION_URL}?key=${key}`,
            { requests: [{ image: { source: { imageUri: imageUrl } }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] },
            { timeout: 25000 }
        );
        return data?.responses?.[0] ?? null;
    } catch (e: any) {
        console.error('[carta-ocr] Vision fallo:', e?.response?.data?.error?.message || e?.message);
        return null;
    }
};

// Puro: fullTextAnnotation -> líneas (párrafos) con caja relativa = unión de cajas de palabras.
// Relativas 0-1 para que el tachado aguante cualquier resize posterior de la imagen.
export const extraerLineas = (respuesta: any): { width: number; height: number; lineas: LineaCarta[] } | null => {
    const page = respuesta?.fullTextAnnotation?.pages?.[0];
    if (!page?.width || !page?.height) return null;
    const { width, height } = page;
    const lineas: LineaCarta[] = [];
    for (const block of page.blocks || []) {
        for (const par of block.paragraphs || []) {
            const words: any[] = par.words || [];
            if (!words.length) continue;
            const texto = words
                .map((w) => (w.symbols || []).map((s: any) => s.text).join(''))
                .join(' ')
                .trim();
            if (texto.length < 4) continue; // precios sueltos, viñetas, adornos
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const w of words) {
                for (const v of w.boundingBox?.vertices || []) {
                    if (typeof v.x === 'number') { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); }
                    if (typeof v.y === 'number') { minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
                }
            }
            if (!isFinite(minX) || !isFinite(minY)) continue;
            lineas.push({
                texto,
                box: { x: minX / width, y: minY / height, w: (maxX - minX) / width, h: (maxY - minY) / height }
            });
        }
    }
    return { width, height, lineas };
};
