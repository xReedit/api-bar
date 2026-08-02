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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
// Administración del catálogo de paquetes de recarga (chatbot_pack) y vista de
// los pagos de clientes (chatbot_pago). Lo consume SOLO el dashboard del
// chatbot-go vía proxy (montado bajo /chatbot/billing-admin con x-api-key =
// CHATBOT_API_KEY); el dueño del SaaS administra desde ahí, no desde Piter.
// El panel Piter sigue leyendo únicamente los packs activos por
// GET /chat-bot/billing/packs (JWT del restaurante).
var client_1 = require("@prisma/client");
var express_1 = __importDefault(require("express"));
var router = express_1["default"].Router();
var prisma = new client_1.PrismaClient();
/** Catálogo completo (incluye inactivos, para poder reactivarlos). */
router.get('/packs', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var packs, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack\n            ORDER BY activo DESC, precio_soles ASC"], ["\n            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack\n            ORDER BY activo DESC, precio_soles ASC"])))];
            case 1:
                packs = _a.sent();
                res.status(200).json({ success: true, packs: packs });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('billing-admin packs:', error_1);
                res.status(500).json({ success: false, error: 'no se pudieron listar los paquetes' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Crea (sin id) o actualiza (con id) un paquete. Actualizar un pack no altera
 * pagos históricos: chatbot_pago copia conversaciones y monto al comprar.
 */
router.post('/packs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, conversaciones, precio, activo, afectadas, packs, error_2;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                id = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.id) != null ? Number(req.body.id) : null;
                conversaciones = Number((_b = req.body) === null || _b === void 0 ? void 0 : _b.conversaciones);
                precio = Number((_c = req.body) === null || _c === void 0 ? void 0 : _c.precio_soles);
                activo = ((_d = req.body) === null || _d === void 0 ? void 0 : _d.activo) == null ? 1 : (Number(req.body.activo) ? 1 : 0);
                if (!Number.isInteger(conversaciones) || conversaciones <= 0 || !Number.isFinite(precio) || precio <= 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'conversaciones (entero > 0) y precio_soles (> 0) son obligatorios' })];
                }
                if (id !== null && (!Number.isInteger(id) || id <= 0)) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'id inválido' })];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 7, , 8]);
                if (!(id === null)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.$executeRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n                INSERT INTO chatbot_pack (conversaciones, precio_soles, activo)\n                VALUES (", ", ", ", ", ")"], ["\n                INSERT INTO chatbot_pack (conversaciones, precio_soles, activo)\n                VALUES (", ", ", ", ", ")"])), conversaciones, precio, activo)];
            case 2:
                _e.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, prisma.$executeRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n                UPDATE chatbot_pack SET conversaciones = ", ",\n                    precio_soles = ", ", activo = ", "\n                WHERE id = ", ""], ["\n                UPDATE chatbot_pack SET conversaciones = ", ",\n                    precio_soles = ", ", activo = ", "\n                WHERE id = ", ""])), conversaciones, precio, activo, id)];
            case 4:
                afectadas = _e.sent();
                if (Number(afectadas) === 0) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'paquete no encontrado' })];
                }
                _e.label = 5;
            case 5: return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack\n            ORDER BY activo DESC, precio_soles ASC"], ["\n            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack\n            ORDER BY activo DESC, precio_soles ASC"])))];
            case 6:
                packs = _e.sent();
                res.status(200).json({ success: true, packs: packs });
                return [3 /*break*/, 8];
            case 7:
                error_2 = _e.sent();
                console.error('billing-admin guardar pack:', error_2);
                res.status(500).json({ success: false, error: 'no se pudo guardar el paquete' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
/** Últimas recargas de los clientes (todas las sedes, todos los estados). */
router.get('/pagos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limit, pagos, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx, creado_en\n            FROM chatbot_pago ORDER BY id DESC LIMIT ", ""], ["\n            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx, creado_en\n            FROM chatbot_pago ORDER BY id DESC LIMIT ", ""])), limit)];
            case 2:
                pagos = _a.sent();
                res.status(200).json({ success: true, pagos: pagos });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error('billing-admin pagos:', error_3);
                res.status(500).json({ success: false, error: 'no se pudieron listar los pagos' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ── Activaciones del chatbot (autoservicio desde Piter) ──────────────────────
/** Últimas activaciones con los datos de contacto de la sede. */
router.get('/activaciones', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var activaciones, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            SELECT cs.id, cs.idsede, cs.atendido_en, s.nombre, s.telefono, s.ciudad\n            FROM chatbot_solicitud cs\n            LEFT JOIN sede s ON s.idsede = cs.idsede\n            WHERE cs.estado = 'atendida'\n            ORDER BY cs.atendido_en DESC\n            LIMIT 50"], ["\n            SELECT cs.id, cs.idsede, cs.atendido_en, s.nombre, s.telefono, s.ciudad\n            FROM chatbot_solicitud cs\n            LEFT JOIN sede s ON s.idsede = cs.idsede\n            WHERE cs.estado = 'atendida'\n            ORDER BY cs.atendido_en DESC\n            LIMIT 50"])))];
            case 1:
                activaciones = _a.sent();
                res.status(200).json({ success: true, activaciones: activaciones });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('billing-admin activaciones:', error_4);
                res.status(500).json({ success: false, error: 'no se pudieron listar las activaciones' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6;
