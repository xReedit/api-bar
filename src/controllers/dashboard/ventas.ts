import * as express from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

import dotenv from 'dotenv';
import { normalizeResponse } from "../../services/dash.util";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash ventas' })
});


// obtener el total de ventas
router.post("/total", async (req, res) => {
    const { idsede, params } = req.body;    
    console.log('params', params);    
    // res.status(200).send(params);
    try {
        const ssql = `CALL procedure_module_dash_ventas(${idsede}, ${JSON.stringify(params)})`;
        console.log('object', ssql);    
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_ventas(${idsede}, ${JSON.stringify(params)})`;        
        const sqlExec = rpt[0].f0            
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);            
        rptExec = normalizeResponse(rptExec);
           
        console.log(rptExec);
        res.status(200).json(rptExec);        
    } catch (error) {
        res.status(500).json(error);        
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

// solicitar a api gpt el analisis de ventas
router.post("/analisis-ventas", async (req, res) => {
    const { message } = req.body;    
    try {
        const url = `${process.env.URL_API_GPT}/analisis-estadistico`
        const data = {            
            message: message
        }
        const response = await axios.post(url, data);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json(error);        
    }
});

export default router;
