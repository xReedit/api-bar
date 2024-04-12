import * as express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado al reimpresion' })
});

// reimprimir comprobante por idcomprobante
router.get('/reimprimir-comprobante/:idregistro_pago', async (req: any, res) => {
    const { idregistro_pago } = req.params    
    // obtener idce de registro de pagos
    const _registro_pago: any = await prisma.registro_pago.findFirst({
        where: { idregistro_pago: Number(idregistro_pago) }
    });

    if (!_registro_pago) {
        res.status(200).send({ message: "No se encontro registro de pago" });
        return;
    }

    const _idce = _registro_pago.idce;
    const comprobante: any = await prisma.ce.findFirst({
        where: { idce: Number(_idce) }        
    });

    // configuracion de la impresion
    const confPrintSede: any = await prisma.conf_print.findFirst({
        where: { idsede: comprobante.idsede }    
    })

    // armamos los arrays
    const serie = comprobante.numero.split('-')[0];
    const correlativo = comprobante.numero.split('-')[1];
    const descripcionDocumento = serie.includes('F') ? 'Factura' : 'Boleta';    
    
    const ArrayComprobante = {
        "serie": serie,
        "correlativo": correlativo,
        "descripcion": descripcionDocumento,
        "pie_pagina_comprobante": confPrintSede.pie_pagina_comprobante,
    }

    const registroPagoSubtotal: any = await prisma.registro_pago_subtotal.findMany({
        where: { idregistro_pago: Number(idregistro_pago) }
    });

    const ArraySubTotales: any = [];
    registroPagoSubtotal.map((item: any) => {
        ArraySubTotales.push({            
            "quitar": false,
            "importe": item.importe,
            "visible": true,
            "descripcion": item.descripcion,
            "visible_cpe": true
        });
    });

    const datosReceptor = JSON.parse(comprobante.json_xml).datos_del_cliente_o_receptor
    const ArrayCliente = {
        "nombres": datosReceptor.apellidos_y_nombres_o_razon_social,
        "num_doc": datosReceptor.numero_documento,
        "telefono": datosReceptor.telefono,
        "direccion": datosReceptor.direccion
    }

    const itemsComprobante = JSON.parse(comprobante.json_xml).items;
    let listItems: any = [];
    itemsComprobante.map((item: any) => {
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

    const ArrayItem = {
        "0": listItems
    }

    // datos de la sede
    const sede: any = await prisma.sede.findFirst({
        where: { idsede: comprobante.idsede }
    });

    const Array_enca = {
        ruc: sede.ruc_cpe,
		nom_us: '',
		nombre: sede.razonsocial_cpe,
		direccion: sede.direccion,
		telefono: sede.telefono,
		sedeciudad: sede.ciudad,
		sedenombre: sede.nombre,
		hash: comprobante.external_id,
		external_id: '',
    }

    const rpt = {
        "ArrayItem": ArrayItem,
        "ArrayCliente": ArrayCliente,
        "ArraySubTotales": ArraySubTotales,
        "ArrayComprobante": ArrayComprobante,
        "Array_enca":Array_enca,
        "Array_print": {}
    }

    res.status(200).send(rpt);
    prisma.$disconnect();
});


export default router;