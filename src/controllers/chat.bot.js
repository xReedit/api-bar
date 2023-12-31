"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var utils_1 = require("../utils/utils");
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api chat-bot' });
        return [2 /*return*/];
    });
}); });
// obtner la informacion de la sede
router.get("/get-sede/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.sede.findMany({
                        where: { idsede: Number(idsede) },
                        select: {
                            idsede: true,
                            idorg: true,
                            nombre: true,
                            direccion: true,
                            ciudad: true,
                            telefono: true,
                            latitude: true,
                            longitude: true,
                            provincia: true,
                            departamento: true,
                            codigo_postal: true,
                            simbolo_moneda: true,
                            ruc_cpe: true,
                            razonsocial_cpe: true,
                            pwa_delivery_importe_min: true,
                            pwa_delivery_servicio_propio: true,
                            pwa_delivery_reparto_solo_app: true,
                            pwa_delivery_comercio_paga_entrega: true,
                            pwa_delivery_habilitar_llamar_repartidor_papaya: true,
                            pwa_delivery_habilitar_calc_costo_servicio_solo_app: true,
                            pwa_min_despacho: true,
                            id_api_comprobante: true,
                            metodo_pago_aceptados_chatbot: true,
                            link_carta: true
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// busca cliente por el numero de telefono
router.get("/cliente/:telefono", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var telefono, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                telefono = req.params.telefono;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT c.idcliente, c.nombres, c.direccion, c.telefono, cast(COALESCE(cpd.idcliente_pwa_direccion,0) as char) pwa_direccion,\n    JSON_ARRAYAGG(\n        JSON_OBJECT(\n        'idcliente_pwa_direccion', cpd.idcliente_pwa_direccion,\n        'direccion', cpd.direccion,\n        'referencia', cpd.referencia,\n        'latitude', cpd.latitude,\n        'longitude', cpd.longitude \n        )\n    ) AS direcciones\nFROM cliente c\nleft JOIN (\n\t\tselect cp.idcliente, cp.idcliente_pwa_direccion, cp.direccion, cp.referencia, cp.latitude, cp.longitude \n\t\tfrom cliente_pwa_direccion cp\n\t\torder by cp.idcliente_pwa_direccion desc\t\t\n\t) cpd USING (idcliente)\nWHERE REPLACE(c.telefono, ' ', '') = REPLACE(", ", ' ', '')\nGROUP by SOUNDEX(c.nombres)\nORDER BY c.idcliente DESC\nLIMIT 1;"], ["\n        SELECT c.idcliente, c.nombres, c.direccion, c.telefono, cast(COALESCE(cpd.idcliente_pwa_direccion,0) as char) pwa_direccion,\n    JSON_ARRAYAGG(\n        JSON_OBJECT(\n        'idcliente_pwa_direccion', cpd.idcliente_pwa_direccion,\n        'direccion', cpd.direccion,\n        'referencia', cpd.referencia,\n        'latitude', cpd.latitude,\n        'longitude', cpd.longitude \n        )\n    ) AS direcciones\nFROM cliente c\nleft JOIN (\n\t\tselect cp.idcliente, cp.idcliente_pwa_direccion, cp.direccion, cp.referencia, cp.latitude, cp.longitude \n\t\tfrom cliente_pwa_direccion cp\n\t\torder by cp.idcliente_pwa_direccion desc\t\t\n\t) cpd USING (idcliente)\nWHERE REPLACE(c.telefono, ' ', '') = REPLACE(", ", ' ', '')\nGROUP by SOUNDEX(c.nombres)\nORDER BY c.idcliente DESC\nLIMIT 1;"])), telefono)];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// obtener horarios y dias de atención
router.get("/horarios/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.categoria.findMany({
                        select: {
                            idcategoria: true,
                            idsede: true,
                            idorg: true,
                            descripcion: true,
                            hora_ini: true,
                            hora_fin: true,
                            dia_disponible: true,
                            visible_cliente: true,
                            url_carta: true
                        },
                        where: {
                            AND: {
                                idsede: Number(idsede),
                                estado: 0
                            }
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// obtener los canales de consumot
router.get("/canales/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.tipo_consumo.findMany({
                        where: { AND: {
                                idsede: Number(idsede),
                                // titulo: '',            
                                estado: 0
                            } },
                        select: {
                            idtipo_consumo: true,
                            descripcion: true,
                            idimpresora: true,
                            estado: true,
                            titulo: true,
                            habilitado_chatbot: true
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// obtener los tipos de pago habilitados
router.get("/tipos-pago", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.tipo_pago.findMany({
                    where: { AND: {
                            habilitado_chatbot: '1',
                            estado: 0
                        } },
                    select: {
                        idtipo_pago: true,
                        descripcion: true
                    }
                })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
router.get('/get-carta-establecimiento/:idsede', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["call porcedure_pwa_pedido_carta(0,", ",0)"], ["call porcedure_pwa_pedido_carta(0,", ",0)"
                        // remplazar nombre de las key de la respuesta
                    ])), idsede)];
            case 1:
                rpt = _a.sent();
                // remplazar nombre de las key de la respuesta
                try {
                    data = {
                        carta: rpt[0].f0,
                        bodega: rpt[0].f1,
                        promociones: rpt[0].f2
                    };
                    res.status(200).send(data);
                }
                catch (error) {
                    res.status(500).send(error);
                }
                return [2 /*return*/];
        }
    });
}); });
// obtener las reglas de la carta
router.get("/get-reglas-carta/:idsede/:idorg", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, idorg, rpt, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                idorg = req.params.idorg;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["call procedure_pwa_reglas_carta_subtotales(", ",", ")"], ["call procedure_pwa_reglas_carta_subtotales(", ",", ")"
                        // remplazar nombre de las key de la respuesta
                    ])), idorg, idsede)];
            case 1:
                rpt = _a.sent();
                // remplazar nombre de las key de la respuesta
                try {
                    data = {
                        reglas: rpt[0].f0,
                        subtotales: rpt[0].f1
                    };
                    res.status(200).send(data);
                }
                catch (error) {
                    res.status(500).send(error);
                }
                return [2 /*return*/];
        }
    });
}); });
// obtner la configuracion de delivery de la sede
router.get("/get-config-delivery/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rptConsulta, _parametros, dataSend, _rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.sede_costo_delivery.findMany({
                        where: {
                            AND: {
                                idsede: Number(idsede),
                                estado: '0'
                            }
                        }
                    })
                    // crea
                ];
            case 1:
                rptConsulta = _a.sent();
                if (!(rptConsulta.length === 0)) return [3 /*break*/, 3];
                _parametros = { "km_base": "2", "km_limite": "7", "km_base_costo": "3", "km_adicional_costo": "2" };
                dataSend = {
                    idsede: Number(idsede),
                    ciudades: '',
                    parametros: _parametros
                };
                return [4 /*yield*/, prisma.sede_costo_delivery.create({
                        data: dataSend
                    })];
            case 2:
                _rpt = _a.sent();
                rptConsulta.push(_rpt);
                _a.label = 3;
            case 3:
                res.status(200).send(rptConsulta);
                return [2 /*return*/];
        }
    });
}); });
// obtener impresoras
router.get("/get-impresoras/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n\t,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n\t,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\nfrom conf_print cp \n\tinner join impresora i using(idsede)\nwhere cp.idsede = ", " and i.estado = 0"], ["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n\t,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n\t,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\nfrom conf_print cp \n\tinner join impresora i using(idsede)\nwhere cp.idsede = ", " and i.estado = 0"])), idsede)];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// seccion que mas piden
router.get("/get-seccion-mas-piden/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["select cast(pd.idseccion as char(10)) idseccion, cast(COUNT(p.idpedido) as char(10)) cantidad_seccion  from pedido p\ninner join pedido_detalle pd using (idpedido)\nwhere STR_TO_DATE(fecha, '%d/%m/%Y') >=date_add(curdate(), INTERVAL -3 DAY) and p.idsede = ", " \ngroup by pd.idseccion \norder by cantidad_seccion desc limit 2"], ["select cast(pd.idseccion as char(10)) idseccion, cast(COUNT(p.idpedido) as char(10)) cantidad_seccion  from pedido p\ninner join pedido_detalle pd using (idpedido)\nwhere STR_TO_DATE(fecha, '%d/%m/%Y') >=date_add(curdate(), INTERVAL -3 DAY) and p.idsede = ", " \ngroup by pd.idseccion \norder by cantidad_seccion desc limit 2"])), idsede)];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                return [2 /*return*/];
        }
    });
}); });
// obnter el comprobante electronico
router.get('/get-comprobante-electronico/:idsede/:dni/:serie/:numero/:fecha', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, dni, serie, numero, fecha, isSearchByFecha, _dataSend, rpt, external_id, numero_comprobante, _rpt;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, idsede = _a.idsede, dni = _a.dni, serie = _a.serie, numero = _a.numero, fecha = _a.fecha;
                isSearchByFecha = fecha !== '' || fecha !== '0' ? true : false;
                fecha = isSearchByFecha ? (0, utils_1.fechaGuionASlash)(fecha) : '';
                _dataSend = {
                    idsede: Number(idsede),
                    dni: dni,
                    serie: serie,
                    numero: numero,
                    fecha: fecha,
                    isSearchByFecha: isSearchByFecha ? 1 : 0
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["call procedure_chatbot_getidexternal_comprobante(", ")"], ["call procedure_chatbot_getidexternal_comprobante(", ")"])), JSON.stringify(_dataSend))];
            case 1:
                rpt = _b.sent();
                if (rpt.length > 0) {
                    external_id = rpt[0].f0;
                    numero_comprobante = rpt[0].f1;
                    _rpt = {
                        success: true,
                        external_id: external_id,
                        numero_comprobante: numero_comprobante
                    };
                    res.status(200).send(_rpt);
                    // if (datosReceptor.numero_documento === dni ) {
                    //     res.status(200).send(_rpt);         
                    // }
                }
                else {
                    res.status(500).send({
                        success: false
                    });
                }
                // res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// actualizar carta
