interface Subtotal {
    "id": 0,
    "quitar": false,
    "importe": '',
    "tachado": false,
    "visible": true,
    "esImpuesto": 0,
    "descripcion": "",
    "visible_cpe": true
}

interface EstructuraPedido {
    p_body: {
        tipoconsumo: any[];
    };
    p_header: any;
    p_subtotales: Subtotal[];
    idpedido: 0
}


class ClassEstructuraPedido {
    private estructura: EstructuraPedido;

    constructor() {
        this.estructura = {
            p_body: {
                tipoconsumo: [],
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
                "idcategoria": "0", //MODIFICARLO
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

    public setTipoConsumo(tipo: any) {
        this.estructura.p_body.tipoconsumo.push(tipo);
    }    

    public setHeader(header: any) {
        this.estructura.p_header = header;
    }

    public setSubtotal(subtotal: any) {
        this.estructura.p_subtotales=subtotal;
    }

    public getEstructura(): EstructuraPedido {
        return this.estructura;
    }

    public getBody(): any {
        return this.estructura.p_body;
    }
}

export default ClassEstructuraPedido;
