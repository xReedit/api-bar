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
exports.pronostico = exports.ubicacionDeSede = void 0;
var axios_1 = __importDefault(require("axios"));
var client_1 = require("@prisma/client");
var errores_1 = require("../dash/errores");
var prisma = new client_1.PrismaClient();
/**
 * Clima por sede.
 *
 * Es negocio disfrazado: la lluvia explica una caida y un feriado soleado explica
 * un pico. Un local con terraza planifica personal e insumos con esto.
 *
 * Open-Meteo: gratuito y sin API key, una credencial menos que gestionar.
 * La ubicacion sale de la sede en el servidor; el modelo no propone coordenadas.
 */
var URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast';
var URL_GEO = 'https://geocoding-api.open-meteo.com/v1/search';
/** Codigos WMO a algo que entienda una persona. */
var CIELO = {
    0: 'despejado',
    1: 'mayormente despejado',
    2: 'parcialmente nublado',
    3: 'nublado',
    45: 'niebla',
    48: 'niebla con escarcha',
    51: 'llovizna ligera',
    53: 'llovizna',
    55: 'llovizna intensa',
    61: 'lluvia ligera',
    63: 'lluvia',
    65: 'lluvia fuerte',
    80: 'chubascos ligeros',
    81: 'chubascos',
    82: 'chubascos fuertes',
    95: 'tormenta',
    96: 'tormenta con granizo',
    99: 'tormenta fuerte con granizo'
};
/** Geocodificaciones ya resueltas; la ciudad de una sede no cambia. */
var cacheGeo = new Map();
function geocodificar(ciudad) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var clave, data, r, ubicacion, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    clave = ciudad.trim().toLowerCase();
                    if (cacheGeo.has(clave))
                        return [2 /*return*/, (_a = cacheGeo.get(clave)) !== null && _a !== void 0 ? _a : null];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(URL_GEO, {
                            params: { name: ciudad, count: 1, language: 'es', country: 'PE' },
                            timeout: 8000
                        })];
                case 2:
                    data = (_d.sent()).data;
                    r = (_b = data === null || data === void 0 ? void 0 : data.results) === null || _b === void 0 ? void 0 : _b[0];
                    ubicacion = r
                        ? { latitud: Number(r.latitude), longitud: Number(r.longitude), etiqueta: String(r.name) }
                        : null;
                    cacheGeo.set(clave, ubicacion);
                    return [2 /*return*/, ubicacion];
                case 3:
                    _c = _d.sent();
                    cacheGeo.set(clave, null);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** Coordenadas de la sede: de la tabla si las tiene, si no por su ciudad. */
function ubicacionDeSede(idsede) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var filas, sede, lat, lon, porCiudad, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT nombre, ciudad, latitude, longitude FROM sede WHERE idsede = ", " LIMIT 1"], ["\n        SELECT nombre, ciudad, latitude, longitude FROM sede WHERE idsede = ", " LIMIT 1"])), idsede)];
                case 1:
                    filas = _c.sent();
                    sede = filas === null || filas === void 0 ? void 0 : filas[0];
                    if (!sede)
                        throw new errores_1.ErrorValidacion('Sede no encontrada');
                    lat = sede.latitude !== null ? Number(sede.latitude) : NaN;
                    lon = sede.longitude !== null ? Number(sede.longitude) : NaN;
                    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
                        return [2 /*return*/, { latitud: lat, longitud: lon, etiqueta: String((_a = sede.ciudad) !== null && _a !== void 0 ? _a : sede.nombre) }];
                    }
                    if (!sede.ciudad) return [3 /*break*/, 3];
                    return [4 /*yield*/, geocodificar(String(sede.ciudad))];
                case 2:
                    _b = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _b = null;
                    _c.label = 4;
                case 4:
                    porCiudad = _b;
                    if (!porCiudad) {
                        throw new errores_1.ErrorValidacion("No tengo la ubicacion de ".concat(sede.nombre, ". Falta cargar sus coordenadas o su ciudad."));
                    }
                    return [2 /*return*/, porCiudad];
            }
        });
    });
}
exports.ubicacionDeSede = ubicacionDeSede;
/** Pronostico diario. Open-Meteo cubre hasta 16 dias hacia adelante. */
function pronostico(idsede, dias) {
    return __awaiter(this, void 0, void 0, function () {
        var ubicacion, acotado, data, d;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ubicacionDeSede(idsede)];
                case 1:
                    ubicacion = _a.sent();
                    acotado = Math.min(Math.max(dias, 1), 14);
                    return [4 /*yield*/, axios_1["default"].get(URL_PRONOSTICO, {
                            params: {
                                latitude: ubicacion.latitud,
                                longitude: ubicacion.longitud,
                                daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
                                timezone: 'America/Lima',
                                forecast_days: acotado
                            },
                            timeout: 10000
                        })];
                case 2:
                    data = (_a.sent()).data;
                    d = data === null || data === void 0 ? void 0 : data.daily;
                    if (!(d === null || d === void 0 ? void 0 : d.time))
                        throw new Error('El servicio de clima no devolvio datos');
                    return [2 /*return*/, {
                            lugar: ubicacion.etiqueta,
                            dias: d.time.map(function (fecha, i) {
                                var _a, _b, _c;
                                return ({
                                    fecha: fecha,
                                    minima: Math.round(d.temperature_2m_min[i]),
                                    maxima: Math.round(d.temperature_2m_max[i]),
                                    lluvia_mm: Number((_a = d.precipitation_sum[i]) !== null && _a !== void 0 ? _a : 0),
                                    prob_lluvia_pct: Number((_b = d.precipitation_probability_max[i]) !== null && _b !== void 0 ? _b : 0),
                                    cielo: (_c = CIELO[d.weather_code[i]]) !== null && _c !== void 0 ? _c : 'variable'
                                });
                            })
                        }];
            }
        });
    });
}
exports.pronostico = pronostico;
var templateObject_1;
