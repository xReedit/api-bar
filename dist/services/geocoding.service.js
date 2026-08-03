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
exports.GeocodingService = exports.clasificarConfianza = void 0;
var axios_1 = __importDefault(require("axios"));
var getApiKey = function () { return process.env.GOOGLE_MAPS_API_KEY || ''; };
/**
 * Clasifica qué tan confiable es un resultado de la Geocoding API.
 * partial_match = Google no encontró exacto y devolvió lo más parecido;
 * locality/APPROXIMATE = solo ubicó la ciudad (típico con calles mal escritas).
 */
var clasificarConfianza = function (result) {
    var _a;
    if (result === null || result === void 0 ? void 0 : result.partial_match)
        return 'baja';
    var types = (result === null || result === void 0 ? void 0 : result.types) || [];
    if (types.includes('locality'))
        return 'baja';
    if (((_a = result === null || result === void 0 ? void 0 : result.geometry) === null || _a === void 0 ? void 0 : _a.location_type) === 'APPROXIMATE')
        return 'baja';
    return 'alta';
};
exports.clasificarConfianza = clasificarConfianza;
var GeocodingService = /** @class */ (function () {
    function GeocodingService() {
    }
    GeocodingService.obtenerCoordenadas = function (direccion, ciudad) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, direccionCompleta, url, response, location, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        apiKey = getApiKey();
                        if (!apiKey) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'API Key de Google Maps no configurada'
                                }];
                        }
                        direccionCompleta = "".concat(direccion, ", ").concat(ciudad, ", Peru");
                        url = "https://maps.googleapis.com/maps/api/geocode/json";
                        return [4 /*yield*/, axios_1["default"].get(url, {
                                params: {
                                    address: direccionCompleta,
                                    key: apiKey
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'No se pudo geocodificar la dirección'
                                }];
                        }
                        location = response.data.results[0].geometry.location;
                        return [2 /*return*/, {
                                success: true,
                                coordenadas: {
                                    lat: location.lat,
                                    lng: location.lng
                                }
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error en geocodificación:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message || 'Error al obtener coordenadas'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Reverse geocoding: coordenadas GPS -> dirección legible. Usado cuando el
    // cliente comparte su ubicación por WhatsApp (antes quedaba "GPS" como dirección).
    GeocodingService.obtenerDireccion = function (lat, lng) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, response, result, ciudad_1, provincia_1, departamento_1, pais_1, codigo_1, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        apiKey = getApiKey();
                        if (!apiKey) {
                            return [2 /*return*/, { success: false, error: 'API Key de Google Maps no configurada' }];
                        }
                        return [4 /*yield*/, axios_1["default"].get('https://maps.googleapis.com/maps/api/geocode/json', {
                                params: { latlng: "".concat(lat, ",").concat(lng), key: apiKey, language: 'es' }
                            })];
                    case 1:
                        response = _b.sent();
                        if (response.data.status !== 'OK' || !((_a = response.data.results) === null || _a === void 0 ? void 0 : _a.length)) {
                            return [2 /*return*/, { success: false, error: 'No se pudo obtener la dirección' }];
                        }
                        result = response.data.results[0];
                        ciudad_1 = '', provincia_1 = '', departamento_1 = '', pais_1 = '', codigo_1 = '';
                        result.address_components.forEach(function (component) {
                            if (component.types.includes('locality'))
                                ciudad_1 = component.long_name;
                            if (component.types.includes('administrative_area_level_2'))
                                provincia_1 = component.long_name;
                            if (component.types.includes('administrative_area_level_1'))
                                departamento_1 = component.long_name;
                            if (component.types.includes('country'))
                                pais_1 = component.long_name;
                            if (component.types.includes('postal_code'))
                                codigo_1 = component.long_name;
                        });
                        return [2 /*return*/, {
                                success: true,
                                direccion: result.formatted_address,
                                ciudad: ciudad_1,
                                provincia: provincia_1,
                                departamento: departamento_1,
                                pais: pais_1,
                                codigo: codigo_1
                            }];
                    case 2:
                        error_2 = _b.sent();
                        console.error('Error en reverse geocoding:', error_2);
                        return [2 /*return*/, { success: false, error: error_2.message || 'Error al obtener dirección' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GeocodingService.calcularDistanciaHaversine = function (lat1, lon1, lat2, lon2) {
        var R = 6371;
        var dLat = this.toRad(lat2 - lat1);
        var dLon = this.toRad(lon2 - lon1);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var distancia = R * c;
        return Math.round(distancia * 100) / 100;
    };
    GeocodingService.toRad = function (grados) {
        return grados * (Math.PI / 180);
    };
    GeocodingService.calcularDistanciaRuta = function (direccion, latComercio, lngComercio, kmLimite, ciudades) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, url, ciudadesABuscar, _loop_1, this_1, _i, ciudadesABuscar_1, ciudad, state_1, lugar, distanciaKm, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        apiKey = getApiKey();
                        if (!apiKey) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'API Key de Google Maps no configurada'
                                }];
                        }
                        url = "https://maps.googleapis.com/maps/api/geocode/json";
                        ciudadesABuscar = ciudades && ciudades.length > 0 ? ciudades : [''];
                        _loop_1 = function (ciudad) {
                            var direccionCompleta, response, location, addressComponents, ciudadExtraida, provinciaExtraida, departamentoExtraido, paisExtraido, codigoExtraido, distanciaKm, confianza;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        direccionCompleta = ciudad
                                            ? "".concat(direccion, ", ").concat(ciudad, ", Peru")
                                            : "".concat(direccion, ", Peru");
                                        console.log('Geocodificando:', direccionCompleta);
                                        return [4 /*yield*/, axios_1["default"].get(url, {
                                                params: {
                                                    address: direccionCompleta,
                                                    key: apiKey,
                                                    region: 'pe'
                                                }
                                            })];
                                    case 1:
                                        response = _b.sent();
                                        if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                                            // Distinguir "no existe" de errores de API (key, billing, etc.):
                                            // antes REQUEST_DENIED se logueaba igual que dirección no hallada.
                                            if (!['OK', 'ZERO_RESULTS'].includes(response.data.status)) {
                                                console.error('Geocoding API:', response.data.status, response.data.error_message || '');
                                            }
                                            console.log("No se encontr\u00F3 direcci\u00F3n con ciudad \"".concat(ciudad, "\""));
                                            return [2 /*return*/, "continue"];
                                        }
                                        location = response.data.results[0].geometry.location;
                                        addressComponents = response.data.results[0].address_components;
                                        ciudadExtraida = '';
                                        provinciaExtraida = '';
                                        departamentoExtraido = '';
                                        paisExtraido = '';
                                        codigoExtraido = '';
                                        addressComponents.forEach(function (component) {
                                            if (component.types.includes('locality')) {
                                                ciudadExtraida = component.long_name;
                                            }
                                            if (component.types.includes('administrative_area_level_2')) {
                                                provinciaExtraida = component.long_name;
                                            }
                                            if (component.types.includes('administrative_area_level_1')) {
                                                departamentoExtraido = component.long_name;
                                            }
                                            if (component.types.includes('country')) {
                                                paisExtraido = component.long_name;
                                            }
                                            if (component.types.includes('postal_code')) {
                                                codigoExtraido = component.long_name;
                                            }
                                        });
                                        distanciaKm = this_1.calcularDistanciaHaversine(latComercio, lngComercio, location.lat, location.lng);
                                        console.log("Encontrado con ciudad \"".concat(ciudad, "\": ").concat(distanciaKm, " km (l\u00EDnea recta)"));
                                        confianza = (0, exports.clasificarConfianza)(response.data.results[0]);
                                        if (confianza === 'alta' && distanciaKm > kmLimite) {
                                            return [2 /*return*/, { value: {
                                                        success: false,
                                                        fueraDeCobertura: true,
                                                        error: "Direcci\u00F3n fuera del rango de cobertura (".concat(distanciaKm.toFixed(2), " km, m\u00E1ximo ").concat(kmLimite, " km)")
                                                    } }];
                                        }
                                        return [2 /*return*/, { value: {
                                                    success: true,
                                                    lat: location.lat,
                                                    lng: location.lng,
                                                    distanciaKm: Math.round(distanciaKm * 100) / 100,
                                                    ciudad: ciudadExtraida,
                                                    provincia: provinciaExtraida,
                                                    departamento: departamentoExtraido,
                                                    pais: paisExtraido,
                                                    codigo: codigoExtraido,
                                                    confianza: confianza,
                                                    direccionFormateada: response.data.results[0].formatted_address
                                                } }];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, ciudadesABuscar_1 = ciudadesABuscar;
                        _a.label = 1;
                    case 1:
                        if (!(_i < ciudadesABuscar_1.length)) return [3 /*break*/, 4];
                        ciudad = ciudadesABuscar_1[_i];
                        return [5 /*yield**/, _loop_1(ciudad)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [4 /*yield*/, this.buscarConPlaces(direccion, ciudadesABuscar[0] || '', latComercio, lngComercio)];
                    case 5:
                        lugar = _a.sent();
                        if (lugar.success && lugar.lat !== undefined && lugar.lng !== undefined) {
                            distanciaKm = this.calcularDistanciaHaversine(latComercio, lngComercio, lugar.lat, lugar.lng);
                            console.log("Places fallback encontr\u00F3 \"".concat(lugar.direccion, "\": ").concat(distanciaKm, " km"));
                            return [2 /*return*/, {
                                    success: true,
                                    lat: lugar.lat,
                                    lng: lugar.lng,
                                    distanciaKm: Math.round(distanciaKm * 100) / 100,
                                    confianza: 'baja',
                                    direccionFormateada: lugar.direccion
                                }];
                        }
                        return [2 /*return*/, {
                                success: false,
                                error: 'No se pudo encontrar la dirección en ninguna de las ciudades de cobertura'
                            }];
                    case 6:
                        error_3 = _a.sent();
                        console.error('Error al geocodificar:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3.message || 'Error al calcular distancia'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    GeocodingService.calcularDistancia = function (direccionCliente, ciudadComercio, latComercio, lngComercio) {
        return __awaiter(this, void 0, void 0, function () {
            var resultadoGeo, distanciaKm, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.obtenerCoordenadas(direccionCliente, ciudadComercio)];
                    case 1:
                        resultadoGeo = _a.sent();
                        if (!resultadoGeo.success || !resultadoGeo.coordenadas) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: resultadoGeo.error || 'No se pudo obtener coordenadas'
                                }];
                        }
                        distanciaKm = this.calcularDistanciaHaversine(latComercio, lngComercio, resultadoGeo.coordenadas.lat, resultadoGeo.coordenadas.lng);
                        return [2 /*return*/, {
                                success: true,
                                distanciaKm: distanciaKm
                            }];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Error al calcular distancia:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4.message || 'Error al calcular distancia'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Places Text Search: tolera direcciones mal escritas ("jr calao" → Jr.
    // Callao). Solo se usa como fallback cuando la Geocoding API no encontró.
    GeocodingService.buscarConPlaces = function (direccion, ciudad, lat, lng) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function () {
            var query, response, r, error_5;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 2, , 3]);
                        query = ciudad ? "".concat(direccion, ", ").concat(ciudad, ", Peru") : "".concat(direccion, ", Peru");
                        return [4 /*yield*/, axios_1["default"].get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
                                params: { query: query, location: "".concat(lat, ",").concat(lng), radius: 15000, region: 'pe', key: getApiKey() }
                            })];
                    case 1:
                        response = _h.sent();
                        r = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.results) === null || _b === void 0 ? void 0 : _b[0];
                        if (((_c = response.data) === null || _c === void 0 ? void 0 : _c.status) !== 'OK' || !((_d = r === null || r === void 0 ? void 0 : r.geometry) === null || _d === void 0 ? void 0 : _d.location)) {
                            if (!['OK', 'ZERO_RESULTS'].includes((_e = response.data) === null || _e === void 0 ? void 0 : _e.status)) {
                                console.error('Places API:', (_f = response.data) === null || _f === void 0 ? void 0 : _f.status, ((_g = response.data) === null || _g === void 0 ? void 0 : _g.error_message) || '');
                            }
                            return [2 /*return*/, { success: false }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                direccion: r.formatted_address || r.name,
                                lat: r.geometry.location.lat,
                                lng: r.geometry.location.lng
                            }];
                    case 2:
                        error_5 = _h.sent();
                        console.error('Error en Places fallback:', error_5.message);
                        return [2 /*return*/, { success: false }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GeocodingService.calcularDistanciaPorRango = function (direccionCliente, latComercio, lngComercio, kmLimite, ciudades) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.calcularDistanciaRuta(direccionCliente, latComercio, lngComercio, kmLimite, ciudades)];
            });
        });
    };
    return GeocodingService;
}());
exports.GeocodingService = GeocodingService;
