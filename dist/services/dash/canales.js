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
exports.canalPorDia = exports.ventasPorCanal = void 0;
var client_1 = require("@prisma/client");
var agregados_1 = require("./agregados");
var prisma = new client_1.PrismaClient();
function listaSedes(idsedes) {
    return idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; }).join(',');
}
function ventasPorCanal(idsedes, desde, hasta) {
    return __awaiter(this, void 0, void 0, function () {
        var sedes, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sedes = listaSedes(idsedes);
                    if (!sedes)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT COALESCE(tc.descripcion, 'SIN CANAL') canal,\n                COUNT(*) ventas,\n                COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) total\n         FROM registro_pago rp\n         LEFT JOIN tipo_consumo tc ON tc.idtipo_consumo = rp.idtipo_consumo\n         WHERE rp.idsede IN (".concat(sedes, ") AND rp.estado = 0\n           AND rp.fecha_hora >= '").concat(desde, " 00:00:00'\n           AND rp.fecha_hora <= '").concat(hasta, " 23:59:59'\n         GROUP BY canal\n         ORDER BY total DESC"))];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, (filas !== null && filas !== void 0 ? filas : []).map(function (f) {
                            var ventas = Number(f.ventas) || 0;
                            var total = (0, agregados_1.redondear)(Number(f.total) || 0);
                            return {
                                canal: String(f.canal),
                                ventas: ventas,
                                total: total,
                                ticketPromedio: ventas ? (0, agregados_1.redondear)(total / ventas) : 0
                            };
                        })];
            }
        });
    });
}
exports.ventasPorCanal = ventasPorCanal;
/** Serie diaria de un canal, para ver si crece o se cae. */
function canalPorDia(idsedes, canal, desde, hasta) {
    return __awaiter(this, void 0, void 0, function () {
        var sedes, seguro, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sedes = listaSedes(idsedes);
                    if (!sedes)
                        return [2 /*return*/, []];
                    seguro = canal.replace(/['\\]/g, '');
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT DATE_FORMAT(rp.fecha_hora, '%Y-%m-%d') fecha,\n                COUNT(*) transacciones,\n                COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) total\n         FROM registro_pago rp\n         LEFT JOIN tipo_consumo tc ON tc.idtipo_consumo = rp.idtipo_consumo\n         WHERE rp.idsede IN (".concat(sedes, ") AND rp.estado = 0\n           AND COALESCE(tc.descripcion, 'SIN CANAL') = '").concat(seguro, "'\n           AND rp.fecha_hora >= '").concat(desde, " 00:00:00'\n           AND rp.fecha_hora <= '").concat(hasta, " 23:59:59'\n         GROUP BY fecha\n         ORDER BY fecha"))];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, (filas !== null && filas !== void 0 ? filas : []).map(function (f) { return ({
                            fecha: String(f.fecha),
                            total: (0, agregados_1.redondear)(Number(f.total) || 0),
                            transacciones: Number(f.transacciones) || 0
                        }); })];
            }
        });
    });
}
exports.canalPorDia = canalPorDia;
