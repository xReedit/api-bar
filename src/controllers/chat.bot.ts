import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { fechaGuionASlash } from "../utils/utils";
import { getEstructuraPedido } from "../services/cocinar.pedido";

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
router.get("/cliente/:telefono/:idsede", async (req, res) => {    
    const { telefono, idsede } = req.params;
    
    // telefono del cliente sin espacios en blanco
    let telefono_cliente = telefono.replace(/\s/g, '');

    // 1. buscar cliente por telefono y sede
    const cliente: any = await prisma.$queryRaw`SELECT c.idcliente, c.nombres, c.direccion, c.telefono FROM cliente c 
        INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente
        WHERE cs.idsede = ${idsede} AND REPLACE(c.telefono, ' ', '') LIKE ${'%' + telefono_cliente + '%'}`;

    // sino se encuetra cliente salir
    if (cliente.length === 0) {
        res.status(200).send(cliente);
        return;
    }
    // 2. si no encuentra el cliente por telefono, buscar direcciones registradas
    const cliente_direcciones: any = await prisma.$queryRaw`SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude 
            FROM cliente_pwa_direccion cpd
            inner join cliente_sede cs on cs.idcliente = cpd.idcliente
            inner join sede_costo_delivery scd on scd.idsede=cs.idsede
            WHERE cpd.idcliente = ${cliente[0].idcliente} AND UPPER(scd.ciudades) LIKE CONCAT('%', UPPER(cpd.ciudad), '%')             
            GROUP BY cpd.direccion
            ORDER BY cpd.idcliente_pwa_direccion DESC`;

    // 3. Si existe cliente, agregar las direcciones
    let lista_direcciones: any = [];
    cliente[0].pwa_direccion = 0;
    if ( cliente_direcciones.length > 0 ){
        cliente[0].pwa_direccion = cliente_direcciones[0].idcliente_pwa_direccion;
        cliente_direcciones.forEach((element: any) => {
            lista_direcciones.push({
                idcliente_pwa_direccion: element.idcliente_pwa_direccion,
                direccion: element.direccion,
                referencia: element.referencia,
                latitude: element.latitude,
                longitude: element.longitude
            })
        })
    } else {
        const cliente_direcciones_string: any = await prisma.$queryRaw`select c.idcliente, c.direccion, c.referencia 
            from cliente_sede cs 
            inner join cliente c on cs.idcliente = c.idcliente where c.idcliente=${cliente[0].idcliente} 
            GROUP by c.direccion`;
        
        if ( cliente_direcciones_string.length > 0 ){
            cliente_direcciones_string.forEach((element: any) => {
                lista_direcciones.push({
                    idcliente_pwa_direccion: 0,
                    direccion: element.direccion,
                    referencia: element.referencia,
                    latitude: '',
                    longitude: ''
                })
            })
        }
    }

    // 4. retornar cliente con direcciones
    // solo enviamos los 7 primeros registros de la lista de direcciones
    lista_direcciones = lista_direcciones.slice(0, 7);
    const data = [{        
        idcliente: cliente[0].idcliente,
        nombres: cliente[0].nombres,
        direccion: cliente[0].direccion,
        telefono: cliente[0].telefono,
        pwa_direccion: cliente[0].pwa_direccion,
        direcciones: lista_direcciones
    }]

    res.status(200).send(data);

    
//     const rpt = await prisma.$queryRaw`
//         SELECT c.idcliente, c.nombres, c.direccion, c.telefono, cast(COALESCE(cpd.idcliente_pwa_direccion,0) as char) pwa_direccion,
//     JSON_ARRAYAGG(
//         JSON_OBJECT(
//         'idcliente_pwa_direccion', cpd.idcliente_pwa_direccion,
//         'direccion', concat(cpd.direccion, ', ', cpd.ciudad, ' ', cpd.codigo),
//         'referencia', cpd.referencia,
//         'latitude', cpd.latitude,
//         'longitude', cpd.longitude 
//         )
//     ) AS direcciones
// FROM cliente c
// inner join cliente_sede cs on cs.idcliente = c.idcliente
// left JOIN (
// 		select cp.idcliente, cp.idcliente_pwa_direccion, cp.direccion, cp.referencia, cp.latitude, cp.longitude, cp.ciudad, cp.codigo 
// 		from cliente_pwa_direccion cp
// 		order by cp.idcliente_pwa_direccion desc		
// 	) cpd on cpd.idcliente = c.idcliente 
// WHERE cs.idsede = 13 and REPLACE(c.telefono, ' ', '') = REPLACE(${telefono}, ' ', '')
// GROUP by c.telefono, SOUNDEX(c.nombres)
// ORDER BY c.idcliente DESC
// LIMIT 1;`;    

    // res.status(200).send(rpt);
})

