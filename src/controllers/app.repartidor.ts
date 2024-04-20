import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { fechaGuionASlash } from "../utils/utils";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api chat-bot' })
});

// obtener lista de pedidos
router.post('/list-pedidos-asignados', async (req: any, res) => {
    const { idpedidos } = req.body;
    const idpedidosArray = idpedidos.split(',').map(Number);
    const placeholders = idpedidosArray.map(() => '?').join(',');
    const pedidos: any = await prisma.$queryRawUnsafe(`SELECT 
        sub.idpedido, 
        sub.nomcliente, 
        sub.nomsede, 
        sub.isapp,    
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.metodoPago' AS metodo_pago,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.establecimiento.nombre' AS establecimiento,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.importeTotal' AS importe,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.propina' AS propina,
        sub.json_datos_delivery->>'$.p_subtotales' AS p_subtotales
    FROM (
        SELECT 
            p.idpedido, 
            c.nombres nomcliente, 
            s.nombre nomsede, 
            p.flag_is_cliente isapp,
            CAST(p.json_datos_delivery AS JSON) json_datos_delivery
        FROM pedido p
        INNER JOIN cliente c ON c.idcliente = p.idcliente 
        INNER JOIN sede s ON p.idsede = s.idsede  
        WHERE p.idpedido in (${placeholders})
    ) sub`, ...idpedidosArray);

    const ArrayPedidos: any = [];
    pedidos.map((item: any) => {
        // obtener costo total a pagar quitando descripcion que contengan 'delivery', 'entrega', 'propina'
        let total = 0;
        let propina = 0;
        let entrega = 0;
        const subtotales = JSON.parse(item.p_subtotales);
        subtotales
            .filter((x:any) => x.descripcion.toLowerCase() !== 'total')
            .map((sub: any) => {
                const descripcion = sub.descripcion.toLowerCase();
                const importe = parseFloat(sub.importe);

                if (!descripcion.includes('propina') && !descripcion.includes('delivery') && !descripcion.includes('entrega')) {
                    total += importe;
                } else if (descripcion.includes('propina')) {
                    propina = importe;
                } else if (descripcion.includes('delivery') || descripcion.includes('entrega')) {
                    entrega = importe;
                }
        });

        const url_img = 'https://restobar.papaya.com.pe/images/';
        item.metodo_pago = JSON.parse(item.metodo_pago);

        ArrayPedidos.push({
            idpedido: item.idpedido,
            nomcliente: item.nomcliente,
            nomsede: item.nomsede,
            isapp: item.isapp == 1 ? true : false,
            idtipo_pago: item.metodo_pago.idtipo_pago,
            img_pago: `${url_img}${item.metodo_pago.img}`,
            establecimiento: item.establecimiento,
            importe_pagar: total,
            importe_total: item.importe,
            propina: propina,
            entrega: entrega
        });
        
    });

    res.status(200).json(ArrayPedidos);
});

// detalle de pedido
router.get('/detalle-pedido/:idpedido', async (req: any, res) => {
    const { idpedido } = req.params;
    const pedido: any = await prisma.$queryRaw`SELECT 
        p.idpedido, 
        c.nombres nomcliente, 
        c.telefono,        
        p.flag_is_cliente isapp,
        CAST(p.json_datos_delivery AS JSON) json_datos_delivery
    FROM pedido p
    INNER JOIN cliente c ON c.idcliente = p.idcliente     
    WHERE p.idpedido = ${idpedido}`;

    

    const arrDatosDelivery = pedido[0].json_datos_delivery.p_header.arrDatosDelivery;
    const orden = pedido[0].json_datos_delivery.p_body.tipoconsumo;
    const subtotales = pedido[0].json_datos_delivery.p_subtotales;

    // objeto con los datos del cliente
    const datosCliente = {
        nombres: pedido[0].nomcliente,
        telefono: pedido[0].telefono,
        direccion: arrDatosDelivery.direccionEnvioSelected.direccion,
        latitud: arrDatosDelivery.direccionEnvioSelected.latitude,
        longitud: arrDatosDelivery.direccionEnvioSelected.longitude
    }

    // objeto con los datos del establecimiento
    const datosEstablecimiento = {
        nombre: arrDatosDelivery.establecimiento.nombre,
        direccion: arrDatosDelivery.establecimiento.direccion,
        ciudad: arrDatosDelivery.establecimiento.ciudad,
        latitud: arrDatosDelivery.establecimiento.latitude,
        longitud: arrDatosDelivery.establecimiento.longitude
    }

    const ArrayPedido = {
        idpedido: pedido[0].idpedido,
        cliente: datosCliente,
        establecimiento: datosEstablecimiento,
        orden: orden,
        subtotales: subtotales        
    }

    

    res.status(200).json(ArrayPedido);
});


export default router;