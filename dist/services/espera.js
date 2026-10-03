"use strict";
exports.__esModule = true;
exports.esperarConTope = exports.EN_PROCESO = void 0;
// Espera una promesa como máximo `ms`. Si vence el tope devuelve EN_PROCESO y
// la promesa SIGUE corriendo (no se cancela): sirve para responderle a tiempo a
// quien llama mientras el trabajo termina en segundo plano.
exports.EN_PROCESO = Symbol('en_proceso');
var esperarConTope = function (promesa, ms) {
    var timer;
    var tope = new Promise(function (r) { timer = setTimeout(function () { return r(exports.EN_PROCESO); }, ms); });
    return Promise.race([promesa, tope])["finally"](function () { return clearTimeout(timer); });
};
exports.esperarConTope = esperarConTope;
