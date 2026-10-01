"use strict";
exports.__esModule = true;
exports.catalogoSedes = exports.resolverSedes = void 0;
var errores_1 = require("../dash/errores");
function resolverSedes(pedidas, contexto) {
    var permitidas = new Map(contexto.sedesPermitidas.map(function (s) { return [s.idsede, s.nombre]; }));
    if (permitidas.size === 0) {
        throw new errores_1.ErrorValidacion('El usuario no tiene sedes asignadas');
    }
    // Sin argumento: la sede de la pantalla, si el usuario la tiene.
    if (pedidas === undefined || pedidas === null) {
        var actual = permitidas.has(contexto.sedeActual)
            ? contexto.sedeActual
            : contexto.sedesPermitidas[0].idsede;
        return { ids: [actual], nombres: [permitidas.get(actual)], descartadas: [] };
    }
    if (pedidas === 'todas') {
        return {
            ids: Array.from(permitidas.keys()),
            nombres: Array.from(permitidas.values()),
            descartadas: []
        };
    }
    if (!Array.isArray(pedidas)) {
        throw new errores_1.ErrorValidacion('sedes debe ser un array de ids o la palabra "todas"');
    }
    var ids = [];
    var nombres = [];
    var descartadas = [];
    for (var _i = 0, pedidas_1 = pedidas; _i < pedidas_1.length; _i++) {
        var bruto = pedidas_1[_i];
        var id = Number(bruto);
        if (!Number.isInteger(id))
            continue;
        if (permitidas.has(id)) {
            if (!ids.includes(id)) {
                ids.push(id);
                nombres.push(permitidas.get(id));
            }
        }
        else {
            descartadas.push(id);
        }
    }
    if (ids.length === 0) {
        throw new errores_1.ErrorValidacion('Ninguna de las sedes pedidas corresponde a este usuario');
    }
    return { ids: ids, nombres: nombres, descartadas: descartadas };
}
exports.resolverSedes = resolverSedes;
/** Catalogo que se inyecta en el prompt para que el modelo nombre las sedes. */
function catalogoSedes(contexto) {
    return contexto.sedesPermitidas
        .map(function (s) { return "- ".concat(s.idsede, ": ").concat(s.nombre).concat(s.idsede === contexto.sedeActual ? ' (la que mira ahora)' : ''); })
        .join('\n');
}
exports.catalogoSedes = catalogoSedes;
