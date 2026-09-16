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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.invalidarVentana = exports.generarCartaTachada = exports.obtenerAgotados = exports.hashAgotados = exports.construirOverlaySVG = exports.resolverCartaTachado = void 0;
// Genera la carta con platos agotados tachados. Regeneración perezosa:
// solo cuando un cliente la pide, como máximo una vez cada 5 min por sede,
// y solo si el set de agotados cambió (key S3 determinística por hash).
var crypto_1 = require("crypto");
var axios_1 = __importDefault(require("axios"));
var path_1 = __importDefault(require("path"));
process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || path_1["default"].join(__dirname, '..', '..', 'fonts');
var sharp_1 = __importDefault(require("sharp"));
var client_s3_1 = require("@aws-sdk/client-s3");
var carta_indice_service_1 = require("./carta.indice.service");
var bucket = function () { return process.env.AWS_BUCKET_NAME || 'papaya-comercio-files'; };
var region = function () { return process.env.AWS_REGION || 'us-east-2'; };
var resolverCartaTachado = function (parametros) {
    return (parametros === null || parametros === void 0 ? void 0 : parametros.carta_tachado) === 'manual' ? 'manual'
        : (parametros === null || parametros === void 0 ? void 0 : parametros.carta_tachado) === 'auto' ? 'auto'
            : 'off';
};
exports.resolverCartaTachado = resolverCartaTachado;
var construirOverlaySVG = function (width, height, cajas) {
    var lineas = cajas.map(function (b) {
        var x1 = Math.max(0, (b.x - 0.015) * width);
        var x2 = Math.min(width, (b.x + b.w + 0.015) * width);
        var y = (b.y + b.h / 2) * height;
        var sw = Math.max(3, b.h * height * 0.16);
        return "<line x1=\"".concat(x1.toFixed(1), "\" y1=\"").concat(y.toFixed(1), "\" x2=\"").concat(x2.toFixed(1), "\" y2=\"").concat(y.toFixed(1), "\" stroke=\"#c62828\" stroke-width=\"").concat(sw.toFixed(1), "\" stroke-linecap=\"round\" opacity=\"0.9\"/>");
    });
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(width, "\" height=\"").concat(height, "\">").concat(lineas.join(''), "</svg>");
};
exports.construirOverlaySVG = construirOverlaySVG;
var hashAgotados = function (nombres) {
    return (0, crypto_1.createHash)('sha1').update(__spreadArray([], nombres, true).sort().join('|')).digest('hex').slice(0, 10);
};
exports.hashAgotados = hashAgotados;
var obtenerAgotados = function (idsede, modo, idx, prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var rows, agotados;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (modo === 'manual')
                    return [2 /*return*/, idx.lineas.filter(function (l) { return l.agotado; })];
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT DISTINCT cl.iditem\n         FROM carta_lista cl JOIN item i ON i.iditem = cl.iditem\n         WHERE i.idsede = ? AND cl.estado = 0 AND i.estado = 0 AND cl.is_visible_cliente = 0\n           AND cl.cantidad IS NOT NULL AND CAST(cl.cantidad AS DECIMAL(10,2)) <= 0", Number(idsede))];
            case 1:
                rows = _a.sent();
                agotados = new Set((rows || []).map(function (r) { return Number(r.iditem); }));
                return [2 /*return*/, idx.lineas.filter(function (l) { return l.iditem !== null && agotados.has(l.iditem); })];
        }
    });
}); };
exports.obtenerAgotados = obtenerAgotados;
// ponytail: ventana en memoria por proceso (pm2 single). Si algún día hay cluster,
// mover a S3/Redis; el peor caso hoy es una regeneración extra tras restart.
var ventana = new Map();
var VENTANA_MS = 5 * 60 * 1000;
var generarCartaTachada = function (idsede, prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var config, modo, idx, _a, cache, lineasAgotadas, nombres, hash, key, url, base, baseBuf, img, meta, W, H, overlay, buf, s3, e_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 14, , 16]);
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: { idsede: Number(idsede), estado: '0' }, select: { parametros: true }
                    })];
            case 1:
                config = _b.sent();
                modo = (0, exports.resolverCartaTachado)(config === null || config === void 0 ? void 0 : config.parametros);
                if (!(modo === 'off')) return [3 /*break*/, 2];
                _a = null;
                return [3 /*break*/, 4];
            case 2: return [4 /*yield*/, (0, carta_indice_service_1.leerIndice)(Number(idsede))];
            case 3:
                _a = _b.sent();
                _b.label = 4;
            case 4:
                idx = _a;
                if (!(!idx || modo === 'off')) return [3 /*break*/, 6];
                return [4 /*yield*/, fallbackLink(idsede, prisma)];
            case 5: return [2 /*return*/, _b.sent()];
            case 6:
                cache = ventana.get(Number(idsede));
                if (cache && Date.now() - cache.en < VENTANA_MS) {
                    return [2 /*return*/, { tipo: 'imagen', imagen_url: cache.url, agotados: cache.agotados }];
                }
                return [4 /*yield*/, (0, exports.obtenerAgotados)(Number(idsede), modo, idx, prisma)];
            case 7:
                lineasAgotadas = _b.sent();
                nombres = lineasAgotadas.map(function (l) { return l.texto; });
                hash = (0, exports.hashAgotados)(__spreadArray([idx.etag], nombres, true));
                key = "files-bot/cartas-gen/carta-".concat(Number(idsede), "-").concat(hash, ".jpg");
                url = "https://".concat(bucket(), ".s3.").concat(region(), ".amazonaws.com/").concat(key);
                if (!((cache === null || cache === void 0 ? void 0 : cache.hash) !== hash)) return [3 /*break*/, 13];
                return [4 /*yield*/, axios_1["default"].get((0, carta_indice_service_1.urlCartaBase)(idx.archivo), {
                        responseType: 'arraybuffer', timeout: 15000, maxContentLength: 20 * 1024 * 1024
                    })];
            case 8:
                base = _b.sent();
                return [4 /*yield*/, (0, sharp_1["default"])(Buffer.from(base.data), { failOn: 'none' })
                        .resize({ width: 1600, withoutEnlargement: true })
                        .toBuffer()];
            case 9:
                baseBuf = _b.sent();
                img = (0, sharp_1["default"])(baseBuf);
                return [4 /*yield*/, img.metadata()];
            case 10:
                meta = _b.sent();
                W = meta.width || idx.width, H = meta.height || idx.height;
                if (nombres.length) {
                    overlay = Buffer.from((0, exports.construirOverlaySVG)(W, H, lineasAgotadas.map(function (l) { return l.box; })));
                    img = img.composite([{ input: overlay }]);
                }
                return [4 /*yield*/, img.jpeg({ quality: 82 }).toBuffer()];
            case 11:
                buf = _b.sent();
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({ Bucket: bucket(), Key: key, Body: buf, ContentType: 'image/jpeg' }))];
            case 12:
                _b.sent();
                _b.label = 13;
            case 13:
                ventana.set(Number(idsede), { hash: hash, url: url, agotados: nombres, en: Date.now() });
                return [2 /*return*/, { tipo: 'imagen', imagen_url: url, agotados: nombres }];
            case 14:
                e_1 = _b.sent();
                console.error('[carta-tachado] fallo, fallback a link', e_1);
                return [4 /*yield*/, fallbackLink(idsede, prisma)];
            case 15: return [2 /*return*/, _b.sent()];
            case 16: return [2 /*return*/];
        }
    });
}); };
exports.generarCartaTachada = generarCartaTachada;
var invalidarVentana = function (idsede) { ventana["delete"](Number(idsede)); };
exports.invalidarVentana = invalidarVentana;
var fallbackLink = function (idsede, prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var categoria, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.categoria.findFirst({
                        where: { idsede: Number(idsede), estado: 0, visible_cliente: '1', url_carta: { not: null } },
                        select: { url_carta: true }
                    })];
            case 1:
                categoria = _b.sent();
                return [2 /*return*/, { tipo: 'link', link_carta: (categoria === null || categoria === void 0 ? void 0 : categoria.url_carta) ? (0, carta_indice_service_1.urlCartaBase)(categoria.url_carta) : null }];
            case 2:
                _a = _b.sent();
                return [2 /*return*/, { tipo: 'link', link_carta: null }];
            case 3: return [2 /*return*/];
        }
    });
}); };
