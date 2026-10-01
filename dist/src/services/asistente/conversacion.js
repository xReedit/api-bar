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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.responder = exports.descripcionDePaso = void 0;
var proveedor_1 = require("./proveedor");
var prompt_1 = require("./prompt");
var herramientas_1 = require("./herramientas");
var errores_1 = require("../dash/errores");
/**
 * Bucle de conversacion: pedir al modelo, ejecutar lo que pida, repetir.
 *
 * La respuesta final NO se parsea de texto: el modelo la entrega llamando a la
 * herramienta "responder", asi el formato lo garantiza el esquema y no la buena
 * voluntad del modelo. Si aun asi responde en texto plano, se usa como titular.
 */
var RESPONDER = {
    nombre: 'responder',
    descripcion: 'Entrega la respuesta final al usuario. Llamala siempre al terminar, despues de ' +
        'haber consultado las herramientas que necesites.',
    parametros: {
        type: 'object',
        properties: {
            titular: {
                type: 'string',
                description: 'Una frase con la conclusion, no con el dato.'
            },
            lectura: {
                type: 'string',
                description: 'Una o dos frases: que significa y que harias.'
            },
            seguimiento: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 3,
                description: 'Preguntas que el usuario podria querer hacer ahora.'
            },
            bloques: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 2,
                description: 'Ids de "bloques_disponibles" que quieres mostrar. Maximo DOS: elegir ' +
                    'es tu trabajo. Omitir si ninguno aporta.'
            },
            descarga: {
                type: 'boolean',
                description: 'true SOLO si el usuario pidio el dato para llevarselo: en Excel, ' +
                    'descargar, exportar, "pasame el reporte". Pone un boton de descarga ' +
                    'junto a los enlaces. No lo marques en una consulta normal.'
            }
        },
        required: ['titular', 'lectura', 'seguimiento'],
        additionalProperties: false
    }
};
/**
 * Que se esta haciendo, en lenguaje de negocio. El usuario no tiene que saber
 * que existe una herramienta llamada "locales_comparar".
 */
var EN_CURSO = {
    ventas_resumen: 'Revisando tus ventas',
    ventas_por_dia: 'Armando la evolucion dia a dia',
    locales_comparar: 'Comparando tus locales',
    productos_top: 'Mirando que se vende mas',
    metas_avance: 'Calculando el avance de meta',
    alertas_operativas: 'Buscando movimientos raros',
    clima: 'Consultando el clima',
    responder: 'Redactando la respuesta'
};
function descripcionDePaso(nombre) {
    var _a;
    return (_a = EN_CURSO[nombre]) !== null && _a !== void 0 ? _a : 'Consultando datos';
}
exports.descripcionDePaso = descripcionDePaso;
function topeHerramientas() {
    var n = Number(process.env.IA_MAX_HERRAMIENTAS);
    return Number.isInteger(n) && n > 0 ? n : 4;
}
function sumarUso(a, b) {
    var _a, _b, _c, _d;
    if (!a)
        return b;
    if (!b)
        return a;
    return {
        entrada: a.entrada + b.entrada,
        salida: a.salida + b.salida,
        cacheEscrito: ((_a = a.cacheEscrito) !== null && _a !== void 0 ? _a : 0) + ((_b = b.cacheEscrito) !== null && _b !== void 0 ? _b : 0),
        cacheLeido: ((_c = a.cacheLeido) !== null && _c !== void 0 ? _c : 0) + ((_d = b.cacheLeido) !== null && _d !== void 0 ? _d : 0)
    };
}
/**
 * Separa los bloques del resultado de una herramienta.
 *
 * El modelo recibe solo los metadatos (id, tipo, titulo): ni una serie, ni una
 * fila. Asi no puede inventar datos y, de paso, no se gastan miles de tokens en
 * mandarle numeros que ya tenemos.
 */
