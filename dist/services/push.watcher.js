"use strict";
/**
 * push.watcher.ts
 *
 * Watcher periódico que detecta los 3 eventos de negocio y dispara Web Push:
 *  - Stock crítico / sin stock
 *  - Meta del día alcanzada
 *  - Anulación de venta grande
 *
 * Las apps que descuentan stock o anulan ventas son externas a este backend
 * (escriben directo a MySQL), así que hacemos polling.
 *
 * Para activarlo, importar y llamar `startPushWatcher()` desde app.ts.
 * Solo arranca si en .env está PUSH_WATCHER_ENABLED=true.
 */
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
var _a;
exports.__esModule = true;
exports.dispararCierreDia = exports.startPushWatcher = void 0;
var client_1 = require("@prisma/client");
var dotenv_1 = __importDefault(require("dotenv"));
var push_sender_1 = require("./push.sender");
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
// =============================================================================
// Config
// =============================================================================
var INTERVAL_ANULACIONES_MS = 60000; // cada 1 minuto
var INTERVAL_STOCK_MS = 5 * 60000; // cada 5 minutos
var INTERVAL_META_MS = 15 * 60000; // cada 15 minutos
var UMBRAL_ANULACION = Number((_a = process.env.PUSH_UMBRAL_ANULACION) !== null && _a !== void 0 ? _a : 200);
// Cursor en memoria: último idregistro_pago procesado por sede para anulaciones
var cursorAnulacionPorSede = new Map();
// =============================================================================
// API pública
// =============================================================================
function startPushWatcher() {
    if (process.env.PUSH_WATCHER_ENABLED !== 'true') {
        console.log('[push-watcher] Deshabilitado (PUSH_WATCHER_ENABLED != true)');
        return;
    }
    console.log('[push-watcher] Iniciado');
    // Ejecutar una vez al arrancar y luego cada N ms
    void runAnulaciones();
    void runStock();
    void runMeta();
    setInterval(function () { return void runAnulaciones(); }, INTERVAL_ANULACIONES_MS);
    setInterval(function () { return void runStock(); }, INTERVAL_STOCK_MS);
    setInterval(function () { return void runMeta(); }, INTERVAL_META_MS);
}
exports.startPushWatcher = startPushWatcher;
// =============================================================================
// 1) ANULACIONES GRANDES
// =============================================================================
function runAnulaciones() {
    return __awaiter(this, void 0, void 0, function () {
        var rows, _i, rows_1, row, enviar, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT rp.idregistro_pago, rp.idsede, CAST(rp.total AS DECIMAL(10,2)) AS total,\n                    rp.motivo_anular, rp.idusuario_permiso,\n                    u.nombres AS nom_usuario\n             FROM registro_pago rp\n             LEFT JOIN usuario u ON u.idusuario = rp.idusuario_permiso\n             WHERE rp.estado != 0\n               AND CAST(rp.total AS DECIMAL(10,2)) >= ?\n               AND DATE(rp.fecha_hora) = CURDATE()", UMBRAL_ANULACION)];
                case 1:
                    rows = _a.sent();
                    _i = 0, rows_1 = rows;
                    _a.label = 2;
                case 2:
                    if (!(_i < rows_1.length)) return [3 /*break*/, 6];
                    row = rows_1[_i];
                    return [4 /*yield*/, (0, push_sender_1.shouldSendOncePerDay)(row.idsede, "anulacion-".concat(row.idregistro_pago), new Date().toISOString().slice(0, 10))];
                case 3:
                    enviar = _a.sent();
                    if (!enviar)
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, push_sender_1.notifyAnulacionGrande)(row.idsede, Number(row.total), row.nom_usuario || 'Usuario', row.motivo_anular || '', row.idregistro_pago, UMBRAL_ANULACION)];
                case 4:
                    _a.sent();
                    cursorAnulacionPorSede.set(row.idsede, row.idregistro_pago);
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [3 /*break*/, 8];
                case 7:
                    err_1 = _a.sent();
                    console.error('[push-watcher] runAnulaciones error:', err_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// 2) STOCK CRÍTICO / SIN STOCK
// =============================================================================
function runStock() {
    return __awaiter(this, void 0, void 0, function () {
        var rows, fecha, _i, rows_2, row, enviar, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT p.idsede, p.idproducto, p.descripcion,\n                    CAST(ps.stock AS DECIMAL(10,2)) AS stock,\n                    CAST(p.stock_minimo AS DECIMAL(10,2)) AS stock_minimo\n             FROM producto p\n             INNER JOIN producto_stock ps ON p.idproducto = ps.idproducto\n             WHERE p.estado = 0\n               AND (\n                   CAST(ps.stock AS DECIMAL(10,2)) = 0\n                   OR CAST(ps.stock AS DECIMAL(10,2)) <= CAST(p.stock_minimo AS DECIMAL(10,2)) * 0.5\n               )\n               AND CAST(p.stock_minimo AS DECIMAL(10,2)) > 0")];
                case 1:
                    rows = _a.sent();
                    fecha = new Date().toISOString().slice(0, 10);
                    _i = 0, rows_2 = rows;
                    _a.label = 2;
                case 2:
                    if (!(_i < rows_2.length)) return [3 /*break*/, 6];
                    row = rows_2[_i];
                    return [4 /*yield*/, (0, push_sender_1.shouldSendOncePerDay)(row.idsede, "stock-".concat(row.idproducto), fecha)];
                case 3:
                    enviar = _a.sent();
                    if (!enviar)
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, push_sender_1.notifyStockAlert)(row.idsede, {
                            idproducto: row.idproducto,
                            descripcion: row.descripcion,
                            stock: Number(row.stock),
                            stock_minimo: Number(row.stock_minimo)
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [3 /*break*/, 8];
                case 7:
                    err_2 = _a.sent();
                    console.error('[push-watcher] runStock error:', err_2);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// 3) META DEL DÍA
// =============================================================================
function runMeta() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var sedes, fecha, _i, sedes_1, s, ventas, totalHoy, meta, err_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT sm.idsede, CAST(sm.diaria AS DECIMAL(10,2)) AS meta\n             FROM sede_meta sm\n             WHERE sm.estado = '0' AND CAST(sm.diaria AS DECIMAL(10,2)) > 0")];
                case 1:
                    sedes = _c.sent();
                    fecha = new Date().toISOString().slice(0, 10);
                    _i = 0, sedes_1 = sedes;
                    _c.label = 2;
                case 2:
                    if (!(_i < sedes_1.length)) return [3 /*break*/, 6];
                    s = sedes_1[_i];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) AS total\n                 FROM registro_pago rp\n                 WHERE rp.idsede = ?\n                   AND rp.estado = 0\n                   AND DATE(rp.fecha_hora) = CURDATE()", s.idsede)];
                case 3:
                    ventas = _c.sent();
                    totalHoy = Number((_b = (_a = ventas[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0);
                    meta = Number(s.meta);
                    if (!(meta > 0 && totalHoy >= meta)) return [3 /*break*/, 5];
                    // notifyMetaAlcanzada usa shouldSendOncePerDay internamente
                    return [4 /*yield*/, (0, push_sender_1.notifyMetaAlcanzada)(s.idsede, totalHoy, meta, fecha)];
                case 4:
                    // notifyMetaAlcanzada usa shouldSendOncePerDay internamente
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [3 /*break*/, 8];
                case 7:
                    err_3 = _c.sent();
                    console.error('[push-watcher] runMeta error:', err_3);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// 4) CIERRE DEL DÍA (función expuesta — invocar desde cron externo o endpoint)
// =============================================================================
/**
 * Llamar UNA vez al cierre del día (ej. cron a las 23:55 o desde un endpoint).
 * Envía push de "Cierre del día" a cada sede con el resumen vs meta.
 */
function dispararCierreDia(fechaISO) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var fecha, sedes, _i, sedes_2, s, ventas, totalHoy, meta;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    fecha = fechaISO !== null && fechaISO !== void 0 ? fechaISO : new Date().toISOString().slice(0, 10);
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT sm.idsede, CAST(sm.diaria AS DECIMAL(10,2)) AS meta\n         FROM sede_meta sm\n         WHERE sm.estado = '0'")];
                case 1:
                    sedes = _c.sent();
                    _i = 0, sedes_2 = sedes;
                    _c.label = 2;
                case 2:
                    if (!(_i < sedes_2.length)) return [3 /*break*/, 6];
                    s = sedes_2[_i];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) AS total\n             FROM registro_pago rp\n             WHERE rp.idsede = ?\n               AND rp.estado = 0\n               AND DATE(rp.fecha_hora) = ?", s.idsede, fecha)];
                case 3:
                    ventas = _c.sent();
                    totalHoy = Number((_b = (_a = ventas[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0);
                    meta = Number(s.meta);
                    return [4 /*yield*/, (0, push_sender_1.notifyCierreDia)(s.idsede, totalHoy, meta, fecha)];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.dispararCierreDia = dispararCierreDia;
