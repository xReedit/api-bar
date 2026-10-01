"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.__esModule = true;
exports.enviarResumenDiario = exports.generarResumen = void 0;
var client_1 = require("@prisma/client");
var proveedor_1 = require("./proveedor");
var herramientas_1 = require("./herramientas");
var push_sender_1 = require("../push.sender");
var reglas_1 = require("./reglas");
var prisma = new client_1.PrismaClient();
/**
 * Resumen diario que LLEGA SIN QUE PREGUNTES.
 *
 * Un chat solo sirve si te acuerdas de abrirlo. Un aviso que aparece en el
 * celular a la hora del cierre no depende de que nadie se acuerde, y es lo que
 * de verdad cambia la relacion del dueno con sus numeros.
 *
 * Reusa las mismas herramientas que el chat, asi que las cifras del push y las
 * del asistente son las mismas por construccion.
 */
var PROMPT = "Eres el gerente de un restaurante y escribes el resumen del dia para el dueno,\nque lo va a leer como notificacion en el celular.\n\nEntrega SIEMPRE el resultado llamando a la herramienta \"resumen\".\n\nReglas:\n- Lo primero es lo que se sale de lo normal. Si todo fue normal, dilo en una linea y ya.\n- Cifras redondeadas: \"S/ 2,180\", no \"S/ 2178.43\".\n- Si hay algo que exige accion hoy, va en el titulo.\n- Nada de \"segun los datos\" ni \"analisis del dia\". Hablas como una persona.\n\nEjemplos de buen cuerpo:\n\"Cerraste S/ 3,240 en 78 tickets, 12% arriba del martes. Dos cajas quedaron abiertas.\"\n\"Dia flojo: S/ 890, 40% bajo la meta. Nadie borro items ni hubo anulaciones raras.\"";
/**
 * El formato se garantiza con el esquema, no con la buena voluntad del modelo.
 * Pidiendo dos lineas de texto plano a veces devolvia una sola y el cuerpo del
 * push quedaba vacio.
 */
var HERRAMIENTA_RESUMEN = {
    nombre: 'resumen',
    descripcion: 'Entrega el resumen del dia. Llamala siempre.',
    parametros: {
        type: 'object',
        properties: {
            titulo: {
                type: 'string',
                description: 'Maximo 40 caracteres. Lo que exige atencion hoy.'
            },
            cuerpo: {
                type: 'string',
                description: 'Maximo 160 caracteres. Cifras redondeadas.'
            }
        },
        required: ['titulo', 'cuerpo'],
        additionalProperties: false
    }
};
function contextoDeSede(idsede, fecha) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var filas, sede;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT idsede, idorg, nombre FROM sede WHERE idsede = ", " LIMIT 1"], ["\n        SELECT idsede, idorg, nombre FROM sede WHERE idsede = ", " LIMIT 1"])), idsede)];
                case 1:
                    filas = _b.sent();
                    sede = filas === null || filas === void 0 ? void 0 : filas[0];
                    if (!sede)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            idusuario: 0,
                            idorg: Number(sede.idorg) || 0,
                            sedeActual: idsede,
                            // Solo su propia sede: el resumen no cruza locales.
                            sedesPermitidas: [{ idsede: idsede, nombre: String((_a = sede.nombre) !== null && _a !== void 0 ? _a : '') }],
                            desde: fecha,
                            hasta: fecha
                        }];
            }
        });
    });
}
/** Texto del resumen para una sede y fecha. Null si no hay nada que contar. */
function generarResumen(idsede, fecha) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function () {
        var ctx, _f, ventas, metas, alertas, mensajes, respuesta, args, titulo, cuerpo, texto, lineas;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, contextoDeSede(idsede, fecha)];
                case 1:
                    ctx = _g.sent();
                    if (!ctx)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, Promise.all([
                            (0, herramientas_1.ejecutarHerramienta)('ventas_resumen', {}, ctx)["catch"](function () { return null; }),
                            (0, herramientas_1.ejecutarHerramienta)('metas_avance', {}, ctx)["catch"](function () { return null; }),
                            (0, herramientas_1.ejecutarHerramienta)('alertas_operativas', {}, ctx)["catch"](function () { return null; })
                        ])];
                case 2:
                    _f = _g.sent(), ventas = _f[0], metas = _f[1], alertas = _f[2];
                    mensajes = [
                        { rol: 'sistema', contenido: PROMPT },
                        {
                            rol: 'usuario',
                            contenido: "Local: ".concat(ctx.sedesPermitidas[0].nombre, ". Fecha: ").concat(fecha, ".\n\n") +
                                "VENTAS:\n".concat(JSON.stringify(ventas), "\n\n") +
                                "METAS:\n".concat(JSON.stringify(metas), "\n\n") +
                                "ALERTAS:\n".concat(JSON.stringify(alertas))
                        }
                    ];
                    return [4 /*yield*/, (0, proveedor_1.obtenerProveedor)().chat(mensajes, [HERRAMIENTA_RESUMEN], 'resumen')];
                case 3:
                    respuesta = _g.sent();
                    args = (_a = respuesta.llamadas.find(function (l) { return l.nombre === 'resumen'; })) === null || _a === void 0 ? void 0 : _a.argumentos;
                    if (args) {
                        titulo = String((_b = args.titulo) !== null && _b !== void 0 ? _b : '').trim();
                        cuerpo = String((_c = args.cuerpo) !== null && _c !== void 0 ? _c : '').trim();
                        if (titulo && cuerpo) {
                            return [2 /*return*/, { titulo: titulo.slice(0, 60), cuerpo: cuerpo.slice(0, 200) }];
                        }
                    }
                    texto = ((_d = respuesta.texto) !== null && _d !== void 0 ? _d : '').trim();
                    if (!texto)
                        return [2 /*return*/, null];
                    lineas = texto.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                    return [2 /*return*/, {
                            titulo: ((_e = lineas[0]) !== null && _e !== void 0 ? _e : 'Resumen del dia').slice(0, 60),
                            cuerpo: (lineas.slice(1).join(' ') || lineas[0] || '').slice(0, 200)
                        }];
            }
        });
    });
}
exports.generarResumen = generarResumen;
/**
 * Avisos configurados por el usuario ("avisame si...").
 *
 * Van en un solo push aunque se disparen varios: dos notificaciones seguidas se
 * leen como spam y se desactivan. `marcarDisparada` evita repetir el mismo aviso
 * el mismo dia.
 */
