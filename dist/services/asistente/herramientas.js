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
exports.ejecutarHerramienta = exports.DEFINICIONES = exports.HERRAMIENTAS = exports.MAX_DIAS = void 0;
var dashVentas = __importStar(require("../dash/ventas"));
var dashProductos = __importStar(require("../dash/productos"));
var agregados_1 = require("../dash/agregados");
var errores_1 = require("../dash/errores");
var sedes_1 = require("./sedes");
var clima_1 = require("./clima");
var metas_1 = require("../dash/metas");
var alertas_1 = require("../dash/alertas");
var horarios_1 = require("../dash/horarios");
var modulos_1 = require("../dash/modulos");
var encuestasDash = __importStar(require("../encuesta.dash.service"));
var reglas_1 = require("./reglas");
var bloques_1 = require("./bloques");
/** Esquema comun del selector de sedes. */
var PARAM_SEDES = {
    oneOf: [
        { type: 'array', items: { type: 'integer' }, description: 'ids de sede' },
        { type: 'string', "enum": ['todas'] }
    ],
    description: 'Sedes a consultar. Omitir para usar la que el usuario tiene en pantalla. ' +
        '"todas" para el conjunto completo del usuario.'
};
/** Tope de dias que puede pedir el modelo en una sola consulta. */
exports.MAX_DIAS = 120;
var ES_ISO = /^\d{4}-\d{2}-\d{2}$/;
function diasEntre(desde, hasta) {
    var a = new Date(desde + 'T00:00:00Z').getTime();
    var b = new Date(hasta + 'T00:00:00Z').getTime();
    return Math.round((b - a) / 86400000) + 1;
}
/**
 * Periodo efectivo de una herramienta.
 *
 * Por defecto el de la pantalla. El modelo puede pedir otro ("los ultimos 90
 * dias", "agosto"), pero acotado: un rango enorme son miles de filas por sede y
 * una respuesta que tarda mas de lo que nadie espera en un chat.
 */
function periodoDe(args, ctx) {
    var desde = args.desde === undefined ? ctx.desde : String(args.desde);
    var hasta = args.hasta === undefined ? ctx.hasta : String(args.hasta);
    if (!ES_ISO.test(desde) || !ES_ISO.test(hasta)) {
        throw new errores_1.ErrorValidacion('desde y hasta deben tener formato YYYY-MM-DD');
    }
    if (hasta < desde) {
        throw new errores_1.ErrorValidacion('hasta no puede ser anterior a desde');
    }
    var dias = diasEntre(desde, hasta);
    if (dias > exports.MAX_DIAS) {
        throw new errores_1.ErrorValidacion("El rango no puede pasar de ".concat(exports.MAX_DIAS, " dias (pediste ").concat(dias, "). Acota las fechas."));
    }
    return { desde: desde, hasta: hasta, dias: dias };
}
var PARAM_FECHAS = {
    desde: {
        type: 'string',
        description: "Inicio YYYY-MM-DD. Omitir para usar el de pantalla. Maximo ".concat(exports.MAX_DIAS, " dias.")
    },
    hasta: { type: 'string', description: 'Fin YYYY-MM-DD. Omitir para usar el de pantalla.' }
};
/**
 * Como se dibuja el resultado lo decide el MODELO, no el servidor.
 *
 * El servidor solo declara que vistas admiten los datos de cada herramienta: no
 * tiene sentido ofrecer un mapa de calor a una lista de platos. Dentro de ese
 * conjunto elige quien entiende la pregunta, que es el modelo: "como van las
 * ventas" pide una serie, "que dia conviene la promo" pide el mapa, y preguntar
 * dos veces seguidas lo mismo no tiene por que verse igual.
 *
 * "auto" conserva la heuristica del servidor y es lo que pasa si no elige.
 */
