import { PrismaClient } from '@prisma/client';
import { redondear } from './agregados';

const prisma = new PrismaClient();

/**
 * Ventas por dia de la semana y hora.
 *
 * Es la unica consulta del asistente que no pasa por un procedure: ninguno
 * devuelve la hora, solo la fecha. Para que la cifra siga siendo la misma que la
 * del resto del dashboard se usa exactamente el mismo filtro que `dash_ventas`
 * (`registro_pago.estado = 0`), comprobado contra el total del dia.
 *
 * Responde a "cuando vendo mas", que es la pregunta que decide turnos, compras y
 * promociones por franja.
 */

export interface CeldaHorario {
    /** 1 = lunes … 7 = domingo. */
    dia: number;
    hora: number;
    total: number;
    transacciones: number;
}

export interface MapaHorario {
    celdas: CeldaHorario[];
    horaMin: number;
    horaMax: number;
    /** Franja con mas venta acumulada en todo el periodo. */
    pico: { dia: number; hora: number; total: number } | null;
}

export const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export function nombreDia(dia: number): string {
    return DIAS[dia - 1] ?? `Dia ${dia}`;
}

export async function ventasPorHorario(
    idsedes: number[],
    desde: string,
    hasta: string
): Promise<MapaHorario> {
    const ids = idsedes.filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return { celdas: [], horaMin: 0, horaMax: 0, pico: null };

    // DAYOFWEEK de MySQL da 1=domingo; se desplaza a 1=lunes, que es como se lee
    // una semana de restaurante.
    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT
            IF(DAYOFWEEK(rp.fecha_hora) = 1, 7, DAYOFWEEK(rp.fecha_hora) - 1) AS dia,
            HOUR(rp.fecha_hora) AS hora,
            ROUND(SUM(rp.total), 2) AS total,
            COUNT(*) AS transacciones
         FROM registro_pago rp
         WHERE rp.idsede IN (${ids.join(',')})
           AND rp.estado = 0
           AND DATE(rp.fecha_hora) BETWEEN '${desde}' AND '${hasta}'
         GROUP BY dia, hora
         ORDER BY dia, hora`
    );

    const celdas: CeldaHorario[] = (filas ?? []).map((f: any) => ({
        dia: Number(f.dia),
        hora: Number(f.hora),
        total: redondear(Number(f.total) || 0),
        transacciones: Number(f.transacciones) || 0
    }));

    if (celdas.length === 0) return { celdas, horaMin: 0, horaMax: 0, pico: null };

    const horas = celdas.map((c) => c.hora);
    const pico = celdas.reduce((mejor, c) => (c.total > mejor.total ? c : mejor));

    return {
        celdas,
        horaMin: Math.min(...horas),
        horaMax: Math.max(...horas),
        pico: { dia: pico.dia, hora: pico.hora, total: pico.total }
    };
}
