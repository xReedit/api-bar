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
exports.__esModule = true;
exports.construirIndice = exports.guardarIndice = exports.leerIndice = exports.urlCartaBase = exports.maxLineasCarta = void 0;
// Índice de la carta: qué línea de texto está en qué caja de la imagen.
// Vive en S3 (files-bot/cartas-idx/), NUNCA en sede_costo_delivery.parametros:
// el PUT update-config-delivery del panel reemplaza ese JSON completo y lo pisaría.
var client_s3_1 = require("@aws-sdk/client-s3");
var carta_ocr_service_1 = require("./carta.ocr.service");
var carta_match_service_1 = require("./carta.match.service");
var bucket = function () { return process.env.AWS_BUCKET_NAME || 'papaya-comercio-files'; };
var region = function () { return process.env.AWS_REGION || 'us-east-2'; };
// El tachado es para cartas cortas (menú del día): con cartas grandes el OCR y el
// match se vuelven poco confiables y la imagen queda ilegible. Tope en líneas de
// texto detectadas (proxy de nº de platos), configurable por env.
var maxLineasCarta = function () {
    var n = Number(process.env.CARTA_TACHADO_MAX_LINEAS);
    return Number.isInteger(n) && n > 0 ? n : 40;
};
exports.maxLineasCarta = maxLineasCarta;
var idxKey = function (idsede) { return "files-bot/cartas-idx/idx-".concat(idsede, ".json"); };
var urlCartaBase = function (archivo) {
    return "https://".concat(bucket(), ".s3.").concat(region(), ".amazonaws.com/files-bot/").concat(archivo);
};
exports.urlCartaBase = urlCartaBase;
var leerIndice = function (idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var s3, r, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.GetObjectCommand({ Bucket: bucket(), Key: idxKey(idsede) }))];
            case 1:
                r = _d.sent();
                _b = (_a = JSON).parse;
                return [4 /*yield*/, r.Body.transformToString()];
            case 2: return [2 /*return*/, _b.apply(_a, [_d.sent()])];
            case 3:
                _c = _d.sent();
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.leerIndice = leerIndice;
var guardarIndice = function (idsede, idx) { return __awaiter(void 0, void 0, void 0, function () {
    var s3, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                        Bucket: bucket(), Key: idxKey(idsede),
                        Body: JSON.stringify(idx), ContentType: 'application/json'
                    }))];
            case 1:
                _a.sent();
                return [2 /*return*/, true];
            case 2:
                e_1 = _a.sent();
                console.error('[carta-idx] guardar fallo', e_1);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.guardarIndice = guardarIndice;
// ETag del objeto S3 = versión de la imagen. Mismo ETag => índice vigente, no se re-OCRea.
var etagCarta = function (archivo) { return __awaiter(void 0, void 0, void 0, function () {
    var s3, h, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.HeadObjectCommand({ Bucket: bucket(), Key: "files-bot/".concat(archivo) }))];
            case 1:
                h = _b.sent();
                return [2 /*return*/, h.ETag || null];
            case 2:
                _a = _b.sent();
                return [2 /*return*/, null];
            case 3: return [2 /*return*/];
        }
    });
}); };
var borrarIndice = function (idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var s3, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                s3 = new client_s3_1.S3Client({ region: region() });
                return [4 /*yield*/, s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket(), Key: idxKey(idsede) }))];
            case 1:
                _b.sent();
                return [3 /*break*/, 3];
            case 2:
                _a = _b.sent();
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Idempotente: si la imagen no cambió (ETag), devuelve el índice existente.
// Al reindexar se conservan los "agotado" manuales de líneas cuyo texto se mantiene.
var construirIndice = function (idsede, prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var categoria, archivo, etag, previo, respuesta, extraido, max, items, agotadosPrevios_1, lineas, idx, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                return [4 /*yield*/, prisma.categoria.findFirst({
                        where: { idsede: Number(idsede), estado: 0, visible_cliente: '1', url_carta: { not: null } },
                        select: { url_carta: true }
                    })];
            case 1:
                categoria = _a.sent();
                archivo = categoria === null || categoria === void 0 ? void 0 : categoria.url_carta;
                if (!archivo)
                    return [2 /*return*/, { indice: null }];
                return [4 /*yield*/, etagCarta(archivo)];
            case 2:
                etag = _a.sent();
                if (!etag)
                    console.warn('[carta-idx] sin etag de S3 (¿falta permiso HeadObject?), versionado de imagen degradado', idsede);
                return [4 /*yield*/, (0, exports.leerIndice)(idsede)];
            case 3:
                previo = _a.sent();
                if (previo && etag && previo.etag === etag && previo.archivo === archivo)
                    return [2 /*return*/, { indice: previo }];
                return [4 /*yield*/, (0, carta_ocr_service_1.detectarTexto)((0, exports.urlCartaBase)(archivo))];
            case 4:
                respuesta = _a.sent();
                extraido = respuesta ? (0, carta_ocr_service_1.extraerLineas)(respuesta) : null;
                if (!extraido)
                    return [2 /*return*/, { indice: null }];
                max = (0, exports.maxLineasCarta)();
                if (!(extraido.lineas.length > max)) return [3 /*break*/, 6];
                // Carta demasiado larga: se borra el índice previo para que un índice de una
                // carta anterior (corta) no tache posiciones equivocadas sobre la imagen nueva.
                return [4 /*yield*/, borrarIndice(idsede)];
            case 5:
                // Carta demasiado larga: se borra el índice previo para que un índice de una
                // carta anterior (corta) no tache posiciones equivocadas sobre la imagen nueva.
                _a.sent();
                console.warn("[carta-idx] carta demasiado larga (".concat(extraido.lineas.length, " lineas > ").concat(max, "), tachado desactivado"), idsede);
                return [2 /*return*/, { indice: null, motivo: 'carta_demasiado_larga', lineas: extraido.lineas.length, max: max }];
            case 6: return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT DISTINCT i.iditem, i.descripcion\n             FROM carta_lista cl JOIN item i ON i.iditem = cl.iditem\n             WHERE i.idsede = ? AND cl.estado = 0 AND i.estado = 0 AND cl.is_visible_cliente = 0", Number(idsede))];
            case 7:
                items = _a.sent();
                agotadosPrevios_1 = new Set(((previo === null || previo === void 0 ? void 0 : previo.lineas) || []).filter(function (l) { return l.agotado; }).map(function (l) { return l.texto; }));
                lineas = (0, carta_match_service_1.matchLineas)(extraido.lineas, items || []).map(function (l) { return (__assign(__assign({}, l), { agotado: agotadosPrevios_1.has(l.texto) })); });
                idx = {
                    archivo: archivo,
                    etag: etag || '', width: extraido.width, height: extraido.height,
                    lineas: lineas,
                    actualizado: new Date().toISOString()
                };
                return [4 /*yield*/, (0, exports.guardarIndice)(idsede, idx)];
            case 8:
                _a.sent();
                return [2 /*return*/, { indice: idx }];
            case 9:
                e_2 = _a.sent();
                console.error('[carta-idx] construir fallo', e_2);
                return [2 /*return*/, { indice: null }];
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.construirIndice = construirIndice;