function PARAM_GRAFICO(opciones, ayuda) {
    return {
        type: 'string',
        "enum": __spreadArray(['auto'], opciones, true),
        description: "Como presentar los datos. ".concat(ayuda, " \"auto\" deja que lo decida el servidor.")
    };
}
/** Devuelve la vista pedida si existe; si no, la que toque por defecto. */
function elegirVista(pedida, vistas, porDefecto) {
    var _a;
    var clave = String(pedida !== null && pedida !== void 0 ? pedida : 'auto');
    var vista = (_a = vistas[clave]) !== null && _a !== void 0 ? _a : vistas[porDefecto];
    return vista();
}
function rangoDe(periodo) {
    return {
        periodo: 'rango',
        rango_start_date: periodo.desde,
        rango_end_date: periodo.hasta
    };
}
/** Periodo inmediatamente anterior, del mismo largo, para comparar. */
function rangoAnterior(periodo) {
    var desde = new Date(periodo.desde + 'T00:00:00Z');
    var hasta = new Date(periodo.hasta + 'T00:00:00Z');
    var dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86400000) + 1);
    var finAnterior = new Date(desde.getTime() - 86400000);
    var inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * 86400000);
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    return {
        periodo: 'rango',
        rango_start_date: iso(inicioAnterior),
        rango_end_date: iso(finAnterior)
    };
}
function filasDeVentas(idsede, params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dashVentas.ventasTotal(idsede, params)];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
// ---------------------------------------------------------------- ventas_resumen
var ventasResumen = {
    definicion: {
        nombre: 'ventas_resumen',
        descripcion: 'Total vendido, numero de transacciones y ticket promedio del periodo en pantalla, ' +
            'con la variacion frente al periodo anterior del mismo largo.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, actual, previo, _i, _a, idsede, _b, _c, _d, _e, _f, _g, hoy, antes;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        actual = [];
                        previo = [];
                        _i = 0, _a = sedes.ids;
                        _h.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        idsede = _a[_i];
                        _c = (_b = actual.push).apply;
                        _d = [actual];
                        return [4 /*yield*/, filasDeVentas(idsede, rangoDe(periodo))];
                    case 2:
                        _c.apply(_b, _d.concat([(_h.sent())]));
                        _f = (_e = previo.push).apply;
                        _g = [previo];
                        return [4 /*yield*/, filasDeVentas(idsede, rangoAnterior(periodo))];
                    case 3:
                        _f.apply(_e, _g.concat([(_h.sent())]));
                        _h.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5:
                        hoy = (0, agregados_1.resumenVentas)(actual);
                        antes = (0, agregados_1.resumenVentas)(previo);
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                total: hoy.total,
                                transacciones: hoy.transacciones,
                                ticket_promedio: hoy.promedio,
                                anuladas: { total: hoy.totalAnuladas, cantidad: hoy.cantidadAnuladas },
                                vs_anterior: {
                                    total_pct: (0, agregados_1.variacionPct)(hoy.total, antes.total),
                                    transacciones_pct: (0, agregados_1.variacionPct)(hoy.transacciones, antes.transacciones),
                                    total_anterior: antes.total
                                },
                                sedes_descartadas: sedes.descartadas,
                                link: "/ventas?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: [
                                    (0, bloques_1.bloqueKpis)('kpi_ventas', "Ventas ".concat(sedes.nombres.join(', ')), [
                                        {
                                            etiqueta: 'Vendido',
                                            valor: hoy.total,
                                            delta: (0, agregados_1.variacionPct)(hoy.total, antes.total),
                                            formato: 'moneda'
                                        },
                                        {
                                            etiqueta: 'Transacciones',
                                            valor: hoy.transacciones,
                                            delta: (0, agregados_1.variacionPct)(hoy.transacciones, antes.transacciones),
                                            formato: 'entero'
                                        },
                                        { etiqueta: 'Ticket promedio', valor: hoy.promedio, formato: 'moneda' }
                                    ])
                                ]
                            }];
                }
            });
        });
    }
};
// --------------------------------------------------------------- ventas_por_dia
var MAX_PUNTOS = 60;
var ventasPorDiaHerramienta = {
    definicion: {
        nombre: 'ventas_por_dia',
        descripcion: 'Serie temporal de ventas: total y transacciones por dia, semana o mes. ' +
            'Util para ver evolucion, crecimiento, dias fuertes y caidas.',
        parametros: {
            type: 'object',
            properties: __assign(__assign({ sedes: PARAM_SEDES }, PARAM_FECHAS), { grafico: PARAM_GRAFICO(['serie', 'combo'], 'serie = linea limpia, mejor para ver la tendencia de muchos dias. ' +
                    'combo = columnas de venta con la linea de tickets encima, para ' +
                    'distinguir mucha-gente-ticket-chico de poca-gente-ticket-grande.'), agrupar_por: {
                    type: 'string',
                    "enum": ['dia', 'semana', 'mes'],
                    description: 'Como agrupar la serie. Para periodos largos o si piden ' +
                        'crecimiento por mes, usar "mes".'
                } }),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, agrupar, filas, _i, _b, idsede, _c, _d, _e, serie, recortada, metas, diaria, mensual, valorMeta, lineaMeta, tituloSerie;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        agrupar = args.agrupar_por === 'mes' || args.agrupar_por === 'semana'
                            ? args.agrupar_por
                            : 'dia';
                        filas = [];
                        _i = 0, _b = sedes.ids;
                        _f.label = 1;
                    case 1:
                        if (!(_i < _b.length)) return [3 /*break*/, 4];
                        idsede = _b[_i];
                        _d = (_c = filas.push).apply;
                        _e = [filas];
                        return [4 /*yield*/, filasDeVentas(idsede, rangoDe(periodo))];
                    case 2:
                        _d.apply(_c, _e.concat([(_f.sent())]));
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        serie = (0, agregados_1.ventasPorDia)(filas, agrupar);
                        recortada = serie.slice(-MAX_PUNTOS);
                        return [4 /*yield*/, Promise.all(sedes.ids.map(function (id) { return (0, metas_1.metaDeSede)(id); }))];
                    case 5:
                        metas = _f.sent();
                        diaria = metas.reduce(function (t, m) { var _a; return t + ((_a = m === null || m === void 0 ? void 0 : m.diaria) !== null && _a !== void 0 ? _a : 0); }, 0);
                        mensual = metas.reduce(function (t, m) { var _a; return t + ((_a = m === null || m === void 0 ? void 0 : m.mensual) !== null && _a !== void 0 ? _a : 0); }, 0);
                        valorMeta = agrupar === 'mes' ? mensual : agrupar === 'semana' ? diaria * 7 : diaria;
                        lineaMeta = valorMeta > 0
                            ? {
                                valor: (0, agregados_1.redondear)(valorMeta),
                                etiqueta: "Meta ".concat(agrupar === 'mes' ? 'mensual' : agrupar === 'semana' ? 'semanal' : 'diaria', ": S/ ").concat((0, agregados_1.redondear)(valorMeta))
                            }
                            : undefined;
                        tituloSerie = agrupar === 'mes'
                            ? 'Ventas por mes'
                            : agrupar === 'semana'
                                ? 'Ventas por semana'
                                : 'Ventas por dia';
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                serie: recortada,
                                recortada_a_ultimos: serie.length > MAX_PUNTOS ? MAX_PUNTOS : null,
                                mejor_dia: recortada.reduce(function (mx, d) { return (!mx || d.total > mx.total ? d : mx); }, null),
                                peor_dia: recortada.reduce(function (mn, d) { return (!mn || d.total < mn.total ? d : mn); }, null),
                                meta_del_tramo: (_a = lineaMeta === null || lineaMeta === void 0 ? void 0 : lineaMeta.valor) !== null && _a !== void 0 ? _a : null,
                                dias_sobre_la_meta: lineaMeta
                                    ? recortada.filter(function (d) { return d.total >= lineaMeta.valor; }).length
                                    : null,
                                link: "/ventas?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: [
                                    elegirVista(args.grafico, {
                                        serie: function () { return (0, bloques_1.bloqueSerieDiaria)('serie_dia', tituloSerie, recortada, lineaMeta); },
                                        combo: function () {
                                            return (0, bloques_1.bloqueComboVentas)('combo_dia', tituloSerie + ' y tickets', recortada, lineaMeta);
                                        },
                                        // Con muchos puntos las columnas se apelmazan y gana la serie limpia.
                                        auto: function () {
                                            return recortada.length <= 14
                                                ? (0, bloques_1.bloqueComboVentas)('combo_dia', tituloSerie + ' y tickets', recortada, lineaMeta)
                                                : (0, bloques_1.bloqueSerieDiaria)('serie_dia', tituloSerie, recortada, lineaMeta);
                                        }
                                    }, 'auto')
                                ]
                            }];
                }
            });
        });
    }
};
// --------------------------------------------------------------- locales_comparar
var localesComparar = {
    definicion: {
        nombre: 'locales_comparar',
        descripcion: 'Compara los locales del usuario en el periodo: total vendido, transacciones y ' +
            'ticket promedio por local, ordenados de mayor a menor. Usar cuando pregunten ' +
            'por varios locales, cual va mejor, o comparativas entre sedes.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            grafico: PARAM_GRAFICO(['barras', 'pendiente'], 'barras = cuanto vendio cada local en este periodo. pendiente = la ' +
                'recta del periodo anterior a este, para ver quien sube y quien baja.'),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, filas, i, idsede, actual, _b, antes, _c, totalGeneral, locales;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)((_a = args.sedes) !== null && _a !== void 0 ? _a : 'todas', ctx);
                        periodo = periodoDe(args, ctx);
                        filas = [];
                        i = 0;
                        _d.label = 1;
                    case 1:
                        if (!(i < sedes.ids.length)) return [3 /*break*/, 5];
                        idsede = sedes.ids[i];
                        _b = agregados_1.resumenVentas;
                        return [4 /*yield*/, filasDeVentas(idsede, rangoDe(periodo))];
                    case 2:
                        actual = _b.apply(void 0, [_d.sent()]);
                        _c = agregados_1.resumenVentas;
                        return [4 /*yield*/, filasDeVentas(idsede, rangoAnterior(periodo))];
                    case 3:
                        antes = _c.apply(void 0, [_d.sent()]);
                        filas.push({
                            idsede: idsede,
                            nombre: sedes.nombres[i],
                            total: actual.total,
                            total_anterior: antes.total,
                            transacciones: actual.transacciones,
                            ticket_promedio: actual.promedio,
                            vs_anterior_pct: (0, agregados_1.variacionPct)(actual.total, antes.total)
                        });
                        _d.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 1];
                    case 5:
                        filas.sort(function (a, b) { return b.total - a.total; });
                        totalGeneral = (0, agregados_1.redondear)(filas.reduce(function (s, f) { return s + f.total; }, 0));
                        locales = filas.map(function (f) { return (__assign(__assign({}, f), { participacion_pct: totalGeneral ? (0, agregados_1.redondear)((f.total / totalGeneral) * 100) : 0 })); });
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                total_general: totalGeneral,
                                locales: locales,
                                sedes_descartadas: sedes.descartadas,
                                link: "/locales?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                // El ranking siempre: ahi estan las cifras. El segundo bloque es la
                                // lectura, y esa la elige el modelo.
                                bloques: [
                                    (0, bloques_1.bloqueRankingLocales)('ranking_locales', 'Locales del periodo', locales),
                                    elegirVista(args.grafico, {
                                        barras: function () { return (0, bloques_1.bloqueBarrasLocales)('barras_locales', 'Vendido por local', locales); },
                                        pendiente: function () { return (0, bloques_1.bloquePendiente)('pendiente_locales', 'Periodo anterior contra este', 'Antes', 'Ahora', locales.map(function (l) { return ({
                                            nombre: l.nombre,
                                            antes: l.total_anterior,
                                            ahora: l.total
                                        }); })); },
                                        auto: function () {
                                            return locales.some(function (l) { return l.total_anterior > 0; })
                                                ? (0, bloques_1.bloquePendiente)('pendiente_locales', 'Periodo anterior contra este', 'Antes', 'Ahora', locales.map(function (l) { return ({
                                                    nombre: l.nombre,
                                                    antes: l.total_anterior,
                                                    ahora: l.total
                                                }); }))
                                                : (0, bloques_1.bloqueBarrasLocales)('barras_locales', 'Vendido por local', locales);
                                        }
                                    }, 'auto')
                                ]
                            }];
                }
            });
        });
    }
};
// ---------------------------------------------------------------- productos_top
var MAX_PRODUCTOS = 15;
var productosTop = {
    definicion: {
        nombre: 'productos_top',
        descripcion: 'Productos mas vendidos del periodo, de la carta o del almacen, ordenados por ' +
            'importe o por cantidad.',
        parametros: {
            type: 'object',
            properties: {
                grafico: PARAM_GRAFICO(['tabla', 'treemap', 'ambos'], 'tabla = el ranking con cantidades e importes. treemap = el area de ' +
                    'cada seccion de la carta, para ver que pesa mas sin leer numeros.'),
                sedes: PARAM_SEDES,
                origen: {
                    type: 'string',
                    "enum": ['carta', 'almacen'],
                    description: 'carta = platos; almacen = productos de bodega'
                },
                ordenar_por: { type: 'string', "enum": ['importe', 'cantidad'] },
                limite: { type: 'integer', minimum: 1, maximum: MAX_PRODUCTOS }
            },
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, origen, ordenarPor, limite, tipo, acumulado, _i, _f, idsede, filas, _g, filas_1, f, producto, acc, lista, tituloTop, secciones, _h, lista_1, p, nombre, porSeccion;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        origen = args.origen === 'almacen' ? 'almacen' : 'carta';
                        ordenarPor = args.ordenar_por === 'cantidad' ? 'cantidad' : 'importe';
                        limite = Math.min(Number(args.limite) || 10, MAX_PRODUCTOS);
                        tipo = origen === 'almacen' ? 'top_ventas_cantidad_almacen' : 'top_ventas_cantidad_carta';
                        acumulado = new Map();
                        _i = 0, _f = sedes.ids;
                        _j.label = 1;
                    case 1:
                        if (!(_i < _f.length)) return [3 /*break*/, 4];
                        idsede = _f[_i];
                        return [4 /*yield*/, dashProductos.dashProductos(idsede, {
                                tipo_consulta: tipo,
                                rango_start_date: periodo.desde,
                                rango_end_date: periodo.hasta
                            })];
                    case 2:
                        filas = (_j.sent());
                        if (!Array.isArray(filas))
                            return [3 /*break*/, 3];
                        for (_g = 0, filas_1 = filas; _g < filas_1.length; _g++) {
                            f = filas_1[_g];
                            producto = String((_a = f.producto_nombre) !== null && _a !== void 0 ? _a : 'SIN NOMBRE');
                            acc = (_b = acumulado.get(producto)) !== null && _b !== void 0 ? _b : {
                                producto: producto,
                                seccion: String((_d = (_c = f.seccion_nombre) !== null && _c !== void 0 ? _c : f.almacen_nombre) !== null && _d !== void 0 ? _d : ''),
                                cantidad: 0,
                                importe: 0
                            };
                            acc.cantidad += Number(f.cantidad_vendida) || 0;
                            acc.importe += Number(f.importe) || 0;
                            acumulado.set(producto, acc);
                        }
                        _j.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        lista = Array.from(acumulado.values())
                            .map(function (p) { return (__assign(__assign({}, p), { cantidad: (0, agregados_1.redondear)(p.cantidad), importe: (0, agregados_1.redondear)(p.importe) })); })
                            .sort(function (a, b) {
                            return ordenarPor === 'cantidad' ? b.cantidad - a.cantidad : b.importe - a.importe;
                        });
                        tituloTop = origen === 'almacen' ? 'Mas vendidos de almacen' : 'Platos mas vendidos';
                        secciones = new Map();
                        for (_h = 0, lista_1 = lista; _h < lista_1.length; _h++) {
                            p = lista_1[_h];
                            nombre = p.seccion || 'Sin seccion';
                            secciones.set(nombre, ((_e = secciones.get(nombre)) !== null && _e !== void 0 ? _e : 0) + p.importe);
                        }
                        porSeccion = Array.from(secciones.entries())
                            .map(function (_a) {
                            var nombre = _a[0], valor = _a[1];
                            return ({ nombre: nombre, valor: (0, agregados_1.redondear)(valor) });
                        })
                            .sort(function (a, b) { return b.valor - a.valor; });
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                origen: origen,
                                ordenado_por: ordenarPor,
                                total_productos: lista.length,
                                // venta BRUTA (precio de lista). El modulo Ventas muestra lo cobrado:
                                // la diferencia son descuentos y ajustes al cobrar.
                                importe_total_bruto: (0, agregados_1.redondear)(lista.reduce(function (s, p) { return s + p.importe; }, 0)),
                                top: lista.slice(0, limite),
                                link: "/productos?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                por_seccion: porSeccion,
                                bloques: elegirVista(args.grafico, {
                                    tabla: function () { return [(0, bloques_1.bloqueTablaProductos)('tabla_productos', tituloTop, lista.slice(0, limite))]; },
                                    treemap: function () { return [(0, bloques_1.bloqueTreemap)('treemap_secciones', 'Peso de cada seccion', porSeccion)]; },
                                    // La tabla responde "cuales"; el treemap responde "cuanto pesa
                                    // cada parte de la carta", que es otra pregunta.
                                    ambos: function () { return [
                                        (0, bloques_1.bloqueTablaProductos)('tabla_productos', tituloTop, lista.slice(0, limite)),
                                        (0, bloques_1.bloqueTreemap)('treemap_secciones', 'Peso de cada seccion', porSeccion)
                                    ]; },
                                    auto: function () { return __spreadArray([
                                        (0, bloques_1.bloqueTablaProductos)('tabla_productos', tituloTop, lista.slice(0, limite))
                                    ], (porSeccion.length >= 3
                                        ? [(0, bloques_1.bloqueTreemap)('treemap_secciones', 'Peso de cada seccion', porSeccion)]
                                        : []), true); }
                                }, 'auto')
                            }];
                }
            });
        });
    }
};
// ------------------------------------------------------------------------ clima
var clima = {
    definicion: {
        nombre: 'clima',
        descripcion: 'Pronostico del tiempo en la ciudad del local: temperaturas, lluvia y ' +
            'probabilidad de lluvia por dia. Util para planificar terrazas, eventos al ' +
            'aire libre, personal e insumos. Hasta 14 dias hacia adelante.',
        parametros: {
            type: 'object',
            properties: {
                sedes: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'Ids de sede. Omitir para la de pantalla.'
                },
                dias: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 14,
                    description: 'Cuantos dias hacia adelante. Por defecto 7.'
                }
            },
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var sedes, dias, porSede, i, p;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        dias = Math.min(Math.max(Number(args.dias) || 7, 1), 14);
                        porSede = [];
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < sedes.ids.length)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, clima_1.pronostico)(sedes.ids[i], dias)];
                    case 2:
                        p = _a.sent();
                        porSede.push({ sede: sedes.nombres[i], lugar: p.lugar, dias: p.dias });
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, {
                            fuente: 'Open-Meteo',
                            locales: porSede,
                            sedes_descartadas: sedes.descartadas,
                            // Solo se grafica la primera sede: varias tiras de clima no se leen.
                            bloques: porSede.length
                                ? [
                                    (0, bloques_1.bloqueClima)('clima_dias', "Pronostico ".concat(porSede[0].lugar), porSede[0].dias)
                                ]
                                : []
                        }];
                }
            });
        });
    }
};
// ------------------------------------------------------------------------ metas
var metasAvance = {
    definicion: {
        nombre: 'metas_avance',
        descripcion: 'Avance contra la meta de venta del periodo y proyeccion de cierre. Usar ' +
            'cuando pregunten si van a llegar a la meta, cuanto falta, o como cerrara ' +
            'el mes. No todas las sedes tienen meta cargada.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            grafico: PARAM_GRAFICO(['anillo', 'mancuerna', 'tabla'], 'anillo = el porcentaje grande, para un solo local. mancuerna = la ' +
                'distancia en soles entre lo vendido y la meta. tabla = las cifras ' +
                'completas con proyeccion.'),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, hoyISO, conMeta, sinMeta, i, idsede, meta, vendido, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                        conMeta = [];
                        sinMeta = [];
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < sedes.ids.length)) return [3 /*break*/, 5];
                        idsede = sedes.ids[i];
                        return [4 /*yield*/, (0, metas_1.metaDeSede)(idsede)];
                    case 2:
                        meta = _b.sent();
                        if (!meta) {
                            sinMeta.push(sedes.nombres[i]);
                            return [3 /*break*/, 4];
                        }
                        _a = agregados_1.resumenVentas;
                        return [4 /*yield*/, filasDeVentas(idsede, rangoDe(periodo))];
                    case 3:
                        vendido = _a.apply(void 0, [_b.sent()]).total;
                        conMeta.push(__assign({ nombre: sedes.nombres[i] }, (0, metas_1.avanceDeMeta)(meta, vendido, periodo.desde, periodo.hasta, hoyISO)));
                        _b.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/, {
                            periodo: { desde: periodo.desde, hasta: periodo.hasta },
                            locales: conMeta,
                            // Se informan, no se inventan: hay locales que no trabajan con objetivos.
                            sin_meta_cargada: sinMeta,
                            que_pierden_sin_meta: sinMeta.length
                                ? [
                                    'no hay porcentaje de avance ni proyeccion de cierre',
                                    'no se pueden comparar locales de distinto tamano en igualdad',
                                    'no reciben la alerta diaria de meta'
                                ]
                                : [],
                            nota_proyeccion: 'La proyeccion es una regla de tres sobre lo que va del periodo: sirve ' +
                                'para saber si vas corto o holgado, no es un pronostico fino.',
                            link: "/ventas?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                            bloques: (conMeta.length
                                ? elegirVista(args.grafico, {
                                    anillo: function () { return [(0, bloques_1.bloqueRadialMetas)('meta_anillo', 'Avance de meta', conMeta)]; },
                                    mancuerna: function () { return [
                                        (0, bloques_1.bloqueMancuernaMetas)('meta_mancuerna', 'Cuanto falta para la meta', conMeta)
                                    ]; },
                                    tabla: function () { return [(0, bloques_1.bloqueRankingMetas)('metas', 'Avance de meta', conMeta)]; },
                                    // Un local: el anillo. Pocos: la mancuerna. Muchos: la
                                    // tabla, la unica que no se satura.
                                    auto: function () {
                                        return conMeta.length === 1
                                            ? [(0, bloques_1.bloqueRadialMetas)('meta_anillo', 'Avance de meta', conMeta)]
                                            : conMeta.length <= 6
                                                ? [
                                                    (0, bloques_1.bloqueMancuernaMetas)('meta_mancuerna', 'Cuanto falta para la meta', conMeta)
                                                ]
                                                : [(0, bloques_1.bloqueRankingMetas)('metas', 'Avance de meta', conMeta)];
                                    }
                                }, 'auto')
                                : [])
                        }];
                }
            });
        });
    }
};
// ---------------------------------------------------------------------- alertas
var alertas = {
    definicion: {
        nombre: 'alertas_operativas',
        descripcion: 'Senales de alerta del periodo: items borrados de pedidos, pedidos anulados, ' +
            'ventas anuladas, descuentos y salidas de caja, comparados con el periodo ' +
            'anterior y desglosados por usuario. Usar cuando pregunten si hay algo raro, ' +
            'por alertas, por robos o descuadres, o al hacer un repaso general del negocio.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, anterior, datos, disparadas;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        anterior = rangoAnterior(periodo);
                        return [4 /*yield*/, (0, alertas_1.alertasOperativas)(sedes.ids, periodo.desde, periodo.hasta, anterior.rango_start_date, anterior.rango_end_date)];
                    case 1:
                        datos = _a.sent();
                        disparadas = datos.indicadores.filter(function (i) { return i.anomalo; }).map(function (i) { return i.clave; });
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                indicadores: datos.indicadores,
                                anomalias: disparadas,
                                quien_borra: datos.borradosPorUsuario,
                                quien_anula: datos.anuladosPorUsuario,
                                quien_saca_de_caja: datos.egresosPorUsuario,
                                motivos_de_borrado: datos.motivosFrecuentes,
                                como_leerlo: 'Borrar items, anular pedidos y sacar dinero de caja son operaciones ' +
                                    'normales. Lo que importa es que se disparen frente al periodo anterior o ' +
                                    'que se concentren en una persona. Senala donde mirar; no acuses.',
                                link: "/caja?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta)
                            }];
                }
            });
        });
    }
};
// ------------------------------------------------------------------ rentabilidad
/** Debajo de esto la dispersion son cuatro puntos sueltos: mejor la tabla. */
var MIN_PLATOS_DISPERSION = 5;
var MAX_PLATOS_MARGEN = 15;
var rentabilidadPlatos = {
    definicion: {
        nombre: 'rentabilidad_platos',
        descripcion: 'Margen y food cost por plato: precio de venta, costo, porcentaje de food ' +
            'cost y ganancia del periodo. Usar cuando pregunten por costos, margen, ' +
            'rentabilidad, que plato deja mas o cuales no son rentables.',
        parametros: {
            type: 'object',
            properties: __assign(__assign({ grafico: PARAM_GRAFICO(['tabla', 'dispersion'], 'tabla = margen, food cost y ganancia plato por plato. dispersion = ' +
                    'margen contra volumen con la linea del promedio, para decidir que ' +
                    'plato empujar.'), sedes: PARAM_SEDES }, PARAM_FECHAS), { ordenar_por: {
                    type: 'string',
                    "enum": ['ganancia', 'margen_pct', 'food_cost_pct'],
                    description: 'ganancia = plata que deja en total; margen_pct = eficiencia por ' +
                        'plato; food_cost_pct ordena de PEOR a mejor para hallar problemas.'
                }, limite: { type: 'integer', minimum: 1, maximum: MAX_PLATOS_MARGEN } }),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, orden, limite, acumulado, _i, _e, idsede, filas, _f, filas_2, f, nombre, acc, lista, sinCosto, conVolumen;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        orden = String((_a = args.ordenar_por) !== null && _a !== void 0 ? _a : 'ganancia');
                        limite = Math.min(Number(args.limite) || 10, MAX_PLATOS_MARGEN);
                        acumulado = new Map();
                        _i = 0, _e = sedes.ids;
                        _g.label = 1;
                    case 1:
                        if (!(_i < _e.length)) return [3 /*break*/, 4];
                        idsede = _e[_i];
                        return [4 /*yield*/, dashProductos.dashProductos(idsede, {
                                tipo_consulta: 'rentabilidad',
                                rango_start_date: periodo.desde,
                                rango_end_date: periodo.hasta
                            })];
                    case 2:
                        filas = (_g.sent());
                        if (!Array.isArray(filas))
                            return [3 /*break*/, 3];
                        for (_f = 0, filas_2 = filas; _f < filas_2.length; _f++) {
                            f = filas_2[_f];
                            nombre = String((_b = f.producto_nombre) !== null && _b !== void 0 ? _b : 'SIN NOMBRE');
                            acc = (_c = acumulado.get(nombre)) !== null && _c !== void 0 ? _c : {
                                plato: nombre,
                                seccion: String((_d = f.seccion) !== null && _d !== void 0 ? _d : ''),
                                precio: Number(f.precio_venta) || 0,
                                costo: Number(f.costo_producto) || 0,
                                cantidad: 0,
                                ingresos: 0
                            };
                            acc.cantidad += Number(f.cantidad_vendida) || 0;
                            acc.ingresos += Number(f.total_ingresos) || 0;
                            acumulado.set(nombre, acc);
                        }
                        _g.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        lista = Array.from(acumulado.values())
                            .map(function (p) {
                            var costoTotal = (0, agregados_1.redondear)(p.costo * p.cantidad);
                            var ganancia = (0, agregados_1.redondear)(p.ingresos - costoTotal);
                            return {
                                plato: p.plato,
                                seccion: p.seccion,
                                precio: (0, agregados_1.redondear)(p.precio),
                                costo: (0, agregados_1.redondear)(p.costo),
                                cantidad: (0, agregados_1.redondear)(p.cantidad),
                                ingresos: (0, agregados_1.redondear)(p.ingresos),
                                ganancia: ganancia,
                                margen_pct: p.ingresos ? (0, agregados_1.redondear)((ganancia / p.ingresos) * 100) : null,
                                food_cost_pct: p.precio ? (0, agregados_1.redondear)((p.costo / p.precio) * 100) : null
                            };
                        })
                            // Sin costo cargado no hay margen que calcular: se informan aparte.
                            .filter(function (p) { return p.costo > 0; });
                        sinCosto = Array.from(acumulado.values())
                            .filter(function (p) { return !p.costo; })
                            .map(function (p) { return p.plato; });
                        if (orden === 'food_cost_pct') {
                            lista.sort(function (a, b) { var _a, _b; return ((_a = b.food_cost_pct) !== null && _a !== void 0 ? _a : 0) - ((_b = a.food_cost_pct) !== null && _b !== void 0 ? _b : 0); });
                        }
                        else if (orden === 'margen_pct') {
                            lista.sort(function (a, b) { var _a, _b; return ((_a = b.margen_pct) !== null && _a !== void 0 ? _a : 0) - ((_b = a.margen_pct) !== null && _b !== void 0 ? _b : 0); });
                        }
                        else {
                            lista.sort(function (a, b) { return b.ganancia - a.ganancia; });
                        }
                        conVolumen = lista
                            .slice(0, limite)
                            .filter(function (p) { return p.cantidad > 0 && p.margen_pct !== null; });
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                ordenado_por: orden,
                                ganancia_total: (0, agregados_1.redondear)(lista.reduce(function (t, p) { return t + p.ganancia; }, 0)),
                                platos: lista.slice(0, limite),
                                // Un plato sin costo cargado no es un plato sin costo: es un dato que falta.
                                platos_sin_costo_cargado: sinCosto.slice(0, 10),
                                como_leerlo: 'El food cost es el costo de insumos sobre el precio de venta. En ' +
                                    'restaurantes se suele apuntar entre 25% y 35%: por encima, el plato ' +
                                    'deja poco; muy por debajo, puede estar caro para el mercado.',
                                link: "/productos?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: (lista.length
                                    ? elegirVista(args.grafico, {
                                        tabla: function () { return [
                                            (0, bloques_1.bloqueTablaMargen)('tabla_margen', 'Margen por plato', lista.slice(0, limite))
                                        ]; },
                                        dispersion: function () { return [
                                            (0, bloques_1.bloqueDispersionMargen)('dispersion_margen', 'Margen contra volumen', conVolumen)
                                        ]; },
                                        // Con cuatro puntos sueltos el cuadrante no dice nada.
                                        auto: function () {
                                            return conVolumen.length >= MIN_PLATOS_DISPERSION
                                                ? [
                                                    (0, bloques_1.bloqueDispersionMargen)('dispersion_margen', 'Margen contra volumen', conVolumen)
                                                ]
                                                : [
                                                    (0, bloques_1.bloqueTablaMargen)('tabla_margen', 'Margen por plato', lista.slice(0, limite))
                                                ];
                                        }
                                    }, 'auto')
                                    : [])
                            }];
                }
            });
        });
    }
};
// -------------------------------------------------------------------- horarios
var horarios = {
    definicion: {
        nombre: 'ventas_por_horario',
        descripcion: 'Reparto de las ventas por dia de la semana y por hora: cuando entra la ' +
            'plata. Usar cuando pregunten que dia o que hora se vende mas, por horas ' +
            'punta o muertas, cuanto personal poner en un turno, o a que hora conviene ' +
            'una promocion.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, mapa, porDia, porHora, _i, _c, c, ordenado;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        return [4 /*yield*/, (0, horarios_1.ventasPorHorario)(sedes.ids, periodo.desde, periodo.hasta)];
                    case 1:
                        mapa = _d.sent();
                        porDia = new Map();
                        porHora = new Map();
                        for (_i = 0, _c = mapa.celdas; _i < _c.length; _i++) {
                            c = _c[_i];
                            porDia.set(c.dia, (0, agregados_1.redondear)(((_a = porDia.get(c.dia)) !== null && _a !== void 0 ? _a : 0) + c.total));
                            porHora.set(c.hora, (0, agregados_1.redondear)(((_b = porHora.get(c.hora)) !== null && _b !== void 0 ? _b : 0) + c.total));
                        }
                        ordenado = function (m) {
                            return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
                        };
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                total_por_dia: ordenado(porDia).map(function (_a) {
                                    var dia = _a[0], total = _a[1];
                                    return ({ dia: (0, horarios_1.nombreDia)(dia), total: total });
                                }),
                                total_por_hora: ordenado(porHora)
                                    .slice(0, 6)
                                    .map(function (_a) {
                                    var hora = _a[0], total = _a[1];
                                    return ({ hora: "".concat(hora, ":00"), total: total });
                                }),
                                franja_pico: mapa.pico
                                    ? {
                                        dia: (0, horarios_1.nombreDia)(mapa.pico.dia),
                                        hora: "".concat(mapa.pico.hora, ":00"),
                                        total: mapa.pico.total
                                    }
                                    : null,
                                horario_detectado: mapa.celdas.length > 0 ? "".concat(mapa.horaMin, ":00 a ").concat(mapa.horaMax, ":59") : null,
                                como_leerlo: 'El horario sale de las ventas reales, no de un horario configurado. Una ' +
                                    'hora sin ventas puede ser que estuviera cerrado o que no entrara nadie.',
                                link: "/ventas?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: mapa.celdas.length
                                    ? [
                                        (0, bloques_1.bloqueMapaHorario)('mapa_horario', 'Cuando entra la plata', mapa, horarios_1.nombreDia)
                                    ]
                                    : []
                            }];
                }
            });
        });
    }
};
// -------------------------------------------------------------------- inventario
var inventario = {
    definicion: {
        nombre: 'inventario_alertas',
        descripcion: 'Productos con stock critico, bajo o agotado, con su valor. Usar cuando ' +
            'pregunten por inventario, stock, que falta, que hay que reponer o que ' +
            'comprar.',
        parametros: {
            type: 'object',
            properties: __assign({ sedes: PARAM_SEDES }, PARAM_FECHAS),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, productos, _i, _d, idsede, filas, _e, filas_3, f, agotados;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        productos = [];
                        _i = 0, _d = sedes.ids;
                        _f.label = 1;
                    case 1:
                        if (!(_i < _d.length)) return [3 /*break*/, 4];
                        idsede = _d[_i];
                        return [4 /*yield*/, dashProductos.dashProductos(idsede, {
                                tipo_consulta: 'inventario_alertas',
                                rango_start_date: periodo.desde,
                                rango_end_date: periodo.hasta
                            })];
                    case 2:
                        filas = (_f.sent());
                        if (!Array.isArray(filas))
                            return [3 /*break*/, 3];
                        for (_e = 0, filas_3 = filas; _e < filas_3.length; _e++) {
                            f = filas_3[_e];
                            productos.push({
                                producto: String((_a = f.producto_nombre) !== null && _a !== void 0 ? _a : ''),
                                familia: String((_b = f.producto_familia) !== null && _b !== void 0 ? _b : ''),
                                stock: Number(f.stock_actual) || 0,
                                minimo: Number(f.stock_minimo) || 0,
                                valor: (0, agregados_1.redondear)(Number(f.valor_stock) || 0),
                                nivel: String((_c = f.nivel_alerta) !== null && _c !== void 0 ? _c : ''),
                                prioridad: Number(f.prioridad) || 0
                            });
                        }
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        productos.sort(function (a, b) { return a.prioridad - b.prioridad || a.stock - b.stock; });
                        agotados = productos.filter(function (p) { return p.stock <= 0; });
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                total_alertas: productos.length,
                                agotados: agotados.length,
                                valor_en_riesgo: (0, agregados_1.redondear)(productos.reduce(function (t, p) { return t + p.valor; }, 0)),
                                productos: productos.slice(0, 15),
                                link: "/productos?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: productos.length
                                    ? [
                                        (0, bloques_1.bloqueTablaInventario)('tabla_stock', 'Stock por reponer', productos.slice(0, 15))
                                    ]
                                    : []
                            }];
                }
            });
        });
    }
};
// --------------------------------------------------- modulos genericos del dash
/**
 * Herramientas que exponen el resto del dashboard. Comparten implementacion:
 * el modelo elige el "tipo" y el servidor valida contra la lista blanca del
 * modulo, resuelve sedes y acota el periodo.
 *
 * El resultado se devuelve recortado: estos procedures pueden traer listados
 * largos y el modelo no necesita cada fila para responder.
 */
