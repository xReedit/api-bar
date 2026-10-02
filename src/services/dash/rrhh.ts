import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger';
dotenv.config();

const prisma = new PrismaClient();

/**
 * Costo de personal, para el asistente.
 *
 * El costo NO se calcula aqui: vive en el API de Recursos Humanos, que es el
 * mismo motor con el que se arma la boleta. Si el asistente lo calculara por su
 * lado, tarde o temprano diria un numero distinto al de la planilla y no habria
 * forma de saber cual es el bueno.
 *
 * Es el unico dato del asistente que sale de otro servicio, asi que puede no
 * estar: se devuelve `null` y quien llama lo cuenta como "no disponible", en vez
 * de romper la consulta entera.
 */

const API_RRHH = process.env.API_RRHH_URL || 'http://localhost:10323/api-rrhh';
const SECRET_POS = process.env.POS_SHARED_SECRET || '';

async function orgDeLaSede(idsede: number): Promise<number | null> {
    const filas: any[] = await prisma.$queryRawUnsafe(
        'SELECT idorg FROM sede WHERE idsede = ? LIMIT 1',
        idsede
    );
    return filas.length ? Number(filas[0].idorg) : null;
}

function tokenParaRrhh(idorg: number, idsede: number): string {
    if (!SECRET_POS) throw new Error('falta POS_SHARED_SECRET');
    return jwt.sign({ ido: idorg, idsede, idusuario: 0 }, SECRET_POS, {
        algorithm: 'HS256',
        expiresIn: '2m'
    });
}

export interface CostoPersonal {
    periodo: string;
    datos: unknown;
}

/** `periodo` es YYYY-MM: Recursos Humanos razona por mes de planilla. */
export async function costoPersonal(
    idsede: number,
    periodo: string
): Promise<CostoPersonal | null> {
    try {
        const idorg = await orgDeLaSede(idsede);
        if (!idorg) return null;

        const r = await axios.post(
            `${API_RRHH}/asistencia/costo`,
            { periodo },
            {
                headers: { Authorization: 'Bearer ' + tokenParaRrhh(idorg, idsede) },
                // Que Recursos Humanos tarde no puede dejar colgado un turno del chat.
                timeout: 15000
            }
        );

        const datos = r.data?.datos ?? r.data;
        if (!datos || (datos as any).sin_rrhh) return null;
        return { periodo, datos };
    } catch (error: any) {
        const detalle = error?.response?.data?.error || error?.message || 'error desconocido';
        logger.error('[asistente] Recursos Humanos no respondio:', detalle);
        return null;
    }
}
