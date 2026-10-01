"use strict";
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
exports.crearProveedorOpenAI = void 0;
var axios_1 = __importDefault(require("axios"));
var tipos_1 = require("../tipos");
/**
 * Proveedor OpenAI via HTTP (axios ya es dependencia; no hace falta el SDK).
 *
 * Todo lo especifico de OpenAI vive aqui: el mapeo de roles, el formato de
 * tool_calls y la forma de la respuesta. El resto del asistente no lo sabe.
 */
var URL = 'https://api.openai.com/v1/chat/completions';
var ROLES = {
    sistema: 'system',
    usuario: 'user',
    asistente: 'assistant',
    herramienta: 'tool'
};
function aFormatoOpenAI(m) {
    var _a;
    var base = { role: ROLES[m.rol], content: m.contenido };
    if (m.rol === 'herramienta') {
        base.tool_call_id = m.idLlamada;
    }
    if (m.rol === 'asistente' && ((_a = m.llamadas) === null || _a === void 0 ? void 0 : _a.length)) {
        base.tool_calls = m.llamadas.map(function (l) { return ({
            id: l.id,
            type: 'function',
            "function": { name: l.nombre, arguments: JSON.stringify(l.argumentos) }
        }); });
        // OpenAI exige content null cuando hay tool_calls
        base.content = m.contenido || null;
    }
    return base;
}
/** Los argumentos llegan como string; si vienen rotos, objeto vacio y que falle la validacion. */
function parsearArgumentos(json) {
    try {
        var v = JSON.parse(json || '{}');
        return v && typeof v === 'object' ? v : {};
    }
    catch (_a) {
        return {};
    }
}
function crearProveedorOpenAI() {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY no configurada');
    }
    var modelo = process.env.IA_MODELO || 'gpt-4o-mini';
    return {
        nombre: 'openai',
        modelo: modelo,
        chat: function (mensajes, herramientas, forzar) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            return __awaiter(this, void 0, void 0, function () {
                var esfuerzo, cuerpo, data, err_1, detalle, mensaje, toolCalls;
                return __generator(this, function (_m) {
                    switch (_m.label) {
                        case 0:
                            esfuerzo = (0, tipos_1.leerEsfuerzo)();
                            cuerpo = {
                                model: modelo,
                                messages: mensajes.map(aFormatoOpenAI)
                            };
                            if (esfuerzo === 'off') {
                                cuerpo.temperature = 0.2;
                            }
                            else {
                                // Solo lo aceptan los modelos de razonamiento; 'max' no existe en
                                // OpenAI, se mapea a 'high'.
                                cuerpo.reasoning_effort = esfuerzo === 'medio' ? 'medium' : 'high';
                            }
                            if (herramientas.length > 0) {
                                cuerpo.tools = herramientas.map(function (h) { return ({
                                    type: 'function',
                                    "function": {
                                        name: h.nombre,
                                        description: h.descripcion,
                                        parameters: h.parametros
                                    }
                                }); });
                                cuerpo.tool_choice = forzar
                                    ? { type: 'function', "function": { name: forzar } }
                                    : 'auto';
                            }
                            _m.label = 1;
                        case 1:
                            _m.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, axios_1["default"].post(URL, cuerpo, {
                                    headers: {
                                        Authorization: "Bearer ".concat(apiKey),
                                        'Content-Type': 'application/json'
                                    },
                                    timeout: 60000
                                })];
                        case 2:
                            (data = (_m.sent()).data);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _m.sent();
                            detalle = (_d = (_c = (_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) !== null && _d !== void 0 ? _d : err_1 === null || err_1 === void 0 ? void 0 : err_1.message;
                            throw new Error("OpenAI (".concat((_f = (_e = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _e === void 0 ? void 0 : _e.status) !== null && _f !== void 0 ? _f : 'sin estado', "): ").concat(detalle));
                        case 4:
                            mensaje = (_j = (_h = (_g = data === null || data === void 0 ? void 0 : data.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.message) !== null && _j !== void 0 ? _j : {};
                            toolCalls = (_k = mensaje.tool_calls) !== null && _k !== void 0 ? _k : [];
                            return [2 /*return*/, {
                                    texto: (_l = mensaje.content) !== null && _l !== void 0 ? _l : null,
                                    llamadas: toolCalls.map(function (t) { return ({
                                        id: t.id,
                                        nombre: t["function"].name,
                                        argumentos: parsearArgumentos(t["function"].arguments)
                                    }); }),
                                    uso: (data === null || data === void 0 ? void 0 : data.usage)
                                        ? { entrada: data.usage.prompt_tokens, salida: data.usage.completion_tokens }
                                        : undefined
                                }];
                    }
                });
            });
        }
    };
}
exports.crearProveedorOpenAI = crearProveedorOpenAI;
