import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponse } from "../../services/dash.util";
import { validarYCorregirRangoPeriodo } from "../../utils/utils";
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
    
    prisma.$disconnect();        
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
    
    prisma.$disconnect();        
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
    
    prisma.$disconnect();        
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
    
    prisma.$disconnect();        
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
    
    prisma.$disconnect();        
});

export default router;
