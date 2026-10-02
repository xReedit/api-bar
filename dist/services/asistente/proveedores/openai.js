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
 * Proveedor OpenAI por la API de Responses (axios ya es dependencia; no hace
 * falta el SDK).
 *
 * POR QUE /v1/responses Y NO /v1/chat/completions
 * Los modelos nuevos de razonamiento rechazan `reasoning_effort` junto con
 * herramientas en chat/completions: o renuncias al razonamiento o renuncias a
 * las herramientas, y este asistente no funciona sin herramientas. Responses
 * admite las dos cosas, que es la unica razon del cambio.
 *
 * QUE CAMBIA RESPECTO A chat/completions
 *  - `messages` pasa a ser `input`, una lista de ITEMS y no solo de mensajes.
 *  - Las herramientas van planas: {type, name, parameters}, sin anidar en
 *    `function`.
 *  - La llamada a herramienta vuelve como un item `function_call` dentro de
 *    `output`, y su resultado se devuelve como `function_call_output`, enlazado
 *    por `call_id` (no por `tool_call_id`).
 *  - El texto vive en items `message` con partes `output_text`.
 *
 * Todo eso se queda aqui dentro: el resto del asistente sigue hablando el
 * contrato neutro de `tipos.ts`.
 */
var URL = 'https://api.openai.com/v1/responses';
/** La escala neutra en los nombres de OpenAI. */
var ESFUERZO_OPENAI = {
    off: 'none',
    medio: 'medium',
    alto: 'high',
    max: 'max'
};
/** `developer` es el papel con el que Responses nombra las instrucciones de sistema. */
var ROLES = {
    sistema: 'developer',
    usuario: 'user',
    asistente: 'assistant'
};
/**
 * Un mensaje del contrato neutro puede convertirse en VARIOS items: un turno
 * del asistente con dos llamadas a herramienta son dos items `function_call`
 * mas, si hablo, uno de texto.
 */
function aItems(m) {
    var _a;
    if (m.rol === 'herramienta') {
        return [
            {
                type: 'function_call_output',
                call_id: m.idLlamada,
                output: m.contenido
            }
        ];
    }
    var items = [];
    if (m.rol === 'asistente' && ((_a = m.llamadas) === null || _a === void 0 ? void 0 : _a.length)) {
        if (m.contenido) {
            items.push({ role: 'assistant', content: m.contenido });
        }
        for (var _i = 0, _b = m.llamadas; _i < _b.length; _i++) {
            var l = _b[_i];
            items.push({
                type: 'function_call',
                call_id: l.id,
                name: l.nombre,
                arguments: JSON.stringify(l.argumentos)
            });
        }
        return items;
    }
    items.push({ role: ROLES[m.rol], content: m.contenido });
    return items;
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
/** El texto puede venir repartido en varias partes `output_text`. */
function textoDe(items) {
    var partes = items
        .filter(function (i) { return i.type === 'message'; })
        .flatMap(function (i) { var _a; return (_a = i.content) !== null && _a !== void 0 ? _a : []; })
        .filter(function (c) { return c.type === 'output_text'; })
        .map(function (c) { var _a; return (_a = c.text) !== null && _a !== void 0 ? _a : ''; });
    var texto = partes.join('').trim();
    return texto.length ? texto : null;
}
function crearProveedorOpenAI() {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY no configurada');
    }
    var modelo = process.env.IA_MODELO || 'gpt-4o-mini';
    // Los modelos clasicos no aceptan `reasoning`. Se deduce del nombre y, si la
    // API se queja, se corrige sola en el catch.
    var aceptaRazonamiento = /^(o\d|gpt-5)/i.test(modelo);
    var reintentado = false;
    return {
        nombre: 'openai',
        modelo: modelo,
        chat: function (mensajes, herramientas, forzar) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            return __awaiter(this, void 0, void 0, function () {
                var esfuerzo, cuerpo, data, err_1, detalle, esDeParametro, items;
                return __generator(this, function (_m) {
                    switch (_m.label) {
                        case 0:
                            esfuerzo = (0, tipos_1.leerEsfuerzo)();
                            reintentado = false;
                            cuerpo = {
                                model: modelo,
                                input: mensajes.flatMap(aItems),
                                // Sin esto, Responses guarda el hilo en OpenAI. El asistente ya
                                // maneja su propio historial y no hace falta dejar copia fuera.
                                store: false
                            };
                            if (aceptaRazonamiento) {
                                // La escala neutra cae una a una en la de OpenAI. 'none' y no
                                // 'minimal': 'minimal' no lo admiten todos los modelos, 'none' si.
                                // Con herramientas, esto SOLO funciona por Responses.
                                cuerpo.reasoning = { effort: ESFUERZO_OPENAI[esfuerzo] };
                            }
                            else if (esfuerzo === 'off') {
                                cuerpo.temperature = 0.2;
                            }
                            if (herramientas.length > 0) {
                                // Planas, sin el envoltorio `function` de chat/completions.
                                cuerpo.tools = herramientas.map(function (h) { return ({
                                    type: 'function',
                                    name: h.nombre,
                                    description: h.descripcion,
                                    parameters: h.parametros
                                }); });
                                cuerpo.tool_choice = forzar ? { type: 'function', name: forzar } : 'auto';
                            }
                            _m.label = 1;
                        case 1:
                            _m.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, axios_1["default"].post(URL, cuerpo, {
                                    headers: {
                                        Authorization: "Bearer ".concat(apiKey),
                                        'Content-Type': 'application/json'
                                    },
                                    timeout: 120000
                                })];
                        case 2:
                            (data = (_m.sent()).data);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _m.sent();
                            detalle = (_e = (_d = (_c = (_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) !== null && _d !== void 0 ? _d : err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _e !== void 0 ? _e : '';
                            esDeParametro = ((_f = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _f === void 0 ? void 0 : _f.status) === 400 && /reasoning|temperature/i.test(detalle);
                            if (esDeParametro && !reintentado) {
                                reintentado = true;
                                aceptaRazonamiento = !aceptaRazonamiento;
                                return [2 /*return*/, this.chat(mensajes, herramientas, forzar)];
                            }
                            throw new Error("OpenAI (".concat((_h = (_g = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _g === void 0 ? void 0 : _g.status) !== null && _h !== void 0 ? _h : 'sin estado', "): ").concat(detalle));
                        case 4:
                            items = (_j = data === null || data === void 0 ? void 0 : data.output) !== null && _j !== void 0 ? _j : [];
                            return [2 /*return*/, {
                                    texto: textoDe(items),
                                    llamadas: items
                                        .filter(function (i) { return i.type === 'function_call'; })
                                        .map(function (i) {
                                        var _a;
                                        return ({
                                            id: String(i.call_id),
                                            nombre: String(i.name),
                                            argumentos: parsearArgumentos((_a = i.arguments) !== null && _a !== void 0 ? _a : '{}')
                                        });
                                    }),
                                    uso: (data === null || data === void 0 ? void 0 : data.usage)
                                        ? {
                                            entrada: data.usage.input_tokens,
                                            salida: data.usage.output_tokens,
                                            // Responses informa el ahorro de cache aqui dentro.
                                            cacheLeido: (_l = (_k = data.usage.input_tokens_details) === null || _k === void 0 ? void 0 : _k.cached_tokens) !== null && _l !== void 0 ? _l : 0
                                        }
                                        : undefined
                                }];
                    }
                });
            });
        }
    };
}
exports.crearProveedorOpenAI = crearProveedorOpenAI;
