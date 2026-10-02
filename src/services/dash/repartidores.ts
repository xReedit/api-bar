import { PrismaClient } from '@prisma/client';
import { redondear } from './agregados';

const prisma = new PrismaClient();

/**
 * Reparto a domicilio: quien entrega, cuanto y como lo califican.
 *
 * El canal delivery (`ventas_por_canal`) dice cuanta plata entra por reparto;
 * esto dice QUIEN la mueve. Son dos preguntas distintas y hasta ahora el
 * asistente solo sabia contestar la primera.
 *
 * Las entregas se cuentan contra la sede, pero el repartidor es de la
 * plataforma: el mismo puede repartir para varios locales.
 */

export interface Repartidor {
    nombre: string;
    entregas: number;
    calificacion: number | null;
    calificaciones: number;
    online: boolean;
    ultimaEntrega: string | null;
}

function listaSedes(idsedes: number[]): string {
    return idsedes.filter((n) => Number.isInteger(n) && n > 0).join(',');
}

export async function repartidoresDeSede(
    idsedes: number[],
    desde: string,
    hasta: string
): Promise<Repartidor[]> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT TRIM(CONCAT(r.nombre, ' ', COALESCE(r.apellido, ''))) nombre,
                COUNT(e.idrepartidor_pedido_entregado) entregas,
                MAX(DATE_FORMAT(e.fecha, '%Y-%m-%d')) ultima,
                r.online,
                AVG(NULLIF(c.calificacion, 0)) nota,
                COUNT(DISTINCT c.idrepartidor_calificacion) calificaciones
         FROM repartidor r
         INNER JOIN repartidor_pedido_entregado e
                 ON e.idrepartidor = r.idrepartidor
                AND e.idsede IN (${sedes})
                AND e.fecha >= '${desde} 00:00:00'
                AND e.fecha <= '${hasta} 23:59:59'
         LEFT JOIN repartidor_calificacion c ON c.idrepartidor = r.idrepartidor
         GROUP BY r.idrepartidor, nombre, r.online
         ORDER BY entregas DESC`
    );

    return (filas ?? []).map((f: any) => ({
        nombre: String(f.nombre || 'SIN NOMBRE'),
        entregas: Number(f.entregas) || 0,
        calificacion: f.nota === null ? null : redondear(Number(f.nota)),
        calificaciones: Number(f.calificaciones) || 0,
        online: Number(f.online) === 1,
        ultimaEntrega: f.ultima ? String(f.ultima) : null
    }));
}

/** Cuantos hay dados de alta, aunque no hayan repartido en el periodo. */
export async function totalRepartidores(): Promise<{ registrados: number; conectados: number }> {
    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) registrados, SUM(online = 1) conectados FROM repartidor`
    );
    const f = filas?.[0] ?? {};
    return {
        registrados: Number(f.registrados) || 0,
        conectados: Number(f.conectados) || 0
    };
}
