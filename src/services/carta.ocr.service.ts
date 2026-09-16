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

// Un paragraph de Vision NO es una fila visual: un nombre que hace wrap, o
// nombre+descripción+precio, caen en el mismo paragraph. El corte real lo marca el
// detectedBreak del último símbolo de cada palabra (SPACE no corta, fin de renglón sí).
const cierraLinea = (word: any): boolean => {
    const symbols: any[] = word.symbols || [];
    const tipo = symbols[symbols.length - 1]?.property?.detectedBreak?.type;
    return tipo === 'LINE_BREAK' || tipo === 'EOL_SURE_SPACE';
};

// Palabras de un paragraph -> grupos, uno por fila visual (la palabra con el salto
// pertenece a la fila que cierra). Sin ningún break: un solo grupo.
const agruparEnLineas = (words: any[]): any[][] => {
    const grupos: any[][] = [];
    let actual: any[] = [];
    for (const w of words) {
        actual.push(w);
        if (cierraLinea(w)) { grupos.push(actual); actual = []; }
    }
    if (actual.length) grupos.push(actual);
    return grupos;
};

const textoDe = (words: any[]): string =>
    words
        .map((w) => (w.symbols || []).map((s: any) => s.text).join(''))
        .join(' ')
        .trim();

// Caja = unión de las cajas de las palabras, normalizada.
// Vision OMITE la coordenada cuando vale 0 (palabra pegada al borde izquierdo/superior),
// así que la ausencia se lee como 0; solo se descarta si no hay vértices en absoluto.
const cajaDe = (words: any[], width: number, height: number): Caja | null => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of words) {
        for (const v of w.boundingBox?.vertices || []) {
            const vx = typeof v.x === 'number' ? v.x : 0;
            const vy = typeof v.y === 'number' ? v.y : 0;
            minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
            minY = Math.min(minY, vy); maxY = Math.max(maxY, vy);
        }
    }
    if (!isFinite(minX) || !isFinite(minY)) return null;
    return { x: minX / width, y: minY / height, w: (maxX - minX) / width, h: (maxY - minY) / height };
};

// Puro: fullTextAnnotation -> líneas visuales con caja relativa.
// Relativas 0-1 para que el tachado aguante cualquier resize posterior de la imagen.
export const extraerLineas = (respuesta: any): { width: number; height: number; lineas: LineaCarta[] } | null => {
    const page = respuesta?.fullTextAnnotation?.pages?.[0];
    if (!page?.width || !page?.height) return null;
    const { width, height } = page;
    const lineas: LineaCarta[] = [];
    for (const block of page.blocks || []) {
        for (const par of block.paragraphs || []) {
            for (const words of agruparEnLineas(par.words || [])) {
                const texto = textoDe(words);
                if (texto.length < 4) continue; // precios sueltos, viñetas, adornos
                const box = cajaDe(words, width, height);
                if (!box) continue;
                lineas.push({ texto, box });
            }
        }
    }
    return { width, height, lineas };
};
