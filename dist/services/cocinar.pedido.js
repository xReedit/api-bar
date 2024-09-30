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
exports.getEstructuraPedido = void 0;
// SE ENCARGA DE COCINAR EL PEDIDO
var axios_1 = __importDefault(require("axios"));
var pedido_services_1 = __importDefault(require("./pedido.services"));
var estructura_pedido_1 = __importDefault(require("../class/estructura.pedido"));
var getEstructuraPedido = function (items, tipo_entrega, datos_entrega, idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var pedidoServices, classEstructuraPedido, rules, items_secciones, secciones, canales_consumo, canalConsumoMasPedido, arrTotales;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pedidoServices = new pedido_services_1["default"]();
                classEstructuraPedido = new estructura_pedido_1["default"]();
                return [4 /*yield*/, getReglasCarta(idsede)];
            case 1:
                rules = _a.sent();
                pedidoServices.setRules(rules);
                return [4 /*yield*/, getSeccionItemsCartaSelected(idsede, items)];
            case 2:
                items_secciones = _a.sent();
                secciones = items_secciones.secciones;
                return [4 /*yield*/, getCanalesConsumo(idsede)];
            case 3:
                canales_consumo = _a.sent();
                // cocinamos el pedido
                secciones = pedidoServices.cocinarPedido(secciones, items);
                canalConsumoMasPedido = pedidoServices.setCanalConsumo(tipo_entrega, canales_consumo, secciones);
                classEstructuraPedido.setTipoConsumo(canalConsumoMasPedido);
                return [4 /*yield*/, pedidoServices.calcularTotalPedido(secciones, tipo_entrega, datos_entrega)];
            case 4:
                arrTotales = _a.sent();
                classEstructuraPedido.setSubtotal(arrTotales);
                return [2 /*return*/, classEstructuraPedido.getEstructura()];
        }
    });
}); };
exports.getEstructuraPedido = getEstructuraPedido;
var getReglasCarta = function (idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var baseUrl, response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                baseUrl = getBaseUrl();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, axios_1["default"].get("".concat(baseUrl, "/get-reglas-carta/").concat(idsede, "/0"))];
            case 2:
                response = _a.sent();
                return [2 /*return*/, response.data];
            case 3:
                error_1 = _a.sent();
                console.error(error_1);
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
function getSeccionItemsCartaSelected(idsede, items) {
    return __awaiter(this, void 0, void 0, function () {
        var baseUrl, response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseUrl = getBaseUrl();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].post("".concat(baseUrl, "/get-seccion-items"), {
                            idsede: idsede,
                            items: items
                        })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_2 = _a.sent();
                    console.log(error_2);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getCanalesConsumo(idsede) {
    return __awaiter(this, void 0, void 0, function () {
        var baseUrl, response, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseUrl = getBaseUrl();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get("".concat(baseUrl, "/canales/").concat(idsede))];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_3 = _a.sent();
                    console.error(error_3);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var getBaseUrl = function () {
    var _baseUrl = process.env.BASE_URL || 'http://localhost:20223';
    return _baseUrl + '/api-restobar/chat-bot';
};