var MAX_FILAS_MODULO = 20;
function titulizarTipo(tipo) {
    var t = tipo.replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
}
function herramientaDeModulo(modulo, nombre, descripcion, enlace, descripcionCorta) {
    var tipos = modulos_1.MODULOS[modulo].tipos;
    return {
        definicion: {
            nombre: nombre,
            descripcion: descripcion,
            parametros: {
                type: 'object',
                properties: __assign(__assign({ sedes: PARAM_SEDES }, PARAM_FECHAS), { tipo: {
                        type: 'string',
                        "enum": __spreadArray([], tipos, true),
                        description: 'Que vista del modulo consultar.'
                    } }),
                required: ['tipo'],
                additionalProperties: false
            }
        },
        ejecutar: function (args, ctx) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function () {
                var sedes, periodo, tipo, porSede, i, datos, primeras, bloque;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                            periodo = periodoDe(args, ctx);
                            tipo = String((_a = args.tipo) !== null && _a !== void 0 ? _a : tipos[0]);
                            porSede = [];
                            i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(i < sedes.ids.length)) return [3 /*break*/, 4];
                            return [4 /*yield*/, (0, modulos_1.consultarModulo)(modulo, sedes.ids[i], tipo, periodo.desde, periodo.hasta)];
                        case 2:
                            datos = _c.sent();
                            porSede.push({
                                sede: sedes.nombres[i],
                                datos: Array.isArray(datos) ? datos.slice(0, MAX_FILAS_MODULO) : datos,
                                filas_totales: Array.isArray(datos) ? datos.length : undefined
                            });
                            _c.label = 3;
                        case 3:
                            i++;
                            return [3 /*break*/, 1];
                        case 4:
                            primeras = (_b = porSede[0]) === null || _b === void 0 ? void 0 : _b.datos;
                            bloque = Array.isArray(primeras)
                                ? (0, bloques_1.bloqueTablaGenerica)("tabla_".concat(nombre), "".concat(descripcionCorta, " \u00B7 ").concat(titulizarTipo(tipo)), primeras)
                                : null;
                            return [2 /*return*/, {
                                    periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                    tipo: tipo,
                                    locales: porSede,
                                    sedes_descartadas: sedes.descartadas,
                                    link: "".concat(enlace, "?desde=").concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                    bloques: bloque ? [bloque] : []
                                }];
                    }
                });
            });
        }
    };
}
var clientes = herramientaDeModulo('clientes', 'clientes_analisis', 'Clientes del local: resumen, listado, segmentacion por frecuencia y gasto, y ' +
    'creditos pendientes. Usar para preguntas sobre clientes, recurrencia, cuanto ' +
    'gastan o quien debe.', '/clientes', 'Clientes');
