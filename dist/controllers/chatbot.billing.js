"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
// Recarga de conversaciones del chatbot (panel Piter): saldo, packs en venta,
// y cobro con Niubiz. El monto SIEMPRE sale de la BD; el pago se verifica
// server-side (authorization) y la acreditación al chatbot-go es idempotente
// por tx_id — reintentar confirmar nunca duplica saldo.
var client_1 = require("@prisma/client");
var express_1 = __importDefault(require("express"));
var billing_helpers_1 = require("../services/billing.helpers");
var chatbotgo = __importStar(require("../services/chatbotgo.service"));
var niubiz = __importStar(require("../services/niubiz.service"));
var router = express_1["default"].Router();
var prisma = new client_1.PrismaClient();
/** Saldo actual de la sede (proxy del chatbot-go). */
router.get('/saldo/:idsede', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var saldo, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, chatbotgo.getSaldo(String(req.params.idsede))];
            case 1:
                saldo = _a.sent();
                res.status(200).json({ success: true, saldo: saldo });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('billing saldo:', error_1);
                res.status(502).json({ success: false, error: 'saldo no disponible' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/** Paquetes activos en venta. */
router.get('/packs', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var packs, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            SELECT id, conversaciones, precio_soles FROM chatbot_pack\n            WHERE activo = 1 ORDER BY conversaciones ASC"], ["\n            SELECT id, conversaciones, precio_soles FROM chatbot_pack\n            WHERE activo = 1 ORDER BY conversaciones ASC"])))];
            case 1:
                packs = _a.sent();
                res.status(200).json({ success: true, packs: packs });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('billing packs:', error_2);
                res.status(500).json({ success: false, error: 'no se pudieron listar los paquetes' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/** Crea el pago pendiente y la sesión Niubiz para abrir el checkout. */
router.post('/pago/iniciar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var entrada, packs, pack_1, monto_1, purchaseNumber, accessToken, clientIp, sessionKey, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                entrada = (0, billing_helpers_1.validarIniciar)(req.body);
                if (!entrada) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'idsede e id_pack son obligatorios' })];
                }
                if (!niubiz.niubizConfigurado()) {
                    return [2 /*return*/, res.status(503).json({ success: false, error: 'pasarela de pago no configurada' })];
                }
                // No cobrar lo que no se va a poder acreditar: sin esta key, chatbot-go
                // rechazaría la acreditación y el pago quedaría cobrado sin saldo aplicado.
                if (!process.env.CHATBOT_BILLING_KEY) {
                    return [2 /*return*/, res.status(503).json({ success: false, error: 'acreditación no configurada' })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n            SELECT id, conversaciones, precio_soles FROM chatbot_pack\n            WHERE id = ", " AND activo = 1"], ["\n            SELECT id, conversaciones, precio_soles FROM chatbot_pack\n            WHERE id = ", " AND activo = 1"])), entrada.idPack)];
            case 2:
                packs = _a.sent();
                if (!packs.length) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'paquete no disponible' })];
                }
                pack_1 = packs[0];
                monto_1 = Number(pack_1.precio_soles);
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var idRows;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.$executeRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n                INSERT INTO chatbot_pago (idsede, id_pack, conversaciones, monto)\n                VALUES (", ", ", ", ", ", ", ")"], ["\n                INSERT INTO chatbot_pago (idsede, id_pack, conversaciones, monto)\n                VALUES (", ", ", ", ", ", ", ")"])), entrada.idsede, pack_1.id, pack_1.conversaciones, monto_1)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["SELECT LAST_INSERT_ID() AS id"], ["SELECT LAST_INSERT_ID() AS id"])))];
                                case 2:
                                    idRows = _a.sent();
                                    return [2 /*return*/, Number(idRows[0].id)];
                            }
                        });
                    }); })];
            case 3:
                purchaseNumber = _a.sent();
                return [4 /*yield*/, niubiz.getAccessToken()];
            case 4:
                accessToken = _a.sent();
                clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
                return [4 /*yield*/, niubiz.createSession(accessToken, monto_1, clientIp.split(',')[0].trim())];
            case 5:
                sessionKey = _a.sent();
                res.status(200).json({
                    success: true,
                    purchaseNumber: String(purchaseNumber),
                    amount: monto_1,
                    sessionKey: sessionKey,
                    merchantId: niubiz.niubizMerchantId(),
                    checkoutJsUrl: niubiz.niubizCheckoutJsUrl(),
                    logoUrl: niubiz.niubizLogoUrl()
                });
                return [3 /*break*/, 7];
            case 6:
                error_3 = _a.sent();
                console.error('billing iniciar:', error_3);
                res.status(500).json({ success: false, error: 'no se pudo iniciar el pago' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * Verifica el pago contra Niubiz y acredita en chatbot-go. Reintentable:
 * un pago ya pagado no se re-cobra, solo re-intenta la acreditación.
 */
router.post('/pago/confirmar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var entrada, pagos, pago, resultado, reclamado, auth, accessToken, authError_1, resultado, dbError_1, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                entrada = (0, billing_helpers_1.validarConfirmar)(req.body);
                if (!entrada) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'purchaseNumber y transactionToken son obligatorios' })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 20, , 21]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx FROM chatbot_pago\n            WHERE id = ", ""], ["\n            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx FROM chatbot_pago\n            WHERE id = ", ""])), entrada.purchaseNumber)];
            case 2:
                pagos = _a.sent();
                if (!pagos.length) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'pago no encontrado' })];
                }
                pago = pagos[0];
                if (!(pago.estado === 'pagado' && pago.niubiz_tx)) return [3 /*break*/, 4];
                return [4 /*yield*/, acreditar(__assign(__assign({}, pago), { niubiz_tx: pago.niubiz_tx }))];
            case 3:
                resultado = _a.sent();
                return [2 /*return*/, res.status(200).json(__assign({ success: true }, resultado))];
            case 4:
                if (pago.estado !== 'pendiente') {
                    return [2 /*return*/, res.status(409).json({ success: false, error: "pago en estado ".concat(pago.estado) })];
                }
                return [4 /*yield*/, prisma.$executeRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            UPDATE chatbot_pago SET estado = 'procesando' WHERE id = ", " AND estado = 'pendiente'"], ["\n            UPDATE chatbot_pago SET estado = 'procesando' WHERE id = ", " AND estado = 'pendiente'"])), pago.id)];
            case 5:
                reclamado = _a.sent();
                if (Number(reclamado) !== 1) {
                    return [2 /*return*/, res.status(409).json({ success: false, error: 'pago en proceso, reintenta en unos segundos' })];
                }
                auth = void 0;
                _a.label = 6;
            case 6:
                _a.trys.push([6, 9, , 11]);
                return [4 /*yield*/, niubiz.getAccessToken()];
            case 7:
                accessToken = _a.sent();
                return [4 /*yield*/, niubiz.authorize(accessToken, {
                        tokenId: entrada.transactionToken,
                        purchaseNumber: pago.id,
                        amount: Number(pago.monto)
                    })];
            case 8:
                auth = _a.sent();
                return [3 /*break*/, 11];
            case 9:
                authError_1 = _a.sent();
                // Niubiz no respondió (red/timeout): liberar el reclamo para permitir reintentar.
                return [4 /*yield*/, prisma.$executeRaw(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ", " AND estado = 'procesando'"], ["\n                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ", " AND estado = 'procesando'"])), pago.id)];
            case 10:
                // Niubiz no respondió (red/timeout): liberar el reclamo para permitir reintentar.
                _a.sent();
                throw authError_1;
            case 11:
                if (!(!auth.ok && !auth.reconocido)) return [3 /*break*/, 13];
                // Respuesta irreconocible (5xx, HTML, token de acceso expirado, etc.):
                // Niubiz no dio un veredicto real, no hay ACTION_CODE. Se trata igual
                // que "no respondió": se libera el reclamo, es reintentable. Marcar
                // 'fallido' aquí perdería el intento sin que hubiera un rechazo real.
                return [4 /*yield*/, prisma.$executeRaw(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ", " AND estado = 'procesando'"], ["\n                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ", " AND estado = 'procesando'"])), pago.id)];
            case 12:
                // Respuesta irreconocible (5xx, HTML, token de acceso expirado, etc.):
                // Niubiz no dio un veredicto real, no hay ACTION_CODE. Se trata igual
                // que "no respondió": se libera el reclamo, es reintentable. Marcar
                // 'fallido' aquí perdería el intento sin que hubiera un rechazo real.
                _a.sent();
                console.warn('billing: respuesta de Niubiz irreconocible, se libera el reclamo', { purchaseNumber: pago.id });
                return [2 /*return*/, res.status(502).json({ success: false, error: 'pasarela no disponible, reintenta', retryable: true })];
            case 13:
                if (!!auth.ok) return [3 /*break*/, 15];
                // Rechazo real: Niubiz contestó con un ACTION_CODE de rechazo. Terminal.
                return [4 /*yield*/, prisma.$executeRaw(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n                UPDATE chatbot_pago SET estado = 'fallido' WHERE id = ", " AND estado = 'procesando'"], ["\n                UPDATE chatbot_pago SET estado = 'fallido' WHERE id = ", " AND estado = 'procesando'"])), pago.id)];
            case 14:
                // Rechazo real: Niubiz contestó con un ACTION_CODE de rechazo. Terminal.
                _a.sent();
                console.warn('billing: pago rechazado', { purchaseNumber: pago.id, actionCode: auth.actionCode });
                return [2 /*return*/, res.status(402).json({
                        success: false,
                        error: auth.descripcion || 'pago rechazado',
                        actionCode: auth.actionCode
                    })];
            case 15:
                _a.trys.push([15, 18, , 19]);
                return [4 /*yield*/, prisma.$executeRaw(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n                UPDATE chatbot_pago SET estado = 'pagado', niubiz_tx = ", "\n                WHERE id = ", " AND estado = 'procesando'"], ["\n                UPDATE chatbot_pago SET estado = 'pagado', niubiz_tx = ", "\n                WHERE id = ", " AND estado = 'procesando'"])), auth.transactionId, pago.id)];
            case 16:
                _a.sent();
                console.log('billing: pago aprobado', { purchaseNumber: pago.id, tx: auth.transactionId });
                return [4 /*yield*/, acreditar(__assign(__assign({}, pago), { niubiz_tx: auth.transactionId }))];
            case 17:
                resultado = _a.sent();
                return [2 /*return*/, res.status(200).json(__assign({ success: true }, resultado))];
            case 18:
                dbError_1 = _a.sent();
                console.error('billing: PAGO APROBADO POR NIUBIZ PERO NO REGISTRADO EN BD (revisar manualmente)', {
                    purchaseNumber: pago.id,
                    transactionId: auth.transactionId,
                    actionCode: auth.actionCode,
                    error: dbError_1
                });
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'pago aprobado pero no registrado; NO reintentar: contactar soporte',
                        purchaseNumber: String(pago.id)
                    })];
            case 19: return [3 /*break*/, 21];
            case 20:
                error_4 = _a.sent();
                console.error('billing confirmar:', error_4);
                res.status(500).json({ success: false, error: 'no se pudo confirmar el pago' });
                return [3 /*break*/, 21];
            case 21: return [2 /*return*/];
        }
    });
}); });
/**
 * Acredita el pago en chatbot-go y devuelve { acreditado, saldo? }. Si la
 * acreditación falla, el pago YA está cobrado: se responde success con
 * acreditado=false y el front puede reintentar confirmar (idempotente).
 */
var acreditar = function (pago) { return __awaiter(void 0, void 0, void 0, function () {
    var error_5, saldo, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, chatbotgo.acreditarRecarga((0, billing_helpers_1.buildRecargaPayload)({
                        idsede: pago.idsede,
                        conversaciones: pago.conversaciones,
                        monto: Number(pago.monto),
                        niubizTx: pago.niubiz_tx
                    }))];
            case 1:
                _b.sent();
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                console.error('billing: pago cobrado pero NO acreditado (reintentar confirmar)', error_5);
                return [2 /*return*/, { acreditado: false }];
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, chatbotgo.getSaldo(String(pago.idsede))];
            case 4:
                saldo = _b.sent();
                return [2 /*return*/, { acreditado: true, saldo: saldo }];
            case 5:
                _a = _b.sent();
                return [2 /*return*/, { acreditado: true }]; // acreditado; el saldo se verá al recargar el panel
            case 6: return [2 /*return*/];
        }
    });
}); };
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10;
