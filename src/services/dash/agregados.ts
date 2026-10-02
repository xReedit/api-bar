/**
 * Agregaciones de ventas: la definicion unica de "cuanto se vendio".
 *
 * Portado de src/lib/services/ventas.helper.ts del dashboard, que hasta ahora
 * era el unico lugar donde vivia esta cuenta (la hacia el navegador). El
 * asistente IA necesita la misma cifra desde el servidor, y dos implementaciones
 * distintas de la misma cuenta es exactamente como se llega a que dos pantallas
 * no cuadren.
 *
 * DEUDA: el dashboard deberia consumir esto en vez de recalcularlo. Mientras
 * tanto, cualquier cambio aqui hay que replicarlo alla.
 *
 * OJO con la semantica heredada: cada fila es una LINEA DE PAGO
 * (registro_pago_detalle), no una venta. Una venta pagada mitad efectivo mitad
 * tarjeta cuenta como dos. Se mantiene asi para coincidir con lo que muestra
 * hoy el dashboard.
 */

export interface FilaVenta {
    importe: string | number;
    anulado: number;
    fecha?: string;
    des_tp?: string;
    [clave: string]: unknown;
}

export interface ResumenVentas {
    total: number;
    totalAnuladas: number;
    transacciones: number;
    cantidadAnuladas: number;
    promedio: number;
    ventaMayor: number;
    ventaMenor: number;
}

function aNumero(v: unknown): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
    return Number.isFinite(n) ? n : 0;
}

export function resumenVentas(filas: FilaVenta[]): ResumenVentas {
    const activas = filas.filter((v) => Number(v.anulado) === 0);
    const anuladas = filas.filter((v) => Number(v.anulado) === 1);

    const importes = activas.map((v) => aNumero(v.importe));
    const total = importes.reduce((s, x) => s + x, 0);

    return {
        total: redondear(total),
        totalAnuladas: redondear(anuladas.reduce((s, v) => s + aNumero(v.importe), 0)),
        transacciones: activas.length,
        cantidadAnuladas: anuladas.length,
        promedio: activas.length > 0 ? redondear(total / activas.length) : 0,
        ventaMayor: importes.length > 0 ? redondear(Math.max(...importes)) : 0,
        ventaMenor: importes.length > 0 ? redondear(Math.min(...importes)) : 0
    };
}

export interface DiaVentas {
    fecha: string;
    total: number;
    transacciones: number;
}

export type Agrupacion = 'dia' | 'semana' | 'mes';

/** Clave de agrupacion a partir de una fecha ISO. */
function claveDe(fecha: string, agrupar: Agrupacion): string {
    if (agrupar === 'mes') return fecha.slice(0, 7); // YYYY-MM
    if (agrupar === 'semana') {
        const d = new Date(fecha + 'T00:00:00Z');
        // Lunes de esa semana; agrupar por dia natural despista con periodos largos.
        const dia = (d.getUTCDay() + 6) % 7;
        d.setUTCDate(d.getUTCDate() - dia);
        return d.toISOString().slice(0, 10);
    }
    return fecha;
}

/** Serie temporal, ordenada. Solo ventas no anuladas. */
export function ventasPorDia(filas: FilaVenta[], agrupar: Agrupacion = 'dia'): DiaVentas[] {
    const acumulado = new Map<string, { total: number; transacciones: number }>();

    for (const v of filas) {
        if (Number(v.anulado) !== 0) continue;
        const fecha = String(v.fecha ?? '').slice(0, 10);
        if (!fecha) continue;

        const clave = claveDe(fecha, agrupar);
        const acc = acumulado.get(clave) ?? { total: 0, transacciones: 0 };
        acc.total += aNumero(v.importe);
        acc.transacciones += 1;
        acumulado.set(clave, acc);
    }

    return Array.from(acumulado.entries())
        .map(([fecha, v]) => ({ fecha, total: redondear(v.total), transacciones: v.transacciones }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Rellena con ceros los dias sin venta de un rango.
 *
 * `ventasPorDia` solo devuelve los dias que facturaron, que es lo correcto para
 * una serie suelta. Pero para superponer dos periodos hace falta que la posicion
 * i signifique lo mismo en los dos: si un lunes cerro y desaparece de la lista,
 * todo lo que viene detras se corre y se acaba comparando jueves con martes.
 *
 * Un dia cerrado vendio cero, no "no existe".
 */
export function rellenarDias(serie: DiaVentas[], desde: string, hasta: string): DiaVentas[] {
    const porFecha = new Map(serie.map((d) => [d.fecha, d]));
    const salida: DiaVentas[] = [];

    const fin = new Date(hasta + 'T00:00:00Z').getTime();
    for (let t = new Date(desde + 'T00:00:00Z').getTime(); t <= fin; t += 86400000) {
        const fecha = new Date(t).toISOString().slice(0, 10);
        salida.push(porFecha.get(fecha) ?? { fecha, total: 0, transacciones: 0 });
    }
    return salida;
}

/** Variacion porcentual, null cuando no hay base con la que comparar. */
export function variacionPct(actual: number, anterior: number): number | null {
    if (!anterior) return null;
    return redondear(((actual - anterior) / anterior) * 100);
}

export function redondear(n: number): number {
    return Math.round(n * 100) / 100;
}
