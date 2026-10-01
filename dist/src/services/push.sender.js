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
exports.notifyAnulacionGrande = exports.notifyCierreDia = exports.notifyMetaAlcanzada = exports.notifyStockAlert = exports.shouldSendOncePerDay = exports.sendPushToUser = exports.sendPushToSede = void 0;
var web_push_1 = __importDefault(require("web-push"));
var client_1 = require("@prisma/client");
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
// =============================================================================
// Configuración VAPID
// =============================================================================
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
var VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
var vapidConfigured = false;
function ensureVapidConfigured() {
    if (vapidConfigured)
        return true;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[push] VAPID keys no configuradas. Define VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en .env. ' +
            'Genera unas con: npx web-push generate-vapid-keys');
        return false;
    }
    web_push_1["default"].setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
}
// =============================================================================
// Envío
// =============================================================================
/**
 * Envía un push a todos los dispositivos suscritos de una sede.
 */
function sendPushToSede(idsede, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var subs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!ensureVapidConfigured())
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, idusuario, idsede, endpoint, p256dh_key, auth_key\n         FROM push_subscriptions\n         WHERE idsede = ? AND enabled = 1", idsede)];
                case 1:
                    subs = _a.sent();
                    return [4 /*yield*/, Promise.all(subs.map(function (s) { return deliverOne(s, payload); }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.sendPushToSede = sendPushToSede;
/**
 * Envía un push a todos los dispositivos suscritos de un usuario.
 */
function sendPushToUser(idusuario, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var subs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!ensureVapidConfigured())
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, idusuario, idsede, endpoint, p256dh_key, auth_key\n         FROM push_subscriptions\n         WHERE idusuario = ? AND enabled = 1", idusuario)];
                case 1:
                    subs = _a.sent();
                    return [4 /*yield*/, Promise.all(subs.map(function (s) { return deliverOne(s, payload); }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.sendPushToUser = sendPushToUser;
function deliverOne(sub, payload) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var subscription, err_1, msg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    subscription = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
                    };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 8]);
                    return [4 /*yield*/, web_push_1["default"].sendNotification(subscription, JSON.stringify(payload))];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 3:
                    err_1 = _b.sent();
                    if (!(err_1.statusCode === 404 || err_1.statusCode === 410)) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.$executeRawUnsafe("UPDATE push_subscriptions SET enabled = 0, last_error = ? WHERE id = ?", "gone:".concat(err_1.statusCode), sub.id)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5:
                    msg = String((_a = err_1.message) !== null && _a !== void 0 ? _a : err_1).slice(0, 250);
                    return [4 /*yield*/, prisma.$executeRawUnsafe("UPDATE push_subscriptions SET last_error = ? WHERE id = ?", msg, sub.id)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7: return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// Helpers de eventos de negocio
// =============================================================================
/**
 * Verifica que el evento no se haya enviado ya hoy para esa sede.
 * Útil para "meta alcanzada" o cualquier evento que debe disparar solo una vez al día.
 */
function shouldSendOncePerDay(idsede, evento, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma.$executeRawUnsafe("INSERT INTO push_notification_log (idsede, evento, fecha) VALUES (?, ?, ?)", idsede, evento, fecha)];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, Number(result) > 0];
                case 2:
                    _a = _b.sent();
                    // Constraint UNIQUE violada → ya se envió hoy
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.shouldSendOncePerDay = shouldSendOncePerDay;
/**
 * Notifica stock crítico o sin stock de un producto.
 */
function notifyStockAlert(idsede, producto) {
    return __awaiter(this, void 0, void 0, function () {
        var stockNum, minimoNum;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stockNum = Number(producto.stock);
                    minimoNum = Number(producto.stock_minimo);
                    if (!(stockNum === 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, sendPushToSede(idsede, {
                            title: '⚠️ Sin stock',
                            body: "".concat(producto.descripcion, " se qued\u00F3 sin stock"),
                            tag: "stock-".concat(producto.idproducto),
                            url: '/productos',
                            requireInteraction: true
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!(stockNum <= minimoNum * 0.5)) return [3 /*break*/, 4];
                    return [4 /*yield*/, sendPushToSede(idsede, {
                            title: 'Stock crítico',
                            body: "".concat(producto.descripcion, ": solo quedan ").concat(stockNum, " unidades"),
                            tag: "stock-".concat(producto.idproducto),
                            url: '/productos'
                        })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.notifyStockAlert = notifyStockAlert;
/**
 * Notifica meta del día alcanzada (una sola vez por día).
 */
function notifyMetaAlcanzada(idsede, totalVentas, meta, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var enviar;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, shouldSendOncePerDay(idsede, 'meta_alcanzada', fecha)];
                case 1:
                    enviar = _a.sent();
                    if (!enviar)
                        return [2 /*return*/];
                    return [4 /*yield*/, sendPushToSede(idsede, {
                            title: '🎯 ¡Meta alcanzada!',
                            body: "Hoy llegaste a S/ ".concat(totalVentas.toFixed(2), " (meta: S/ ").concat(meta.toFixed(2), ")"),
                            tag: "meta-alcanzada-".concat(fecha),
                            url: '/hoy'
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.notifyMetaAlcanzada = notifyMetaAlcanzada;
/**
 * Notifica el cierre del día (meta no alcanzada). Disparar desde un cron al final del día.
 */
function notifyCierreDia(idsede, totalVentas, meta, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var enviar, porcentaje;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, shouldSendOncePerDay(idsede, 'cierre_dia', fecha)];
                case 1:
                    enviar = _a.sent();
                    if (!enviar)
                        return [2 /*return*/];
                    porcentaje = meta > 0 ? ((totalVentas / meta) * 100).toFixed(1) : '0';
                    return [4 /*yield*/, sendPushToSede(idsede, {
                            title: 'Cierre del día',
                            body: "Ventas: S/ ".concat(totalVentas.toFixed(2), " de meta S/ ").concat(meta.toFixed(2), " (").concat(porcentaje, "%)"),
                            tag: "cierre-".concat(fecha),
                            url: '/hoy'
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.notifyCierreDia = notifyCierreDia;
/**
 * Notifica una anulación de venta importante.
 */
function notifyAnulacionGrande(idsede, monto, usuarioQueAnula, motivo, idregistro_pago, umbral) {
    if (umbral === void 0) { umbral = 200; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (monto < umbral)
                        return [2 /*return*/];
                    return [4 /*yield*/, sendPushToSede(idsede, {
                            title: '🚨 Anulación importante',
                            body: "".concat(usuarioQueAnula, " anul\u00F3 S/ ").concat(monto.toFixed(2)).concat(motivo ? " (".concat(motivo, ")") : ''),
                            tag: "anulacion-".concat(idregistro_pago),
                            url: '/ventas',
                            requireInteraction: true
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.notifyAnulacionGrande = notifyAnulacionGrande;
