import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponseDashPromocionesCupones } from "../../services/dash.util";
import { limitarRangoFechasDashboard } from "../../utils/utils";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash PROMOCIONES Y CUPONES' })
});

// obtener dashboard de cupones y promociones
router.post("/get-dash-promociones-cupones", async (req, res) => {
    const { idsede, params } = req.body;

    const p_tipo_consulta = params?.tipo_consulta || 'all';
    
    // Limitar rango de fechas a máximo 5 meses
    const fechasOriginales = {
        fecha_inicio: params?.rango_start_date || params?.fecha_inicio || '',
        fecha_fin: params?.rango_end_date || params?.fecha_fin || ''
    };
    const fechasLimitadas = limitarRangoFechasDashboard(fechasOriginales.fecha_inicio, fechasOriginales.fecha_fin);
    const p_fecha_inicio = fechasLimitadas.fecha_inicio;
    const p_fecha_fin = fechasLimitadas.fecha_fin;

    if (!idsede) {
        return res.status(400).json({ error: 'Parámetro inválido. Se requiere idsede' });
    }

    if (!p_tipo_consulta) {
        return res.status(400).json({ error: 'Parámetro inválido. Se requiere params.tipo_consulta' });
    }

    try {
        const resultados = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);

            try {
                const result = await tx.$queryRawUnsafe(`CALL procedure_dash_promociones_cupones(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                console.error('Error al ejecutar el stored procedure:', error);
                throw error;
            }
        });

        const resultadosFormateados = normalizeResponseDashPromocionesCupones(resultados as any, p_tipo_consulta);
        res.status(200).json(resultadosFormateados);
    } catch (error) {
        res.status(500).json(error);
    }
});

export default router;
