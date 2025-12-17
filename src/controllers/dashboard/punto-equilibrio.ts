import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponseDashPuntoEquilibrio } from "../../services/dash.util";
import { limitarRangoFechasDashboard } from "../../utils/utils";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash PUNTO DE EQUILIBRIO' })
});

// Obtener datos para análisis de punto de equilibrio
router.post("/get-datos", async (req, res) => {
    const { idsede, params } = req.body;


    let resultados: any;

    const p_tipo_consulta = params.tipo_consulta || 'resumen';
    
    // Limitar rango de fechas a máximo 5 meses
    const fechasLimitadas = limitarRangoFechasDashboard(params.rango_start_date, params.rango_end_date);
    const p_fecha_inicio = fechasLimitadas.fecha_inicio;
    const p_fecha_fin = fechasLimitadas.fecha_fin;
    
    try {        
        resultados = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);


            
            try {
                const result = await tx.$queryRawUnsafe(`CALL module_dash_punto_equilibrio(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                console.error('Error al ejecutar el stored procedure:', error);
                throw error;
            }
        });

        const resultadosFormateados = normalizeResponseDashPuntoEquilibrio(resultados, p_tipo_consulta);       
        res.status(200).json(resultadosFormateados);
    } catch (error) {
        console.error('Error en punto equilibrio:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: String(error)
        });
    }
});

// guardar datos del punto de equilibrio
router.post("/set-datos-punto-equilibrio", async (req, res) => {
    const { idsede, mes, anio, datos } = req.body;

    try {
        const puntoEquilibrio = await prisma.punto_equilibrio.findFirst({
            where: {
                idsede: idsede,
                mes: String(mes),
                anio: String(anio)
            }
        });
        
        if (puntoEquilibrio) {
            await prisma.punto_equilibrio.update({
                where: {
                    id: puntoEquilibrio.id
                },
                data: {
                    datos: JSON.stringify(datos)
                }
            });
        } else {
            await prisma.punto_equilibrio.create({
                data: {
                    idsede: idsede,
                    mes: String(mes),
                    anio: String(anio),
                    datos: JSON.stringify(datos)
                }
            });
        }

        res.status(200).json({ message: 'Datos guardados correctamente' });
    } catch (error) {
        console.error('Error en punto equilibrio:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: String(error)
        });
    }

});

// obtener registro de punto de equilibrio
router.post("/get-datos-punto-equilibrio", async (req, res) => {
    const { idsede, mes, anio } = req.body;
    const puntoEquilibrio = await prisma.punto_equilibrio.findFirst({
        where: {
            idsede: idsede,
            mes: String(mes),
            anio: String(anio)
        },
        orderBy: {
            id: 'desc'
        }
    }) || await prisma.punto_equilibrio.findFirst({
        where: {
            idsede: idsede
        },
        orderBy: {
            id: 'desc'
        }
    }) || {};

    res.status(200).json(puntoEquilibrio || {});

})


export default router;
