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
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api restobar cobranza' });
        return [2 /*return*/];
    });
}); });
// verificar advertencia de pago del servicio
router.get("/advertencia/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rptData, rpt, ultimaFechaPago, frecuenciaPago, fechaProximoPago, hoy, diasRestantes, mensaje, diasPasados, tiempoAdvertencia, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 12, , 13]);
                return [4 /*yield*/, prisma.sede_suscripcion.findMany({
                        where: {
                            idsede: parseInt(idsede),
                            estado: '0'
                        }
                    })];
            case 2:
                rptData = _a.sent();
                // Si no hay suscripción, no mostrar advertencia
                if (rptData.length === 0) {
                    return [2 /*return*/, res.json({ mostrar: false })];
                }
                rpt = rptData[0];
                ultimaFechaPago = rpt.ultimo_pago;
                // Validar fecha de último pago (evitar fechas inválidas como 1969-12-31)
                if (!ultimaFechaPago || new Date(ultimaFechaPago).getFullYear() < 2000) {
                    return [2 /*return*/, res.json({ mostrar: false })];
                }
                frecuenciaPago = rpt.frecuencia.toLowerCase();
                fechaProximoPago = new Date(ultimaFechaPago);
                switch (frecuenciaPago) {
                    case 'mensual':
                        fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
                        break;
                    case 'semestral':
                        fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 6);
                        break;
                    case 'anual':
                        fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1);
                        break;
                    default:
                        // Si no hay frecuencia válida, asumir mensual
                        fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
                }
                hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                fechaProximoPago.setHours(0, 0, 0, 0);
                diasRestantes = Math.ceil((fechaProximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                mensaje = 'Le recordamos el pago del servicio.';
                if (!(diasRestantes > 0 && diasRestantes <= 3)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.sede_estado.updateMany({
                        where: {
                            idsede: parseInt(idsede),
                            is_advertencia: '0'
                        },
                        data: {
                            is_advertencia: '1'
                        }
                    })];
            case 3:
                _a.sent();
                mensaje = "Su pago vence en ".concat(diasRestantes, " d\u00EDa").concat(diasRestantes > 1 ? 's' : '', ". Le recordamos realizar el pago a tiempo.");
                return [2 /*return*/, res.json({ mostrar: true, tiempo: 5, diasRestantes: diasRestantes, msj: mensaje })];
            case 4:
                if (!(diasRestantes <= 0)) return [3 /*break*/, 11];
                diasPasados = Math.abs(diasRestantes);
                tiempoAdvertencia = 5 + (diasPasados * 3);
                if (!(diasPasados >= 1 && diasPasados <= 10)) return [3 /*break*/, 6];
                mensaje = "Estimado cliente, han pasado ".concat(diasPasados, " d\u00EDa").concat(diasPasados > 1 ? 's' : '', " desde la fecha de vencimiento de su pago. Le recordamos amablemente que realice su pago para evitar interrupciones en el servicio.");
                return [4 /*yield*/, prisma.sede_estado.updateMany({
                        where: { idsede: parseInt(idsede) },
                        data: {
                            is_bloqueo_contador: '1',
                            is_advertencia: '1'
                        }
                    })];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6:
                // 11-20 días vencidos: Advertencia de suspensión
                if (diasPasados > 10 && diasPasados <= 20) {
                    mensaje = "Estimado cliente, han pasado ".concat(diasPasados, " d\u00EDas desde el vencimiento de su pago. Si el retraso supera los 20 d\u00EDas, el servicio ser\u00E1 suspendido. Papaya.com.pe no se har\u00E1 responsable de los inconvenientes que esto pueda causar.");
                    tiempoAdvertencia = Math.min(tiempoAdvertencia, 60); // Máximo 60 segundos
                }
                if (!(diasPasados > 20)) return [3 /*break*/, 10];
                mensaje = "Estimado cliente, su servicio ha sido suspendido debido a la falta de pago. Regularice su pago para reactivar el servicio.";
                if (!(rpt.activo === '0')) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma.sede_suscripcion.update({
                        where: { idsede_suscripcion: rpt.idsede_suscripcion },
                        data: { activo: '1' } // 1 = no activo/suspendido
                    })];
            case 7:
                _a.sent();
                return [4 /*yield*/, prisma.sede_estado.updateMany({
                        where: { idsede: parseInt(idsede) },
                        data: {
                            is_bloqueado: '1',
                            fecha_bloqueo: new Date()
                        }
                    })];
            case 8:
                _a.sent();
                _a.label = 9;
            case 9:
                tiempoAdvertencia = 1000; // No se puede omitir fácilmente
                _a.label = 10;
            case 10: return [2 /*return*/, res.json({
                    mostrar: true,
                    tiempo: tiempoAdvertencia,
                    diasRestantes: diasRestantes,
                    diasPasados: diasPasados,
                    msj: mensaje
                })];
            case 11: 
            // CASO 3: Faltan más de 3 días, todo bien
            return [2 /*return*/, res.json({ mostrar: false })];
            case 12:
                error_1 = _a.sent();
                console.error('Error en advertencia cobranza:', error_1);
                return [2 /*return*/, res.json({ mostrar: false })];
            case 13: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
