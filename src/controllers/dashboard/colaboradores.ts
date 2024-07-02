import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponse } from "../../services/dash.util";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash COLABORADORES' })
});

// obtener total pedidos
router.post("/get-pedidos", async (req, res) => {
    const { idsede, params } = req.body;
    try {        
        const ssql = `CALL procedure_module_dash_pedidos(${idsede}, ${JSON.stringify(params)})`;
        console.log('object', ssql);
        const rpt: any = await prisma.$queryRaw`CALL procedure_module_dash_pedidos(${idsede}, ${JSON.stringify(params)})`;
        const sqlExec = rpt[0].f0
        let rptExec: any = await prisma.$queryRawUnsafe(sqlExec);
        rptExec = normalizeResponse(rptExec);        
        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.post("/get-test", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash COLABORADORES' })
});


export default router;