var compras = herramientaDeModulo('compras', 'compras_gastos', 'Compras y gastos a proveedores: resumen, listado, proveedores, productos mas ' +
    'comprados y evolucion. Usar para preguntas sobre gastos, compras, proveedores ' +
    'o en que se va la plata.', '/compras', 'Compras');
var usuariosDash = herramientaDeModulo('usuarios', 'personal_rendimiento', 'Rendimiento del personal: cajeros, meseros, top vendedores, bajo rendimiento y ' +
    'comparativa entre usuarios. Usar para preguntas sobre quien vende mas, como va ' +
    'el equipo o quien rinde poco.', '/usuarios', 'Personal');
var puntoEquilibrio = herramientaDeModulo('puntoEquilibrio', 'punto_equilibrio', 'Punto de equilibrio: gastos fijos, gastos variables, resumen por categorias y ' +
    'evolucion mensual. Usar para preguntas sobre gastos fijos, costos del local, ' +
    'cuanto hay que vender para no perder, o rentabilidad general.', '/punto-equilibrio', 'Punto de equilibrio');
var promociones = herramientaDeModulo('promociones', 'promociones_cupones', 'Promociones, cupones y descuentos aplicados: cuantos se usaron y cuanto costaron. ' +
    'Usar para preguntas sobre promociones, cupones o descuentos.', '/promociones', 'Promociones');
