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
exports.extraerLineas = exports.detectarTexto = void 0;
// OCR de la imagen de la carta con Google Cloud Vision (REST + API key).
// Se llama UNA vez por imagen subida (indexado), nunca por request de cliente.
var axios_1 = __importDefault(require("axios"));
var VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
// Llama a Vision con la URL pública de S3 (imageUri: Vision descarga la imagen, aquí no).
var detectarTexto = function (imageUrl) { return __awaiter(void 0, void 0, void 0, function () {
    var key, data, e_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                key = process.env.GOOGLE_VISION_API_KEY;
                if (!key) {
                    console.warn('[carta-ocr] GOOGLE_VISION_API_KEY no configurada, indexado omitido');
                    return [2 /*return*/, null];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 3, , 4]);
                return [4 /*yield*/, axios_1["default"].post("".concat(VISION_URL, "?key=").concat(key), { requests: [{ image: { source: { imageUri: imageUrl } }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }, { timeout: 25000 })];
            case 2:
                data = (_f.sent()).data;
                return [2 /*return*/, (_b = (_a = data === null || data === void 0 ? void 0 : data.responses) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null];
            case 3:
                e_1 = _f.sent();
                console.error('[carta-ocr] Vision fallo:', ((_e = (_d = (_c = e_1 === null || e_1 === void 0 ? void 0 : e_1.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.message) || (e_1 === null || e_1 === void 0 ? void 0 : e_1.message));
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.detectarTexto = detectarTexto;
// Un paragraph de Vision NO es una fila visual: un nombre que hace wrap, o
// nombre+descripción+precio, caen en el mismo paragraph. El corte real lo marca el
// detectedBreak del último símbolo de cada palabra (SPACE no corta, fin de renglón sí).
var cierraLinea = function (word) {
    var _a, _b, _c;
    var symbols = word.symbols || [];
    var tipo = (_c = (_b = (_a = symbols[symbols.length - 1]) === null || _a === void 0 ? void 0 : _a.property) === null || _b === void 0 ? void 0 : _b.detectedBreak) === null || _c === void 0 ? void 0 : _c.type;
    return tipo === 'LINE_BREAK' || tipo === 'EOL_SURE_SPACE';
};
// Palabras de un paragraph -> grupos, uno por fila visual (la palabra con el salto
// pertenece a la fila que cierra). Sin ningún break: un solo grupo.
var agruparEnLineas = function (words) {
    var grupos = [];
    var actual = [];
    for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
        var w = words_1[_i];
        actual.push(w);
        if (cierraLinea(w)) {
            grupos.push(actual);
            actual = [];
        }
    }
    if (actual.length)
        grupos.push(actual);
    return grupos;
};
var textoDe = function (words) {
    return words
        .map(function (w) { return (w.symbols || []).map(function (s) { return s.text; }).join(''); })
        .join(' ')
        .trim();
};
// Caja = unión de las cajas de las palabras, normalizada.
// Vision OMITE la coordenada cuando vale 0 (palabra pegada al borde izquierdo/superior),
// así que la ausencia se lee como 0; solo se descarta si no hay vértices en absoluto.
var cajaDe = function (words, width, height) {
    var _a;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var _i = 0, words_2 = words; _i < words_2.length; _i++) {
        var w = words_2[_i];
        for (var _b = 0, _c = ((_a = w.boundingBox) === null || _a === void 0 ? void 0 : _a.vertices) || []; _b < _c.length; _b++) {
            var v = _c[_b];
            var vx = typeof v.x === 'number' ? v.x : 0;
            var vy = typeof v.y === 'number' ? v.y : 0;
            minX = Math.min(minX, vx);
            maxX = Math.max(maxX, vx);
            minY = Math.min(minY, vy);
            maxY = Math.max(maxY, vy);
        }
    }
    if (!isFinite(minX) || !isFinite(minY))
        return null;
    return { x: minX / width, y: minY / height, w: (maxX - minX) / width, h: (maxY - minY) / height };
};
// Puro: fullTextAnnotation -> líneas visuales con caja relativa.
// Relativas 0-1 para que el tachado aguante cualquier resize posterior de la imagen.
var extraerLineas = function (respuesta) {
    var _a, _b;
    var page = (_b = (_a = respuesta === null || respuesta === void 0 ? void 0 : respuesta.fullTextAnnotation) === null || _a === void 0 ? void 0 : _a.pages) === null || _b === void 0 ? void 0 : _b[0];
    if (!(page === null || page === void 0 ? void 0 : page.width) || !(page === null || page === void 0 ? void 0 : page.height))
        return null;
    var width = page.width, height = page.height;
    var lineas = [];
    for (var _i = 0, _c = page.blocks || []; _i < _c.length; _i++) {
        var block = _c[_i];
        for (var _d = 0, _e = block.paragraphs || []; _d < _e.length; _d++) {
            var par = _e[_d];
            for (var _f = 0, _g = agruparEnLineas(par.words || []); _f < _g.length; _f++) {
                var words = _g[_f];
                var texto = textoDe(words);
                if (texto.length < 4)
                    continue; // precios sueltos, viñetas, adornos
                var box = cajaDe(words, width, height);
                if (!box)
                    continue;
                lineas.push({ texto: texto, box: box });
            }
        }
    }
    return { width: width, height: height, lineas: lineas };
};
exports.extraerLineas = extraerLineas;
