"use strict";
exports.__esModule = true;
exports.reiniciarProveedor = exports.obtenerProveedor = void 0;
var openai_1 = require("./proveedores/openai");
var anthropic_1 = require("./proveedores/anthropic");
/**
 * Selector de proveedor. Se elige con IA_PROVEEDOR y el modelo con IA_MODELO,
 * asi que cambiar de motor es una variable de entorno y un reinicio.
 *
 *   IA_PROVEEDOR=openai     IA_MODELO=gpt-4o-mini      OPENAI_API_KEY=...
 *   IA_PROVEEDOR=anthropic  IA_MODELO=claude-sonnet-5  ANTHROPIC_API_KEY=...
 */
var cache = null;
function obtenerProveedor() {
    if (cache)
        return cache;
    var elegido = (process.env.IA_PROVEEDOR || 'openai').toLowerCase();
    switch (elegido) {
        case 'openai':
            cache = (0, openai_1.crearProveedorOpenAI)();
            break;
        case 'anthropic':
        case 'claude':
            cache = (0, anthropic_1.crearProveedorAnthropic)();
            break;
        default:
            throw new Error("IA_PROVEEDOR desconocido: ".concat(elegido));
    }
    return cache;
}
exports.obtenerProveedor = obtenerProveedor;
/** Para los tests: olvida el proveedor cacheado. */
function reiniciarProveedor() {
    cache = null;
}
exports.reiniciarProveedor = reiniciarProveedor;