router.put('/update-carta/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                dataBody = req.body;
                return [4 /*yield*/, prisma.categoria.updateMany({
                        data: dataBody,
                        where: {
                            idcategoria: Number(id)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
router.put('/update-canal-consumo/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                dataBody = req.body;
                return [4 /*yield*/, prisma.tipo_consumo.updateMany({
                        data: dataBody,
                        where: {
                            idtipo_consumo: Number(id)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// update metodo_pago_aceptados_chatbot por la sede
router.put('/update-tipo-pago-sede/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                dataBody = req.body;
                return [4 /*yield*/, prisma.sede.updateMany({
                        data: dataBody,
                        where: {
                            idsede: Number(id)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// guardar datos del delivery update-config-delivery
router.put('/update-config-delivery/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                dataBody = req.body;
                return [4 /*yield*/, prisma.sede_costo_delivery.updateMany({
                        data: dataBody,
                        where: {
                            idsede_costo_delivery: Number(id)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// guardar datos del delivery update-config-delivery
router.post('/create-config-delivery', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dataBody = req.body;
                return [4 /*yield*/, prisma.sede_costo_delivery.create({
                        data: dataBody
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// from bot - guardar en chatbot_cliente los datos para ser recuperados en la tienda en linea
router.post('/create-history-chatbot-cliente', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dataBody = __assign(__assign({}, req.body), { fecha: new Date().toISOString().slice(0, 19).replace('T', ' ') });
                return [4 /*yield*/, prisma.chatbot_cliente.create({
                        data: dataBody
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
router.get("/get-user-bot/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.usuario.findMany({
                        where: { AND: {
                                idsede: Number(idsede),
                                isbot: '1'
                            } },
                        select: {
                            idusuario: true,
                            nombres: true
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// cambiar nombre del cliente
router.put('/change-name-cliente', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var dataBody, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dataBody = __assign({}, req.body);
                return [4 /*yield*/, prisma.cliente.update({
                        data: {
                            nombres: dataBody.nombres
                        },
                        where: {
                            idcliente: Number(dataBody.idcliente)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).send(rpt);
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6;
