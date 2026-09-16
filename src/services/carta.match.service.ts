// Cruce difuso entre líneas OCR de la imagen y items del POS (carta_lista/item).
// Score Dice sobre tokens normalizados; umbral conservador: mejor no tachar que tachar mal.
import type { LineaCarta } from './carta.ocr.service';

export const normalizarTexto = (s: string): string =>
    String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const tokens = (s: string) => new Set(normalizarTexto(s).split(' ').filter((t) => t.length > 1));

const dice = (a: Set<string>, b: Set<string>): number => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    // forEach y no for..of: el tsconfig compila sin downlevelIteration y ahí
    // recorrer un Set con for..of no compila (TS2802).
    a.forEach((t) => {
        if (b.has(t)) inter++;
    });
    return (2 * inter) / (a.size + b.size);
};

const UMBRAL = 0.6;

export const matchLineas = (
    lineas: LineaCarta[],
    items: { iditem: number; descripcion: string }[]
): (LineaCarta & { iditem: number | null })[] => {
    // score de cada par (línea, item); asignación greedy de mayor a menor score,
    // cada item se usa una sola vez ("Ceviche" no debe robarle el match a "Ceviche de toyo")
    const itemTokens = items.map((it) => ({ ...it, toks: tokens(it.descripcion) }));
    const pares: { li: number; item: number; score: number }[] = [];
    lineas.forEach((l, li) => {
        const lt = tokens(l.texto);
        itemTokens.forEach((it, ii) => {
            const s = dice(lt, it.toks);
            if (s >= UMBRAL) pares.push({ li, item: ii, score: s });
        });
    });
    pares.sort((a, b) => b.score - a.score);
    const asignadoLinea = new Map<number, number>();
    const usadoItem = new Set<number>();
    for (const p of pares) {
        if (asignadoLinea.has(p.li) || usadoItem.has(p.item)) continue;
        asignadoLinea.set(p.li, p.item);
        usadoItem.add(p.item);
    }
    return lineas.map((l, li) => ({
        ...l,
        iditem: asignadoLinea.has(li) ? itemTokens[asignadoLinea.get(li)!].iditem : null
    }));
};
