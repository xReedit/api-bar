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
exports.crearProveedorAnthropic = void 0;
var axios_1 = __importDefault(require("axios"));
var tipos_1 = require("../tipos");
/**
 * Proveedor Anthropic (Claude) via HTTP.
 *
 * Se escribe ahora, aunque el proveedor por defecto sea OpenAI, para que la
 * interfaz este probada contra dos formatos distintos desde el principio: una
 * abstraccion con una sola implementacion no es una abstraccion.
 *
 * Diferencias con OpenAI que absorbe este archivo:
 *  - el system prompt va aparte, no como un mensaje mas
 *  - los resultados de herramienta son bloques dentro de un mensaje de usuario
 */
var URL = 'https://api.anthropic.com/v1/messages';
var VERSION = '2023-06-01';
function crearProveedorAnthropic() {
    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY no configurada');
    }
    var modelo = process.env.IA_MODELO || 'claude-sonnet-5';
    return {
        nombre: 'anthropic',
        modelo: modelo,
        chat: function (mensajes, herramientas, forzar) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return __awaiter(this, void 0, void 0, function () {
                var system, conversacion, esfuerzo, presupuesto, cuerpo, tools, cabeceras, workspace, data, err_1, detalle, bloques, textos, usos;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            system = mensajes
                                .filter(function (m) { return m.rol === 'sistema'; })
                                .map(function (m) { return m.contenido; })
                                .join('\n\n');
                            conversacion = mensajes
                                .filter(function (m) { return m.rol !== 'sistema'; })
                                .map(function (m) {
                                var _a;
                                if (m.rol === 'herramienta') {
                                    return {
                                        role: 'user',
                                        content: [
                                            {
                                                type: 'tool_result',
                                                tool_use_id: m.idLlamada,
                                                content: m.contenido
                                            }
                                        ]
                                    };
                                }
                                if (m.rol === 'asistente' && ((_a = m.llamadas) === null || _a === void 0 ? void 0 : _a.length)) {
                                    var bloques_1 = [];
                                    if (m.contenido)
                                        bloques_1.push({ type: 'text', text: m.contenido });
                                    for (var _i = 0, _b = m.llamadas; _i < _b.length; _i++) {
                                        var l = _b[_i];
                                        bloques_1.push({
                                            type: 'tool_use',
                                            id: l.id,
                                            name: l.nombre,
                                            input: l.argumentos
                                        });
                                    }
                                    return { role: 'assistant', content: bloques_1 };
                                }
                                return {
                                    role: m.rol === 'asistente' ? 'assistant' : 'user',
                                    content: m.contenido
                                };
                            });
                            esfuerzo = (0, tipos_1.leerEsfuerzo)();
                            presupuesto = tipos_1.PRESUPUESTO_RAZONAMIENTO[esfuerzo];
                            cuerpo = {
                                model: modelo,
                                max_tokens: 1500,
                                messages: conversacion
                            };
                            // Sin `temperature`: los modelos actuales de Anthropic la rechazan por
                            // obsoleta. El determinismo lo da el prompt, no el parametro.
                            if (presupuesto > 0) {
                                // Con thinking activo, max_tokens debe superar el presupuesto.
                                cuerpo.thinking = { type: 'enabled', budget_tokens: presupuesto };
                                cuerpo.max_tokens = presupuesto + 1500;
                            }
                            // El prompt de sistema y el catalogo de herramientas son identicos en
                            // cada turno y en cada sede: cachearlos evita reenviar ~5k tokens por
                            // consulta. El marcador va en el ULTIMO bloque, que cierra el tramo
                            // cacheable.
                            if (system) {
                                cuerpo.system = [
                                    { type: 'text', text: system, cache_control: { type: 'ephemeral' } }
                                ];
                            }
                            if (herramientas.length > 0) {
                                tools = herramientas.map(function (h) { return ({
                                    name: h.nombre,
                                    description: h.descripcion,
                                    input_schema: h.parametros
                                }); });
                                tools[tools.length - 1].cache_control = { type: 'ephemeral' };
                                cuerpo.tools = tools;
                                if (forzar)
                                    cuerpo.tool_choice = { type: 'tool', name: forzar };
                            }
                            cabeceras = {
                                'x-api-key': apiKey,
                                'anthropic-version': VERSION,
                                'Content-Type': 'application/json'
                            };
                            workspace = process.env.ANTHROPIC_WORKSPACE_ID;
                            if (workspace)
                                cabeceras['anthropic-workspace-id'] = workspace;
                            _k.label = 1;
                        case 1:
                            _k.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, axios_1["default"].post(URL, cuerpo, { headers: cabeceras, timeout: 60000 })];
                        case 2:
                            (data = (_k.sent()).data);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _k.sent();
                            detalle = (_d = (_c = (_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) !== null && _d !== void 0 ? _d : err_1 === null || err_1 === void 0 ? void 0 : err_1.message;
                            throw new Error("Anthropic (".concat((_f = (_e = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _e === void 0 ? void 0 : _e.status) !== null && _f !== void 0 ? _f : 'sin estado', "): ").concat(detalle));
                        case 4:
                            bloques = (_g = data === null || data === void 0 ? void 0 : data.content) !== null && _g !== void 0 ? _g : [];
                            textos = bloques.filter(function (b) { return b.type === 'text'; }).map(function (b) { var _a; return (_a = b.text) !== null && _a !== void 0 ? _a : ''; });
                            usos = bloques.filter(function (b) { return b.type === 'tool_use'; });
                            return [2 /*return*/, {
                                    texto: textos.length ? textos.join('\n') : null,
                                    llamadas: usos.map(function (b) {
                                        var _a;
                                        return ({
                                            id: b.id,
                                            nombre: b.name,
                                            argumentos: (_a = b.input) !== null && _a !== void 0 ? _a : {}
                                        });
                                    }),
                                    uso: (data === null || data === void 0 ? void 0 : data.usage)
                                        ? {
                                            entrada: data.usage.input_tokens,
                                            salida: data.usage.output_tokens,
                                            cacheEscrito: (_h = data.usage.cache_creation_input_tokens) !== null && _h !== void 0 ? _h : 0,
                                            cacheLeido: (_j = data.usage.cache_read_input_tokens) !== null && _j !== void 0 ? _j : 0
                                        }
                                        : undefined
                                }];
                    }
                });
            });
        }
    };
}
exports.crearProveedorAnthropic = crearProveedorAnthropic;