function separarBloques(resultado) {
    if (!resultado || typeof resultado !== 'object') {
        return { paraModelo: resultado, bloques: [] };
    }
    var _a = resultado, bloques = _a.bloques, resto = __rest(_a, ["bloques"]);
    if (!Array.isArray(bloques) || bloques.length === 0) {
        return { paraModelo: resto, bloques: [] };
    }
    var disponibles = bloques.map(function (b) { return ({
        id: b.id,
        tipo: b.tipo,
        titulo: b.titulo
    }); });
    return { paraModelo: __assign(__assign({}, resto), { bloques_disponibles: disponibles }), bloques: bloques };
}
/**
 * Etiqueta segun el destino. Antes todos decian "Ver el detalle" y con dos
 * herramientas salian dos botones identicos, sin forma de saber a donde iba
 * cada uno.
 */
var DESTINOS = {
    '/ventas': 'Ver ventas',
    '/productos': 'Ver productos',
    '/locales': 'Ver locales',
    '/caja': 'Ver caja',
    '/encuestas': 'Ver encuestas',
    '/metas': 'Ver metas'
};
function etiquetaDeLink(href) {
    var _a;
    var ruta = href.split('?')[0];
    return (_a = DESTINOS[ruta]) !== null && _a !== void 0 ? _a : 'Ver el detalle';
}
/** Recoge los `link` que devolvieron las herramientas, sin repetir destino. */
function extraerLinks(resultados) {
    var porRuta = new Map();
    for (var _i = 0, resultados_1 = resultados; _i < resultados_1.length; _i++) {
        var r = resultados_1[_i];
        var href = r === null || r === void 0 ? void 0 : r.link;
        if (typeof href !== 'string' || !href)
            continue;
        var ruta = href.split('?')[0];
        // Una entrada por seccion: dos consultas a ventas no son dos botones.
        if (!porRuta.has(ruta))
            porRuta.set(ruta, href);
    }
    return Array.from(porRuta.values()).map(function (href) { return ({
        label: etiquetaDeLink(href),
        href: href
    }); });
}
function responder(mensajeUsuario, ctx, historial, 
/** Se llama al empezar cada herramienta, para el streaming de progreso. */
alProgreso) {
    var _a, _b, _c, _d, _e;
    if (historial === void 0) { historial = []; }
    return __awaiter(this, void 0, void 0, function () {
        var texto, proveedor, herramientas, mensajes, resultados, catalogoBloques, uso, forzarRespuesta, vuelta, respuesta, finales, a, pedidos, _i, _f, llamada, contenido, resultado, _g, paraModelo, bloques, _h, bloques_1, b, error_1;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    texto = String(mensajeUsuario !== null && mensajeUsuario !== void 0 ? mensajeUsuario : '').trim();
                    if (!texto) {
                        throw new errores_1.ErrorValidacion('El mensaje no puede estar vacio');
                    }
                    proveedor = (0, proveedor_1.obtenerProveedor)();
                    herramientas = __spreadArray(__spreadArray([], herramientas_1.DEFINICIONES, true), [RESPONDER], false);
                    mensajes = __spreadArray(__spreadArray([
                        { rol: 'sistema', contenido: (0, prompt_1.construirPrompt)(ctx) }
                    ], historial, true), [
                        { rol: 'usuario', contenido: texto }
                    ], false);
                    resultados = [];
                    catalogoBloques = new Map();
                    forzarRespuesta = false;
                    vuelta = 0;
                    _j.label = 1;
                case 1:
                    if (!(vuelta <= topeHerramientas())) return [3 /*break*/, 10];
                    return [4 /*yield*/, proveedor.chat(mensajes, herramientas, forzarRespuesta ? 'responder' : undefined)];
                case 2:
                    respuesta = _j.sent();
                    uso = sumarUso(uso, respuesta.uso);
                    finales = respuesta.llamadas.filter(function (l) { return l.nombre === 'responder'; });
                    if (finales.length > 0) {
                        a = finales[0].argumentos;
                        pedidos = Array.isArray(a.bloques) ? a.bloques.map(String) : [];
                        return [2 /*return*/, {
                                titular: String((_a = a.titular) !== null && _a !== void 0 ? _a : '').trim(),
                                lectura: String((_b = a.lectura) !== null && _b !== void 0 ? _b : '').trim(),
                                // Solo ids que existan de verdad, y como mucho dos.
                                bloques: pedidos
                                    .map(function (id) { return catalogoBloques.get(id); })
                                    .filter(function (b) { return Boolean(b); })
                                    .slice(0, 2),
                                seguimiento: Array.isArray(a.seguimiento) ? a.seguimiento.map(String) : [],
                                links: extraerLinks(resultados),
                                descarga: a.descarga === true,
                                uso: uso
                            }];
                    }
                    // Respondio en texto plano en vez de llamar a "responder". Pasa: se le pide
                    // otra vez obligandolo a usar la herramienta, para no perder la estructura
                    // (titular, lectura, chips) por un desliz de formato.
                    if (respuesta.llamadas.length === 0) {
                        if (!forzarRespuesta) {
                            forzarRespuesta = true;
                            mensajes.push({ rol: 'asistente', contenido: (_c = respuesta.texto) !== null && _c !== void 0 ? _c : '' });
                            mensajes.push({
                                rol: 'usuario',
                                contenido: 'Entrega esa misma respuesta llamando a la herramienta "responder".'
                            });
                            return [3 /*break*/, 9];
                        }
                        return [2 /*return*/, {
                                titular: ((_d = respuesta.texto) !== null && _d !== void 0 ? _d : '').trim() || 'No pude responder eso.',
                                lectura: '',
                                bloques: [],
                                seguimiento: [],
                                links: extraerLinks(resultados),
                                uso: uso
                            }];
                    }
                    // Guardamos lo que pidio el modelo antes de devolverle los resultados.
                    mensajes.push({
                        rol: 'asistente',
                        contenido: (_e = respuesta.texto) !== null && _e !== void 0 ? _e : '',
                        llamadas: respuesta.llamadas
                    });
                    _i = 0, _f = respuesta.llamadas;
                    _j.label = 3;
                case 3:
                    if (!(_i < _f.length)) return [3 /*break*/, 9];
                    llamada = _f[_i];
                    alProgreso === null || alProgreso === void 0 ? void 0 : alProgreso(descripcionDePaso(llamada.nombre));
                    contenido = void 0;
                    _j.label = 4;
                case 4:
                    _j.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, herramientas_1.ejecutarHerramienta)(llamada.nombre, llamada.argumentos, ctx)];
                case 5:
                    resultado = _j.sent();
                    resultados.push(resultado);
                    _g = separarBloques(resultado), paraModelo = _g.paraModelo, bloques = _g.bloques;
                    for (_h = 0, bloques_1 = bloques; _h < bloques_1.length; _h++) {
                        b = bloques_1[_h];
                        catalogoBloques.set(b.id, b);
                    }
                    contenido = JSON.stringify(paraModelo);
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _j.sent();
                    // El modelo ve un mensaje saneado, nunca el error crudo: ahi viajan
                    // nombres de tabla, SQL y stack (PLAN_ASISTENTE_IA.md, 6.1 punto 5).
                    contenido = JSON.stringify({
                        error: (0, errores_1.mensajeError)(error_1, "ejecutar ".concat(llamada.nombre))
                    });
                    return [3 /*break*/, 7];
                case 7:
                    mensajes.push({ rol: 'herramienta', contenido: contenido, idLlamada: llamada.id });
                    _j.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    vuelta++;
                    return [3 /*break*/, 1];
                case 10: 
                // Se agoto el tope de vueltas sin respuesta final.
                return [2 /*return*/, {
                        titular: 'No pude cerrar la respuesta con los datos que consulte.',
                        lectura: 'Prueba con una pregunta mas concreta, por ejemplo acotando el local o las fechas.',
                        bloques: [],
                        seguimiento: [],
                        links: extraerLinks(resultados),
                        uso: uso
                    }];
            }
        });
    });
}
exports.responder = responder;
