"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.logger = void 0;
var pino_1 = __importDefault(require("pino"));
var util_1 = require("util");
// Logger unico de la app. Reemplaza console.* para que produccion no se sature:
// los diagnosticos ruidosos (geocoding, impresion, flujo del bot) son `debug` y
// quedan apagados salvo que se suba LOG_LEVEL.
//
// LOG_LEVEL: trace|debug|info|warn|error|fatal|silent
//   produccion  -> info  (sin el detalle de cada geocodificacion)
//   desarrollo  -> debug (todo, con formato legible via pino-pretty)
// Subirlo en caliente sin tocar codigo:
//   LOG_LEVEL=debug pm2 restart restobar-api --update-env
var esProduccion = process.env.NODE_ENV === 'production';
// pino-pretty es devDependency: con `npm ci --omit=dev` no existe en el server.
// Si ademas alli NODE_ENV no quedo en 'production', pedir el transport tumbaria
// el arranque. Se usa solo si de verdad esta instalado.
var hayPinoPretty = (function () {
    try {
        require.resolve('pino-pretty');
        return true;
    }
    catch (_a) {
        return false;
    }
})();
exports.logger = (0, pino_1["default"])(__assign({ level: process.env.LOG_LEVEL || (esProduccion ? 'info' : 'debug'), 
    // pm2 ya pone su propio timestamp en el archivo; en dev lo formatea pino-pretty.
    base: undefined, hooks: {
        // pino NO concatena los argumentos sueltos: logger.error('fallo:', err.message)
        // imprimiria solo "fallo:" y tiraria el detalle. Como el codigo venia de
        // console.*, se formatea igual que console (util.format) cuando el primer
        // argumento es un string. Objeto primero = comportamiento nativo de pino
        // (campos estructurados), por si mas adelante se usa.
        logMethod: function (args, method) {
            if (args.length > 1 && typeof args[0] === 'string') {
                return method.call(this, util_1.format.apply(void 0, args));
            }
            return method.apply(this, args);
        }
    } }, (esProduccion || !hayPinoPretty ? {} : {
    transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
    }
})));
exports["default"] = exports.logger;
