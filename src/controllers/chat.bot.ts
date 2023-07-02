import * as express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api chat-bot' })
});

// obtner la informacion de la sede
router.get("/get-sede/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.sede.findMany({
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
    })
    res.status(200).send(rpt);
});

// busca cliente por el numero de telefono
router.get("/cliente/:telefono", async (req, res) => {
    const { telefono } = req.params;
    const rpt = await prisma.$queryRaw`
        SELECT c.idcliente, c.nombres, c.direccion, c.telefono, cast(COALESCE(cpd.idcliente_pwa_direccion,0) as char) pwa_direccion
    ,cast(CONCAT('[',
      GROUP_CONCAT(JSON_OBJECT(
      	'idcliente_pwa_direccion', cpd.idcliente_pwa_direccion,
        'direccion', cpd.direccion,
        'referencia', cpd.referencia,
        'latitude', cpd.latitude,
        'longitude', cpd.longitude
      ) order by cpd.idcliente_pwa_direccion desc)
    ,']') as json) as direcciones
FROM cliente c
inner JOIN (
		select cp.idcliente, cp.idcliente_pwa_direccion, cp.direccion, cp.referencia, cp.latitude, cp.longitude 
		from cliente_pwa_direccion cp
		order by cp.idcliente_pwa_direccion desc
	) cpd USING (idcliente)
WHERE REPLACE(c.telefono, ' ', '') = REPLACE(${telefono}, ' ', '')
GROUP by SOUNDEX(c.nombres)
ORDER BY c.idcliente DESC
LIMIT 1;`;    

    res.status(200).send(rpt);
})

// obtener horarios y dias de atención
router.get("/horarios/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.categoria.findMany({
        where: { idsede: Number(idsede)},
        select: {
            idcategoria: true,
            idsede: true,
            idorg: true,
            descripcion: true,
            hora_ini: true,
            hora_fin: true,
            dia_disponible: true,
            visible_cliente: true,
            url_carta: true,
        }
    })
    res.status(200).send(rpt);
});


// obtener los canales de consumot
router.get("/canales/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.tipo_consumo.findMany({
        where: { AND: {
            idsede: Number(idsede),
            // titulo: '',            
            estado: 0
        }},
        select: {
            idtipo_consumo: true,
            descripcion: true,            
            idimpresora: true,
            estado: true,
            titulo: true,
            habilitado_chatbot: true            
        }
    })
    res.status(200).send(rpt);
});

// obtener los tipos de pago habilitados
router.get("/tipos-pago", async (req, res) => {    
    const rpt = await prisma.tipo_pago.findMany({
        where: { AND: {
            habilitado_chatbot: '1',
            estado: 0
        }},
        select: {
            idtipo_pago: true,
            descripcion: true,            
        }
    })
    res.status(200).send(rpt);
})       


router.get('/get-carta-establecimiento/:idsede', async (req: any, res) => {
    const { idsede } = req.params
    const rpt: any = await prisma.$queryRaw`call porcedure_pwa_pedido_carta(0,${idsede},0)`
    // remplazar nombre de las key de la respuesta
    try {        
        const data = {
                carta: rpt[0].f0,
                bodega: rpt[0].f1,
                promociones: rpt[0].f2
            }
        res.status(200).send(data);
    } catch (error) {        
        res.status(500).send(error);
    }
})

// obtener las reglas de la carta
router.get("/get-reglas-carta/:idsede/:idorg", async (req, res) => {
    const { idsede } = req.params;
    const { idorg } = req.params;
    const rpt: any = await prisma.$queryRaw`call procedure_pwa_reglas_carta_subtotales(${idorg},${idsede})`
    // remplazar nombre de las key de la respuesta
    try {
        const data = {
            reglas: rpt[0].f0,
            subtotales: rpt[0].f1,            
        }
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send(error);
    }
})

// obtner la configuracion de delivery de la sede
router.get("/get-config-delivery/:idsede", async (req, res) => {
    const { idsede } = req.params;
    let rptConsulta;
    rptConsulta = await prisma.sede_costo_delivery.findMany({
        where: {
            AND: {
                idsede: Number(idsede),                
                estado: '0'
            }
        }
    })

    // crea
    if (rptConsulta.length === 0 ) {
        const _parametros = { "km_base": "2", "km_limite": "7", "km_base_costo": "3", "km_adicional_costo": "2" }
        const dataSend = {
            idsede: Number(idsede),
            ciudades: '',
            parametros: _parametros
        }

        const _rpt = await prisma.sede_costo_delivery.create({
            data: dataSend
            }
        )        

        rptConsulta.push(_rpt)
    }
    res.status(200).send(rptConsulta);
});

