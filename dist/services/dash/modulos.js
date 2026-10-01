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
exports.__esModule = true;
exports.consultarModulo = exports.MODULOS = void 0;
var client_1 = require("@prisma/client");
var dash_util_1 = require("../dash.util");
var utils_1 = require("../../utils/utils");
var errores_1 = require("./errores");
var prisma = new client_1.PrismaClient();
exports.MODULOS = {
    clientes: {
        procedimiento: 'procedure_module_dash_clientes',
        normalizador: dash_util_1.normalizeResponseDashClientes,
        tipos: ['resumen', 'listado', 'segmentacion', 'creditos_pendientes']
    },
    compras: {
        procedimiento: 'procedure_module_dash_compras',
        normalizador: dash_util_1.normalizeResponseDashCompras,
        tipos: [
            'resumen',
            'listado',
            'listado_proveedores',
            'top_productos',
            'evolucion_diaria',
            'detalle_compra',
            'proveedores_activos'
        ]
    },
    usuarios: {
        procedimiento: 'procedure_module_dash_usuarios',
        normalizador: dash_util_1.normalizeResponseDashUsuarios,
        tipos: [
            'resumen',
            'usuarios_caja',
            'usuarios_meseros',
            'distribucion_roles',
            'top_vendedores_caja',
            'top_meseros',
            'evolucion_diaria_caja',
            'evolucion_diaria_meseros',
            'comparativa_usuarios',
            'bajo_rendimiento',
            'listado_completo'
        ]
    },
    puntoEquilibrio: {
        procedimiento: 'module_dash_punto_equilibrio',
        normalizador: dash_util_1.normalizeResponseDashPuntoEquilibrio,
        tipos: [
            'resumen',
            'evolucion_mensual',
            'resumen_categorias',
            'detalle_gastos_fijos',
            'detalle_gastos_variables',
            'ingresos_diarios'
        ]
    },
    promociones: {
        procedimiento: 'procedure_dash_promociones_cupones',
        normalizador: dash_util_1.normalizeResponseDashPromocionesCupones,
        tipos: ['cupones', 'promociones', 'promociones_detalle', 'descuentos', 'all']
    }
};
function exigirEnteroPositivo(valor, campo) {
    var n = Number(valor);
    if (!Number.isInteger(n) || n <= 0)
        throw new errores_1.ErrorValidacion("".concat(campo, " invalido"));
    return n;
}
function exigirFechaISO(valor, campo) {
    var f = String(valor !== null && valor !== void 0 ? valor : '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new errores_1.ErrorValidacion("".concat(campo, " debe tener formato YYYY-MM-DD"));
    }
    return f;
}
function consultarModulo(modulo, idsede, tipoConsulta, desde, hasta) {
    return __awaiter(this, void 0, void 0, function () {
        var def, sede, fechas, inicio, fin, resultados;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    def = exports.MODULOS[modulo];
                    sede = exigirEnteroPositivo(idsede, 'idsede');
                    // Lista blanca: el tipo entra concatenado al SQL.
                    if (!def.tipos.includes(tipoConsulta)) {
                        throw new errores_1.ErrorValidacion("tipo_consulta invalido para ".concat(modulo, ": ").concat(tipoConsulta));
                    }
                    fechas = (0, utils_1.limitarRangoFechasDashboard)(desde, hasta);
                    inicio = exigirFechaISO(fechas.fecha_inicio, 'desde');
                    fin = exigirFechaISO(fechas.fecha_fin, 'hasta');
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.$executeRawUnsafe("SET @xidsede = ".concat(sede))];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @tipo_consulta = '".concat(tipoConsulta, "'"))];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @fecha_inicio = '".concat(inicio, "'"))];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, tx.$executeRawUnsafe("SET @fecha_fin = '".concat(fin, "'"))];
                                    case 4:
                                        _a.sent();
                                        return [2 /*return*/, tx.$queryRawUnsafe("CALL ".concat(def.procedimiento, "(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)"))];
                                }
                            });
                        }); })];
                case 1:
                    resultados = _a.sent();
                    return [2 /*return*/, def.normalizador(resultados, tipoConsulta)];
            }
        });
    });
}
exports.consultarModulo = consultarModulo;
