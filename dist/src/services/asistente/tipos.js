"use strict";
/**
 * Tipos del asistente IA.
 *
 * Deliberadamente neutrales: no copian el formato de OpenAI ni el de Anthropic.
 * Cada proveedor traduce a lo suyo en su propio archivo, asi que cambiar de
 * modelo no toca ni las herramientas ni el controlador.
 */
exports.__esModule = true;
exports.leerEsfuerzo = exports.PRESUPUESTO_RAZONAMIENTO = void 0;
/** Presupuesto de tokens de razonamiento por nivel (Anthropic). */
exports.PRESUPUESTO_RAZONAMIENTO = {
    off: 0,
    medio: 2000,
    alto: 6000,
    max: 12000
};
function leerEsfuerzo() {
    var v = (process.env.IA_ESFUERZO || 'off').toLowerCase();
    return v === 'medio' || v === 'alto' || v === 'max' ? v : 'off';
}
exports.leerEsfuerzo = leerEsfuerzo;