// --------------------------------------------------------------------- encuestas
var encuestas = {
    definicion: {
        nombre: 'encuestas_opinion',
        descripcion: 'Que opinan los clientes: NPS, satisfaccion, respuestas por canal y malas ' +
            'experiencias pendientes de atender. Usar para preguntas sobre encuestas, ' +
            'opinion de clientes, quejas, NPS o satisfaccion.',
        parametros: {
            type: 'object',
            properties: __assign(__assign({ sedes: PARAM_SEDES }, PARAM_FECHAS), { incluir_malas: {
                    type: 'boolean',
                    description: 'Trae tambien las malas experiencias pendientes de atender.'
                } }),
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, rango, porSede, i, tablero, malas, _f, k, bloques, csat, canales, tabla;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        rango = { inicio: periodo.desde, fin: periodo.hasta };
                        porSede = [];
                        i = 0;
                        _g.label = 1;
                    case 1:
                        if (!(i < sedes.ids.length)) return [3 /*break*/, 7];
                        return [4 /*yield*/, encuestasDash.tablero(sedes.ids[i], rango)];
                    case 2:
                        tablero = _g.sent();
                        if (!(args.incluir_malas === true)) return [3 /*break*/, 4];
                        return [4 /*yield*/, encuestasDash.alertas(sedes.ids[i], rango, 'pendientes')];
                    case 3:
                        _f = (_g.sent());
                        return [3 /*break*/, 5];
                    case 4:
                        _f = [];
                        _g.label = 5;
                    case 5:
                        malas = _f;
                        porSede.push({
                            sede: sedes.nombres[i],
                            kpis: (_a = tablero === null || tablero === void 0 ? void 0 : tablero.kpis) !== null && _a !== void 0 ? _a : null,
                            canales: (_b = tablero === null || tablero === void 0 ? void 0 : tablero.canales) !== null && _b !== void 0 ? _b : [],
                            hay_encuestas_activas: (_c = tablero === null || tablero === void 0 ? void 0 : tablero.hay_activas) !== null && _c !== void 0 ? _c : false,
                            // Solo lo necesario para hablar de ellas: nada de datos del cliente.
                            malas_pendientes: malas.slice(0, 8).map(function (a) { return ({
                                id: a.id,
                                fecha: a.respondido_en,
                                motivos: a.motivos,
                                comentario: a.comentario,
                                mesa: a.nummesa,
                                mozo: a.mozo
                            }); })
                        });
                        _g.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 1];
                    case 7:
                        k = (_d = porSede[0]) === null || _d === void 0 ? void 0 : _d.kpis;
                        bloques = [];
                        if (k) {
                            csat = Number(k.csat_prom) || 0;
                            bloques.push((0, bloques_1.bloqueKpis)('kpi_encuestas', "Opinion ".concat(porSede[0].sede), __spreadArray(__spreadArray([
                                { etiqueta: 'NPS', valor: Number(k.nps) || 0, formato: 'entero' }
                            ], (csat > 0
                                ? []
                                : [
                                    {
                                        etiqueta: 'Satisfaccion',
                                        valor: csat,
                                        formato: 'entero'
                                    }
                                ]), true), [
                                {
                                    etiqueta: 'Respuestas',
                                    valor: Number(k.respuestas) || 0,
                                    formato: 'entero'
                                },
                                {
                                    etiqueta: 'Malas sin atender',
                                    valor: Number(k.malas_pendientes) || 0,
                                    formato: 'entero'
                                }
                            ], false)));
                            // La satisfaccion es una nota del 1 al 5: suelta no dice si 3.8 esta
                            // bien. El medidor trae la escala puesta.
                            if (csat > 0) {
                                bloques.push((0, bloques_1.bloqueMedidor)('medidor_csat', 'Satisfaccion del cliente', 'Nota media', csat, 1, 5));
                            }
                        }
                        canales = (_e = porSede[0]) === null || _e === void 0 ? void 0 : _e.canales;
                        if (Array.isArray(canales) && canales.length > 1) {
                            tabla = (0, bloques_1.bloqueTablaGenerica)('tabla_canales', 'Por canal', canales);
                            if (tabla)
                                bloques.push(tabla);
                        }
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                locales: porSede,
                                sedes_descartadas: sedes.descartadas,
                                link: "/encuestas?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: bloques
                            }];
                }
            });
        });
    }
};
// ------------------------------------------------------- detalle de operaciones
var operacionesDetalle = {
    definicion: {
        nombre: 'operaciones_detalle',
        descripcion: 'Detalle linea por linea de pedidos anulados, ventas anuladas, items ' +
            'borrados o salidas de caja: cual fue, cuando, quien y por que motivo. ' +
            'Usar cuando pidan ver el detalle de algo que salio en las alertas, o ' +
            'preguntan "cuales fueron".',
        parametros: {
            type: 'object',
            properties: __assign(__assign({ sedes: PARAM_SEDES }, PARAM_FECHAS), { tipo: {
                    type: 'string',
                    "enum": ['pedidos_anulados', 'ventas_anuladas', 'items_borrados', 'egresos_caja'],
                    description: 'Que operaciones detallar.'
                }, limite: { type: 'integer', minimum: 1, maximum: 30 } }),
            required: ['tipo'],
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var sedes, periodo, tipo, operaciones, total;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        periodo = periodoDe(args, ctx);
                        tipo = String(args.tipo);
                        return [4 /*yield*/, (0, alertas_1.detalleOperaciones)(tipo, sedes.ids, periodo.desde, periodo.hasta, Number(args.limite) || 15)];
                    case 1:
                        operaciones = _a.sent();
                        total = operaciones.reduce(function (t, o) { return t + o.monto; }, 0);
                        return [2 /*return*/, {
                                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                                sedes: sedes.nombres,
                                tipo: tipo,
                                cantidad: operaciones.length,
                                monto_total: (0, agregados_1.redondear)(total),
                                operaciones: operaciones,
                                sin_motivo: operaciones.filter(function (o) { return !o.motivo; }).length,
                                link: "/caja?desde=".concat(periodo.desde, "&hasta=").concat(periodo.hasta),
                                bloques: operaciones.length
                                    ? [
                                        (0, bloques_1.bloqueTablaGenerica)('tabla_operaciones', titulizarTipo(tipo), operaciones.map(function (o) { return ({
                                            referencia: o.referencia,
                                            monto: o.monto
                                        }); }))
                                    ].filter(Boolean)
                                    : []
                            }];
                }
            });
        });
    }
};
// ----------------------------------------------------------------- avisos
/**
 * Lo unico del catalogo que toca una tabla propia, y aun asi no escribe: con
 * "proponer" devuelve un bloque de acciones para que el usuario confirme. Si el
 * modelo pudiera crear reglas, bastaria convencerlo por el chat.
 */
