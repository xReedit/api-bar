"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.mensajeError = exports.ErrorValidacion = void 0;
var logger_1 = require("../../utils/logger");
/**
 * Saneo de errores para las respuestas del dashboard y del asistente IA.
 *
 * Un error crudo de Prisma o MySQL lleva dentro el nombre de la tabla, el SQL y
 * a veces el stack. Eso no puede salir al cliente ni llegar al modelo: es la via
 * de fuga mas probable del asistente (ver docs/PLAN_ASISTENTE_IA.md, 6.1).
 */
/** Error de entrada: su mensaje SI se puede mostrar, lo causo quien llamo. */
var ErrorValidacion = /** @class */ (function (_super) {
    __extends(ErrorValidacion, _super);
    function ErrorValidacion(mensaje) {
        var _this = _super.call(this, mensaje) || this;
        _this.name = 'ErrorValidacion';
        // Sin esto `instanceof` falla: tsconfig no fija target, asi que se emite
        // ES5, y ahi heredar de Error pierde la cadena de prototipos. El efecto
        // era que TODO error de validacion salia como generico con estado 500.
        Object.setPrototypeOf(_this, ErrorValidacion.prototype);
        return _this;
    }
    return ErrorValidacion;
}(Error));
exports.ErrorValidacion = ErrorValidacion;
/**
 * Mensaje seguro para el cliente. Solo los errores de validacion conservan su
 * texto; cualquier otro se colapsa a un generico y se registra completo en el
 * servidor, donde si se puede leer.
 */
function mensajeError(error, contexto) {
    if (contexto === void 0) { contexto = 'consultar los datos'; }
    if (error instanceof ErrorValidacion) {
        return error.message;
    }
    logger_1.logger.error("[dash] Error al ".concat(contexto, ":"), error);
    return "No se pudo ".concat(contexto, ". Intenta nuevamente.");
}
exports.mensajeError = mensajeError;
