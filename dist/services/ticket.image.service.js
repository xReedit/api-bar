"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.generarYSubirTicket = exports.obtenerLogo = void 0;
// Renderiza el ticket SVG a PNG (sharp) y lo sube a S3 con key FIJA por
// sesión (se sobreescribe: no acumula espacio). Cualquier fallo devuelve
// null y el resumen sale como texto — la imagen nunca rompe el pedido.
var axios_1 = __importDefault(require("axios"));
var sharp_1 = __importDefault(require("sharp"));
var client_s3_1 = require("@aws-sdk/client-s3");
var ticket_svg_1 = require("./ticket.svg");
var bucket = function () { return process.env.AWS_BUCKET_NAME || 'papaya-comercio-files'; };
var region = function () { return process.env.AWS_REGION || 'us-east-2'; };
// Base de la carpeta legacy /restobar/print/logo/ donde vive el archivo cuyo
// nombre guarda conf_print.logo. Debe terminar en "/". Dev:
// http://192.168.1.65/restobar/print/logo/
var LOGO_BASE = function () { return process.env.RESTOBAR_LOGO_BASE_URL || 'https://restobar.papaya.com.pe/print/logo/'; };
// El filesystem del servidor legacy está en latin-1: una "í" en el nombre de
// archivo se pide como %ED (percent-encoding latin-1), NO %C3%AD (UTF-8) —
// verificado con curl contra la sede 13 ("1613Sin título.jpg" → 200 solo con
// %ED). Codificamos byte a byte interpretando el string como latin-1.
var encodeLatin1 = function (s) { return Array.from(Buffer.from(s, 'latin1')).map(function (b) { return (b <= 0x20 || b > 0x7e || '%#?"<>\\^`{|}'.includes(String.fromCharCode(b))) ? '%' + b.toString(16).toUpperCase().padStart(2, '0') : String.fromCharCode(b); }).join(''); };
// Algunos logos guardados en BD (sede.logo64) son PNG/JPEG malformados que
// los navegadores toleran pero libpng no ("vipspng: libpng read error").
// librsvg entonces dropea la imagen en silencio y el ticket sale con un
// hueco en blanco arriba. Re-encodeamos el logo con sharp({failOn:'none'})
// -que sí lee bytes tolerantes- para producir un PNG limpio antes de
// insertarlo en el SVG. Si cualquier paso falla, devolvemos null: el
// builder ya omite el <image> y no reserva el hueco.
var normalizarLogo = function (logoDataUrl) { return __awaiter(void 0, void 0, void 0, function () {
    var partes, buffer, png, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!logoDataUrl)
                    return [2 /*return*/, null];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                partes = logoDataUrl.split(',');
                if (partes.length !== 2 || !partes[0].startsWith('data:image'))
                    return [2 /*return*/, null];
                buffer = Buffer.from(partes[1], 'base64');
                return [4 /*yield*/, (0, sharp_1["default"])(buffer, { failOn: 'none' }).png().toBuffer()];
            case 2:
                png = _a.sent();
                return [2 /*return*/, "data:image/png;base64,".concat(png.toString('base64'))];
            case 3:
                error_1 = _a.sent();
                console.error('ticket-imagen: logo malformado, se omite:', error_1.message);
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
// El logo real del restaurante se administra en x-configuraciones: el
// NOMBRE de archivo queda en conf_print.logo (ej. "1613Sin título.jpg") y el
// archivo se sirve en `${LOGO_BASE}${nombreArchivo}` (carpeta del servidor
// legacy, no en BD). sede.logo64 es el logo de IMPRESIÓN de respaldo (baja
// calidad, para tickets de cocina) — se usa solo si no hay nombreArchivo o
// la descarga falla. Ningún paso lanza: siempre null en vez de romper el
// ticket.
var obtenerLogo = function (nombreArchivo, logo64) { return __awaiter(void 0, void 0, void 0, function () {
    var intentos, _i, intentos_1, nombreCodificado, url, respuesta, png, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!nombreArchivo) return [3 /*break*/, 7];
                intentos = [encodeLatin1(nombreArchivo), encodeURIComponent(nombreArchivo)];
                _i = 0, intentos_1 = intentos;
                _a.label = 1;
            case 1:
                if (!(_i < intentos_1.length)) return [3 /*break*/, 7];
                nombreCodificado = intentos_1[_i];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                url = "".concat(LOGO_BASE()).concat(nombreCodificado);
                return [4 /*yield*/, axios_1["default"].get(url, { timeout: 5000, responseType: 'arraybuffer' })];
            case 3:
                respuesta = _a.sent();
                return [4 /*yield*/, (0, sharp_1["default"])(Buffer.from(respuesta.data), { failOn: 'none' }).png().toBuffer()];
            case 4:
                png = _a.sent();
                return [2 /*return*/, "data:image/png;base64,".concat(png.toString('base64'))];
            case 5:
                error_2 = _a.sent();
                console.error('ticket-imagen: fallo obteniendo logo real (conf_print.logo):', error_2.message);
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 1];
            case 7: return [2 /*return*/, normalizarLogo(logo64)];
        }
    });
}); };
exports.obtenerLogo = obtenerLogo;
var generarYSubirTicket = function (sessionId, datos) { return __awaiter(void 0, void 0, void 0, function () {
    var logoArchivo, logo64, resto, logoDataUrl, svg, png, key, s3, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                    console.error('ticket-imagen: faltan credenciales AWS en el env');
                    return [2 /*return*/, null];
                }
                logoArchivo = datos.logoArchivo, logo64 = datos.logo64, resto = __rest(datos, ["logoArchivo", "logo64"]);
                return [4 /*yield*/, (0, exports.obtenerLogo)(logoArchivo, logo64)];
            case 1:
                logoDataUrl = _a.sent();
                svg = (0, ticket_svg_1.construirTicketSVG)(__assign(__assign({}, resto), { logoDataUrl: logoDataUrl })).svg;
                return [4 /*yield*/, (0, sharp_1["default"])(Buffer.from(svg)).png().toBuffer()];
            case 2:
                png = _a.sent();
                key = "files-bot/tickets/ticket-".concat(String(sessionId).replace(/[^a-zA-Z0-9._-]/g, ''), ".png");
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                        Bucket: bucket(),
                        Key: key,
                        Body: png,
                        ContentType: 'image/png'
                    }))];
            case 3:
                _a.sent();
                return [2 /*return*/, "https://".concat(bucket(), ".s3.").concat(region(), ".amazonaws.com/").concat(key)];
            case 4:
                error_3 = _a.sent();
                console.error('ticket-imagen: error generando/subiendo:', error_3.message);
                return [2 /*return*/, null];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.generarYSubirTicket = generarYSubirTicket;
