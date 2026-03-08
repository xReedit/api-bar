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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var geocoding_service_1 = require("../services/geocoding.service");
var cocinar_pedido_1 = require("../services/cocinar.pedido");
var pedido_services_1 = __importDefault(require("../services/pedido.services"));
var json_print_services_1 = require("../services/json.print.services");
var axios_1 = __importDefault(require("axios"));
var prisma = new client_1.PrismaClient();
var router = express.Router();
// Función helper para calcular tiempo estimado con margen
var calcularTiempoEstimado = function (tiempoAproxMinutos) {
    var margenMenos = 5;
    var margenMas = 10;
    var tiempoMin = Math.max(15, tiempoAproxMinutos - margenMenos);
    var tiempoMax = tiempoAproxMinutos + margenMas;
    return "".concat(tiempoMin, "-").concat(tiempoMax, " min");
};
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Chatbot V2 API - Endpoints disponibles' });
        return [2 /*return*/];
    });
}); });
router.get("/cliente/:idorg/:idsede/:telefono", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, telefono, telefonoSinCodigo, cliente, totalPedidos, ultimoPedido, direccionPwa, direccionCliente, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 5, , 6]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede, telefono = _a.telefono;
                telefonoSinCodigo = telefono.replace(/\D/g, '').replace(/^(51)?/, '');
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"])), idsede, idorg, '%' + telefonoSinCodigo + '%')];
            case 1:
                cliente = _d.sent();
                if (!cliente || cliente.length === 0) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            encontrado: false,
                            cliente: null,
                            descripcion: 'Cliente no encontrado en la base de datos'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n            SELECT COUNT(*) as total FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"], ["\n            SELECT COUNT(*) as total FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"])), cliente[0].idcliente, idsede)];
            case 2:
                totalPedidos = _d.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n            SELECT fecha, hora FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            ORDER BY idpedido DESC LIMIT 1"], ["\n            SELECT fecha, hora FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            ORDER BY idpedido DESC LIMIT 1"])), cliente[0].idcliente, idsede)];
            case 3:
                ultimoPedido = _d.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude, cpd.ciudad, cpd.provincia\n            FROM cliente_pwa_direccion cpd\n            WHERE cpd.idcliente = ", "\n            ORDER BY cpd.idcliente_pwa_direccion DESC\n            LIMIT 1"], ["\n            SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude, cpd.ciudad, cpd.provincia\n            FROM cliente_pwa_direccion cpd\n            WHERE cpd.idcliente = ", "\n            ORDER BY cpd.idcliente_pwa_direccion DESC\n            LIMIT 1"])), cliente[0].idcliente)];
            case 4:
                direccionPwa = _d.sent();
                direccionCliente = direccionPwa && direccionPwa.length > 0
                    ? {
                        idcliente_pwa_direccion: direccionPwa[0].idcliente_pwa_direccion,
                        direccion: direccionPwa[0].direccion,
                        referencia: direccionPwa[0].referencia,
                        latitude: direccionPwa[0].latitude,
                        longitude: direccionPwa[0].longitude,
                        ciudad: direccionPwa[0].ciudad,
                        provincia: direccionPwa[0].provincia
                    }
                    : {
                        idcliente_pwa_direccion: null,
                        direccion: cliente[0].direccion || '',
                        referencia: '',
                        latitude: '',
                        longitude: '',
                        ciudad: '',
                        provincia: ''
                    };
                res.status(200).json({
                    success: true,
                    encontrado: true,
                    cliente: {
                        id: cliente[0].idcliente,
                        nombre: cliente[0].nombres,
                        telefono: cliente[0].telefono,
                        direccion: direccionCliente,
                        total_pedidos: ((_b = totalPedidos[0]) === null || _b === void 0 ? void 0 : _b.total) || 0,
                        ultimo_pedido: ((_c = ultimoPedido[0]) === null || _c === void 0 ? void 0 : _c.fecha) || null
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _d.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al buscar cliente'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get("/menu/:idorg/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, rpt, carta, menuPlano, productos_1, itemsVistos_1, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["call porcedure_pwa_pedido_carta(", ",", ",1)"], ["call porcedure_pwa_pedido_carta(", ",", ",1)"])), idorg, idsede)];
            case 1:
                rpt = _c.sent();
                carta = ((_b = rpt[0]) === null || _b === void 0 ? void 0 : _b.f0) || [];
                menuPlano = [];
                productos_1 = [];
                itemsVistos_1 = new Set();
                carta.forEach(function (categoria) {
                    var _a;
                    (_a = categoria.secciones) === null || _a === void 0 ? void 0 : _a.forEach(function (seccion) {
                        var _a;
                        (_a = seccion.items) === null || _a === void 0 ? void 0 : _a.forEach(function (item) {
                            var claveUnica = "".concat(item.iditem, "-").concat(item.des);
                            if (itemsVistos_1.has(claveUnica)) {
                                return;
                            }
                            itemsVistos_1.add(claveUnica);
                            var stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                            productos_1.push({
                                iditem: item.iditem,
                                idseccion: seccion.idseccion,
                                descripcion: item.des,
                                precio: Number(item.precio),
                                stock: stockNumerico
                            });
                        });
                    });
                });
                res.status(200).json({
                    success: true,
                    menu: productos_1
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _c.sent();
                console.error('Error en consultar_menu:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Error al consultar menu'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/calcular-delivery", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, direccion, referencia, session_id, sedeConfig, parametros, obtenerCoordenadas, costoBase, sede, distanciaMaxima, ciudades, resultadoDistancia, distanciaKm, kmBase, costoAdicional, costoFijo, costo, tiempoAproxEntrega, existingPreview, direccionData, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 9, , 10]);
                _a = req.body, idorg = _a.idorg, idsede = _a.idsede, direccion = _a.direccion, referencia = _a.referencia, session_id = _a.session_id;
                if (!direccion) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Direccion es requerida'
                        })];
                }
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 1:
                sedeConfig = _b.sent();
                if (!sedeConfig) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Configuracion de delivery no encontrada'
                        })];
                }
                parametros = sedeConfig.parametros || {};
                obtenerCoordenadas = parametros.obtener_coordenadas_del_cliente === 'SI';
                costoBase = Number(parametros.km_base_costo || 0);
                if (!obtenerCoordenadas) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            disponible: true,
                            costo: costoBase,
                            distancia_km: 0,
                            tiempo_estimado: calcularTiempoEstimado(10),
                            mensaje: "Costo fijo de delivery"
                        })];
                }
                return [4 /*yield*/, prisma.sede.findUnique({
                        where: { idsede: Number(idsede) },
                        select: {
                            latitude: true,
                            longitude: true
                        }
                    })];
            case 2:
                sede = _b.sent();
                if (!sede || !sede.latitude || !sede.longitude) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Coordenadas del comercio no configuradas'
                        })];
                }
                distanciaMaxima = Number(parametros.km_limite || 10);
                ciudades = [];
                if (sedeConfig.ciudades) {
                    ciudades = sedeConfig.ciudades
                        .split(',')
                        .filter(function (c) { return c.length > 0; });
                }
                return [4 /*yield*/, geocoding_service_1.GeocodingService.calcularDistanciaPorRango(direccion, Number(sede.latitude), Number(sede.longitude), distanciaMaxima, ciudades)];
            case 3:
                resultadoDistancia = _b.sent();
                if (!resultadoDistancia.success || resultadoDistancia.distanciaKm === undefined) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            disponible: false,
                            mensaje: resultadoDistancia.error || 'No se pudo calcular la distancia'
                        })];
                }
                distanciaKm = resultadoDistancia.distanciaKm;
                kmBase = Number(parametros.km_base || 2);
                costoAdicional = Number(parametros.km_adicional_costo || 0);
                costoFijo = Number(parametros.costo_fijo || 0);
                costo = costoFijo > 0 ? costoFijo : costoBase;
                if (costoFijo === 0 && distanciaKm > kmBase) {
                    costo += (distanciaKm - kmBase) * costoAdicional;
                }
                tiempoAproxEntrega = Number(parametros.tiempo_aprox_entrega || 30);
                if (!session_id) return [3 /*break*/, 8];
                return [4 /*yield*/, prisma.pedido_preview.findFirst({
                        where: { id: session_id }
                    })];
            case 4:
                existingPreview = _b.sent();
                direccionData = {
                    direccion: direccion,
                    referencia: referencia || '',
                    latitude: resultadoDistancia.lat,
                    longitude: resultadoDistancia.lng,
                    ciudad: resultadoDistancia.ciudad || '',
                    provincia: resultadoDistancia.provincia || '',
                    departamento: resultadoDistancia.departamento || '',
                    pais: resultadoDistancia.pais || '',
                    codigo: resultadoDistancia.codigo || '',
                    distancia_km: distanciaKm,
                    costo_delivery: Number(costo.toFixed(2))
                };
                if (!existingPreview) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma.pedido_preview.update({
                        where: { id: session_id },
                        data: { direccion_cliente: direccionData }
                    })];
            case 5:
                _b.sent();
                return [3 /*break*/, 8];
            case 6: return [4 /*yield*/, prisma.pedido_preview.create({
                    data: {
                        id: session_id,
                        estructura: JSON.stringify({}),
                        ticket_formateado: '',
                        estado: 'pending',
                        direccion_cliente: direccionData
                    }
                })];
            case 7:
                _b.sent();
                _b.label = 8;
            case 8:
                res.status(200).json({
                    success: true,
                    disponible: true,
                    costo: Number(costo.toFixed(2)),
                    distancia_km: distanciaKm,
                    tiempo_estimado: calcularTiempoEstimado(tiempoAproxEntrega)
                });
                return [3 /*break*/, 10];
            case 9:
                error_3 = _b.sent();
                console.error('Error en calcular_delivery:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Error al calcular delivery'
                });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.get("/config/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, sede, sedeConfig, tiposEntrega, metodosPago, horariosDB, horaActual, diaActual, mapaDias_1, horarioAtencion_1, horarioPrincipal_1, diasArray, parametros, estaAbierto, nombreDiaActual, horaActualStr, horaAbre, horaCierra, generarMensajeHorario, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.sede.findFirst({
                        where: {
                            idsede: Number(idsede)
                        },
                        select: {
                            nombre: true,
                            telefono: true,
                            direccion: true,
                            latitude: true,
                            longitude: true,
                            metodo_pago_aceptados_chatbot: true,
                            link_carta: true
                        }
                    })];
            case 1:
                sede = _a.sent();
                if (!sede) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 2:
                sedeConfig = _a.sent();
                return [4 /*yield*/, prisma.tipo_consumo.findMany({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_consumo: true,
                            descripcion: true
                        }
                    })];
            case 3:
                tiposEntrega = _a.sent();
                return [4 /*yield*/, prisma.tipo_pago.findMany({
                        where: {
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_pago: true,
                            descripcion: true
                        }
                    })];
            case 4:
                metodosPago = _a.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"], ["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"])), idsede)];
            case 5:
                horariosDB = _a.sent();
                horaActual = new Date();
                diaActual = horaActual.getDay();
                mapaDias_1 = {
                    '1': 'domingo',
                    '2': 'lunes',
                    '3': 'martes',
                    '4': 'miercoles',
                    '5': 'jueves',
                    '6': 'viernes',
                    '7': 'sabado'
                };
                horarioAtencion_1 = {
                    lunes: { abre: "11:00", cierra: "22:00" },
                    martes: { abre: "11:00", cierra: "22:00" },
                    miercoles: { abre: "11:00", cierra: "22:00" },
                    jueves: { abre: "11:00", cierra: "22:00" },
                    viernes: { abre: "11:00", cierra: "23:00" },
                    sabado: { abre: "11:00", cierra: "23:00" },
                    domingo: { abre: "12:00", cierra: "21:00" }
                };
                if (horariosDB && horariosDB.length > 0) {
                    horarioPrincipal_1 = horariosDB[0];
                    diasArray = horarioPrincipal_1.numdia.split(',').filter(function (d) { return d; });
                    diasArray.forEach(function (numDia) {
                        var nombreDia = mapaDias_1[numDia];
                        if (nombreDia) {
                            horarioAtencion_1[nombreDia] = {
                                abre: horarioPrincipal_1.hora_inicio,
                                cierra: horarioPrincipal_1.hora_fin
                            };
                        }
                    });
                }
                parametros = (sedeConfig === null || sedeConfig === void 0 ? void 0 : sedeConfig.parametros) || {};
                estaAbierto = false;
                nombreDiaActual = mapaDias_1[diaActual === 0 ? '1' : (diaActual + 1).toString()];
                if (nombreDiaActual && horarioAtencion_1[nombreDiaActual]) {
                    horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                    horaAbre = horarioAtencion_1[nombreDiaActual].abre;
                    horaCierra = horarioAtencion_1[nombreDiaActual].cierra;
                    estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
                }
                generarMensajeHorario = function () {
                    var dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                    var horariosUnicos = {};
                    dias.forEach(function (dia) {
                        var horario = horarioAtencion_1[dia];
                        var key = "".concat(horario.abre, "-").concat(horario.cierra);
                        if (!horariosUnicos[key]) {
                            horariosUnicos[key] = [];
                        }
                        horariosUnicos[key].push(dia);
                    });
                    var mensajes = Object.entries(horariosUnicos).map(function (_a) {
                        var horario = _a[0], diasArray = _a[1];
                        var _b = horario.split('-'), abre = _b[0], cierra = _b[1];
                        var diasTexto = diasArray.length === 7 ? 'Todos los días' :
                            diasArray.map(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ');
                        return "".concat(diasTexto, ": ").concat(abre, " - ").concat(cierra);
                    });
                    return "Estamos cerrados. Nuestro horario de atenci\u00F3n: ".concat(mensajes.join('. '));
                };
                res.status(200).json({
                    success: true,
                    config: {
                        nombre_negocio: sede.nombre,
                        telefono_negocio: sede.telefono,
                        direccion: sede.direccion,
                        latitud: sede.latitude,
                        longitud: sede.longitude,
                        horario_atencion: horarioAtencion_1,
                        esta_abierto: estaAbierto,
                        hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        mensaje_cerrado: generarMensajeHorario(),
                        tipos_consumo: tiposEntrega.map(function (te) { return ({
                            id: te.idtipo_consumo.toString(),
                            nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
                        }); }),
                        delivery: {
                            habilitado: true,
                            tipo: "distancia",
                            costo_base: Number(parametros.km_base_costo || 0),
                            costo_por_km: Number(parametros.km_adicional_costo || 0),
                            km_base: Number(parametros.km_base || 0),
                            distancia_maxima_km: Number(parametros.km_limite || 5),
                            calcular_advertencia: parametros.obtener_coordenadas_del_cliente,
                            tiempo_estimado_base: calcularTiempoEstimado(Number(parametros.tiempo_aprox_entrega || 30)),
                            descripcion: "Costo base S/".concat(Number(parametros.km_base_costo || 0), " hasta ").concat(Number(parametros.km_base || 0), " km, luego S/").concat(Number(parametros.km_adicional_costo || 0), " por km adicional")
                        },
                        metodos_pago: metodosPago.map(function (mp) { return ({
                            id: mp.idtipo_pago.toString(),
                            nombre: mp.descripcion,
                            activo: true
                        }); }),
                        mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
                        activo: true,
                        link_carta: sede.link_carta
                    }
                });
                return [3 /*break*/, 7];
            case 6:
                error_4 = _a.sent();
                console.error('Error en obtener_config_negocio:', error_4);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener configuracion'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
router.post("/resumen-pedido", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session_id, idsede, items, tipo_entrega, direccion, costo_delivery, itemsParaCocinar, datosEntrega, tipoEntregaMapeado, tipoEntregaObj, estructuraPedidoCocinada, tipoConsumo, secciones, subtotales, pedidoService, ticketFormateado, previewId, estructuraJson, error_5;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                _a = req.body, session_id = _a.session_id, idsede = _a.idsede, items = _a.items, tipo_entrega = _a.tipo_entrega, direccion = _a.direccion, costo_delivery = _a.costo_delivery;
                if (!items || items.length === 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Items son requeridos'
                        })];
                }
                if (!idsede) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'idsede es requerido'
                        })];
                }
                itemsParaCocinar = items.map(function (item) { return ({
                    iditem: item.iditem,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    indicaciones: item.indicaciones || '',
                    observaciones: item.indicaciones || ''
                }); });
                datosEntrega = {
                    direccion: direccion || '',
                    costo_entrega: (tipo_entrega === null || tipo_entrega === void 0 ? void 0 : tipo_entrega.toLowerCase()) === 'delivery' ? (costo_delivery || 0) : 0
                };
                tipoEntregaMapeado = tipo_entrega;
                if ((tipo_entrega === null || tipo_entrega === void 0 ? void 0 : tipo_entrega.toLowerCase()) === 'recojo' || (tipo_entrega === null || tipo_entrega === void 0 ? void 0 : tipo_entrega.toLowerCase()) === 'recoger') {
                    tipoEntregaMapeado = 'PARA LLEVAR';
                }
                tipoEntregaObj = {
                    descripcion: tipoEntregaMapeado
                };
                return [4 /*yield*/, (0, cocinar_pedido_1.getEstructuraPedido)(itemsParaCocinar, tipoEntregaObj, datosEntrega, Number(idsede))];
            case 1:
                estructuraPedidoCocinada = _d.sent();
                tipoConsumo = (_c = (_b = estructuraPedidoCocinada.p_body) === null || _b === void 0 ? void 0 : _b.tipoconsumo) === null || _c === void 0 ? void 0 : _c[0];
                secciones = (tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.secciones) || [];
                subtotales = estructuraPedidoCocinada.p_subtotales || [];
                pedidoService = new pedido_services_1["default"]();
                ticketFormateado = pedidoService.getResumenPedidoShowCliente(secciones, tipoConsumo, subtotales);
                previewId = session_id;
                estructuraJson = JSON.stringify(estructuraPedidoCocinada);
                return [4 /*yield*/, prisma.$queryRawUnsafe("INSERT INTO pedido_preview (id, estructura, ticket_formateado, estado) \n             VALUES (?, ?, ?, ?) \n             ON DUPLICATE KEY UPDATE \n             estructura = VALUES(estructura), \n             ticket_formateado = VALUES(ticket_formateado), \n             estado = 'pending',\n             created_at = CURRENT_TIMESTAMP", previewId, estructuraJson, ticketFormateado, 'pending')];
            case 2:
                _d.sent();
                res.status(200).json({
                    success: true,
                    resumen: ticketFormateado
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _d.sent();
                console.error('Error en resumen-pedido:', error_5);
                res.status(500).json({
                    success: false,
                    error: 'Error al generar resumen del pedido'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post("/pedido", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session_id, idorg, idsede, cliente_telefono, cliente_nombre, direccion, tipo_entrega, metodo_pago, notas, idresumen, preview, estructuraPedidoCocinada_1, datosDeliveryGuardados, tipoConsumoEstructura, tipoEntregaFinal, descripcionTipoConsumo, cliente, idcliente, nombreCliente, nuevoCliente, idclientePwaDireccion, direccionFinal, direccionExistente, nuevaDireccion, infoCliente, infoSede, usuarioBot, idusuarioBot, resultInsert, nuevoUsuario, sede, listImpresoras, tipoConsumo, isDelivery, isRecoger, arrDatosDelivery, direccionDelivery, referenciaDelivery, latitudeDelivery, longitudeDelivery, ciudadDelivery, provinciaDelivery, departamentoDelivery, paisDelivery, codigoDelivery, costoDeliveryCalculado, p_header_1, jsonPrintService, arrPrint, dataPrint_1, dataUsuarioSend, pedidoEnviar, dataSocketQuery, payload, URL_RESTOBAR, urlBackend, response, resultado, idpedido, error_6;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                _p.trys.push([0, 21, , 22]);
                _a = req.body, session_id = _a.session_id, idorg = _a.idorg, idsede = _a.idsede, cliente_telefono = _a.cliente_telefono, cliente_nombre = _a.cliente_nombre, direccion = _a.direccion, tipo_entrega = _a.tipo_entrega, metodo_pago = _a.metodo_pago, notas = _a.notas;
                idresumen = session_id;
                if (!idresumen) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'idresumen es requerido'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, estructura, estado, direccion_cliente FROM pedido_preview WHERE id = ? AND estado = 'pending' LIMIT 1", idresumen)];
            case 1:
                preview = _p.sent();
                if (!preview || preview.length === 0) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Resumen de pedido no encontrado o ya fue confirmado'
                        })];
                }
                estructuraPedidoCocinada_1 = preview[0].estructura;
                datosDeliveryGuardados = null;
                if (preview[0].direccion_cliente) {
                    try {
                        datosDeliveryGuardados = typeof preview[0].direccion_cliente === 'string'
                            ? JSON.parse(preview[0].direccion_cliente)
                            : preview[0].direccion_cliente;
                    }
                    catch (error) {
                        console.error('Error al parsear direccion_cliente:', error);
                    }
                }
                tipoConsumoEstructura = (_c = (_b = estructuraPedidoCocinada_1.p_body) === null || _b === void 0 ? void 0 : _b.tipoconsumo) === null || _c === void 0 ? void 0 : _c[0];
                tipoEntregaFinal = tipo_entrega;
                if (!tipoEntregaFinal && tipoConsumoEstructura) {
                    descripcionTipoConsumo = (_d = tipoConsumoEstructura.descripcion) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                    if (descripcionTipoConsumo === 'delivery') {
                        tipoEntregaFinal = 'delivery';
                    }
                    else if (descripcionTipoConsumo === 'para llevar') {
                        tipoEntregaFinal = 'recojo';
                    }
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres FROM cliente c\n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE c.telefono = ", " AND cs.idsede = ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres FROM cliente c\n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE c.telefono = ", " AND cs.idsede = ", "\n            LIMIT 1"])), cliente_telefono, idsede)];
            case 2:
                cliente = _p.sent();
                idcliente = void 0;
                nombreCliente = void 0;
                if (!(!cliente || cliente.length === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.cliente.create({
                        data: {
                            idorg: Number(idorg),
                            nombres: (cliente_nombre || 'CLIENTE').toUpperCase(),
                            telefono: cliente_telefono,
                            direccion: direccion || '',
                            f_registro: new Date().toISOString().slice(0, 19).replace('T', ' '),
                            ruc: '',
                            pwa_id: '',
                            email: '',
                            estado: 0
                        }
                    })];
            case 3:
                nuevoCliente = _p.sent();
                idcliente = nuevoCliente.idcliente;
                nombreCliente = nuevoCliente.nombres;
                return [4 /*yield*/, prisma.cliente_sede.create({
                        data: {
                            idcliente: idcliente,
                            idsede: Number(idsede),
                            telefono: cliente_telefono
                        }
                    })];
            case 4:
                _p.sent();
                return [3 /*break*/, 7];
            case 5:
                idcliente = cliente[0].idcliente;
                nombreCliente = cliente[0].nombres;
                if (!(!nombreCliente || nombreCliente.trim() === '')) return [3 /*break*/, 7];
                nombreCliente = (cliente_nombre || 'CLIENTE').toUpperCase();
                return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE cliente SET nombres = ? WHERE idcliente = ?", nombreCliente, idcliente)];
            case 6:
                _p.sent();
                _p.label = 7;
            case 7:
                idclientePwaDireccion = null;
                direccionFinal = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.direccion) || direccion || '';
                if (!(direccionFinal && datosDeliveryGuardados)) return [3 /*break*/, 11];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n                SELECT idcliente_pwa_direccion FROM cliente_pwa_direccion\n                WHERE idcliente = ", " AND direccion = ", "\n                LIMIT 1"], ["\n                SELECT idcliente_pwa_direccion FROM cliente_pwa_direccion\n                WHERE idcliente = ", " AND direccion = ", "\n                LIMIT 1"])), idcliente, direccionFinal)];
            case 8:
                direccionExistente = _p.sent();
                if (!(direccionExistente && direccionExistente.length > 0)) return [3 /*break*/, 9];
                idclientePwaDireccion = direccionExistente[0].idcliente_pwa_direccion;
                return [3 /*break*/, 11];
            case 9: return [4 /*yield*/, prisma.$queryRawUnsafe("INSERT INTO cliente_pwa_direccion (idcliente, direccion, latitude, longitude, referencia) VALUES (?, ?, ?, ?, ?)", idcliente, direccionFinal, ((_e = datosDeliveryGuardados.latitude) === null || _e === void 0 ? void 0 : _e.toString()) || '', ((_f = datosDeliveryGuardados.longitude) === null || _f === void 0 ? void 0 : _f.toString()) || '', datosDeliveryGuardados.referencia || '')];
            case 10:
                nuevaDireccion = _p.sent();
                idclientePwaDireccion = nuevaDireccion.insertId;
                _p.label = 11;
            case 11:
                infoCliente = {
                    idcliente: idcliente,
                    nombres: nombreCliente,
                    telefono: cliente_telefono,
                    direccion: direccionFinal,
                    idcliente_pwa_direccion: idclientePwaDireccion
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n            SELECT s.idsede, s.idorg, s.nombre, s.direccion, s.telefono\n            FROM sede s\n            WHERE s.idsede = ", " and estado=0\n            LIMIT 1"], ["\n            SELECT s.idsede, s.idorg, s.nombre, s.direccion, s.telefono\n            FROM sede s\n            WHERE s.idsede = ", " and estado=0\n            LIMIT 1"])), idsede)];
            case 12:
                infoSede = _p.sent();
                if (!infoSede || infoSede.length === 0) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n            SELECT idusuario FROM usuario WHERE usuario = 'bot' LIMIT 1"], ["\n            SELECT idusuario FROM usuario WHERE usuario = 'bot' LIMIT 1"])))];
            case 13:
                usuarioBot = _p.sent();
                idusuarioBot = void 0;
                if (!(!usuarioBot || usuarioBot.length === 0)) return [3 /*break*/, 16];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_11 || (templateObject_11 = __makeTemplateObject(["\n                INSERT INTO usuario (usuario, clave, nombre, estado, isbot) \n                VALUES ('bot', 'bot-user', 'Bot WhatsApp', 0, 1)"], ["\n                INSERT INTO usuario (usuario, clave, nombre, estado, isbot) \n                VALUES ('bot', 'bot-user', 'Bot WhatsApp', 0, 1)"])))];
            case 14:
                resultInsert = _p.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n                SELECT idusuario FROM usuario WHERE sede = ", " AND isbot = '1' LIMIT 1"], ["\n                SELECT idusuario FROM usuario WHERE sede = ", " AND isbot = '1' LIMIT 1"])), idsede)];
            case 15:
                nuevoUsuario = _p.sent();
                idusuarioBot = nuevoUsuario[0].idusuario;
                return [3 /*break*/, 17];
            case 16:
                idusuarioBot = usuarioBot[0].idusuario;
                _p.label = 17;
            case 17:
                sede = {
                    idsede: infoSede[0].idsede,
                    idorg: infoSede[0].idorg,
                    idusuario: idusuarioBot,
                    sede: infoSede[0]
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_13 || (templateObject_13 = __makeTemplateObject(["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\n        from conf_print cp \n            inner join impresora i using(idsede)\n        where cp.idsede = ", " and i.estado = 0"], ["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\n        from conf_print cp \n            inner join impresora i using(idsede)\n        where cp.idsede = ", " and i.estado = 0"
                        // Obtener tipo de consumo para determinar si es delivery
                    ])), idsede)];
            case 18:
                listImpresoras = _p.sent();
                tipoConsumo = (_h = (_g = estructuraPedidoCocinada_1.p_body) === null || _g === void 0 ? void 0 : _g.tipoconsumo) === null || _h === void 0 ? void 0 : _h[0];
                isDelivery = (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'delivery';
                isRecoger = (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'recojo' || (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'recoger';
                arrDatosDelivery = {};
                if (isDelivery) {
                    direccionDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.direccion) || infoCliente.direccion || "";
                    referenciaDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.referencia) || "";
                    latitudeDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.latitude) || "";
                    longitudeDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.longitude) || "";
                    ciudadDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.ciudad) || "";
                    provinciaDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.provincia) || "";
                    departamentoDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.departamento) || "";
                    paisDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.pais) || "";
                    codigoDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.codigo) || "";
                    costoDeliveryCalculado = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.costo_delivery) || 0;
                    arrDatosDelivery = {
                        idcliente: infoCliente.idcliente.toString(),
                        dni: "",
                        nombre: infoCliente.nombres.toUpperCase(),
                        f_nac: "",
                        direccion: direccionDelivery,
                        telefono: infoCliente.telefono || "",
                        paga_con: metodo_pago.nombre || notas || "",
                        dato_adicional: notas || "",
                        referencia: referenciaDelivery,
                        tipoComprobante: [],
                        importeTotal: ((_k = (_j = estructuraPedidoCocinada_1.p_subtotales) === null || _j === void 0 ? void 0 : _j.find(function (st) { var _a; return (_a = st.descripcion) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('total'); })) === null || _k === void 0 ? void 0 : _k.importe) || 0,
                        metodoPago: {
                            idtipo_pago: metodo_pago.id,
                            descripcion: metodo_pago.nombre ? metodo_pago.nombre : "OTRO",
                            img: "_tp_01.png",
                            importe: "",
                            checked: true,
                            visible: true
                        },
                        propina: [],
                        direccionEnvioSelected: {
                            idcliente: infoCliente.idcliente.toString(),
                            num_doc: "",
                            nombre: infoCliente.nombres.toUpperCase(),
                            direccion: direccionDelivery,
                            referencia: referenciaDelivery,
                            telefono: infoCliente.telefono || "",
                            paga_con: metodo_pago.nombre || notas || "",
                            f_nac: "",
                            ciudad: ciudadDelivery,
                            provincia: provinciaDelivery,
                            departamento: departamentoDelivery,
                            pais: paisDelivery,
                            codigo: codigoDelivery,
                            latitude: latitudeDelivery.toString(),
                            longitude: longitudeDelivery.toString(),
                            titulo: "Casa",
                            solicitaCubiertos: "0",
                            direccion_delivery_no_map: [{
                                    direccion: direccionDelivery,
                                    referencia: referenciaDelivery
                                }],
                            nombres: infoCliente.nombres.toUpperCase()
                        },
                        establecimiento: {
                            idsede: infoSede[0].idsede.toString(),
                            idorg: infoSede[0].idorg.toString(),
                            nombre: infoSede[0].nombre,
                            ciudad: "",
                            direccion: infoSede[0].direccion,
                            telefono: infoSede[0].telefono,
                            // eslogan: "",
                            // mesas: "",
                            // maximo_pedidos_x_hora: "",
                            // authorization_api_comprobante: "",
                            // id_api_comprobante: "2",
                            // facturacion_e_activo: "1",
                            // logo64: "",
                            // codigo_postal: "",
                            latitude: latitudeDelivery,
                            longitude: longitudeDelivery
                        },
                        subTotales: [],
                        pasoRecoger: false,
                        buscarRepartidor: true,
                        isFromComercio: 1,
                        costoTotalDelivery: costoDeliveryCalculado,
                        tiempoEntregaProgamado: [],
                        delivery: 1,
                        solicitaCubiertos: "0",
                        nombres: infoCliente.nombres.toUpperCase()
                    };
                }
                else if (isRecoger) {
                    arrDatosDelivery = {
                        idcliente: infoCliente.idcliente.toString(),
                        nombre: infoCliente.nombres.toUpperCase(),
                        telefono: infoCliente.telefono || "",
                        establecimiento: {
                            idsede: infoSede[0].idsede.toString(),
                            idorg: infoSede[0].idorg.toString(),
                            nombre: infoSede[0].nombre,
                            direccion: infoSede[0].direccion,
                            telefono: infoSede[0].telefono
                        },
                        pasoRecoger: true,
                        buscarRepartidor: false,
                        isFromComercio: 1,
                        delivery: 0,
                        nombres: infoCliente.nombres.toUpperCase()
                    };
                }
                p_header_1 = __assign(__assign({}, estructuraPedidoCocinada_1.p_header), { idclie: infoCliente.idcliente.toString(), referencia: infoCliente.nombres.toUpperCase(), idcategoria: ((_l = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idcategoria) === null || _l === void 0 ? void 0 : _l.toString()) || "1", mesa: "", tipo_consumo: ((_m = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idtipo_consumo) === null || _m === void 0 ? void 0 : _m.toString()) || "4", subtotales_tachados: "", arrDatosDelivery: arrDatosDelivery, isComercioAppDeliveryMapa: isDelivery ? "1" : "0", delivery: isDelivery ? 1 : 0 });
                // Actualizar la estructura con el p_header completo
                estructuraPedidoCocinada_1.p_header = p_header_1;
                jsonPrintService = new json_print_services_1.JsonPrintService();
                arrPrint = jsonPrintService.enviarMiPedido(true, sede, estructuraPedidoCocinada_1.p_body, listImpresoras);
                dataPrint_1 = [];
                arrPrint.map(function (x) {
                    dataPrint_1.push({
                        Array_enca: p_header_1,
                        ArraySubTotales: estructuraPedidoCocinada_1.p_subtotales,
                        ArrayItem: x.arrBodyPrint,
                        Array_print: x.arrPrinters
                    });
                });
                dataUsuarioSend = {
                    idusuario: sede.idusuario,
                    idcliente: infoCliente.idcliente,
                    idorg: sede.idorg,
                    idsede: sede.idsede,
                    nombres: 'BOT',
                    cargo: 'BOT',
                    usuario: 'BOT'
                };
                pedidoEnviar = {
                    dataPedido: estructuraPedidoCocinada_1,
                    dataPrint: dataPrint_1,
                    dataUsuario: dataUsuarioSend,
                    isDeliveryAPP: isDelivery,
                    isClienteRecogeLocal: isRecoger,
                    dataDescuento: [],
                    listPrinters: arrPrint.listPrinters
                };
                dataSocketQuery = {
                    idorg: sede.idorg,
                    idsede: sede.idsede,
                    idusuario: sede.idusuario,
                    idcliente: infoCliente.idcliente,
                    iscliente: false,
                    isOutCarta: false,
                    isCashAtm: false,
                    isFromApp: 0,
                    isFromBot: 1
                };
                payload = {
                    query: dataSocketQuery,
                    dataSend: pedidoEnviar
                };
                URL_RESTOBAR = process.env.URL_RESTOBAR || 'http://localhost:3000';
                urlBackend = "".concat(URL_RESTOBAR, "/bot/send-bot-pedido");
                return [4 /*yield*/, axios_1["default"].post(urlBackend, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })];
            case 19:
                response = _p.sent();
                resultado = response.data;
                idpedido = resultado.idpedido || ((_o = resultado.data) === null || _o === void 0 ? void 0 : _o.idpedido);
                if (!idpedido) {
                    throw new Error('Backend no retornó idpedido');
                }
                return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE pedido_preview SET estado = 'confirmed', idpedido = ? WHERE id = ?", idpedido, idresumen)];
            case 20:
                _p.sent();
                res.status(200).json({
                    success: true,
                    mensaje: 'Pedido confirmado y guardado exitosamente',
                    idpedido: idpedido,
                    numero_pedido: idpedido
                });
                return [3 /*break*/, 22];
            case 21:
                error_6 = _p.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al crear pedido'
                });
                return [3 /*break*/, 22];
            case 22: return [2 /*return*/];
        }
    });
}); });
// consultar pedido por session_id
router.get('/info-pedido/:session_id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var session_id, pedidoPreview, pedido, infoPedido, pedidoSerializable, resultado, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                session_id = req.params.session_id;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_14 || (templateObject_14 = __makeTemplateObject(["\n            SELECT estado, idpedido\n            FROM pedido_preview\n            WHERE id = ", "\n            LIMIT 1"], ["\n            SELECT estado, idpedido\n            FROM pedido_preview\n            WHERE id = ", "\n            LIMIT 1"])), session_id)];
            case 1:
                pedidoPreview = _a.sent();
                if (!pedidoPreview || pedidoPreview.length === 0) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Pedido no encontrado'
                        })];
                }
                pedido = pedidoPreview[0];
                infoPedido = null;
                pedidoSerializable = {
                    estado: pedido.estado,
                    idpedido: pedido.idpedido ? Number(pedido.idpedido) : null
                };
                if (!(pedido.estado === 'confirmed' && pedido.idpedido)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_15 || (templateObject_15 = __makeTemplateObject(["\n                SELECT \n                    p.idpedido,\n                    p.fecha_hora, \n                    tc.descripcion as canal_consumo, \n                    COALESCE(r.nombre, 'sin asignar') as repartidor,\n                    TIMESTAMPDIFF(MINUTE, p.fecha_hora, NOW()) as tiempo_transcurrido_minutos\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                LEFT JOIN repartidor r USING(idrepartidor)\n                WHERE p.idpedido = ", "\n                LIMIT 1"], ["\n                SELECT \n                    p.idpedido,\n                    p.fecha_hora, \n                    tc.descripcion as canal_consumo, \n                    COALESCE(r.nombre, 'sin asignar') as repartidor,\n                    TIMESTAMPDIFF(MINUTE, p.fecha_hora, NOW()) as tiempo_transcurrido_minutos\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                LEFT JOIN repartidor r USING(idrepartidor)\n                WHERE p.idpedido = ", "\n                LIMIT 1"])), pedido.idpedido)];
            case 2:
                resultado = _a.sent();
                if (resultado && resultado.length > 0) {
                    infoPedido = {
                        idpedido: Number(resultado[0].idpedido),
                        fecha_hora: resultado[0].fecha_hora,
                        canal_consumo: resultado[0].canal_consumo,
                        repartidor: resultado[0].repartidor,
                        tiempo_transcurrido_minutos: Number(resultado[0].tiempo_transcurrido_minutos)
                    };
                }
                _a.label = 3;
            case 3:
                res.status(200).json({
                    success: true,
                    data: {
                        preview: pedidoSerializable,
                        pedido_info: infoPedido
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_7 = _a.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al consultar pedido'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/contexto/:idorg/:idsede/:telefono', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, telefono, sede, categoria, sedeConfig, tiposEntrega, metodosPago, horariosDB, horaActual, diaActual, mapaDias_2, horarioAtencion_2, horarioPrincipal_2, diasArray, parametros, estaAbierto, nombreDiaActual, horaActualStr, horaAbre, horaCierra, generarMensajeHorario, negocio, telefonoLimpio, clienteDB, cliente, totalPedidos, ultimoPedido, rpt, carta, productos_2, itemsVistos_2, error_8;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 12, , 13]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede, telefono = _a.telefono;
                return [4 /*yield*/, prisma.sede.findFirst({
                        where: {
                            idsede: Number(idsede)
                        },
                        select: {
                            nombre: true,
                            telefono: true,
                            direccion: true,
                            latitude: true,
                            longitude: true,
                            metodo_pago_aceptados_chatbot: true
                        }
                    })];
            case 1:
                sede = _e.sent();
                if (!sede) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.categoria.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            visible_cliente: '1'
                        },
                        select: {
                            url_carta: true
                        }
                    })];
            case 2:
                categoria = _e.sent();
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 3:
                sedeConfig = _e.sent();
                return [4 /*yield*/, prisma.tipo_consumo.findMany({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_consumo: true,
                            descripcion: true
                        }
                    })];
            case 4:
                tiposEntrega = _e.sent();
                return [4 /*yield*/, prisma.tipo_pago.findMany({
                        where: {
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_pago: true,
                            descripcion: true
                        }
                    })];
            case 5:
                metodosPago = _e.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_16 || (templateObject_16 = __makeTemplateObject(["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"], ["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"])), idsede)];
            case 6:
                horariosDB = _e.sent();
                horaActual = new Date();
                diaActual = horaActual.getDay();
                mapaDias_2 = {
                    '1': 'domingo',
                    '2': 'lunes',
                    '3': 'martes',
                    '4': 'miercoles',
                    '5': 'jueves',
                    '6': 'viernes',
                    '7': 'sabado'
                };
                horarioAtencion_2 = {
                    lunes: { abre: "11:00", cierra: "22:00" },
                    martes: { abre: "11:00", cierra: "22:00" },
                    miercoles: { abre: "11:00", cierra: "22:00" },
                    jueves: { abre: "11:00", cierra: "22:00" },
                    viernes: { abre: "11:00", cierra: "23:00" },
                    sabado: { abre: "11:00", cierra: "23:00" },
                    domingo: { abre: "12:00", cierra: "21:00" }
                };
                if (horariosDB && horariosDB.length > 0) {
                    horarioPrincipal_2 = horariosDB[0];
                    diasArray = horarioPrincipal_2.numdia.split(',').filter(function (d) { return d; });
                    diasArray.forEach(function (numDia) {
                        var nombreDia = mapaDias_2[numDia];
                        if (nombreDia) {
                            horarioAtencion_2[nombreDia] = {
                                abre: horarioPrincipal_2.hora_inicio,
                                cierra: horarioPrincipal_2.hora_fin
                            };
                        }
                    });
                }
                parametros = (sedeConfig === null || sedeConfig === void 0 ? void 0 : sedeConfig.parametros) || {};
                estaAbierto = false;
                nombreDiaActual = mapaDias_2[diaActual === 0 ? '1' : (diaActual + 1).toString()];
                if (nombreDiaActual && horarioAtencion_2[nombreDiaActual]) {
                    horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                    horaAbre = horarioAtencion_2[nombreDiaActual].abre;
                    horaCierra = horarioAtencion_2[nombreDiaActual].cierra;
                    estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
                }
                generarMensajeHorario = function () {
                    var dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                    return dias.map(function (dia) {
                        var horario = horarioAtencion_2[dia];
                        var diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
                        return "".concat(diaCapitalizado, ": ").concat(horario.abre, " - ").concat(horario.cierra);
                    }).join(', ');
                };
                negocio = {
                    nombre_negocio: sede.nombre,
                    telefono_negocio: sede.telefono,
                    direccion: sede.direccion,
                    latitud: sede.latitude,
                    longitud: sede.longitude,
                    horario_atencion: horarioAtencion_2,
                    horario: generarMensajeHorario(),
                    esta_abierto: estaAbierto,
                    hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    tipos_consumo: tiposEntrega.map(function (te) { return ({
                        id: te.idtipo_consumo.toString(),
                        nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
                    }); }),
                    delivery: {
                        habilitado: true,
                        tipo: "distancia",
                        costo_base: Number(parametros.km_base_costo || 0),
                        costo_por_km: Number(parametros.km_adicional_costo || 0),
                        km_base: Number(parametros.km_base || 0),
                        distancia_maxima_km: Number(parametros.km_limite || 5),
                        calcular_advertencia: parametros.obtener_coordenadas_del_cliente,
                        tiempo_estimado_base: calcularTiempoEstimado(Number(parametros.tiempo_aprox_entrega || 30)),
                        descripcion: "Costo base S/".concat(Number(parametros.km_base_costo || 0), " hasta ").concat(Number(parametros.km_base || 0), " km, luego S/").concat(Number(parametros.km_adicional_costo || 0), " por km adicional")
                    },
                    metodos_pago: metodosPago.map(function (mp) { return ({
                        id: mp.idtipo_pago.toString(),
                        nombre: mp.descripcion,
                        activo: true
                    }); }),
                    mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
                    activo: true,
                    link_carta: (categoria === null || categoria === void 0 ? void 0 : categoria.url_carta) ? "https://papaya-comercio-files.s3.us-east-2.amazonaws.com/files-bot/".concat(categoria === null || categoria === void 0 ? void 0 : categoria.url_carta) : null
                };
                telefonoLimpio = telefono.replace(/\s/g, '');
                return [4 /*yield*/, prisma.$queryRaw(templateObject_17 || (templateObject_17 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(c.telefono, ' ', '') LIKE ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(c.telefono, ' ', '') LIKE ", "\n            LIMIT 1"])), idsede, idorg, '%' + telefonoLimpio + '%')];
            case 7:
                clienteDB = _e.sent();
                cliente = null;
                if (!(clienteDB && clienteDB.length > 0)) return [3 /*break*/, 10];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_18 || (templateObject_18 = __makeTemplateObject(["\n                SELECT COUNT(*) as total FROM pedido \n                WHERE idcliente = ", " \n                AND idsede = ", "\n                AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"], ["\n                SELECT COUNT(*) as total FROM pedido \n                WHERE idcliente = ", " \n                AND idsede = ", "\n                AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"])), clienteDB[0].idcliente, idsede)];
            case 8:
                totalPedidos = _e.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_19 || (templateObject_19 = __makeTemplateObject(["\n                SELECT fecha, hora FROM pedido \n                WHERE idcliente = ", " \n                AND idsede = ", "\n                ORDER BY idpedido DESC LIMIT 1"], ["\n                SELECT fecha, hora FROM pedido \n                WHERE idcliente = ", " \n                AND idsede = ", "\n                ORDER BY idpedido DESC LIMIT 1"])), clienteDB[0].idcliente, idsede)];
            case 9:
                ultimoPedido = _e.sent();
                cliente = {
                    id: Number(clienteDB[0].idcliente),
                    nombre: clienteDB[0].nombres,
                    telefono: clienteDB[0].telefono,
                    direccion: clienteDB[0].direccion,
                    total_pedidos: Number(((_b = totalPedidos[0]) === null || _b === void 0 ? void 0 : _b.total) || 0),
                    ultimo_pedido: ((_c = ultimoPedido[0]) === null || _c === void 0 ? void 0 : _c.fecha) || null,
                    encontrado: true
                };
                _e.label = 10;
            case 10: return [4 /*yield*/, prisma.$queryRaw(templateObject_20 || (templateObject_20 = __makeTemplateObject(["call porcedure_pwa_pedido_carta(", ",", ",1)"], ["call porcedure_pwa_pedido_carta(", ",", ",1)"])), idorg, idsede)];
            case 11:
                rpt = _e.sent();
                carta = ((_d = rpt[0]) === null || _d === void 0 ? void 0 : _d.f0) || [];
                productos_2 = [];
                itemsVistos_2 = new Set();
                carta.forEach(function (categoria) {
                    var _a;
                    (_a = categoria.secciones) === null || _a === void 0 ? void 0 : _a.forEach(function (seccion) {
                        var _a;
                        (_a = seccion.items) === null || _a === void 0 ? void 0 : _a.forEach(function (item) {
                            var claveUnica = "".concat(item.iditem, "-").concat(item.des);
                            if (itemsVistos_2.has(claveUnica)) {
                                return;
                            }
                            itemsVistos_2.add(claveUnica);
                            var stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                            productos_2.push({
                                iditem: Number(item.iditem),
                                idseccion: Number(seccion.idseccion),
                                descripcion: item.des,
                                precio: Number(item.precio),
                                stock: stockNumerico
                            });
                        });
                    });
                });
                res.status(200).json({
                    negocio: negocio,
                    cliente: cliente,
                    menu: productos_2
                });
                return [3 /*break*/, 13];
            case 12:
                error_8 = _e.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener contexto'
                });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20;
