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
exports.compararLocales = exports.metaVentaDiaria = exports.ventasDetalle = exports.ventasTotal = void 0;
var client_1 = require("@prisma/client");
var dash_util_1 = require("../dash.util");
var utils_1 = require("../../utils/utils");
var errores_1 = require("./errores");
var prisma = new client_1.PrismaClient();
/**
 * Las consultas se arman concatenando (`$executeRawUnsafe`), asi que todo id que
 * entre aqui se valida como entero antes de tocar el SQL. Es la unica barrera:
 * el asistente IA recibe parametros propuestos por un modelo.
 */
function exigirEnteroPositivo(valor, campo) {
    var n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) {
        throw new errores_1.ErrorValidacion("".concat(campo, " invalido"));
    }
    return n;
}
function exigirListaDeEnteros(valores, campo) {
    if (!Array.isArray(valores) || valores.length === 0) {
        throw new errores_1.ErrorValidacion("".concat(campo, " debe ser un array con al menos un elemento"));
    }
    return valores.map(function (v, i) { return exigirEnteroPositivo(v, "".concat(campo, "[").concat(i, "]")); });
}
var PERIODOS_VALIDOS = ['hoy', 'dia', 'semana', 'mes', 'rango'];
function exigirPeriodo(valor) {
    var p = String(valor !== null && valor !== void 0 ? valor : 'dia');
    if (!PERIODOS_VALIDOS.includes(p)) {
        throw new errores_1.ErrorValidacion('periodo invalido');
    }
    return p;
}
/** Solo YYYY-MM-DD. Cualquier otra cosa no entra al SQL. */
function exigirFechaISO(valor, campo) {
    var f = String(valor !== null && valor !== void 0 ? valor : '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new errores_1.ErrorValidacion("".concat(campo, " debe tener formato YYYY-MM-DD"));
    }
    return f;
}
/**
 * El JSON de params viaja dentro de comillas simples en el SQL. Un apostrofo en
 * cualquier valor rompe la cadena y deja escribir SQL arbitrario, asi que se
 * escapan barra y comilla antes de concatenar.
 */
function jsonParaSql(params) {
    return JSON.stringify(params)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}
/** Total de ventas del periodo. Equivale a POST /dash-ventas/total */
function ventasTotal(idsede, params) {
    return __awaiter(this, void 0, void 0, function () {
        var sede, ssql, rpt, sqlExec, rptExec;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sede = exigirEnteroPositivo(idsede, 'idsede');
                    ssql = "CALL procedure_module_dash_ventas(".concat(sede, ", '").concat(jsonParaSql(params), "')");
                    return [4 /*yield*/, prisma.$queryRawUnsafe(ssql)];
                case 1:
                    rpt = _a.sent();
                    sqlExec = rpt[0].f0;
                    return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
                case 2:
                    rptExec = _a.sent();
                    return [2 /*return*/, (0, dash_util_1.normalizeResponseDashVentasTotal)(rptExec)];
            }
        });
    });
}
exports.ventasTotal = ventasTotal;
/** Detalle de ventas del periodo. Equivale a POST /dash-ventas/ventas-detalle */
function ventasDetalle(idsede, params) {
    return __awaiter(this, void 0, void 0, function () {
        var sede, ventas;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sede = exigirEnteroPositivo(idsede, 'idsede');
                    if (!params || !params.periodo) {
                        throw new errores_1.ErrorValidacion('Se requiere params.periodo');
                    }
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.$executeRawUnsafe("SET @xidsede = ".concat(sede))];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @periodo_params = '".concat(jsonParaSql(params), "'"))];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/, tx.$queryRawUnsafe("CALL procedure_module_dash_pedidos_ventas(@xidsede, @periodo_params)")];
                                }
                            });
                        }); })];
                case 1:
                    ventas = _a.sent();
                    return [2 /*return*/, (0, dash_util_1.normalizeResponseDash)(ventas)];
            }
        });
    });
}
exports.ventasDetalle = ventasDetalle;
/** Meta de venta diaria de la sede. Equivale a POST /dash-ventas/meta-venta */
function metaVentaDiaria(idsede) {
    return __awaiter(this, void 0, void 0, function () {
        var sede, rpt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sede = exigirEnteroPositivo(idsede, 'idsede');
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["select diaria from sede_meta where idsede = ", " and estado = '0'"], ["select diaria from sede_meta where idsede = ", " and estado = '0'"])), sede)];
                case 1:
                    rpt = _a.sent();
                    return [2 /*return*/, rpt[0] ? rpt[0].diaria : 0];
            }
        });
    });
}
exports.metaVentaDiaria = metaVentaDiaria;
/** Comparativa entre locales. Equivale a POST /dash-ventas/comparar-locales */
function compararLocales(sedes, params) {
    return __awaiter(this, void 0, void 0, function () {
        var listaSedes, tipoConsulta, fechas, fechaInicio, fechaFin, result;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    listaSedes = exigirListaDeEnteros(sedes, 'sedes');
                    tipoConsulta = exigirPeriodo(params === null || params === void 0 ? void 0 : params.periodo);
                    fechas = (0, utils_1.limitarRangoFechasDashboard)((params === null || params === void 0 ? void 0 : params.rango_start_date) || '', (params === null || params === void 0 ? void 0 : params.rango_end_date) || '');
                    fechaInicio = exigirFechaISO(fechas.fecha_inicio, 'rango_start_date');
                    fechaFin = exigirFechaISO(fechas.fecha_fin, 'rango_end_date');
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.$executeRawUnsafe("SET @sedes_json = '".concat(JSON.stringify(listaSedes), "'"))];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @tipo_consulta = '".concat(tipoConsulta, "'"))];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @fecha_inicio = '".concat(fechaInicio, "'"))];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @fecha_fin = '".concat(fechaFin, "'"))];
                                    case 4:
                                        _a.sent();
                                        return [2 /*return*/, tx.$queryRawUnsafe("CALL procedure_dash_comparar_locales(@sedes_json, @tipo_consulta, @fecha_inicio, @fecha_fin)")];
                                }
                            });
                        }); })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, (0, dash_util_1.normalizeResponseCompararLocales)(result)];
            }
        });
    });
}
exports.compararLocales = compararLocales;
var templateObject_1;
