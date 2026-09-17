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
// Encuesta de satisfaccion PUBLICA (sin login): la responde un cliente anonimo desde encuesta.papaya.com.pe.
// Contrato y modelo de amenazas: plan/ENCUESTAS-FASE2-PLAN.md del POS legacy.
//
// Defensas propias de este router (no afectan al resto de la API):
//  - token de 96 bits (enc_canal_sede) validado por forma ANTES de tocar la BD
//  - link de comprobante firmado con HMAC (?v=) y con vencimiento
//  - nonce firmado: sin GET previo no hay POST, minimo 3 s de llenado, atado a la version vista
//  - canales comprobante y WhatsApp SOLO con venta firmada (el token del ticket va impreso: es publico)
//  - rate limit por IP (IPv6 agrupada por /56) + tope diario por IP en QR fijo, campo trampa `sitio`,
//    validacion estricta por tipo de pregunta. El tamano del body lo limita el nginx de la app (16 KB).
//  - sin ENCUESTA_SECRET responde 503: nunca queda abierto sin firmas
// Sin restriccion CORS a proposito: la app entra por su propio proxy (mismo origen) y una API publica y
// anonima se puede llamar igual con curl; la proteccion real son las firmas, el rate limit y la validacion.
var express_1 = __importDefault(require("express"));
var net_1 = require("net");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var encuesta_firma_1 = require("../services/encuesta.firma");
var encuesta_publica_service_1 = require("../services/encuesta.publica.service");
var router = express_1["default"].Router();
// En estos canales el token viaja impreso en cada comprobante: sin la firma de la venta cualquiera responderia sin limite
var CANALES_CON_VENTA = ['ticket', 'whatsapp'];
var avisoSinSecreto = false;
var error = function (res, status, codigo, mensaje) {
    return res.status(status).json({ ok: false, codigo: codigo, mensaje: mensaje });
};
var limite = function (max) {
    return (0, express_rate_limit_1["default"])({
        windowMs: 60000,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: function (_req, res) { return error(res, 429, 'DEMASIADAS_SOLICITUDES', 'Demasiados intentos. Espera un momento.'); }
    });
};
router.use(function (req, res, next) {
    var _a;
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!(0, encuesta_firma_1.secretoEncuesta)()) {
        if (!avisoSinSecreto)
            console.error('[encuesta-publica] ENCUESTA_SECRET no configurado (minimo 32 caracteres): servicio deshabilitado');
        avisoSinSecreto = true;
        return error(res, 503, 'NO_DISPONIBLE', 'La encuesta no esta disponible en este momento.');
    }
    // en router.use aun no hay req.params: el token es el primer segmento de la ruta
    if (!encuesta_publica_service_1.TOKEN_RE.test((_a = req.path.split('/')[1]) !== null && _a !== void 0 ? _a : '')) {
        return error(res, 404, 'LINK_INVALIDO', 'Este enlace no es valido.');
    }
    next();
});
var responderError = function (res, e, contexto) {
    if (e instanceof encuesta_publica_service_1.ErrorEncuesta)
        return error(res, e.status, e.codigo, e.message);
    console.error("[encuesta-publica] ".concat(contexto, ":"), e);
    return error(res, 500, 'NO_DISPONIBLE', 'No se pudo procesar la encuesta. Intenta de nuevo.');
};
/** Venta del link de comprobante (?v=), o null si el link es de tablet / QR fijo. Lanza si es invalida. */
var ventaDelLink = function (secreto, token, v, idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var idpago;
    return __generator(this, function (_a) {
        if (v === undefined || v === '')
            return [2 /*return*/, null];
        idpago = (0, encuesta_firma_1.leerVenta)(secreto, token, v);
        if (!idpago)
            throw new encuesta_publica_service_1.ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
        return [2 /*return*/, (0, encuesta_publica_service_1.validarVenta)(idpago, idsede)];
    });
}); };
router.get('/:token', limite(60), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var secreto, token, pub, venta, preguntas, e_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                secreto = (0, encuesta_firma_1.secretoEncuesta)();
                token = req.params.token;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, encuesta_publica_service_1.buscarPublicacion)(token)];
            case 2:
                pub = _b.sent();
                return [4 /*yield*/, ventaDelLink(secreto, token, req.query.v, pub.idsede)];
            case 3:
                venta = _b.sent();
                if (!venta && CANALES_CON_VENTA.includes(pub.canal))
                    throw new encuesta_publica_service_1.ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
                return [4 /*yield*/, (0, encuesta_publica_service_1.buscarPreguntas)(pub.idenc_encuesta)];
            case 4:
                preguntas = _b.sent();
                if (!preguntas.length)
                    throw new encuesta_publica_service_1.ErrorEncuesta(410, 'SIN_ENCUESTA', 'Esta encuesta ya no esta disponible.');
                // solo lo que el cliente necesita: ni idorg/idsede ni datos de la venta
                res.status(200).json({
                    ok: true,
                    data: {
                        local: pub.local,
                        canal: pub.canal,
                        texto_inicio: pub.texto_inicio,
                        texto_fin: pub.texto_fin,
                        preguntas: preguntas.map(function (p) { return ({ id: p.id, tipo: p.tipo, texto: p.texto, obligatorio: p.obligatorio, opciones: p.opciones }); }),
                        nonce: (0, encuesta_firma_1.crearNonce)(secreto, { p: pub.idenc_publicacion, e: pub.idenc_encuesta, v: (_a = venta === null || venta === void 0 ? void 0 : venta.idregistro_pago) !== null && _a !== void 0 ? _a : 0, t: Date.now() })
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _b.sent();
                responderError(res, e_1, 'GET');
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.post('/:token/respuestas', limite(20), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var secreto, token, body, lectura, mensaje, nonce, pub, venta, _a, preguntas, validas, e_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                secreto = (0, encuesta_firma_1.secretoEncuesta)();
                token = req.params.token;
                body = req.body && typeof req.body === 'object' ? req.body : {};
                // campo trampa: un humano nunca lo ve; se responde exito sin guardar para no darle pistas al bot
                if (typeof body.sitio === 'string' && body.sitio.trim() !== '') {
                    return [2 /*return*/, res.status(201).json({ ok: true, data: { texto_fin: null } })];
                }
                lectura = (0, encuesta_firma_1.leerNonce)(secreto, body.nonce);
                if (!lectura.ok) {
                    mensaje = lectura.motivo === 'vencido'
                        ? 'La encuesta estuvo abierta mucho tiempo. Vuelve a empezar.'
                        : 'No se pudo validar el envio. Vuelve a empezar.';
                    return [2 /*return*/, error(res, 400, 'NONCE_INVALIDO', mensaje)];
                }
                nonce = lectura.nonce;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, (0, encuesta_publica_service_1.buscarPublicacion)(token)];
            case 2:
                pub = _b.sent();
                if (nonce.p !== pub.idenc_publicacion || nonce.e !== pub.idenc_encuesta) {
                    throw new encuesta_publica_service_1.ErrorEncuesta(409, 'ENCUESTA_CAMBIO', 'La encuesta se actualizo. Vuelve a empezar.');
                }
                if (!nonce.v && CANALES_CON_VENTA.includes(pub.canal))
                    throw new encuesta_publica_service_1.ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
                if (!nonce.v) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, encuesta_publica_service_1.validarVenta)(nonce.v, pub.idsede)];
            case 3:
                _a = _b.sent();
                return [3 /*break*/, 5];
            case 4:
                _a = null;
                _b.label = 5;
            case 5:
                venta = _a;
                return [4 /*yield*/, (0, encuesta_publica_service_1.buscarPreguntas)(pub.idenc_encuesta)];
            case 6:
                preguntas = _b.sent();
                validas = (0, encuesta_publica_service_1.validarRespuestas)(preguntas, body.respuestas);
                // solo una IP valida llega a la BD (y a los reportes del POS)
                return [4 /*yield*/, (0, encuesta_publica_service_1.guardarRespuesta)({ pub: pub, validas: validas, venta: venta, ip: req.ip && (0, net_1.isIP)(req.ip) ? req.ip : null })];
            case 7:
                // solo una IP valida llega a la BD (y a los reportes del POS)
                _b.sent();
                res.status(201).json({ ok: true, data: { texto_fin: pub.texto_fin } });
                return [3 /*break*/, 9];
            case 8:
                e_2 = _b.sent();
                responderError(res, e_2, 'POST');
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
