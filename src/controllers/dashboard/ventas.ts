import express from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

import dotenv from 'dotenv';
import { normalizeResponse, normalizeResponseDash, normalizeResponseDashVentasTotal, normalizeResponseCompararLocales } from "../../services/dash.util";
import { validarYCorregirRangoPeriodo, limitarRangoFechasDashboard } from "../../utils/utils";
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash ventas' })
});


// obtener el total de ventas
router.post("/total", async (req, res) => {
    let { idsede, params } = req.body;    


    
    
    // Validar y corregir el rango de período si es necesario
    // params = validarYCorregirRangoPeriodo(params);
    //console.log('params corregidos:', params);
    
    // res.status(200).send(params);
    try {
        const ssql = `CALL procedure_module_dash_ventas(${idsede}, '${JSON.stringify(params)}')`;

        const rpt: any = await prisma.$queryRawUnsafe(ssql);        

        const sqlExec = rpt[0].f0            

        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);            
        rptExec = normalizeResponseDashVentasTotal(rptExec);        

                   
        res.status(200).json(rptExec);        
    } catch (error) {
        res.status(500).json(error);        
    }
});

router.post("/ventas-detalle", async (req, res) => {
    let { idsede, params } = req.body;     
    try {
        // Validar parámetros
        if (!idsede || !params || !params.periodo) {
            return res.status(400).json({
                error: 'Parámetros inválidos. Se requiere idsede y params.periodo'
            });
        }

        let ventas = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @periodo_params = '${JSON.stringify(params)}'`);
            const result = await tx.$queryRawUnsafe(`CALL procedure_module_dash_pedidos_ventas(@xidsede, @periodo_params)`);
            return result;
        });        

        ventas = normalizeResponseDash(ventas);

        // const sql = `CALL procedure_module_dash_pedidos_ventas(${idsede}, '${JSON.stringify(params)}')`;
        // const rpt: any = await prisma.$queryRawUnsafe(sql);
        // const sqlExec = rpt[0].f0;
        // let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);
        // rptExec = normalizeResponse(rptExec);
        
        res.status(200).json(ventas);

    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: String(error)
        });
    }
});

// get meta de venta diaria
router.post("/meta-venta", async (req, res) => {
    const { idsede } = req.body;        
    try {
        const rpt: any = await prisma.$queryRaw`select diaria from sede_meta where idsede = ${idsede} and estado = '0'`;
        const meta = rpt[0] ? rpt[0].diaria : 0;
        res.status(200).json({
            meta: meta
        });        
    } catch (error) {
        res.status(500).json(error);        
    }
});

// comparar ventas entre sedes
router.post("/comparar-locales", async (req, res) => {
    const { sedes, params } = req.body;
    
    try {
        if (!sedes || !Array.isArray(sedes) || sedes.length === 0) {
            return res.status(400).json({
                error: 'Se requiere un array de sedes'
            });
        }        

        const tipo_consulta = params?.periodo || 'dia';
        
        // Limitar rango de fechas a máximo 5 meses
        const fechasLimitadas = limitarRangoFechasDashboard(params?.rango_start_date || '', params?.rango_end_date || '');
        const fecha_inicio = fechasLimitadas.fecha_inicio;
        const fecha_fin = fechasLimitadas.fecha_fin;

        let result: any = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @sedes_json = '${JSON.stringify(sedes)}'`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${fecha_fin}'`);
            return await tx.$queryRawUnsafe(`CALL procedure_dash_comparar_locales(@sedes_json, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
        });

        result = normalizeResponseCompararLocales(result);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: String(error)
        });
    }
});

// solicitar a api gpt el analisis de ventas
router.post("/analisis-ventas", async (req, res) => {
    const { message, nom_assistant } = req.body;    

    const assistants = [
        {id: 9, name: 'ventas', url: 'analisis-estadistico'},
        {id: 10, name: 'productos', url: 'analisis-estadistico'}
    ]

    const assistant = assistants.find((element: any) => element.name === nom_assistant);


    try {
        const url = `${process.env.URL_API_GPT}/analisis-estadistico`


        const data = {            
            message: message,
            idassistant: assistant?.id
        }
        const response = await axios.post(url, data);        
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json(error);        
    }
});

export default router;
