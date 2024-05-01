import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { fechaGuionASlash } from "../utils/utils";
import SocketService from "../services/socket.services";

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
        sub.pwa_estado,
        sub.estado, 
        sub.nomcliente, 
        sub.telefono,
        sub.nomsede, 
        sub.telefono_sede,
        sub.isapp,  
        sub.time_line,
        sub.json_datos_delivery,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.metodoPago' AS metodo_pago,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.establecimiento.nombre' AS establecimiento,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.importeTotal' AS importe,
        sub.json_datos_delivery->>'$.p_header.arrDatosDelivery.propina' AS propina,
        sub.json_datos_delivery->>'$.p_subtotales' AS p_subtotales
    FROM (
        SELECT 
            p.idpedido, 
            p.pwa_estado,
            p.estado,
            c.nombres nomcliente, 
            c.telefono,        
            s.telefono telefono_sede,            
            s.nombre nomsede, 
            p.flag_is_cliente isapp,
            ptle.time_line, 
            CAST(p.json_datos_delivery AS JSON) json_datos_delivery
        FROM pedido p
        INNER JOIN cliente c ON c.idcliente = p.idcliente 
        INNER JOIN sede s ON p.idsede = s.idsede  
        left join pedido_time_line_entrega ptle on ptle.idpedido = p.idpedido 
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

        const url_img = 'https://app.restobar.papaya.com.pe/assets/images/icon-app/';
        item.metodo_pago = JSON.parse(item.metodo_pago);

        const arrDatosDelivery = item.json_datos_delivery.p_header.arrDatosDelivery;
        const orden = item.json_datos_delivery.p_body.tipoconsumo;
        const subtotalesOrden = item.json_datos_delivery.p_subtotales;

        // // objeto con los datos del cliente
        const datosCliente = {
            nombres: item.nomcliente,
            telefono: item.telefono,
            direccion: arrDatosDelivery.direccionEnvioSelected.direccion,
            latitud: arrDatosDelivery.direccionEnvioSelected.latitude,
            longitud: arrDatosDelivery.direccionEnvioSelected.longitude
        }

        // objeto con los datos del establecimiento
        const datosEstablecimiento = {
            nombre: arrDatosDelivery.establecimiento.nombre,
            direccion: arrDatosDelivery.establecimiento.direccion,
            telefono: item.telefono_sede,
            ciudad: arrDatosDelivery.establecimiento.ciudad,
            latitud: arrDatosDelivery.establecimiento.latitude,
            longitud: arrDatosDelivery.establecimiento.longitude
        }

        const ArrayPedido = {
            idpedido: item.idpedido,
            pwa_estado: item.pwa_estado,
            estado: item.estado,
            cliente: datosCliente,
            establecimiento: datosEstablecimiento,
            orden: orden,
            subtotales: subtotalesOrden        
        }

        const _time_line = item.time_line ? item.time_line : {};

        const _timeLineDefault = {
            hora_acepta_pedido: _time_line.hora_acepta_pedido ? _time_line.hora_acepta_pedido : 0,
            hora_pedido_entregado: _time_line.hora_pedido_entregado ? _time_line.hora_pedido_entregado : 0,
            llego_al_comercio: _time_line.llego_al_comercio ? _time_line.llego_al_comercio : false, 
            en_camino_al_cliente: _time_line.en_camino_al_cliente ? _time_line.en_camino_al_cliente : false,
            mensaje_enviado: {
                llego_al_comercio: _time_line?.mensaje_enviado?.llego_al_comercio ? _time_line.mensaje_enviado.llego_al_comercio : false  ,
                en_camino_al_cliente: _time_line?.mensaje_enviado?.en_camino_al_cliente ? _time_line.mensaje_enviado.en_camino_al_cliente : false,
                entrego: _time_line?.mensaje_enviado?.entrego ? _time_line.mensaje_enviado.entrego : false,
            },
            paso: _time_line.paso ? _time_line.paso : 0,
            msj_log: _time_line.msj_log ? _time_line.msj_log : '',
            distanciaMtr:_time_line.distanciaMtr ? _time_line.distanciaMtr : '',
        }

        ArrayPedidos.push({
            idpedido: item.idpedido,
            pwa_estado: item.pwa_estado,
            estado: item.estado,
            nomcliente: item.nomcliente,
            nomsede: item.nomsede,
            isapp: item.isapp == 1 ? true : false,
            idtipo_pago: item.metodo_pago.idtipo_pago,
            img_pago: `${url_img}${item.metodo_pago.img}`,
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
});

// detalle de pedido
router.get('/detalle-pedido/:idpedido', async (req: any, res) => {
    const { idpedido } = req.params;
    const pedido: any = await prisma.$queryRaw`SELECT 
        p.idpedido, 
        p.pwa_estado,
        p.estado,
        c.nombres nomcliente, 
        c.telefono,        
        s.telefono telefono_sede,
        p.flag_is_cliente isapp,
        CAST(p.json_datos_delivery AS JSON) json_datos_delivery
    FROM pedido p
    inner join sede s on p.idsede=s.idsede
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
        telefono: pedido[0].telefono_sede,
        ciudad: arrDatosDelivery.establecimiento.ciudad,
        latitud: arrDatosDelivery.establecimiento.latitude,
        longitud: arrDatosDelivery.establecimiento.longitude
    }

    const ArrayPedido = {
        idpedido: pedido[0].idpedido,
        pwa_estado: pedido[0].pwa_estado,
        estado: pedido[0].estado,
        cliente: datosCliente,
        establecimiento: datosEstablecimiento,
        orden: orden,
        subtotales: subtotales        
    }

    

    res.status(200).json(ArrayPedido);
});

// guardar timeline pedido
router.post('/save-timeline-pedido', async (req: any, res) => {
    const { idpedido, dataCliente, dataEstablecimiento, nomRepartidor, telRepartidor, idrepartidor, timeLine } = req.body;    
    let time_line = timeLine;    

    if ( time_line.mensaje_enviado.llego_al_comercio == true && !time_line.mensaje_enviado.en_camino_al_cliente ) {
        time_line.llego_al_comercio = true;
        time_line.mensaje_enviado.llego_al_comercio = true;
        time_line.paso = 1;
        time_line.msj_log = 'Llego al comercio';        
    } else if ( time_line.mensaje_enviado.en_camino_al_cliente ) {
        time_line.llego_al_comercio = true;
        time_line.mensaje_enviado.llego_al_comercio = true;
        time_line.en_camino_al_cliente = true;
        time_line.mensaje_enviado.en_camino_al_cliente = true;
        time_line.paso = 2;
        time_line.msj_log = 'En camino al cliente';        
    }

    
    
    const rowCliente = {
            nombre: dataCliente.nombres.split(' ')[0],
            telefono: dataCliente.telefono,
            establecimiento: dataEstablecimiento.nombre,
            idpedido: idpedido,
            repartidor_nom: nomRepartidor,
            repartidor_telefono: telRepartidor,
            repartidor_id: idrepartidor, // update timeline
            time_line: time_line, // update timeline
            tipo_msj: time_line.paso
    }

    const listClienteNotificar:any = [];
    listClienteNotificar.push(rowCliente);

    console.log('listClienteNotificar', listClienteNotificar);

    // se comunica mediante socket
    const socketServices = new SocketService();
    let querySocket = socketServices.querySocket('repartidor');
    querySocket.idrepartidor = parseInt(idrepartidor);
    console.log('querySocket', querySocket);
    await socketServices.connectSocket(querySocket);

    socketServices.emitEvent('repartidor-notifica-cliente-time-line', listClienteNotificar);
    socketServices.disconnect();
    res.status(200).json({ message: 'ok' });
});

// guardar token fcm
router.post('/save-token-fcm', async (req: any, res) => {
    const { idrepartidor, token_fcm } = req.body;
    const repartidor = await prisma.repartidor.update({
        where: {
            idrepartidor: idrepartidor
        },
        data: {
            pwa_code_verification: token_fcm
        }
    });

    res.status(200).json(repartidor);
});

export default router;