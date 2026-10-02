"use strict";
// Indicadores de Recursos Humanos para el dashboard.
//
// DE DONDE SALEN LOS DATOS
// El costo de personal NO se calcula aqui. Vive en el API de Recursos Humanos,
// que es el que tiene las marcas, los horarios y los contratos, y es el mismo
// motor con el que se arma la boleta. Este controlador es un puente.
//
// POR QUE UN PUENTE Y NO LA CUENTA HECHA ACA
// Si el dashboard calculara el costo por su lado, tarde o temprano mostraria
// un numero distinto al de la planilla. Y cuando el dueno pregunte cual es el
// bueno, no va a haber respuesta. Un solo motor, dos pantallas.
//
// LAS VENTAS NO PASAN POR AQUI
// A proposito. El dashboard ya sabe traer sus ventas, y esa cifra se muestra
// en media docena de pantallas: si esta pagina trajera las suyas por otro
// camino, habria dos numeros de venta para el mismo dia. La pagina combina el
// costo que da este endpoint con las ventas que ya sabe pedir.
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
var express = __importStar(require("express"));
var axios_1 = __importDefault(require("axios"));
var jwt = __importStar(require("jsonwebtoken"));
var client_1 = require("@prisma/client");
var dotenv_1 = __importDefault(require("dotenv"));
var logger_1 = require("../../utils/logger");
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
var router = express.Router();
/**
 * La empresa a la que pertenece una sede.
 *
 * Se busca aqui y NO se acepta del cliente. El dashboard sabe en que sede esta
 * parado; de que empresa es, lo dice la base. Si viniera en el cuerpo, cambiar
 * ese numero mostraria la planilla de otro negocio.
 */
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
/** Donde vive el API de Recursos Humanos. */
var API_RRHH = process.env.API_RRHH_URL || 'http://localhost:10323/api-rrhh';
/**
 * El secreto que comparten el POS y Recursos Humanos.
 *
 * Es la misma puerta que usa el POS para hablar con RRHH. Aqui se usa para lo
 * mismo: un servidor llamando a otro. El token lleva la empresa y la sede, y
 * del otro lado se verifica la firma -- no se confia en lo que diga el cliente.
 */
var SECRET_POS = process.env.POS_SHARED_SECRET || '';
function tokenParaRrhh(idorg, idsede) {
    if (!SECRET_POS) {
        throw new Error('falta POS_SHARED_SECRET en el .env: sin eso no se puede consultar Recursos Humanos');
    }
    // Corto a proposito: se emite para esta llamada y nada mas.
    return jwt.sign({ ido: idorg, idsede: idsede, idusuario: 0 }, SECRET_POS, { algorithm: 'HS256', expiresIn: '2m' });
}
router.get("/", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estas conectado al api dash RRHH' });
        return [2 /*return*/];
    });
}); });
/**
 * Costo de personal de un periodo.
 *
 * Body: `{ idsede, params: { periodo } }`
 *   - `idsede` es el del POS (restobar.sede), no el de Recursos Humanos.
 *   - `periodo` es la clave que arma RRHH ('2026-09' o el primer dia del
 *     periodo). Si no viene, RRHH resuelve el periodo en curso.
 */
router.post("/get-dash-rrhh-costo", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, idorg, r, error_1, detalle;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _a = req.body || {}, idsede = _a.idsede, params = _a.params;
                if (!idsede) {
                    return [2 /*return*/, res.status(400).json({ error: 'Falta la sede.' })];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 4, , 5]);
                return [4 /*yield*/, orgDeLaSede(Number(idsede))];
            case 2:
                idorg = _f.sent();
                if (!idorg) {
                    return [2 /*return*/, res.status(404).json({ error: 'Esa sede no existe.' })];
                }
                return [4 /*yield*/, axios_1["default"].post("".concat(API_RRHH, "/asistencia/costo"), { periodo: params === null || params === void 0 ? void 0 : params.periodo }, {
                        headers: { Authorization: 'Bearer ' + tokenParaRrhh(Number(idorg), Number(idsede)) },
                        // Si Recursos Humanos no contesta, esta pagina no puede colgar
                        // al dashboard entero esperando.
                        timeout: 15000
                    })];
            case 3:
                r = _f.sent();
                res.status(200).json((_c = (_b = r.data) === null || _b === void 0 ? void 0 : _b.datos) !== null && _c !== void 0 ? _c : r.data);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _f.sent();
                detalle = ((_e = (_d = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'error desconocido';
                logger_1.logger.error('[dash-rrhh] no se pudo consultar Recursos Humanos:', detalle);
                res.status(200).json({
                    sin_rrhh: true,
                    no_disponible: true,
                    motivo: detalle
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Costo de personal de TODAS las sedes de la empresa, para compararlas.
 *
 * No se manda la lista de sedes: la arma Recursos Humanos a partir de la
 * empresa del token. Mandarla desde aqui seria darle al cliente la posibilidad
 * de pedir una sede que no es suya.
 *
 * Body: `{ idsede, params: { periodo } }`
 *
 * El `idsede` viaja solo para que el token sea valido -- la puerta de Recursos
 * Humanos exige empresa Y sede, y con razon: un token sin sede serviria para
 * cualquiera. Del otro lado no se usa, porque las sedes se listan a partir de
 * la empresa.
 */
router.post("/get-dash-rrhh-sedes", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, idorg, r, error_2, detalle;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _a = req.body || {}, idsede = _a.idsede, params = _a.params;
                if (!idsede) {
                    return [2 /*return*/, res.status(400).json({ error: 'Falta la sede.' })];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 4, , 5]);
                return [4 /*yield*/, orgDeLaSede(Number(idsede))];
            case 2:
                idorg = _f.sent();
                if (!idorg) {
                    return [2 /*return*/, res.status(404).json({ error: 'Esa sede no existe.' })];
                }
                return [4 /*yield*/, axios_1["default"].post(API_RRHH + '/asistencia/costo-sedes', { periodo: params === null || params === void 0 ? void 0 : params.periodo }, {
                        headers: { Authorization: 'Bearer ' + tokenParaRrhh(Number(idorg), Number(idsede)) },
                        timeout: 30000 // son varias planillas, una por local
                    })];
            case 3:
                r = _f.sent();
                res.status(200).json((_c = (_b = r.data) === null || _b === void 0 ? void 0 : _b.datos) !== null && _c !== void 0 ? _c : r.data);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _f.sent();
                detalle = ((_e = (_d = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || 'error desconocido';
                logger_1.logger.error('[dash-rrhh] no se pudieron comparar las sedes:', detalle);
                res.status(200).json({ sin_rrhh: true, no_disponible: true, motivo: detalle, sedes: [] });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