// obtener horarios y dias de atención
router.get("/horarios/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.categoria.findMany({
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
        },
        where: { 
            AND: {
                idsede: Number(idsede),
                estado: 0
            }
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

// obtener listado de la secciones
router.get("/get-secciones-carta/:idsede", async (req, res) => {
    const { idsede } = req.params;
    try {        
        const rpt: any = await prisma.$queryRaw`SELECT s.descripcion, s.idseccion from carta_lista cl 
            inner join seccion s on cl.idseccion = s.idseccion 
            inner join carta c on cl.idcarta = c.idcarta 
            where c.idsede = ${idsede}
            GROUP by s.idseccion`
        res.status(200).send(rpt);
    } catch (error) {
        res.status(500).send(error);
    }
});

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
        const _parametros = { "km_base": "2", "km_limite": "7", "km_base_costo": "3", "km_adicional_costo": "2", "obtener_coordenadas_del_cliente":"SI", "costo_fijo":"0" }
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

// obtener la impresora segun el tipo de consumo y la sede
router.get("/get-impresora-tipo-consumo/:idsede/:idimpresora", async (req, res) => {
    const { idsede, idimpresora } = req.params;
    const rpt = await prisma.$queryRaw`select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font
            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery
            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda		
        from conf_print cp 
            inner join impresora i using(idsede)
        where cp.idsede = ${idsede} and i.estado = 0 and i.idimpresora = ${idimpresora}`

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
router.get('/get-comprobante-electronico/:idsede/:dni/:serie/:numero/:fecha', async (req: any, res) => {    
    let { idsede, dni, serie, numero, fecha } = req.params;
    const isSearchByFecha = fecha == '' || fecha == '0' ? false : true    
        
    fecha = isSearchByFecha ?  fechaGuionASlash(fecha) : ''    

    const _dataSend = {
        idsede: Number(idsede),
        dni: dni,
        serie: serie,
        numero: numero,
        fecha: fecha,
        isSearchByFecha: isSearchByFecha ?  1 : 0
    }

    console.log('_dataSend', _dataSend);
    console.log('query', `call procedure_chatbot_getidexternal_comprobante(${JSON.stringify(_dataSend)})`);

    const rpt: any = await prisma.$queryRaw`call procedure_chatbot_getidexternal_comprobante(${JSON.stringify(_dataSend)})`
    console.log('rpt', rpt);

    if ( rpt.length > 0 ) {
        const external_id = rpt[0].f0
        const numero_comprobante = rpt[0].f1
        // const datosReceptor = rpt[0].datos.datos_del_cliente_o_receptor
        
        // enviamos el comprobante            
        const _rpt = {
            success: true,
            external_id: external_id,
            numero_comprobante: numero_comprobante
        }
        res.status(200).send(_rpt);
        
    } else {
        res.status(500).send({
            success: false
        }); 
    }
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

    try {
        const rpt = await prisma.sede_costo_delivery.updateMany({
            data: dataBody,
            where: {
                idsede_costo_delivery: Number(id)
            }
        })
        res.status(200).send(rpt);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'error al actualizar update-config-delivery.' });
    } finally {
        prisma.$disconnect();
    }        

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

// from bot - guardar en chatbot_cliente los datos para ser recuperados en la tienda en linea
router.post('/create-history-chatbot-cliente', async (req: any, res, next) => {
    const dataBody = { ...req.body, fecha: new Date().toISOString().slice(0, 19).replace('T', ' ')}
    const rpt = await prisma.chatbot_cliente.create({
        data: dataBody
    })

    res.status(200).send(rpt);
    prisma.$disconnect();
})

router.get("/get-user-bot/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.usuario.findMany({
        where: { AND: {
            idsede: Number(idsede),
            isbot: '1'
        }},
        select: {
            idusuario: true,
            nombres: true,
        }
    }
)

    res.status(200).send(rpt);
    prisma.$disconnect();
})

