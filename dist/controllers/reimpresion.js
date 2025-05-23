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
router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado al reimpresion' });
});
// reimprimir comprobante por idcomprobante
router.get('/reimprimir-comprobante/:idregistro_pago', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idregistro_pago, _registro_pago, _idce, comprobante, confPrintSede, serie, correlativo, descripcionDocumento, ArrayComprobante, registroPagoSubtotal, ArraySubTotales, datosReceptor, ArrayCliente, itemsComprobante, listItems, ArrayItem, sede, Array_enca, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idregistro_pago = req.params.idregistro_pago;
                return [4 /*yield*/, prisma.registro_pago.findFirst({
                        select: { idce: true },
                        where: { idregistro_pago: Number(idregistro_pago) }
                    })];
            case 1:
                _registro_pago = _a.sent();
                if (!_registro_pago) {
                    res.status(200).send({ message: "No se encontro registro de pago" });
                    return [2 /*return*/];
                }
                _idce = _registro_pago.idce;
                return [4 /*yield*/, prisma.ce.findFirst({
                        where: { idce: Number(_idce) }
                    })];
            case 2:
                comprobante = _a.sent();
                return [4 /*yield*/, prisma.conf_print.findFirst({
                        where: { idsede: comprobante.idsede }
                    })
                    // armamos los arrays
                ];
            case 3:
                confPrintSede = _a.sent();
                serie = comprobante.numero.split('-')[0];
                correlativo = comprobante.numero.split('-')[1];
                descripcionDocumento = serie.includes('F') ? 'Factura' : 'Boleta';
                ArrayComprobante = {
                    "serie": serie,
                    "correlativo": correlativo,
                    "descripcion": descripcionDocumento,
                    "pie_pagina_comprobante": confPrintSede.pie_pagina_comprobante
                };
                return [4 /*yield*/, prisma.registro_pago_subtotal.findMany({
                        where: { idregistro_pago: Number(idregistro_pago) }
                    })];
            case 4:
                registroPagoSubtotal = _a.sent();
                ArraySubTotales = [];
                registroPagoSubtotal.map(function (item) {
                    ArraySubTotales.push({
                        "quitar": false,
                        "importe": item.importe,
                        "visible": true,
                        "descripcion": item.descripcion,
                        "visible_cpe": true
                    });
                });
                datosReceptor = JSON.parse(comprobante.json_xml).datos_del_cliente_o_receptor;
                ArrayCliente = {
                    "nombres": datosReceptor.apellidos_y_nombres_o_razon_social,
                    "num_doc": datosReceptor.numero_documento,
                    "telefono": datosReceptor.telefono,
                    "direccion": datosReceptor.direccion
                };
                itemsComprobante = JSON.parse(comprobante.json_xml).items;
                listItems = [];
                itemsComprobante.map(function (item) {
                    listItems.push({
                        "id": "",
                        "des": item.descripcion,
                        "seccion": "",
                        "cantidad": item.cantidad,
                        "punitario": item.punitario,
                        "precio_print": item.total_item,
                        "precio_total": item.total_item,
                        "tipo_consumo": ""
                    });
                });
                ArrayItem = {
                    "0": listItems
                };
                return [4 /*yield*/, prisma.sede.findFirst({
                        where: { idsede: comprobante.idsede }
                    })];
            case 5:
                sede = _a.sent();
                Array_enca = {
                    ruc: sede.ruc_cpe,
                    nom_us: '',
                    nombre: sede.razonsocial_cpe,
                    direccion: sede.direccion,
                    telefono: sede.telefono,
                    sedeciudad: sede.ciudad,
                    sedenombre: sede.nombre,
                    hash: comprobante.external_id,
                    external_id: ''
                };
                rpt = {
                    "ArrayItem": ArrayItem,
                    "ArrayCliente": ArrayCliente,
                    "ArraySubTotales": ArraySubTotales,
                    "ArrayComprobante": ArrayComprobante,
                    "Array_enca": Array_enca,
                    "Array_print": {}
                };
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
