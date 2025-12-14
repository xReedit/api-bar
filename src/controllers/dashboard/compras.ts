import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponseDashCompras } from "../../services/dash.util";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash COMPRAS' })
});

// obtener dashboard de compras
router.post("/get-dash-compras", async (req, res) => {
    const { idsede, params } = req.body;


    let comprasResultados: any;

    const p_tipo_consulta = params.tipo_consulta;
    const p_fecha_inicio = params.rango_start_date;
    const p_fecha_fin = params.rango_end_date;
    
    try {        
        comprasResultados = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);


            
            try {
                const result = await tx.$queryRawUnsafe(`CALL procedure_module_dash_compras(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                console.error('Error al ejecutar el stored procedure:', error);
                throw error;
            }
        });

        const comprasResultadosFormateados = normalizeResponseDashCompras(comprasResultados, p_tipo_consulta);       
        res.status(200).json(comprasResultadosFormateados);
    } catch (error) {
        res.status(500).json(error);
    }
});

export default router;
