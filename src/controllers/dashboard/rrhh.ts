// Indicadores de Recursos Humanos para el dashboard.
//
// DE DONDE SALEN LOS DATOS
// El costo de personal NO se calcula aqui. Vive en el API de Recursos Humanos,
// que es el que tiene las marcas, los horarios y los contratos, y es el mismo
// motor con el que se arma la boleta. Este controlador es un puente.
//
// POR QUE UN PUENTE Y NO LA CUENTA HECHA ACA
// Si el dashboard calculara el costo por su lado, tarde o temprano mostraria
// un numero distinto al de la planilla. Y cuando el dueno pregunte cual es el
// bueno, no va a haber respuesta. Un solo motor, dos pantallas.
//
// LAS VENTAS NO PASAN POR AQUI
// A proposito. El dashboard ya sabe traer sus ventas, y esa cifra se muestra
// en media docena de pantallas: si esta pagina trajera las suyas por otro
// camino, habria dos numeros de venta para el mismo dia. La pagina combina el
// costo que da este endpoint con las ventas que ya sabe pedir.

import * as express from "express";
import axios from "axios";
import * as jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { logger } from '../../utils/logger';
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

/**
 * La empresa a la que pertenece una sede.
 *
 * Se busca aqui y NO se acepta del cliente. El dashboard sabe en que sede esta
 * parado; de que empresa es, lo dice la base. Si viniera en el cuerpo, cambiar
 * ese numero mostraria la planilla de otro negocio.
 */
async function orgDeLaSede(idsede: number): Promise<number | null> {
    const filas: any[] = await prisma.$queryRawUnsafe(
        'SELECT idorg FROM sede WHERE idsede = ? LIMIT 1', idsede);
    return filas.length ? Number(filas[0].idorg) : null;
}

/** Donde vive el API de Recursos Humanos. */
const API_RRHH = process.env.API_RRHH_URL || 'http://localhost:10323/api-rrhh';

/**
 * El secreto que comparten el POS y Recursos Humanos.
 *
 * Es la misma puerta que usa el POS para hablar con RRHH. Aqui se usa para lo
 * mismo: un servidor llamando a otro. El token lleva la empresa y la sede, y
 * del otro lado se verifica la firma -- no se confia en lo que diga el cliente.
 */
const SECRET_POS = process.env.POS_SHARED_SECRET || '';

function tokenParaRrhh(idorg: number, idsede: number): string {
    if (!SECRET_POS) {
        throw new Error('falta POS_SHARED_SECRET en el .env: sin eso no se puede consultar Recursos Humanos');
    }
    // Corto a proposito: se emite para esta llamada y nada mas.
    return jwt.sign({ ido: idorg, idsede, idusuario: 0 }, SECRET_POS,
        { algorithm: 'HS256', expiresIn: '2m' });
}

router.get("/", async (_req, res) => {
    res.status(200).json({ message: 'Estas conectado al api dash RRHH' });
});

/**
 * Costo de personal de un periodo.
 *
 * Body: `{ idsede, params: { periodo } }`
 *   - `idsede` es el del POS (restobar.sede), no el de Recursos Humanos.
 *   - `periodo` es la clave que arma RRHH ('2026-09' o el primer dia del
 *     periodo). Si no viene, RRHH resuelve el periodo en curso.
 */
router.post("/get-dash-rrhh-costo", async (req, res) => {
    const { idsede, params } = req.body || {};

    if (!idsede) {
        return res.status(400).json({ error: 'Falta la sede.' });
    }

    try {
        const idorg = await orgDeLaSede(Number(idsede));
        if (!idorg) { return res.status(404).json({ error: 'Esa sede no existe.' }); }

        const r = await axios.post(
            `${API_RRHH}/asistencia/costo`,
            { periodo: params?.periodo },
            {
                headers: { Authorization: 'Bearer ' + tokenParaRrhh(Number(idorg), Number(idsede)) },
                // Si Recursos Humanos no contesta, esta pagina no puede colgar
                // al dashboard entero esperando.
                timeout: 15000
            }
        );

        res.status(200).json(r.data?.datos ?? r.data);

    } catch (error: any) {
        // Que el modulo de RRHH no este disponible no es un error del
        // dashboard: se devuelve un cuerpo que la pantalla sabe mostrar, en
        // vez de un 500 que solo dice "algo paso".
        const detalle = error?.response?.data?.error || error?.message || 'error desconocido';
        logger.error('[dash-rrhh] no se pudo consultar Recursos Humanos:', detalle);

        res.status(200).json({
            sin_rrhh: true,
            no_disponible: true,
            motivo: detalle
        });
    }
});

/**
 * Costo de personal de TODAS las sedes de la empresa, para compararlas.
 *
 * No se manda la lista de sedes: la arma Recursos Humanos a partir de la
 * empresa del token. Mandarla desde aqui seria darle al cliente la posibilidad
 * de pedir una sede que no es suya.
 *
 * Body: `{ idsede, params: { periodo } }`
 *
 * El `idsede` viaja solo para que el token sea valido -- la puerta de Recursos
 * Humanos exige empresa Y sede, y con razon: un token sin sede serviria para
 * cualquiera. Del otro lado no se usa, porque las sedes se listan a partir de
 * la empresa.
 */
router.post("/get-dash-rrhh-sedes", async (req, res) => {
    const { idsede, params } = req.body || {};

    if (!idsede) {
        return res.status(400).json({ error: 'Falta la sede.' });
    }

    try {
        const idorg = await orgDeLaSede(Number(idsede));
        if (!idorg) { return res.status(404).json({ error: 'Esa sede no existe.' }); }

        const r = await axios.post(
            API_RRHH + '/asistencia/costo-sedes',
            { periodo: params?.periodo },
            {
                headers: { Authorization: 'Bearer ' + tokenParaRrhh(Number(idorg), Number(idsede)) },
                timeout: 30000   // son varias planillas, una por local
            }
        );
        res.status(200).json(r.data?.datos ?? r.data);

    } catch (error: any) {
        const detalle = error?.response?.data?.error || error?.message || 'error desconocido';
        logger.error('[dash-rrhh] no se pudieron comparar las sedes:', detalle);
        res.status(200).json({ sin_rrhh: true, no_disponible: true, motivo: detalle, sedes: [] });
    }
});

export default router;
