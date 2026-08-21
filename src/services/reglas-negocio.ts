// Reglas propias del local que el dueño escribe en el panel Piter (por sede) y
// el bot respeta al armar el pedido. Ej. pollería: "máximo 2 presas iguales,
// el resto debe variar".
//
// Se guarda en sede_costo_delivery.parametros.reglas_negocio, la misma bolsa
// JSON que personalidad_chatbot y resumen_formato: sin ALTER TABLE en prod.
// Viaja en /contexto dentro de `negocio` y chatbot-go la vuelve un bloque del
// system prompt (internal/prompt/piter.go, reglasNegocio()).
//
// Es texto libre que entra al prompt, así que se limpia SIEMPRE: al guardar
// (con mensaje de error para el dueño) y al leer (falla-abierto: dato sucio =
// sin reglas, el bot atiende normal). La barrera de verdad no es este filtro
// sino la arquitectura: precios, iditem y el resumen salen del backend, así
// que una regla no puede regalar comida.

export const REGLAS_MAX_LEN = 200;

// Tokens que delatan un intento de reescribir el prompt en vez de configurar
// el negocio. No pretende ser exhaustivo (imposible con texto libre): corta lo
// obvio y deja que los límites escritos en el prompt hagan el resto.
const FRASES_PROHIBIDAS = [
    'ignora', 'ignore', 'olvida', 'olvidate', 'olvídate',
    'system prompt', 'prompt del sistema', 'instrucciones anteriores',
    'eres ahora', 'a partir de ahora eres', 'actua como', 'actúa como',
    'no_responder', 'resumen_pedido', 'confirmar_pedido', 'calcular_delivery',
    'informacion_pedido', 'generar_comprobante', 'consultar_comprobante'
];

const URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|pe|io|xyz|link)\b/i;

export type ReglasValidadas = { texto: string; error: string | null };

/**
 * Normaliza y valida el texto de reglas del panel.
 * `error` != null significa "rechaza el guardado y muéstraselo al dueño";
 * `texto` siempre es seguro de meter al prompt ('' cuando hay error).
 */
export const validarReglas = (valor: any): ReglasValidadas => {
    // Colapsar TODO el espacio en blanco a espacios simples mata de paso los
    // saltos de línea, tabs y bloques ``` con los que se maquetan inyecciones.
    // Solo texto: un número o un objeto en ese campo es dato sucio, no una regla.
    if (typeof valor !== 'string') return { texto: '', error: null };

    const texto = valor
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/[`_]{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (texto === '') return { texto: '', error: null };

    if (texto.length > REGLAS_MAX_LEN) {
        return { texto: '', error: `Las reglas no pueden pasar de ${REGLAS_MAX_LEN} caracteres.` };
    }
    if (URL_RE.test(texto)) {
        return { texto: '', error: 'Las reglas no pueden contener enlaces ni páginas web.' };
    }
    const enMinuscula = texto.toLowerCase();
    if (FRASES_PROHIBIDAS.some(f => enMinuscula.includes(f))) {
        return { texto: '', error: 'Ese texto no se puede guardar: escribe una regla de tu negocio (ej. "máximo 2 presas iguales por pedido").' };
    }
    return { texto, error: null };
};

/** Lectura falla-abierto para /contexto: dato sucio o inválido = sin reglas. */
export const resolverReglas = (valor: any): string => validarReglas(valor).texto;
