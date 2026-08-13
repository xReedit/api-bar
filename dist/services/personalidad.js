"use strict";
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
exports.__esModule = true;
exports.resolverPersonalidad = exports.PERSONALIDAD_DEFAULT = exports.PERSONALIDADES = void 0;
exports.PERSONALIDADES = [
    'amigable',
    'profesional',
    'directo',
    'achorado',
    'divertido',
    'diplomatico' // conciliadora, suaviza negativas
];
exports.PERSONALIDAD_DEFAULT = 'amigable';
/**
 * Normaliza lo que venga del panel/BD contra la lista blanca.
 * Cualquier cosa rara (null, otro tipo, una voz que ya no existe) cae al
 * default: el bot nunca se queda sin voz por un dato sucio.
 */
var resolverPersonalidad = function (valor) {
    var v = String(valor !== null && valor !== void 0 ? valor : '').trim().toLowerCase();
    return exports.PERSONALIDADES.includes(v)
        ? v
        : exports.PERSONALIDAD_DEFAULT;
};
exports.resolverPersonalidad = resolverPersonalidad;
