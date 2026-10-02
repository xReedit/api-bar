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
exports.totalRepartidores = exports.repartidoresDeSede = void 0;
var client_1 = require("@prisma/client");
var agregados_1 = require("./agregados");
var prisma = new client_1.PrismaClient();
function listaSedes(idsedes) {
    return idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; }).join(',');
}
function repartidoresDeSede(idsedes, desde, hasta) {
    return __awaiter(this, void 0, void 0, function () {
        var sedes, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sedes = listaSedes(idsedes);
                    if (!sedes)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT TRIM(CONCAT(r.nombre, ' ', COALESCE(r.apellido, ''))) nombre,\n                COUNT(e.idrepartidor_pedido_entregado) entregas,\n                MAX(DATE_FORMAT(e.fecha, '%Y-%m-%d')) ultima,\n                r.online,\n                AVG(NULLIF(c.calificacion, 0)) nota,\n                COUNT(DISTINCT c.idrepartidor_calificacion) calificaciones\n         FROM repartidor r\n         INNER JOIN repartidor_pedido_entregado e\n                 ON e.idrepartidor = r.idrepartidor\n                AND e.idsede IN (".concat(sedes, ")\n                AND e.fecha >= '").concat(desde, " 00:00:00'\n                AND e.fecha <= '").concat(hasta, " 23:59:59'\n         LEFT JOIN repartidor_calificacion c ON c.idrepartidor = r.idrepartidor\n         GROUP BY r.idrepartidor, nombre, r.online\n         ORDER BY entregas DESC"))];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, (filas !== null && filas !== void 0 ? filas : []).map(function (f) { return ({
                            nombre: String(f.nombre || 'SIN NOMBRE'),
                            entregas: Number(f.entregas) || 0,
                            calificacion: f.nota === null ? null : (0, agregados_1.redondear)(Number(f.nota)),
                            calificaciones: Number(f.calificaciones) || 0,
                            online: Number(f.online) === 1,
                            ultimaEntrega: f.ultima ? String(f.ultima) : null
                        }); })];
            }
        });
    });
}
exports.repartidoresDeSede = repartidoresDeSede;
/** Cuantos hay dados de alta, aunque no hayan repartido en el periodo. */
function totalRepartidores() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var filas, f;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT COUNT(*) registrados, SUM(online = 1) conectados FROM repartidor")];
                case 1:
                    filas = _b.sent();
                    f = (_a = filas === null || filas === void 0 ? void 0 : filas[0]) !== null && _a !== void 0 ? _a : {};
                    return [2 /*return*/, {
                            registrados: Number(f.registrados) || 0,
                            conectados: Number(f.conectados) || 0
                        }];
            }
        });
    });
}
exports.totalRepartidores = totalRepartidores;
