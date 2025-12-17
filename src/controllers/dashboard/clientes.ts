import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponseDashClientes } from "../../services/dash.util";
import { limitarRangoFechasDashboard } from "../../utils/utils";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash CLIENTES' })
});

// obtener dashboard de clientes
router.post("/get-dash-clientes", async (req, res) => {
    const { idsede, params } = req.body;


    let clienteResultados: any;

    const p_tipo_consulta = params.tipo_consulta;
    
    // Limitar rango de fechas a máximo 5 meses
    const fechasLimitadas = limitarRangoFechasDashboard(params.rango_start_date, params.rango_end_date);
    const p_fecha_inicio = fechasLimitadas.fecha_inicio;
    const p_fecha_fin = fechasLimitadas.fecha_fin;
    
    try {        
        clienteResultados = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);


            
            try {
                const result = await tx.$queryRawUnsafe(`CALL procedure_module_dash_clientes(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                console.error('Error al ejecutar el stored procedure:', error);
                throw error;
            }
        });

        const clienteResultadosFormateados = normalizeResponseDashClientes(clienteResultados, p_tipo_consulta);       
        res.status(200).json(clienteResultadosFormateados);
    } catch (error) {
        res.status(500).json(error);
    }
});

export default router;