// cambiar nombre del cliente
router.put('/change-name-cliente', async (req: any, res, next) => {
    const dataBody = { ...req.body}
    const rpt = await prisma.cliente.update({
        data: {
            nombres: dataBody.nombres,
        },
        where: {
            idcliente: Number(dataBody.idcliente)
        }
    })

    res.status(200).send(rpt);
    prisma.$disconnect();
})

// cambiar nombre del cliente
router.put('/change-name-cliente', async (req: any, res, next) => {
    const dataBody = { ...req.body}
    const rpt = await prisma.cliente.update({
        data: {
            nombres: dataBody.nombres,
        },
        where: {
            idcliente: Number(dataBody.idcliente)
        }
    })

    res.status(200).send(rpt);
    prisma.$disconnect();
})





// INTERACCION CON GPTS - PITER
// obtener la carta
router.get("/get-carta/:idsede", async (req, res) => {    
    const { idsede } = req.params;
    const rpt = await prisma.$queryRaw`select cll.idcarta_lista, cll.idcarta, cll.idseccion, cll.iditem, s.descripcion descripcion_seccion, i.descripcion, i.detalle as receta, cll.precio, 
		IF(cll.cantidad='SP',(IFNULL(( SELECT FLOOR(if (sum(i1.necesario) >= 1,
																		if(i1.viene_de='1', min(cast(p1.stock as SIGNED)), 
																			min(cast(ps.stock as SIGNED)))
																		,if(i1.viene_de='1', cast(p1.stock as SIGNED), 
																			cast(ps.stock as SIGNED))) /i1.cantidad)  cantidad 
																	  FROM item_ingrediente AS i1 
																	  	left JOIN porcion AS p1 ON i1.idporcion=p1.idporcion 
																		left JOIN producto_stock ps on ps.idproducto_stock = i1.idproducto_stock 
																	  WHERE i1.iditem=cll.iditem GROUP BY i1.iditem, i1.necesario ORDER BY i1.necesario desc, i1.iditem_ingrediente limit 1)
											,IFNULL((SELECT sum(FLOOR(p1.stock/i1.cantidad)) 
												FROM item_subitem_content ic
												inner join item_subitem AS i1 on ic.iditem_subitem_content = i1.iditem_subitem_content and i1.estado=0
												INNER JOIN porcion AS p1 ON i1.idporcion=p1.idporcion 
												WHERE i1.iditem_subitem_content=( 													
													SELECT iditem_subitem_content from item_subitem_content_detalle where iditem = cll.iditem and estado = 0 order by iditem_subitem_content_detalle limit 1
												)											
											),0)
											)),if(cll.cantidad = 'ND', 1000, cll.cantidad)) as stock 
	from carta_lista cll
        inner join item i on i.iditem = cll.iditem 
        inner join seccion s on s.idseccion = cll.idseccion
        inner JOIN carta c on c.idcarta = cll.idcarta 
        inner join categoria as catt on catt.idcategoria = c.idcategoria
        where c.idsede = ${idsede} and (catt.estado = 0 AND catt.visible_cliente=1 and (catt.url_carta <> '' AND catt.url_carta IS NOT NULL)) and i.estado=0 and cll.is_visible_cliente = 0 and s.is_visible_cliente=0`;
    
    res.status(200).send(rpt);
    prisma.$disconnect();
    
})

