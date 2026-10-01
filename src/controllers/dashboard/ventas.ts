import express from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

import dotenv from 'dotenv';
import { normalizeResponse } from "../../services/dash.util";
import * as dashVentas from "../../services/dash/ventas";
import { ErrorValidacion, mensajeError } from "../../services/dash/errores";
import * as dashMetas from "../../services/dash/metas";
import { CustomRequest } from "../../middleware/auth";
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
    const { idsede, params } = req.body;
    try {
        res.status(200).json(await dashVentas.ventasTotal(idsede, params));
    } catch (error) {
        res.status(500).json({ error: mensajeError(error, 'consultar el total de ventas') });
    }
});

router.post("/ventas-detalle", async (req, res) => {
    const { idsede, params } = req.body;
    try {
        res.status(200).json(await dashVentas.ventasDetalle(idsede, params));
    } catch (error) {
        res.status(500).json({ error: mensajeError(error, 'consultar el detalle de ventas') });
    }
});

// get meta de venta diaria
router.post("/meta-venta", async (req, res) => {
    const { idsede } = req.body;
    try {
        res.status(200).json({ meta: await dashVentas.metaVentaDiaria(idsede) });
    } catch (error) {
        res.status(500).json({ error: mensajeError(error, 'consultar la meta de venta') });
    }
});

// comparar ventas entre sedes
router.post("/comparar-locales", async (req, res) => {
    const { sedes, params } = req.body;
    try {
        res.status(200).json(await dashVentas.compararLocales(sedes, params));
    } catch (error) {
        res.status(500).json({ error: mensajeError(error, 'comparar los locales') });
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

// ---------------------------------------------------------------- metas de venta
//
// Estos son los unicos endpoints de ESCRITURA del dashboard de ventas, asi que
// aqui si se comprueba que la sede sea del usuario contra el token. El resto de
// rutas dash-* todavia toma idsede del body sin validar (ver Etapa 0 del plan
// docs/PLAN_ASISTENTE_IA.md); en un endpoint que guarda no se puede esperar.

interface TokenDashboard {
    idorg?: number;
    idsede?: number;
    sedes?: Array<{ idsede: number; nombre: string }>;
}

function sedesDelToken(req: express.Request): number[] {
    const t = ((req as CustomRequest).token ?? {}) as TokenDashboard;
    const ids = new Set<number>();
    if (Number.isInteger(Number(t.idsede))) ids.add(Number(t.idsede));
    for (const s of t.sedes ?? []) {
        if (Number.isInteger(Number(s?.idsede))) ids.add(Number(s.idsede));
    }
    return Array.from(ids);
}

router.post("/metas-listar", async (req, res) => {
    try {
        const propias = sedesDelToken(req);
        const pedidas: number[] = Array.isArray(req.body?.sedes)
            ? req.body.sedes.map(Number).filter((n: number) => propias.includes(n))
            : propias;

        res.status(200).json(await dashMetas.listarMetas(pedidas));
    } catch (error) {
        res.status(500).json({ error: mensajeError(error, "consultar las metas") });
    }
});

router.post("/metas-guardar", async (req, res) => {
    try {
        const { idsede, diaria, mensual, anual } = req.body ?? {};
        const sede = Number(idsede);

        if (!sedesDelToken(req).includes(sede)) {
            throw new ErrorValidacion("Sede no autorizada para este usuario");
        }

        const t = ((req as CustomRequest).token ?? {}) as TokenDashboard;
        const guardada = await dashMetas.guardarMeta(sede, Number(t.idorg) || 0, {
            diaria,
            mensual,
            anual
        });

        res.status(200).json({ idsede: sede, ...guardada });
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, "guardar la meta") });
    }
});

export default router;