// obtener impresoras
router.get("/get-impresoras/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.$queryRaw`select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font
	,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery
	,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda		
from conf_print cp 
	inner join impresora i using(idsede)
where cp.idsede = ${idsede} and i.estado = 0`

    res.status(200).send(rpt);
});

// seccion que mas piden
router.get("/get-seccion-mas-piden/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.$queryRaw`select cast(pd.idseccion as char(10)) idseccion, cast(COUNT(p.idpedido) as char(10)) cantidad_seccion  from pedido p
inner join pedido_detalle pd using (idpedido)
where STR_TO_DATE(fecha, '%d/%m/%Y') >=date_add(curdate(), INTERVAL -3 DAY) and p.idsede = ${idsede} 
group by pd.idseccion 
order by cantidad_seccion desc limit 2`

    res.status(200).send(rpt);
})

// obnter el comprobante electronico
router.get('/get-comprobante-electronico/:idsede/:dni/:serie/:numero', async (req: any, res) => {    
    const { idsede } = req.params;
    const { dni } = req.params;
    const { serie } = req.params;
    const { numero } = req.params;

    const rpt = <any>await prisma.$queryRaw`select external_id, cast(json_xml as JSON) datos, numero
from ce
 where idsede = ${idsede} 
 	and (substring_index(numero,'-', 1)=${serie}
 		and TRIM(LEADING '0' FROM substring_index(numero,'-', -1)) = ${numero}
 	) and json_xml != ''`

    console.log('rpt', rpt);
    console.log('rpt.length ', rpt.length);

    if ( rpt.length > 0 ) {
        const external_id = rpt[0].external_id
        const datosReceptor = rpt[0].datos.datos_del_cliente_o_receptor
        console.log('datosReceptor', datosReceptor.numero_documento);
        console.log('¿data.dni', dni);
        if (datosReceptor.numero_documento === dni ) {
            // enviamos el comprobante
            console.log('enviar comprobante ====');   
            const _rpt = {
                success: true,
                external_id: external_id
            }

            console.log('_rpt', _rpt);
            res.status(200).send(_rpt);         

        } else {
            console.log('error');            
            res.status(500).send({
                success: false
            }); 
        }
    }

    

    // res.status(200).send(rpt);
    prisma.$disconnect();
});


// actualizar carta
router.put('/update-carta/:id', async (req: any, res, next) => {
    const { id } = req.params
    const dataBody = req.body    
    const rpt = await prisma.categoria.updateMany({
        data: dataBody,
        where: {
             idcategoria: Number(id)            
        }

    }
    )

    res.status(200).send(rpt);
    prisma.$disconnect();

})


router.put('/update-canal-consumo/:id', async (req: any, res, next) => {
    const { id } = req.params
    const dataBody = req.body
    const rpt = await prisma.tipo_consumo.updateMany({
        data: dataBody,
        where: {
            idtipo_consumo: Number(id)
        }

    }
    )

    res.status(200).send(rpt);
    prisma.$disconnect();

})

// update metodo_pago_aceptados_chatbot por la sede
router.put('/update-tipo-pago-sede/:id', async (req: any, res, next) => {
    const { id } = req.params
    const dataBody = req.body
    const rpt = await prisma.sede.updateMany({
        data: dataBody,
        where: {
            idsede: Number(id)
        }

    }
    )

    res.status(200).send(rpt);
    prisma.$disconnect();

})

// guardar datos del delivery update-config-delivery
router.put('/update-config-delivery/:id', async (req: any, res, next) => {
    const { id } = req.params
    const dataBody = req.body
    const rpt = await prisma.sede_costo_delivery.updateMany({
        data: dataBody,
        where: {
            idsede_costo_delivery: Number(id)
        }

    }
    )

    res.status(200).send(rpt);
    prisma.$disconnect();

})

// guardar datos del delivery update-config-delivery
router.post('/create-config-delivery', async (req: any, res, next) => {    
    const dataBody = req.body
    const rpt = await prisma.sede_costo_delivery.create({
        data: dataBody
    }
    )

    res.status(200).send(rpt);
    prisma.$disconnect();

})

export default router;