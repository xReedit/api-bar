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
exports.GeocodingService = void 0;
var axios_1 = __importDefault(require("axios"));
var getApiKey = function () { return process.env.GOOGLE_MAPS_API_KEY || ''; };
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
            var apiKey, url, ciudadesABuscar, _i, ciudadesABuscar_1, ciudad, direccionCompleta, response, location, distanciaKm, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        apiKey = getApiKey();
                        if (!apiKey) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'API Key de Google Maps no configurada'
                                }];
                        }
                        url = "https://maps.googleapis.com/maps/api/geocode/json";
                        ciudadesABuscar = ciudades && ciudades.length > 0 ? ciudades : [''];
                        _i = 0, ciudadesABuscar_1 = ciudadesABuscar;
                        _a.label = 1;
                    case 1:
                        if (!(_i < ciudadesABuscar_1.length)) return [3 /*break*/, 4];
                        ciudad = ciudadesABuscar_1[_i];
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
                    case 2:
                        response = _a.sent();
                        if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                            console.log("No se encontr\u00F3 direcci\u00F3n con ciudad \"".concat(ciudad, "\""));
                            return [3 /*break*/, 3];
                        }
                        location = response.data.results[0].geometry.location;
                        distanciaKm = this.calcularDistanciaHaversine(latComercio, lngComercio, location.lat, location.lng);
                        console.log("Encontrado con ciudad \"".concat(ciudad, "\": ").concat(distanciaKm, " km (l\u00EDnea recta)"));
                        if (distanciaKm > kmLimite) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Direcci\u00F3n fuera del rango de cobertura (".concat(distanciaKm.toFixed(2), " km, m\u00E1ximo ").concat(kmLimite, " km)")
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                distanciaKm: Math.round(distanciaKm * 100) / 100
                            }];
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, {
                            success: false,
                            error: 'No se pudo encontrar la dirección en ninguna de las ciudades de cobertura'
                        }];
                    case 5:
                        error_2 = _a.sent();
                        console.error('Error al geocodificar:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2.message || 'Error al calcular distancia'
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    GeocodingService.calcularDistancia = function (direccionCliente, ciudadComercio, latComercio, lngComercio) {
        return __awaiter(this, void 0, void 0, function () {
            var resultadoGeo, distanciaKm, error_3;
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
                        error_3 = _a.sent();
                        console.error('Error al calcular distancia:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3.message || 'Error al calcular distancia'
                            }];
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
