"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api chat-bot' });
        return [2 /*return*/];
    });
}); });
// obtener lista de pedidos
router.post('/list-pedidos-asignados', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idpedidos, idpedidosArray, placeholders, pedidos, ArrayPedidos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idpedidos = req.body.idpedidos;
                idpedidosArray = idpedidos.split(',').map(Number);
                placeholders = idpedidosArray.map(function () { return '?'; }).join(',');
                return [4 /*yield*/, prisma.$queryRawUnsafe.apply(prisma, __spreadArray(["SELECT \n        sub.idpedido,\n        sub.pwa_estado,\n        sub.estado, \n        sub.nomcliente, \n        sub.telefono,\n        sub.nomsede, \n        sub.telefono_sede,\n        sub.isapp,  \n        sub.time_line,\n        sub.json_datos_delivery,\n        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.metodoPago' AS metodo_pago,\n        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.establecimiento.nombre' AS establecimiento,\n        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.importeTotal' AS importe,\n        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.propina' AS propina,\n        sub.json_datos_delivery->>'$.p_subtotales' AS p_subtotales\n    FROM (\n        SELECT \n            p.idpedido, \n            p.pwa_estado,\n            p.estado,\n            c.nombres nomcliente, \n            c.telefono,        \n            s.telefono telefono_sede,            \n            s.nombre nomsede, \n            p.flag_is_cliente isapp,\n            ptle.time_line, \n            CAST(p.json_datos_delivery AS JSON) json_datos_delivery\n        FROM pedido p\n        INNER JOIN cliente c ON c.idcliente = p.idcliente \n        INNER JOIN sede s ON p.idsede = s.idsede  \n        left join pedido_time_line_entrega ptle on ptle.idpedido = p.idpedido \n        WHERE p.idpedido in (".concat(placeholders, ")\n    ) sub")], idpedidosArray, false))];
            case 1:
                pedidos = _a.sent();
                ArrayPedidos = [];
                pedidos.map(function (item) {
                    // obtener costo total a pagar quitando descripcion que contengan 'delivery', 'entrega', 'propina'
                    var total = 0;
                    var propina = 0;
                    var entrega = 0;
                    var subtotales = JSON.parse(item.p_subtotales);
                    subtotales
                        .filter(function (x) { return x.descripcion.toLowerCase() !== 'total'; })
                        .map(function (sub) {
                        var descripcion = sub.descripcion.toLowerCase();
                        var importe = parseFloat(sub.importe);
                        if (!descripcion.includes('propina') && !descripcion.includes('delivery') && !descripcion.includes('entrega')) {
                            total += importe;
                        }
                        else if (descripcion.includes('propina')) {
                            propina = importe;
                        }
                        else if (descripcion.includes('delivery') || descripcion.includes('entrega')) {
                            entrega = importe;
                        }
                    });
                    var url_img = 'https://app.restobar.papaya.com.pe/assets/images/icon-app/';
                    item.metodo_pago = JSON.parse(item.metodo_pago);
                    var arrDatosDelivery = item.json_datos_delivery.p_header.arrDatosDelivery;
                    var orden = item.json_datos_delivery.p_body.tipoconsumo;
                    var subtotalesOrden = item.json_datos_delivery.p_subtotales;
                    // // objeto con los datos del cliente
                    var datosCliente = {
                        nombres: item.nomcliente,
                        telefono: item.telefono,
                        direccion: arrDatosDelivery.direccionEnvioSelected.direccion,
                        latitud: arrDatosDelivery.direccionEnvioSelected.latitude,
                        longitud: arrDatosDelivery.direccionEnvioSelected.longitude
                    };
                    // objeto con los datos del establecimiento
                    var datosEstablecimiento = {
                        nombre: arrDatosDelivery.establecimiento.nombre,
                        direccion: arrDatosDelivery.establecimiento.direccion,
                        telefono: item.telefono_sede,
                        ciudad: arrDatosDelivery.establecimiento.ciudad,
                        latitud: arrDatosDelivery.establecimiento.latitude,
                        longitud: arrDatosDelivery.establecimiento.longitude
                    };
                    var ArrayPedido = {
                        idpedido: item.idpedido,
                        pwa_estado: item.pwa_estado,
                        estado: item.estado,
                        cliente: datosCliente,
                        establecimiento: datosEstablecimiento,
                        orden: orden,
                        subtotales: subtotalesOrden
                    };
                    var _time_line = item.time_line ? item.time_line : {};
                    var _timeLineDefault = {
                        hora_acepta_pedido: _time_line.hora_acepta_pedido ? _time_line.hora_acepta_pedido : 0,
                        hora_pedido_entregado: _time_line.hora_pedido_entregado ? _time_line.hora_pedido_entregado : 0,
                        llego_al_comercio: _time_line.llego_al_comercio ? _time_line.llego_al_comercio : false,
                        en_camino_al_cliente: _time_line.en_camino_al_cliente ? _time_line.en_camino_al_cliente : false,
                        mensaje_enviado: _time_line.mensaje_enviado ? _time_line.mensaje_enviado : {
                            llego_al_comercio: false,
                            en_camino_al_cliente: false,
                            entrego: false
                        },
                        paso: _time_line.paso ? _time_line.paso : 0,
                        msj_log: _time_line.msj_log ? _time_line.msj_log : '',
                        distanciaMtr: _time_line.distanciaMtr ? _time_line.distanciaMtr : ''
                    };
                    ArrayPedidos.push({
                        idpedido: item.idpedido,
                        pwa_estado: item.pwa_estado,
                        estado: item.estado,
                        nomcliente: item.nomcliente,
                        nomsede: item.nomsede,
                        isapp: item.isapp == 1 ? true : false,
                        idtipo_pago: item.metodo_pago.idtipo_pago,
                        img_pago: "".concat(url_img).concat(item.metodo_pago.img),
                        establecimiento: item.establecimiento,
                        importe_pagar: total,
                        importe_total: parseFloat(item.importe),
                        propina: propina,
                        entrega: entrega,
                        time_line: _timeLineDefault,
                        orden_detalle: ArrayPedido
                    });
                });
                res.status(200).json(ArrayPedidos);
                return [2 /*return*/];
        }
    });
}); });
// detalle de pedido
router.get('/detalle-pedido/:idpedido', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idpedido, pedido, arrDatosDelivery, orden, subtotales, datosCliente, datosEstablecimiento, ArrayPedido;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idpedido = req.params.idpedido;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT \n        p.idpedido, \n        p.pwa_estado,\n        p.estado,\n        c.nombres nomcliente, \n        c.telefono,        \n        s.telefono telefono_sede,\n        p.flag_is_cliente isapp,\n        CAST(p.json_datos_delivery AS JSON) json_datos_delivery\n    FROM pedido p\n    inner join sede s on p.idsede=s.idsede\n    INNER JOIN cliente c ON c.idcliente = p.idcliente     \n    WHERE p.idpedido = ", ""], ["SELECT \n        p.idpedido, \n        p.pwa_estado,\n        p.estado,\n        c.nombres nomcliente, \n        c.telefono,        \n        s.telefono telefono_sede,\n        p.flag_is_cliente isapp,\n        CAST(p.json_datos_delivery AS JSON) json_datos_delivery\n    FROM pedido p\n    inner join sede s on p.idsede=s.idsede\n    INNER JOIN cliente c ON c.idcliente = p.idcliente     \n    WHERE p.idpedido = ", ""])), idpedido)];
            case 1:
                pedido = _a.sent();
                arrDatosDelivery = pedido[0].json_datos_delivery.p_header.arrDatosDelivery;
                orden = pedido[0].json_datos_delivery.p_body.tipoconsumo;
                subtotales = pedido[0].json_datos_delivery.p_subtotales;
                datosCliente = {
                    nombres: pedido[0].nomcliente,
                    telefono: pedido[0].telefono,
                    direccion: arrDatosDelivery.direccionEnvioSelected.direccion,
                    latitud: arrDatosDelivery.direccionEnvioSelected.latitude,
                    longitud: arrDatosDelivery.direccionEnvioSelected.longitude
                };
                datosEstablecimiento = {
                    nombre: arrDatosDelivery.establecimiento.nombre,
                    direccion: arrDatosDelivery.establecimiento.direccion,
                    telefono: pedido[0].telefono_sede,
                    ciudad: arrDatosDelivery.establecimiento.ciudad,
                    latitud: arrDatosDelivery.establecimiento.latitude,
                    longitud: arrDatosDelivery.establecimiento.longitude
                };
                ArrayPedido = {
                    idpedido: pedido[0].idpedido,
                    pwa_estado: pedido[0].pwa_estado,
                    estado: pedido[0].estado,
                    cliente: datosCliente,
                    establecimiento: datosEstablecimiento,
                    orden: orden,
                    subtotales: subtotales
                };
                res.status(200).json(ArrayPedido);
                return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1;