function enviarAvisos(idsede, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var disparadas, titulo, _i, disparadas_1, d;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, reglas_1.evaluarSede)(idsede, fecha)];
                case 1:
                    disparadas = _a.sent();
                    if (disparadas.length === 0)
                        return [2 /*return*/, 0];
                    titulo = disparadas.length === 1
                        ? 'Aviso que pediste'
                        : "".concat(disparadas.length, " avisos que pediste");
                    return [4 /*yield*/, (0, push_sender_1.sendPushToSede)(idsede, {
                            title: titulo,
                            body: disparadas.map(function (d) { return d.mensaje; }).join(' ').slice(0, 300),
                            tag: "avisos-ia-".concat(fecha),
                            url: '/hoy'
                        })];
                case 2:
                    _a.sent();
                    _i = 0, disparadas_1 = disparadas;
                    _a.label = 3;
                case 3:
                    if (!(_i < disparadas_1.length)) return [3 /*break*/, 6];
                    d = disparadas_1[_i];
                    return [4 /*yield*/, (0, reglas_1.marcarDisparada)(d.regla.id, fecha)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/, disparadas.length];
            }
        });
    });
}
/**
 * Envia el resumen a todas las sedes activas. Pensado para un cron al cierre.
 * `shouldSendOncePerDay` evita duplicados si el cron se dispara dos veces.
 */
function enviarResumenDiario(fechaISO) {
    return __awaiter(this, void 0, void 0, function () {
        var fecha, sedes, enviados, omitidos, avisos, _i, _a, s, idsede, _b, resumen, err_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fecha = fechaISO !== null && fechaISO !== void 0 ? fechaISO : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT DISTINCT rp.idsede\n        FROM registro_pago rp\n        WHERE DATE(rp.fecha_hora) = ", " AND rp.estado = 0\n        UNION\n        SELECT DISTINCT r.idsede FROM asistente_regla_alerta r WHERE r.activa = 1"], ["\n        SELECT DISTINCT rp.idsede\n        FROM registro_pago rp\n        WHERE DATE(rp.fecha_hora) = ", " AND rp.estado = 0\n        UNION\n        SELECT DISTINCT r.idsede FROM asistente_regla_alerta r WHERE r.activa = 1"])), fecha)];
                case 1:
                    sedes = _c.sent();
                    enviados = 0;
                    omitidos = 0;
                    avisos = 0;
                    _i = 0, _a = sedes !== null && sedes !== void 0 ? sedes : [];
                    _c.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 10];
                    s = _a[_i];
                    idsede = Number(s.idsede);
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 8, , 9]);
                    _b = avisos;
                    return [4 /*yield*/, enviarAvisos(idsede, fecha)];
                case 4:
                    avisos = _b + _c.sent();
                    return [4 /*yield*/, (0, push_sender_1.shouldSendOncePerDay)(idsede, 'resumen_ia', fecha)];
                case 5:
                    if (!(_c.sent())) {
                        omitidos++;
                        return [3 /*break*/, 9];
                    }
                    return [4 /*yield*/, generarResumen(idsede, fecha)];
                case 6:
                    resumen = _c.sent();
                    if (!resumen) {
                        omitidos++;
                        return [3 /*break*/, 9];
                    }
                    return [4 /*yield*/, (0, push_sender_1.sendPushToSede)(idsede, {
                            title: resumen.titulo,
                            body: resumen.cuerpo,
                            tag: "resumen-ia-".concat(fecha),
                            url: '/hoy'
                        })];
                case 7:
                    _c.sent();
                    enviados++;
                    return [3 /*break*/, 9];
                case 8:
                    err_1 = _c.sent();
                    console.error("[resumen-ia] sede ".concat(idsede, ":"), err_1);
                    omitidos++;
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 2];
                case 10: return [2 /*return*/, { enviados: enviados, omitidos: omitidos, avisos: avisos }];
            }
        });
    });
}
exports.enviarResumenDiario = enviarResumenDiario;
var templateObject_1, templateObject_2;
