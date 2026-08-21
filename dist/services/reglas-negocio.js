"use strict";
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
exports.__esModule = true;
exports.resolverReglas = exports.validarReglas = exports.REGLAS_MAX_LEN = void 0;
exports.REGLAS_MAX_LEN = 200;
// Tokens que delatan un intento de reescribir el prompt en vez de configurar
// el negocio. No pretende ser exhaustivo (imposible con texto libre): corta lo
// obvio y deja que los límites escritos en el prompt hagan el resto.
var FRASES_PROHIBIDAS = [
    'ignora', 'ignore', 'olvida', 'olvidate', 'olvídate',
    'system prompt', 'prompt del sistema', 'instrucciones anteriores',
    'eres ahora', 'a partir de ahora eres', 'actua como', 'actúa como',
    'no_responder', 'resumen_pedido', 'confirmar_pedido', 'calcular_delivery',
    'informacion_pedido', 'generar_comprobante', 'consultar_comprobante'
];
var URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|pe|io|xyz|link)\b/i;
/**
 * Normaliza y valida el texto de reglas del panel.
 * `error` != null significa "rechaza el guardado y muéstraselo al dueño";
 * `texto` siempre es seguro de meter al prompt ('' cuando hay error).
 */
var validarReglas = function (valor) {
    // Colapsar TODO el espacio en blanco a espacios simples mata de paso los
    // saltos de línea, tabs y bloques ``` con los que se maquetan inyecciones.
    // Solo texto: un número o un objeto en ese campo es dato sucio, no una regla.
    if (typeof valor !== 'string')
        return { texto: '', error: null };
    var texto = valor
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/[`_]{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (texto === '')
        return { texto: '', error: null };
    if (texto.length > exports.REGLAS_MAX_LEN) {
        return { texto: '', error: "Las reglas no pueden pasar de ".concat(exports.REGLAS_MAX_LEN, " caracteres.") };
    }
    if (URL_RE.test(texto)) {
        return { texto: '', error: 'Las reglas no pueden contener enlaces ni páginas web.' };
    }
    var enMinuscula = texto.toLowerCase();
    if (FRASES_PROHIBIDAS.some(function (f) { return enMinuscula.includes(f); })) {
        return { texto: '', error: 'Ese texto no se puede guardar: escribe una regla de tu negocio (ej. "máximo 2 presas iguales por pedido").' };
    }
    return { texto: texto, error: null };
};
exports.validarReglas = validarReglas;
/** Lectura falla-abierto para /contexto: dato sucio o inválido = sin reglas. */
var resolverReglas = function (valor) { return (0, exports.validarReglas)(valor).texto; };
exports.resolverReglas = resolverReglas;
