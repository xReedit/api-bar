"use strict";
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
                "nom_us": "BOT",
                "delivery": 0,
                "reservar": 0,
                "systemOS": "Bot WhatsApp",
                "isCliente": 1,
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
                "is_print_subtotales": 0
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
    ClassEstructuraPedido.prototype.getEstructura = function () {
        return this.estructura;
    };
    ClassEstructuraPedido.prototype.getBody = function () {
        return this.estructura.p_body;
    };
    return ClassEstructuraPedido;
}());
exports["default"] = ClassEstructuraPedido;
