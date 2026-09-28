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

// Palabras vacías fuera del score: "Sopa DE pollo" y "Saltado DE pollo" comparten
// "de" y "pollo" (Dice 0.667 > umbral) y en producción el agotado le robaba la
// línea al plato vivo. La similitud debe salir de las palabras que distinguen.
const VACIAS = new Set([
    'de', 'del', 'la', 'el', 'lo', 'los', 'las', 'con', 'al', 'en',
    'un', 'una', 'por', 'para', 'su', 'sus', 'mas', 'sin'
]);

const tokens = (s: string) =>
    new Set(normalizarTexto(s).split(' ').filter((t) => t.length > 1 && !VACIAS.has(t)));

// Números como secuencias de dígitos del texto original normalizado ("1/4" → 1 y 4).
// No entran al Dice (los de 1 dígito se filtran arriba); son una guardia aparte.
const numeros = (s: string) => new Set(normalizarTexto(s).match(/\d+/g) || []);

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

// Guardia numérica: todos los números del ITEM deben aparecer en la línea
// ("Pollo a la brasa 1/2" no puede tachar la línea del 1/4). Los números extra
// de la línea (precios) no molestan porque el item no los tiene.
const numerosCompatibles = (numLinea: Set<string>, numItem: Set<string>): boolean => {
    let ok = true;
    numItem.forEach((n) => {
        if (!numLinea.has(n)) ok = false;
    });
    return ok;
};

const UMBRAL = 0.6;
// Dos candidatos casi empatados = ambigüedad real (platos hermanos): no se tacha
// ninguno en vez de adivinar. Con un ganador claro (1.0 vs 0.8) no interviene.
const MARGEN = 0.1;

export const matchLineas = (
    lineas: LineaCarta[],
    items: { iditem: number; descripcion: string }[]
): (LineaCarta & { iditem: number | null })[] => {
    // score de cada par (línea, item); asignación greedy de mayor a menor score,
    // cada item se usa una sola vez ("Ceviche" no debe robarle el match a "Ceviche de toyo")
    const itemTokens = items.map((it) => ({ ...it, toks: tokens(it.descripcion), nums: numeros(it.descripcion) }));
    const pares: { li: number; item: number; score: number }[] = [];
    lineas.forEach((l, li) => {
        const lt = tokens(l.texto);
        const ln = numeros(l.texto);
        itemTokens.forEach((it, ii) => {
            if (!numerosCompatibles(ln, it.nums)) return;
            const s = dice(lt, it.toks);
            if (s >= UMBRAL) pares.push({ li, item: ii, score: s });
        });
    });

    // Ambigüedad por línea y por item: si los dos mejores candidatos de un lado
    // quedan a menos de MARGEN, ese lado se excluye entero (falla-seguro).
    const mejores = (clave: 'li' | 'item') => {
        const top = new Map<number, number[]>();
        for (const p of pares) {
            const arr = top.get(p[clave]) || [];
            arr.push(p.score);
            top.set(p[clave], arr);
        }
        const ambiguos = new Set<number>();
        top.forEach((scores, k) => {
            scores.sort((a, b) => b - a);
            if (scores.length > 1 && scores[0] - scores[1] < MARGEN) ambiguos.add(k);
        });
        return ambiguos;
    };
    const lineasAmbiguas = mejores('li');
    const itemsAmbiguos = mejores('item');
    const paresLimpios = pares.filter((p) => !lineasAmbiguas.has(p.li) && !itemsAmbiguos.has(p.item));

    paresLimpios.sort((a, b) => b.score - a.score);
    const asignadoLinea = new Map<number, number>();
    const usadoItem = new Set<number>();
    for (const p of paresLimpios) {
        if (asignadoLinea.has(p.li) || usadoItem.has(p.item)) continue;
        asignadoLinea.set(p.li, p.item);
        usadoItem.add(p.item);
    }
    return lineas.map((l, li) => ({
        ...l,
        iditem: asignadoLinea.has(li) ? itemTokens[asignadoLinea.get(li)!].iditem : null
    }));
};
