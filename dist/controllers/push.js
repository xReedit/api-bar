"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var crypto_1 = __importDefault(require("crypto"));
var dotenv_1 = __importDefault(require("dotenv"));
var push_sender_1 = require("../services/push.sender");
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
var router = express.Router();
function hashEndpoint(endpoint) {
    return crypto_1["default"].createHash('sha256').update(endpoint).digest('hex');
}
/**
 * GET /push - healthcheck
 */
router.get('/', function (req, res) {
    res.status(200).json({ message: 'Push notifications API' });
});
/**
 * POST /push/subscribe
 * Body: {
 *   idusuario: number,
 *   idsede: number,
 *   subscription: { endpoint, keys: { p256dh, auth } },
 *   userAgent?: string
 * }
 */
router.post('/subscribe', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idusuario, idsede, subscription, userAgent, endpointHash, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                _a = req.body, idusuario = _a.idusuario, idsede = _a.idsede, subscription = _a.subscription, userAgent = _a.userAgent;
                if (!(subscription === null || subscription === void 0 ? void 0 : subscription.endpoint) ||
                    !((_b = subscription === null || subscription === void 0 ? void 0 : subscription.keys) === null || _b === void 0 ? void 0 : _b.p256dh) ||
                    !((_c = subscription === null || subscription === void 0 ? void 0 : subscription.keys) === null || _c === void 0 ? void 0 : _c.auth)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Suscripción inválida' })];
                }
                if (typeof idusuario !== 'number' || typeof idsede !== 'number') {
                    return [2 /*return*/, res.status(400).json({ error: 'idusuario e idsede son obligatorios' })];
                }
                endpointHash = hashEndpoint(subscription.endpoint);
                // Upsert manual: si existe el endpoint_hash, actualiza; si no, inserta
                return [4 /*yield*/, prisma.$executeRawUnsafe("INSERT INTO push_subscriptions\n                (idusuario, idsede, endpoint, endpoint_hash, p256dh_key, auth_key, user_agent, enabled)\n             VALUES (?, ?, ?, ?, ?, ?, ?, 1)\n             ON DUPLICATE KEY UPDATE\n                idusuario = VALUES(idusuario),\n                idsede = VALUES(idsede),\n                endpoint = VALUES(endpoint),\n                p256dh_key = VALUES(p256dh_key),\n                auth_key = VALUES(auth_key),\n                user_agent = VALUES(user_agent),\n                enabled = 1,\n                last_error = NULL", idusuario, idsede, subscription.endpoint, endpointHash, subscription.keys.p256dh, subscription.keys.auth, userAgent !== null && userAgent !== void 0 ? userAgent : null)];
            case 1:
                // Upsert manual: si existe el endpoint_hash, actualiza; si no, inserta
                _d.sent();
                res.json({ ok: true });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('Error en /push/subscribe:', error_1);
                res.status(500).json({ error: 'Error guardando suscripción' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /push/unsubscribe
 * Body: { endpoint: string }
 */
router.post('/unsubscribe', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var endpoint, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                endpoint = req.body.endpoint;
                if (!endpoint || typeof endpoint !== 'string') {
                    return [2 /*return*/, res.status(400).json({ error: 'endpoint requerido' })];
                }
                return [4 /*yield*/, prisma.$executeRawUnsafe("UPDATE push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?", hashEndpoint(endpoint))];
            case 1:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Error en /push/unsubscribe:', error_2);
                res.status(500).json({ error: 'Error desuscribiendo' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /push/resubscribe
 * Llamado por el Service Worker cuando el navegador rota la suscripción.
 * Body: { oldEndpoint: string | null, subscription: {...} }
 */
router.post('/resubscribe', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, oldEndpoint, subscription, newHash, oldHash, updated, error_3;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                _a = req.body, oldEndpoint = _a.oldEndpoint, subscription = _a.subscription;
                if (!(subscription === null || subscription === void 0 ? void 0 : subscription.endpoint) ||
                    !((_b = subscription === null || subscription === void 0 ? void 0 : subscription.keys) === null || _b === void 0 ? void 0 : _b.p256dh) ||
                    !((_c = subscription === null || subscription === void 0 ? void 0 : subscription.keys) === null || _c === void 0 ? void 0 : _c.auth)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Suscripción inválida' })];
                }
                newHash = hashEndpoint(subscription.endpoint);
                if (!oldEndpoint) return [3 /*break*/, 2];
                oldHash = hashEndpoint(oldEndpoint);
                return [4 /*yield*/, prisma.$executeRawUnsafe("UPDATE push_subscriptions\n                 SET endpoint = ?, endpoint_hash = ?, p256dh_key = ?, auth_key = ?, enabled = 1, last_error = NULL\n                 WHERE endpoint_hash = ?", subscription.endpoint, newHash, subscription.keys.p256dh, subscription.keys.auth, oldHash)];
            case 1:
                updated = _d.sent();
                if (Number(updated) > 0)
                    return [2 /*return*/, res.json({ ok: true })];
                _d.label = 2;
            case 2:
                // Si no había suscripción previa identificable, no podemos asociar usuario/sede
                // El cliente debe volver a llamar a /subscribe con idusuario/idsede.
                res.json({ ok: false, message: 'Re-suscripción requerida desde el cliente' });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _d.sent();
                console.error('Error en /push/resubscribe:', error_3);
                res.status(500).json({ error: 'Error en resubscribe' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /push/test
 * Envía una notificación de prueba a todas las suscripciones de una sede.
 * Body: { idsede: number, title?: string, body?: string }
 *
 * SOLO PARA TESTING. Quitar o proteger más en producción.
 */
router.post('/test', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, title, body, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, idsede = _a.idsede, title = _a.title, body = _a.body;
                if (typeof idsede !== 'number') {
                    return [2 /*return*/, res.status(400).json({ error: 'idsede requerido' })];
                }
                return [4 /*yield*/, (0, push_sender_1.sendPushToSede)(idsede, {
                        title: title || 'Prueba de notificación',
                        body: body || 'Si ves esto, las push notifications funcionan ✅',
                        url: '/hoy'
                    })];
            case 1:
                _b.sent();
                res.json({ ok: true });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('Error en /push/test:', error_4);
                res.status(500).json({ error: 'Error enviando push de prueba' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
