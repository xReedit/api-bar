"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.costoPersonal = void 0;
var axios_1 = __importDefault(require("axios"));
var jwt = __importStar(require("jsonwebtoken"));
var client_1 = require("@prisma/client");
var dotenv_1 = __importDefault(require("dotenv"));
var logger_1 = require("../../utils/logger");
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
/**
 * Costo de personal, para el asistente.
 *
 * El costo NO se calcula aqui: vive en el API de Recursos Humanos, que es el
 * mismo motor con el que se arma la boleta. Si el asistente lo calculara por su
 * lado, tarde o temprano diria un numero distinto al de la planilla y no habria
 * forma de saber cual es el bueno.
 *
 * Es el unico dato del asistente que sale de otro servicio, asi que puede no
 * estar: se devuelve `null` y quien llama lo cuenta como "no disponible", en vez
 * de romper la consulta entera.
 */
var API_RRHH = process.env.API_RRHH_URL || 'http://localhost:10323/api-rrhh';
var SECRET_POS = process.env.POS_SHARED_SECRET || '';
function orgDeLaSede(idsede) {
    return __awaiter(this, void 0, void 0, function () {
        var filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$queryRawUnsafe('SELECT idorg FROM sede WHERE idsede = ? LIMIT 1', idsede)];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, filas.length ? Number(filas[0].idorg) : null];
            }
        });
    });
}
function tokenParaRrhh(idorg, idsede) {
    if (!SECRET_POS)
        throw new Error('falta POS_SHARED_SECRET');
    return jwt.sign({ ido: idorg, idsede: idsede, idusuario: 0 }, SECRET_POS, {
        algorithm: 'HS256',
        expiresIn: '2m'
    });
}
/** `periodo` es YYYY-MM: Recursos Humanos razona por mes de planilla. */
function costoPersonal(idsede, periodo) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var idorg, r, datos, error_1, detalle;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, orgDeLaSede(idsede)];
                case 1:
                    idorg = _e.sent();
                    if (!idorg)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, axios_1["default"].post("".concat(API_RRHH, "/asistencia/costo"), { periodo: periodo }, {
                            headers: { Authorization: 'Bearer ' + tokenParaRrhh(idorg, idsede) },
                            // Que Recursos Humanos tarde no puede dejar colgado un turno del chat.
                            timeout: 15000
                        })];
                case 2:
                    r = _e.sent();
                    datos = (_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.datos) !== null && _b !== void 0 ? _b : r.data;
                    if (!datos || datos.sin_rrhh)
                        return [2 /*return*/, null];
                    return [2 /*return*/, { periodo: periodo, datos: datos }];
                case 3:
                    error_1 = _e.sent();
                    detalle = ((_d = (_c = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'error desconocido';
                    logger_1.logger.error('[asistente] Recursos Humanos no respondio:', detalle);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.costoPersonal = costoPersonal;
