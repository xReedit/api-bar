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
exports.avisarComprobante = exports.configAviso = exports.mensajeAvisoComprobante = exports.numeroDeSesion = void 0;
// Aviso proactivo del comprobante: cuando la emisión tarda más que el tope y el
// bot ya le dijo al cliente "se está generando", el resultado llega después y
// nadie se lo entregaba (caso real 08/10: el cliente esperó y nunca lo recibió).
// Al terminar, se le escribe por el canal /chatbot/emitir de backend-pedidos
// (el mismo de los recordatorios del bot → gateway WhatsApp de la sede).
var axios_1 = __importDefault(require("axios"));
var logger_1 = require("../utils/logger");
/** session_id = numero_idorg_idsede (chatbot-go). */
var numeroDeSesion = function (sessionId) {
    var numero = String(sessionId || '').split('_')[0];
    return /^\d{6,15}$/.test(numero) ? numero : null;
};
exports.numeroDeSesion = numeroDeSesion;
var mensajeAvisoComprobante = function (tipo, r) {
    if (r.success && r.numero) {
        return "Listo \uD83D\uDE4C tu ".concat(tipo, " ").concat(r.numero, " ya est\u00E1 lista").concat(r.url_pdf ? ": ".concat(r.url_pdf) : '');
    }
    return "No pudimos generar tu ".concat(tipo, " por aqu\u00ED \uD83D\uDE14. Solic\u00EDtala en caja y te la emiten al momento \uD83D\uDE4F");
};
exports.mensajeAvisoComprobante = mensajeAvisoComprobante;
var configAviso = function () { return ({
    url: process.env.CHATBOT_EMITIR_URL || '',
    key: process.env.CHATBOT_EMITIR_KEY || ''
}); };
exports.configAviso = configAviso;
/** Nunca lanza: corre en segundo plano, después de haberle respondido al bot. */
var avisarComprobante = function (d, cfg, post) {
    if (cfg === void 0) { cfg = (0, exports.configAviso)(); }
    if (post === void 0) { post = axios_1["default"].post; }
    return __awaiter(void 0, void 0, void 0, function () {
        var numero, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    numero = (0, exports.numeroDeSesion)(d.session_id);
                    if (!cfg.url || !cfg.key || !numero) {
                        logger_1.logger.warn("aviso-comprobante: sin canal (url/key/numero) para sesi\u00F3n ".concat(d.session_id, "; el cliente deber\u00E1 repedirlo"));
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, post(cfg.url, {
                            idorg: String(d.idorg), idsede: String(d.idsede),
                            numero: numero,
                            mensaje: (0, exports.mensajeAvisoComprobante)(d.tipo, d.resultado)
                        }, { timeout: 10000, headers: { 'x-api-key': cfg.key } })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    e_1 = _a.sent();
                    logger_1.logger.error("aviso-comprobante: no se pudo avisar a la sesi\u00F3n ".concat(d.session_id, ":"), e_1 === null || e_1 === void 0 ? void 0 : e_1.message);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.avisarComprobante = avisarComprobante;
