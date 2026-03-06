interface Subtotal {
    "id": 0,
    "quitar": false,
    "importe": '',
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
                "nom_us": "BOT WhatsApp",
                "delivery": 0,
                "reservar": 0,
                "systemOS": "Bot WhatsApp",
                "isCliente": 0, // no es cliente es el bot
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
                "is_print_subtotales": 1
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

    public completarHeader(datosCliente: any, datosEntrega: any, metodoPago?: string, notas?: string) {
        const tipoConsumo = this.estructura.p_body?.tipoconsumo?.[0];
        const isDelivery = tipoConsumo?.descripcion?.toLowerCase() === 'delivery';

        // Construir arrDatosDelivery completo
        const arrDatosDelivery = isDelivery ? {
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
            importeTotal: this.estructura.p_subtotales?.find((st: any) => st.descripcion?.toLowerCase().includes('total'))?.importe || 0,
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
            costoTotalDelivery: this.estructura.p_subtotales?.find((st: any) => st.descripcion?.toLowerCase().includes('delivery'))?.importe || 0,
            tiempoEntregaProgamado: [],
            delivery: 1,
            solicitaCubiertos: "0",
            nombres: datosCliente.nombres.toUpperCase()
        } : {};

        // Actualizar p_header con todos los campos necesarios
        this.estructura.p_header = {
            ...this.estructura.p_header,
            idclie: datosCliente.idcliente.toString(),
            referencia: datosCliente.nombres.toUpperCase(),
            idcategoria: tipoConsumo?.idcategoria?.toString() || "1",
            mesa: "",
            tipo_consumo: tipoConsumo?.idtipo_consumo?.toString() || "4",
            subtotales_tachados: "",
            arrDatosDelivery: arrDatosDelivery,
            isComercioAppDeliveryMapa: isDelivery ? "1" : "0",
            delivery: isDelivery ? 1 : 0
        };
    }

    public getEstructura(): EstructuraPedido {
        return this.estructura;
    }

    public getBody(): any {
        return this.estructura.p_body;
    }
}

export default ClassEstructuraPedido;