router.get("/get-carta-by-seccion/:idsede/:idseccion", async (req, res) => {    
    const { idsede, idseccion } = req.params;
    const rpt = await prisma.$queryRaw`select cll.idcarta_lista, cll.idcarta, cll.idseccion, cll.iditem, s.descripcion descripcion_seccion, i.descripcion, i.detalle as receta, cll.precio, 
		IF(cll.cantidad='SP',(IFNULL(( SELECT FLOOR(if (sum(i1.necesario) >= 1,
																		if(i1.viene_de='1', min(cast(p1.stock as SIGNED)), 
																			min(cast(ps.stock as SIGNED)))
																		,if(i1.viene_de='1', cast(p1.stock as SIGNED), 
																			cast(ps.stock as SIGNED))) /i1.cantidad)  cantidad 
																	  FROM item_ingrediente AS i1 
																	  	left JOIN porcion AS p1 ON i1.idporcion=p1.idporcion 
																		left JOIN producto_stock ps on ps.idproducto_stock = i1.idproducto_stock 
																	  WHERE i1.iditem=cll.iditem GROUP BY i1.iditem, i1.necesario ORDER BY i1.necesario desc, i1.iditem_ingrediente limit 1)
											,IFNULL((SELECT sum(FLOOR(p1.stock/i1.cantidad)) 
												FROM item_subitem_content ic
												inner join item_subitem AS i1 on ic.iditem_subitem_content = i1.iditem_subitem_content and i1.estado=0
												INNER JOIN porcion AS p1 ON i1.idporcion=p1.idporcion 
												WHERE i1.iditem_subitem_content=( 													
													SELECT iditem_subitem_content from item_subitem_content_detalle where iditem = cll.iditem and estado = 0 order by iditem_subitem_content_detalle limit 1
												)											
											),0)
											)),if(cll.cantidad = 'ND', 1000, cll.cantidad)) as stock 
	from carta_lista cll
        inner join item i on i.iditem = cll.iditem 
        inner join seccion s on s.idseccion = cll.idseccion
        inner JOIN carta c on c.idcarta = cll.idcarta 
        inner join categoria as catt on catt.idcategoria = c.idcategoria
        where (c.idsede = ${idsede} and s.idseccion= ${idseccion}) and catt.estado = 0 and i.estado=0 and cll.is_visible_cliente = 0`;
    
    res.status(200).send(rpt);
    prisma.$disconnect();
    
})

// consultar stock de un item
router.get("/get-stock-item/:idsede/:iditem", async (req, res) => {
    const { idsede, iditem } = req.params;
    const rpt = await prisma.$queryRaw`select cl.idcarta_lista, cl.idcarta, cl.idseccion, cl.iditem, i.descripcion, cl.precio, cl.cantidad as stock from carta_lista cl 
        inner join item i on i.iditem = cl.iditem 
        inner JOIN carta c on c.idcarta = cl.idcarta 
        where c.idsede = ${idsede} and i.estado=0 and cl.iditem = ${iditem}`;
    
    res.status(200).send(rpt);
    prisma.$disconnect();
    
})

// obtener seccion y los items seleccionados by listIdItem
router.post("/get-seccion-items", async (req, res) => {
    const { idsede, items } = req.body;     

    // verificamos si items es un json, sino lo es lo convertimos a json
    const _items = typeof items === 'string' ? JSON.parse(items) : items;
    


    // console.log('sql', `call procedure_get_seccion_items_chatbot(${idsede}, ${JSON.stringify(_items)})`);       
    const rpt: any = await prisma.$queryRaw`call procedure_get_seccion_items_chatbot(${idsede}, ${JSON.stringify(_items)})`        
    try {
        const data = {
            secciones: rpt[0].f0            
        }
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send(error);
    }
    prisma.$disconnect();
})

