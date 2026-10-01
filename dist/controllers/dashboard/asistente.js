"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var dotenv_1 = __importDefault(require("dotenv"));
var conversacion_1 = require("../../services/asistente/conversacion");
var resumenDiario_1 = require("../../services/asistente/resumenDiario");
var prompt_1 = require("../../services/asistente/prompt");
var errores_1 = require("../../services/dash/errores");
var reglas_1 = require("../../services/asistente/reglas");
dotenv_1["default"].config();
var router = express.Router();
/**
 * Asistente IA del dashboard (docs/PLAN_ASISTENTE_IA.md).
 *
 * Montado detras de `auth`: el contexto de seguridad sale del token, nunca del
 * cuerpo de la peticion ni de lo que proponga el modelo.
 */
/** Cada turno cuesta tokens: sin tope, un bucle en el navegador vacia la cuenta. */
var limite = (0, express_rate_limit_1["default"])({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas seguidas. Espera un momento.' }
});
function exigirFechaISO(valor, campo) {
    var f = String(valor !== null && valor !== void 0 ? valor : '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new errores_1.ErrorValidacion("".concat(campo, " debe tener formato YYYY-MM-DD"));
    }
    return f;
}
/**
 * El contexto se arma del token + la pantalla. `sedesPermitidas` es la frontera
 * de seguridad: si el token no trae sedes[], se cae a la sede del propio token.
 */
function construirContexto(req, conRango) {
    var _a, _b;
    if (conRango === void 0) { conRango = true; }
    var token = ((_a = req.token) !== null && _a !== void 0 ? _a : {});
    var _c = (_b = req.body) !== null && _b !== void 0 ? _b : {}, idsede = _c.idsede, desde = _c.desde, hasta = _c.hasta;
    var permitidas = Array.isArray(token.sedes) && token.sedes.length > 0
        ? token.sedes
        : token.idsede
            ? [{ idsede: Number(token.idsede), nombre: 'Mi local' }]
            : [];
    if (permitidas.length === 0) {
        throw new errores_1.ErrorValidacion('El token no trae sedes asignadas');
    }
    var pedida = Number(idsede);
    var sedeActual = permitidas.some(function (s) { return Number(s.idsede) === pedida; })
        ? pedida
        : Number(permitidas[0].idsede);
    return {
        idusuario: Number(token.id) || 0,
        idorg: Number(token.idorg) || 0,
        sedeActual: sedeActual,
        sedesPermitidas: permitidas.map(function (s) {
            var _a;
            return ({
                idsede: Number(s.idsede),
                nombre: String((_a = s.nombre) !== null && _a !== void 0 ? _a : "Sede ".concat(s.idsede))
            });
        }),
        desde: conRango ? exigirFechaISO(desde, 'desde') : (0, prompt_1.hoyEnLima)(),
        hasta: conRango ? exigirFechaISO(hasta, 'hasta') : (0, prompt_1.hoyEnLima)()
    };
}
/**
 * Historial de la conversacion.
 *
 * Se acota a proposito: el contexto se paga en cada turno, y mas alla de unos
 * pocos intercambios deja de aportar. Solo texto de usuario y asistente; las
 * llamadas a herramientas no se reenvian, que es donde esta el volumen.
 */
var MAX_TURNOS = 8;
var MAX_CARACTERES = 600;
function construirHistorial(bruto) {
    if (!Array.isArray(bruto))
        return [];
    return bruto
        .slice(-MAX_TURNOS)
        .filter(function (t) { return t && (t.rol === 'usuario' || t.rol === 'asistente'); })
        .map(function (t) {
        var _a;
        return ({
            rol: t.rol,
            contenido: String((_a = t.texto) !== null && _a !== void 0 ? _a : '').slice(0, MAX_CARACTERES)
        });
    })
        .filter(function (t) { return t.contenido.length > 0; });
}
router.get('/', function (_req, res) {
    res.status(200).json({ message: 'Estas conectado al api dash asistente' });
});
router.post('/chat', limite, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var contexto, respuesta, error_1, estado;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                contexto = construirContexto(req);
                return [4 /*yield*/, (0, conversacion_1.responder)((_a = req.body) === null || _a === void 0 ? void 0 : _a.mensaje, contexto, construirHistorial((_b = req.body) === null || _b === void 0 ? void 0 : _b.historial))];
            case 1:
                respuesta = _c.sent();
                res.status(200).json(respuesta);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                estado = error_1 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_1, 'responder la consulta') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Misma consulta, pero avisando por el camino.
 *
 * La espera no la causa el modelo escribiendo, la causan las consultas a la base
 * (una por sede, y varias por turno). Por eso se emite QUE se esta haciendo en
 * vez de las letras de la respuesta: es mas informativo y mucho mas simple.
 *
 * SSE y no WebSocket porque el flujo es de ida: servidor -> navegador.
 */
