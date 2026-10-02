import { PrismaClient } from '@prisma/client';
import { redondear } from './agregados';

const prisma = new PrismaClient();

/**
 * Ventas por canal: salon, para llevar y delivery.
 *
 * El canal vive en `registro_pago.idtipo_consumo`. Se agrupa por DESCRIPCION y
 * no por id porque `tipo_consumo` tiene una fila por sede: el mismo "DELIVERY"
 * aparece con varios ids, y agrupar por id partiria el canal en pedazos.
 *
 * Mismo filtro que el resto del dashboard (`estado = 0`), para que la suma de
 * los canales cuadre con el total de ventas.
 */

export interface VentaCanal {
    canal: string;
    ventas: number;
    total: number;
    ticketPromedio: number;
}

function listaSedes(idsedes: number[]): string {
    return idsedes.filter((n) => Number.isInteger(n) && n > 0).join(',');
}

export async function ventasPorCanal(
    idsedes: number[],
    desde: string,
    hasta: string
): Promise<VentaCanal[]> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(tc.descripcion, 'SIN CANAL') canal,
                COUNT(*) ventas,
                COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) total
         FROM registro_pago rp
         LEFT JOIN tipo_consumo tc ON tc.idtipo_consumo = rp.idtipo_consumo
         WHERE rp.idsede IN (${sedes}) AND rp.estado = 0
           AND rp.fecha_hora >= '${desde} 00:00:00'
           AND rp.fecha_hora <= '${hasta} 23:59:59'
         GROUP BY canal
         ORDER BY total DESC`
    );

    return (filas ?? []).map((f: any) => {
        const ventas = Number(f.ventas) || 0;
        const total = redondear(Number(f.total) || 0);
        return {
            canal: String(f.canal),
            ventas,
            total,
            ticketPromedio: ventas ? redondear(total / ventas) : 0
        };
    });
}

/** Serie diaria de un canal, para ver si crece o se cae. */
export async function canalPorDia(
    idsedes: number[],
    canal: string,
    desde: string,
    hasta: string
): Promise<Array<{ fecha: string; total: number; transacciones: number }>> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    // El canal llega de una lista cerrada que arma el propio servidor a partir de
    // ventasPorCanal, pero igual se escapa: nunca se concatena texto sin tocar.
    const seguro = canal.replace(/['\\]/g, '');

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT DATE_FORMAT(rp.fecha_hora, '%Y-%m-%d') fecha,
                COUNT(*) transacciones,
                COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) total
         FROM registro_pago rp
         LEFT JOIN tipo_consumo tc ON tc.idtipo_consumo = rp.idtipo_consumo
         WHERE rp.idsede IN (${sedes}) AND rp.estado = 0
           AND COALESCE(tc.descripcion, 'SIN CANAL') = '${seguro}'
           AND rp.fecha_hora >= '${desde} 00:00:00'
           AND rp.fecha_hora <= '${hasta} 23:59:59'
         GROUP BY fecha
         ORDER BY fecha`
    );

    return (filas ?? []).map((f: any) => ({
        fecha: String(f.fecha),
        total: redondear(Number(f.total) || 0),
        transacciones: Number(f.transacciones) || 0
    }));
}