// obtner informacion para el delivery de la sede
router.get("/get-info-delivery/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.$queryRaw`select JSON_OBJECT('latitude',s.latitude, 'longitude', s.longitude) coordenadas_sede, scd.ciudades ciudades_disponible, scd.parametros->>'$.km_limite' distancia_maxima from sede s 
        inner join sede_costo_delivery scd on s.idsede = scd.idsede 
        where s.idsede = ${idsede}`

    res.status(200).send(rpt); 
    prisma.$disconnect();
})

// reducir tokens
// obtener la paramtrosSedeDelivery
router.get("/get-parametros-delivery/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rptParams = await prisma.sede_costo_delivery.findMany({
        where: {
            AND: {
                idsede: Number(idsede),                
                estado: '0'
            }
        }
    })

    // coordenadas de la sede
    const rptSede:any = await prisma.sede.findMany({
        where: {
            idsede: Number(idsede)
        },
        select: {
            latitude: true,
            longitude: true
        }
    })

    let paramsSede: any[] = []    
    if ( rptParams.length == 0 ) {
        paramsSede = [{ "km_base": "2", "km_limite": "7", "km_base_costo": "3", "km_adicional_costo": "2", "obtener_coordenadas_del_cliente":"SI", "costo_fijo":"0" }]
    } else {
        paramsSede = rptParams
    }

    
    const dataRpt = {
        obtener_coordenadas_del_cliente: paramsSede[0].parametros.obtener_coordenadas_del_cliente || 'SI',
        coordenadas_sede: {
            latitude: rptSede[0].latitude,
            longitude: rptSede[0].longitude
        },
        ciudades_disponible: paramsSede[0].ciudades,
        distancia_maxima_en_kilometros: paramsSede[0].parametros.km_limite,
        costo_delivery: 0,
        parametros_delivery: paramsSede[0].parametros
    }
    

    res.status(200).send(dataRpt);
    prisma.$disconnect();
})


// cocina estructura de pedido
router.post("/get-estructura-pedido", async (req, res, next) => {
    const { items, tipo_entrega, datos_entrega, idsede } = req.body;    
    const estrutura_pedido = await getEstructuraPedido(items, tipo_entrega, datos_entrega, idsede).catch(next);    
    res.status(200).send(estrutura_pedido);
})

// registrar nuevo cliente
router.post("/create-cliente-from-bot", async (req, res, next) => {
    const {telefono, idsede, nombres} = req.body;
    const rpt = await prisma.cliente.create({
        data: {
            telefono: telefono,
            idorg: 1,
            nombres: nombres.toUpperCase(),
            f_registro: new Date().toISOString().slice(0, 19).replace('T', ' '),
            ruc: '',
            direccion: '',
            pwa_id: '',
            email: '',
            estado: 0
        }        
    })
    const idcliente = rpt.idcliente;

    // ahora guardamos en cliente-sede
    await prisma.cliente_sede.create({
        data: {
            idcliente: idcliente,
            idsede: idsede,
            telefono: telefono         
        }
    })   

    res.status(200).send(rpt);
    prisma.$disconnect();
})


// guardar pedido realizado por el bot
router.post("/create-pedido-bot", async (req, res, next) => {
    const { idpedido, idsede } = req.body;
        
        const rpt = await prisma.pedido_bot.create({
            data: {
                idpedido: idpedido,
                fecha: new Date(),
                idsede: idsede
            }
        }).catch(next);
        res.status(200).send(rpt);    
        await prisma.$disconnect();    
})

// cuenta los pedidos del bot
router.get("/count-pedidos-bot/:idsede", async (req, res, next) => {
    const { idsede } = req.params;
    const rpt = await prisma.pedido_bot.count({
        where: {
            idsede: Number(idsede)
        }
    }).catch(next);     
        
    const rptCount = {
        count: rpt    
    };
    res.status(200).send(rptCount)
    prisma.$disconnect();    
})

// lista de productos disponibles para el bot
router.get("/get-list-productos-disponibles/:idsede", async (req, res, next) => {    
    const { idsede } = req.params;    
    try {
        const rpt: any = await prisma.$queryRaw`call procedure_secciones_mas_salen_bot(${idsede})`        

        let listProductos: any[] = []
        rpt.forEach((seccion: any) => {
            const seccionAdd = {
                idseccion: seccion.f0,
                seccion: seccion.f1,
                items: seccion.f2,
            }            
            listProductos.push(seccionAdd)
        })        
        res.status(200).send(listProductos);
    } catch (error) {
        next(error);
    } finally {
        prisma.$disconnect();    
    }
})

// registra la direccion del cliente para el pedido - bot
router.post("/create-direccion-cliente-pedido-bot", async (req, res, next) => {
    const { direccion, idcliente } = req.body;   
    // console.log('direccion', direccion); 
    // console.log('idcliente', idcliente);

    // 1 - buscar si la direccion ya existe
    const rptDireccion: any = await prisma.cliente_pwa_direccion.findMany({
        where: {
            AND: {
                idcliente: idcliente,
                direccion: direccion.direccion
            }
        }
    }).catch(next);

    // si la direccion ya existe retornamos
    if (rptDireccion.length > 0) {
        res.status(200).send(rptDireccion);
        prisma.$disconnect();
        return;
    }

    const rpt = await prisma.cliente_pwa_direccion.create({        
        data: {
            idcliente: idcliente,
            direccion: direccion.direccion,
            referencia: direccion.referencia || '',
            latitude: direccion.coordenadas.latitude || '',
            longitude: direccion.coordenadas.longitude || '',
            ciudad: direccion.political.ciudad || '',
            provincia: direccion.political.provincia || '',
            departamento: direccion.political.departamento || '',
            codigo: direccion.political.codigo || '',
            pais: direccion.political.pais || '',
            titulo: ''            
        }
    }).catch(next);
    res.status(200).send(rpt);
    prisma.$disconnect();
})

// registra la cantidad de token utilizado por idsede
router.post("/register-used-gpt-sede", async (req, res, next) => {
    const { data } = req.body;    
    const rpt: any = await prisma.$queryRaw`call procedure_use_gpt(${JSON.stringify(data)})`        
    try {        
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send(error);
    }
    prisma.$disconnect();
})

// consultar el estado del pedido
router.get("/get-estado-pedido/:idsede/:telefono", async (req, res) => {
    const { idsede, telefono } = req.params;
    const rpt: any = await prisma.$queryRaw`call procedure_get_estado_pedido_bot(${idsede}, ${telefono})`
    res.status(200).send(rpt);    
})

// bloquear numero de telefono
router.post("/bloquear-telefono", async (req, res, next) => {
    const { telefono, idsede, info } = req.body;    
    const rpt = await prisma.chatbot_num_bloqueados.create({
        data: {
            telefono: telefono,
            idsede: idsede,
            info: info,
            fecha_bloqueo: new Date()
        }
    }).catch(next);
    res.status(200).send(rpt);    
})

// desbloquear numero de telefono
router.post("/desbloquear-telefono", async (req, res, next) => {
    const { telefono, idsede } = req.body;    
    const rpt = await prisma.chatbot_num_bloqueados.deleteMany({
        where: {
            AND: {
                telefono: telefono,
                idsede: idsede
            }
        }
    }).catch(next);
    res.status(200).send(rpt);    
})

// listar telefonos bloqueados
router.get("/list-telefonos-bloqueados/:idsede", async (req, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.chatbot_num_bloqueados.findMany({
        select: {
            info: true,
            fecha_bloqueo: true,
        },
        where: {
            idsede: Number(idsede)
        }
    })
    res.status(200).send(rpt);
})

// consultar numero bloqueado
router.get("/get-telefono-bloqueado/:telefono/:idsede", async (req, res) => {
    const { telefono, idsede } = req.params;
    const rpt = await prisma.chatbot_num_bloqueados.findMany({
        where: {
            AND: {
                telefono: telefono,
                idsede: Number(idsede)
            }
        }
    })

    // retornar verdadero si el telefono esta bloqueado
    res.status(200).send(rpt.length > 0);    
})

export default router;

