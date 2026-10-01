"use strict";
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
exports.__esModule = true;
var ClassEstructuraPedido = /** @class */ (function () {
    function ClassEstructuraPedido() {
        this.estructura = {
            p_body: {
                tipoconsumo: []
            },
            p_header: {
                "m": "00",
                "r": '',
                "appv": "v.2z",
                "nom_us": "BOT WhatsApp",
                "delivery": 0,
                "reservar": 0,
                "systemOS": "Bot WhatsApp",
                "isCliente": 0,
                "isFromBot": 1,
                "m_respaldo": "0",
                "num_pedido": "",
                "idcategoria": "0",
                "solo_llevar": 0,
                "arrDatosReserva": {},
                "correlativo_dia": "",
                "idregistro_pago": 0,
                "arrDatosDelivery": {},
                "isprint_all_short": 0,
                "idregistra_scan_qr": 0,
                "isprint_copy_short": 0,
                "is_print_subtotales": 1
            },
            p_subtotales: [],
            idpedido: 0
        };
    }
    ClassEstructuraPedido.prototype.setTipoConsumo = function (tipo) {
        this.estructura.p_body.tipoconsumo.push(tipo);
    };
    ClassEstructuraPedido.prototype.setHeader = function (header) {
        this.estructura.p_header = header;
    };
    ClassEstructuraPedido.prototype.setSubtotal = function (subtotal) {
        this.estructura.p_subtotales = subtotal;
    };
    ClassEstructuraPedido.prototype.completarHeader = function (datosCliente, datosEntrega, metodoPago, notas) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var tipoConsumo = (_b = (_a = this.estructura.p_body) === null || _a === void 0 ? void 0 : _a.tipoconsumo) === null || _b === void 0 ? void 0 : _b[0];
        var isDelivery = ((_c = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.descripcion) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === 'delivery';
        // Construir arrDatosDelivery completo
        var arrDatosDelivery = isDelivery ? {
            idcliente: datosCliente.idcliente.toString(),
            dni: "",
            nombre: datosCliente.nombres.toUpperCase(),
            f_nac: "",
            direccion: datosCliente.direccion || "",
            telefono: datosCliente.telefono || "",
            paga_con: "",
            dato_adicional: notas || "",
            referencia: "",
            tipoComprobante: [],
            importeTotal: ((_e = (_d = this.estructura.p_subtotales) === null || _d === void 0 ? void 0 : _d.find(function (st) { var _a; return (_a = st.descripcion) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('total'); })) === null || _e === void 0 ? void 0 : _e.importe) || 0,
            metodoPago: {
                idtipo_pago: metodoPago || "1",
                descripcion: metodoPago === "1" ? "EFECTIVO" : "OTRO",
                img: "_tp_01.png",
                importe: "",
                checked: true,
                visible: true
            },
            propina: [],
            direccionEnvioSelected: {
                idcliente: datosCliente.idcliente.toString(),
                num_doc: "",
                nombre: datosCliente.nombres.toUpperCase(),
                direccion: datosCliente.direccion || "",
                referencia: "",
                telefono: datosCliente.telefono || "",
                paga_con: "",
                f_nac: "",
                ciudad: "",
                provincia: "",
                departamento: "",
                pais: "",
                codigo: "",
                latitude: "",
                longitude: "",
                titulo: "Casa",
                solicitaCubiertos: "0",
                direccion_delivery_no_map: [{
                        direccion: datosCliente.direccion || "",
                        referencia: ""
                    }],
                nombres: datosCliente.nombres.toUpperCase()
            },
            establecimiento: datosEntrega.establecimiento || {},
            subTotales: [],
            pasoRecoger: false,
            buscarRepartidor: true,
            isFromComercio: 1,
            costoTotalDelivery: ((_g = (_f = this.estructura.p_subtotales) === null || _f === void 0 ? void 0 : _f.find(function (st) { var _a; return (_a = st.descripcion) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('delivery'); })) === null || _g === void 0 ? void 0 : _g.importe) || 0,
            tiempoEntregaProgamado: [],
            delivery: 1,
            solicitaCubiertos: "0",
            nombres: datosCliente.nombres.toUpperCase()
        } : {};
        // Actualizar p_header con todos los campos necesarios
        this.estructura.p_header = __assign(__assign({}, this.estructura.p_header), { idclie: datosCliente.idcliente.toString(), referencia: datosCliente.nombres.toUpperCase(), idcategoria: ((_h = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idcategoria) === null || _h === void 0 ? void 0 : _h.toString()) || "1", mesa: "", tipo_consumo: ((_j = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idtipo_consumo) === null || _j === void 0 ? void 0 : _j.toString()) || "4", subtotales_tachados: "", arrDatosDelivery: arrDatosDelivery, isComercioAppDeliveryMapa: isDelivery ? "1" : "0", delivery: isDelivery ? 1 : 0 });
    };
    ClassEstructuraPedido.prototype.getEstructura = function () {
        return this.estructura;
    };
    ClassEstructuraPedido.prototype.getBody = function () {
        return this.estructura.p_body;
    };
    return ClassEstructuraPedido;
}());
exports["default"] = ClassEstructuraPedido;
