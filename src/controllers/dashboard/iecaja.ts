import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponse, normalizeResponseDashCaja } from "../../services/dash.util";
import { validarYCorregirRangoPeriodo } from "../../utils/utils";
import { logger } from '../../utils/logger';
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash ie caja' })
});

// obtener el total ingresos y salidas de caja
router.post("/get-iecaja", async (req, res) => {
    let { idsede, params } = req.body;    
    params = validarYCorregirRangoPeriodo(params);
    try {
        const ssql = `CALL procedure_module_dash_caja(${idsede}, ${JSON.stringify(params)})`;        
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_caja(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0                 
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);            
        
        rptExec = normalizeResponse(rptExec);
        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);        
    }
});

// obtener el total de otros ingreoss
router.post("/get-otros-ingresos", async (req, res) => {
    let { idsede, params } = req.body;    
    params = validarYCorregirRangoPeriodo(params);
    try {
        const ssql = `CALL procedure_module_dash_otros_ingresos(${idsede}, ${JSON.stringify(params)})`;        
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_otros_ingresos(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0                 
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec); 	                
                

        // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
        rptExec = normalizeResponse(rptExec);

        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);        
    }
});

// obtener pedidos borrados
router.post("/get-pedidos-borrados", async (req, res) => {
    let { idsede, params } = req.body;    
    params = validarYCorregirRangoPeriodo(params);
    try {
        const ssql = `CALL procedure_module_dash_pedidos_borrados(${idsede}, ${JSON.stringify(params)})`;        
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_pedidos_borrados(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0                 
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);            
        // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
        rptExec = normalizeResponse(rptExec);


        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);        
    }
});


// obtener pedidos faltana cobrar
router.post("/get-pedidos-sin-corbrar", async (req, res) => {
    let { idsede, params } = req.body;    
    params = validarYCorregirRangoPeriodo(params);
    try {
        const ssql = `CALL procedure_module_dash_pedidos_sin_cobrar(${idsede}, ${JSON.stringify(params)})`;        
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_pedidos_sin_cobrar(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0                 
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec); 	                                    

        // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
        rptExec = normalizeResponse(rptExec);


        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);        
    }
});

// obtener descuentos aplicados
router.post("/get-descuentos-aplicados", async (req, res) => {
    let { idsede, params } = req.body;    
    params = validarYCorregirRangoPeriodo(params);
    try {
        // const ssql = `CALL procedure_module_dash_descuentos(${idsede}, ${JSON.stringify(params)})`;        
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_descuentos(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0                 
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec); 	                                    

        // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
        rptExec = normalizeResponse(rptExec);


        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);        
    }
});

router.post("/get-dash-caja", async (req, res) => {
    let { idsede, params } = req.body;        
    let cajaResultados: any;
    try {



        

        const p_tipo_consulta = params.tipo_consulta;
        const p_fecha_inicio = params.rango_start_date;
        const p_fecha_fin = params.rango_end_date;

        cajaResultados = await prisma.$transaction(async (tx) => {      






            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);            
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);

            try {
                const result = await tx.$queryRawUnsafe(`CALL procedure_module_dash_caja2(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                logger.error('Error al ejecutar el stored procedure:', error);
                throw error;
            }
        });     



        // Mapear los resultados con los nombres correctos
        const cajaFormateada = normalizeResponseDashCaja(cajaResultados, p_tipo_consulta);
    
        res.status(200).json(cajaFormateada);
    } catch (error) {
        res.status(500).json(error);
    }
});

// Cierres de caja del periodo: el snapshot que el POS guarda al cerrar (detalle_cierre) tal cual,
// para que el dashboard reimprima el ticket. El "dia" respeta hora_cierre_dia de la sede, igual que
// procedure_module_dash_caja2: un cierre a las 2am con hora_cierre 03:00 cuenta para el dia anterior.
// ponytail: devuelve el detalle de todos los cierres del rango (~1-20KB c/u); paginar si un mes pesa demasiado.
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
router.post("/get-cierres", async (req, res) => {
    const idsede = Number(req.body?.idsede);
    const inicio = req.body?.params?.rango_start_date;
    const fin = req.body?.params?.rango_end_date;
    if (!Number.isFinite(idsede) || !FECHA_RE.test(inicio) || !FECHA_RE.test(fin)) {
        return res.status(400).json({ success: false, error: 'idsede o rango de fechas invalido' });
    }
    try {
        const rows: any[] = await prisma.$queryRaw`
            SELECT b.idusuario_bitacora_cierre AS id, b.idusuario, u.nombres AS usuario_nombre,
                   sup.nombres AS supervisor_nombre, b.numintentos, b.fecha,
                   DATE_FORMAT(SUBTIME(b.fecha_hora, IFNULL(so.hora_cierre_dia, '00:00')), '%Y-%m-%d') AS dia,
                   s.nombre AS sede_nombre, s.ciudad, b.detalle_cierre, b.detalle_titulo
            FROM usuario_bitacora_cierre b
            JOIN usuario u ON u.idusuario = b.idusuario
            LEFT JOIN usuario sup ON sup.idusuario = NULLIF(b.idusuario_supervisor, 0)
            JOIN sede s ON s.idsede = b.idsede
            LEFT JOIN sede_opciones so ON so.idsede = b.idsede
            WHERE b.idsede = ${idsede} AND b.cierre = 1 AND b.detalle_cierre IS NOT NULL
              AND b.fecha_hora >= CONCAT(${inicio}, ' ', IFNULL(so.hora_cierre_dia, '00:00'))
              AND b.fecha_hora <  CONCAT(DATE_ADD(${fin}, INTERVAL 1 DAY), ' ', IFNULL(so.hora_cierre_dia, '00:00'))
            ORDER BY b.fecha_hora DESC`;
        res.status(200).json(rows.map((r) => ({ ...r, numintentos: Number(r.numintentos ?? 0) })));
    } catch (error) {
        logger.error('get-cierres:', error);
        res.status(500).json({ success: false, error: 'No se pudieron obtener los cierres' });
    }
});

export default router;
