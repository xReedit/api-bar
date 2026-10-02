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

export type Granularidad = 'dia' | 'semana' | 'mes';

/** Como agrupa MySQL cada granularidad. La semana arranca en lunes. */
const FORMATO: Record<Granularidad, string> = {
    dia: "DATE_FORMAT(rp.fecha_hora, '%Y-%m-%d')",
    semana: "DATE_FORMAT(DATE_SUB(rp.fecha_hora, INTERVAL WEEKDAY(rp.fecha_hora) DAY), '%Y-%m-%d')",
    mes: "DATE_FORMAT(rp.fecha_hora, '%Y-%m')"
};

/**
 * Granularidad que deja un grafico legible.
 *
 * Cinco meses en barras diarias son ciento cincuenta columnas y un eje que no
 * se lee: el dato esta, pero no comunica nada. Se elige por el largo del rango
 * y no por lo que pida quien llama, salvo que lo imponga a proposito.
 */
export function granularidadPara(desde: string, hasta: string): Granularidad {
    const dias =
        (new Date(hasta + 'T00:00:00Z').getTime() - new Date(desde + 'T00:00:00Z').getTime()) /
            86400000 +
        1;
    if (dias <= 45) return 'dia';
    if (dias <= 180) return 'semana';
    return 'mes';
}

export interface PuntoCanal {
    periodo: string;
    canal: string;
    total: number;
    transacciones: number;
}

/**
 * Los canales a lo largo del tiempo.
 *
 * Sin `canal` devuelve todos, que es lo que hace falta para compararlos: una
 * linea por canal sobre el mismo eje. Con `canal`, solo ese.
 */
export async function canalesEnElTiempo(
    idsedes: number[],
    desde: string,
    hasta: string,
    agrupar: Granularidad,
    canal?: string
): Promise<PuntoCanal[]> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    // El canal sale de una lista que arma el propio servidor, pero igual se
    // escapa: nunca se concatena texto sin tocar.
    const filtro = canal
        ? `AND COALESCE(tc.descripcion, 'SIN CANAL') = '${canal.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, '')}'`
        : '';

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT ${FORMATO[agrupar]} periodo,
                COALESCE(tc.descripcion, 'SIN CANAL') canal,
                COUNT(*) transacciones,
                COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) total
         FROM registro_pago rp
         LEFT JOIN tipo_consumo tc ON tc.idtipo_consumo = rp.idtipo_consumo
         WHERE rp.idsede IN (${sedes}) AND rp.estado = 0
           AND rp.fecha_hora >= '${desde} 00:00:00'
           AND rp.fecha_hora <= '${hasta} 23:59:59'
           ${filtro}
         GROUP BY periodo, canal
         ORDER BY periodo`
    );

    return (filas ?? []).map((f: any) => ({
        periodo: String(f.periodo),
        canal: String(f.canal),
        total: redondear(Number(f.total) || 0),
        transacciones: Number(f.transacciones) || 0
    }));
}