router.post('/chat-stream', limite, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var enviar, contexto, respuesta, error_2;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache, no-transform');
                res.setHeader('Connection', 'keep-alive');
                // Sin esto nginx acumula el buffer y los eventos llegan todos al final.
                res.setHeader('X-Accel-Buffering', 'no');
                (_a = res.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(res);
                enviar = function (evento, datos) {
                    res.write("event: ".concat(evento, "\n"));
                    res.write("data: ".concat(JSON.stringify(datos), "\n\n"));
                };
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, 4, 5]);
                contexto = construirContexto(req);
                return [4 /*yield*/, (0, conversacion_1.responder)((_b = req.body) === null || _b === void 0 ? void 0 : _b.mensaje, contexto, construirHistorial((_c = req.body) === null || _c === void 0 ? void 0 : _c.historial), function (paso) { return enviar('paso', { texto: paso }); })];
            case 2:
                respuesta = _d.sent();
                enviar('fin', respuesta);
                return [3 /*break*/, 5];
            case 3:
                error_2 = _d.sent();
                enviar('error', { error: (0, errores_1.mensajeError)(error_2, 'responder la consulta') });
                return [3 /*break*/, 5];
            case 4:
                res.end();
                return [7 /*endfinally*/];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Resumen del dia en texto, sin enviar nada. Para que el usuario lo vea en
 * pantalla y para probar el cron sin gastar notificaciones.
 */
router.post('/resumen-diario/previsualizar', limite, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var contexto, resumen, error_3, estado;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                contexto = construirContexto(req);
                return [4 /*yield*/, (0, resumenDiario_1.generarResumen)(contexto.sedeActual, contexto.hasta)];
            case 1:
                resumen = _a.sent();
                if (!resumen) {
                    return [2 /*return*/, res.status(200).json({ vacio: true })];
                }
                res.status(200).json(resumen);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                estado = error_3 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_3, 'generar el resumen') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Dispara el envio a todas las sedes con ventas del dia. Pensado para un cron
 * al cierre; `shouldSendOncePerDay` evita duplicados si se llama dos veces.
 *
 * Va detras del mismo `auth` que el resto: un cron externo necesita un token del
 * dashboard. Si mas adelante se automatiza desde el servidor, conviene moverlo a
 * una ruta con x-api-key como /chatbot/*.
 */
router.post('/resumen-diario/enviar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fecha, _a, _b, error_4, estado;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                fecha = (_c = req.body) === null || _c === void 0 ? void 0 : _c.fecha;
                if (fecha !== undefined)
                    exigirFechaISO(fecha, 'fecha');
                _b = (_a = res.status(200)).json;
                return [4 /*yield*/, (0, resumenDiario_1.enviarResumenDiario)(fecha)];
            case 1:
                _b.apply(_a, [_d.sent()]);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _d.sent();
                estado = error_4 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_4, 'enviar los resumenes') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Reglas de aviso: "avisame si algun local baja del 70% de su meta".
 *
 * El asistente las propone como un bloque de acciones; se crean aqui, y solo
 * cuando el usuario pulsa. El modelo no escribe en la base.
 */
router.post('/avisos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ctx, _a, _b, error_5, estado;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                ctx = construirContexto(req, false);
                _b = (_a = res.status(200)).json;
                return [4 /*yield*/, (0, reglas_1.listarReglas)(ctx.sedesPermitidas.map(function (s) { return s.idsede; }))];
            case 1:
                _b.apply(_a, [_c.sent()]);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _c.sent();
                estado = error_5 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_5, 'listar los avisos') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/avisos/crear', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ctx, idsede_1, _a, _b, error_6, estado;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 2, , 3]);
                ctx = construirContexto(req, false);
                idsede_1 = Number((_c = req.body) === null || _c === void 0 ? void 0 : _c.idsede);
                if (!ctx.sedesPermitidas.some(function (s) { return s.idsede === idsede_1; })) {
                    throw new errores_1.ErrorValidacion('Sede no autorizada para este usuario');
                }
                _b = (_a = res.status(200)).json;
                return [4 /*yield*/, (0, reglas_1.crearRegla)(ctx.idorg, idsede_1, ctx.idusuario, String((_e = (_d = req.body) === null || _d === void 0 ? void 0 : _d.tipo) !== null && _e !== void 0 ? _e : ''), Number((_f = req.body) === null || _f === void 0 ? void 0 : _f.umbral))];
            case 1:
                _b.apply(_a, [_g.sent()]);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _g.sent();
                estado = error_6 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_6, 'crear el aviso') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/avisos/borrar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ctx, borrado, error_7, estado;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                ctx = construirContexto(req, false);
                return [4 /*yield*/, (0, reglas_1.borrarRegla)(Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.id), ctx.sedesPermitidas.map(function (s) { return s.idsede; }))];
            case 1:
                borrado = _b.sent();
                res.status(200).json({ borrado: borrado });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                estado = error_7 instanceof errores_1.ErrorValidacion ? 400 : 500;
                res.status(estado).json({ error: (0, errores_1.mensajeError)(error_7, 'borrar el aviso') });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
