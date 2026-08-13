// Voz del bot por sede. La elige el dueño en el panel Piter y viaja a
// chatbot-go dentro de `negocio` en /contexto, que la convierte en un bloque
// del system prompt (internal/prompt/piter.go, mapa `personas`).
//
// Se guarda en sede_costo_delivery.parametros (la bolsa de config por sede que
// ya usa el chatbot para resumen_formato) — a propósito: evita un ALTER TABLE
// en producción y el prisma db pull que lo acompaña.
//
// Las claves son el CONTRATO entre los 3 repos: cambiarlas obliga a tocar
// también el panel y el mapa de Go.

export const PERSONALIDADES = [
    'amigable',      // default: cálida y cercana (el tono histórico del bot)
    'profesional',   // trato de usted, sobria
    'directo',       // al grano, sin cháchara
    'achorado',      // jerga peruana
    'divertido',     // con humor
    'diplomatico'    // conciliadora, suaviza negativas
] as const;

export type Personalidad = typeof PERSONALIDADES[number];

export const PERSONALIDAD_DEFAULT: Personalidad = 'amigable';

/**
 * Normaliza lo que venga del panel/BD contra la lista blanca.
 * Cualquier cosa rara (null, otro tipo, una voz que ya no existe) cae al
 * default: el bot nunca se queda sin voz por un dato sucio.
 */
export const resolverPersonalidad = (valor: any): Personalidad => {
    const v = String(valor ?? '').trim().toLowerCase();
    return (PERSONALIDADES as readonly string[]).includes(v)
        ? (v as Personalidad)
        : PERSONALIDAD_DEFAULT;
};