var avisos = {
    definicion: {
        nombre: 'avisos_configurar',
        descripcion: 'Alertas permanentes del tipo "avisame si...". Con accion "listar" ' +
            'devuelve las que ya existen; con "proponer" prepara una nueva para que ' +
            'el usuario la confirme con un boton. Usar cuando pidan que les avises ' +
            'de algo, que vigiles algo, o pregunten que avisos tienen activos.',
        parametros: {
            type: 'object',
            properties: {
                accion: { type: 'string', "enum": ['listar', 'proponer'] },
                sedes: PARAM_SEDES,
                tipo: {
                    type: 'string',
                    "enum": reglas_1.CATALOGO.map(function (c) { return c.tipo; }),
                    description: 'Solo para proponer. Que se vigila.'
                },
                umbral: {
                    type: 'number',
                    description: 'Solo para proponer. Porcentaje, soles o cantidad segun el tipo.'
                }
            },
            required: ['accion'],
            additionalProperties: false
        }
    },
    ejecutar: function (args, ctx) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var sedes, tipos, reglas, def, umbral, idsede, descripcion;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sedes = (0, sedes_1.resolverSedes)(args.sedes, ctx);
                        tipos = reglas_1.CATALOGO.map(function (c) { return ({
                            tipo: c.tipo,
                            descripcion: c.etiqueta,
                            unidad: c.unidad
                        }); });
                        if (!(args.accion === 'listar')) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, reglas_1.listarReglas)(sedes.ids)];
                    case 1:
                        reglas = _b.sent();
                        return [2 /*return*/, {
                                sedes: sedes.nombres,
                                cantidad: reglas.length,
                                reglas: reglas,
                                tipos_disponibles: tipos
                            }];
                    case 2:
                        def = (0, reglas_1.definicionDe)(String((_a = args.tipo) !== null && _a !== void 0 ? _a : ''));
                        umbral = Number(args.umbral);
                        if (!Number.isFinite(umbral) || umbral <= 0) {
                            throw new errores_1.ErrorValidacion('El umbral debe ser un numero mayor que cero');
                        }
                        idsede = sedes.ids[0];
                        descripcion = def.plantilla(umbral);
                        return [2 /*return*/, {
                                propuesta: { idsede: idsede, sede: sedes.nombres[0], tipo: def.tipo, umbral: umbral, descripcion: descripcion },
                                instruccion_para_ti: 'Di en una frase que vas a vigilar y que debe pulsar el boton para ' +
                                    'activarlo. No digas que ya quedo activo, porque todavia no lo esta.',
                                bloques: [
                                    {
                                        id: 'accion_aviso',
                                        tipo: 'acciones',
                                        titulo: descripcion,
                                        acciones: [
                                            {
                                                etiqueta: 'Activar aviso',
                                                operacion: 'crear_regla',
                                                datos: { idsede: idsede, tipo: def.tipo, umbral: umbral }
                                            }
                                        ]
                                    }
                                ]
                            }];
                }
            });
        });
    }
};
// ------------------------------------------------------------------- catalogo
exports.HERRAMIENTAS = [
    ventasResumen,
    ventasPorDiaHerramienta,
    horarios,
    localesComparar,
    productosTop,
    metasAvance,
    rentabilidadPlatos,
    inventario,
    alertas,
    operacionesDetalle,
    clientes,
    compras,
    usuariosDash,
    puntoEquilibrio,
    promociones,
    encuestas,
    avisos,
    clima
];
exports.DEFINICIONES = exports.HERRAMIENTAS.map(function (h) { return h.definicion; });
function ejecutarHerramienta(nombre, args, ctx) {
    return __awaiter(this, void 0, void 0, function () {
        var h;
        return __generator(this, function (_a) {
            h = exports.HERRAMIENTAS.find(function (x) { return x.definicion.nombre === nombre; });
            if (!h) {
                throw new errores_1.ErrorValidacion("Herramienta desconocida: ".concat(nombre));
            }
            return [2 /*return*/, h.ejecutar(args, ctx)];
        });
    });
}
exports.ejecutarHerramienta = ejecutarHerramienta;
