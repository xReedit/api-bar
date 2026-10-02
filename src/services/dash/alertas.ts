import { PrismaClient } from '@prisma/client';
import { redondear } from './agregados';

const prisma = new PrismaClient();

/**
 * Senales de alerta operativa.
 *
 * Todo lo que aparece aqui puede ser perfectamente normal: se borran items
 * porque el cliente cambio de opinion y se sacan billetes de caja para pagar al
 * proveedor. Lo que importa no es que ocurra, sino que ocurra MUCHO MAS que de
 * costumbre, o que se concentre en una persona.
 *
 * Por eso cada indicador se compara contra el periodo anterior del mismo largo
 * y se desglosa por usuario: un dato suelto no dice nada, la desviacion si.
 */

export interface Indicador {
    clave: string;
    etiqueta: string;
    cantidad: number;
    monto: number;
    cantidadAnterior: number;
    montoAnterior: number;
    variacionPct: number | null;
    /** Cuanto pesa sobre lo vendido en el periodo. Null si no hubo ventas. */
    pctSobreVentas: number | null;
    /** true cuando se dispara respecto al periodo anterior. */
    anomalo: boolean;
}

export interface PorUsuario {
    usuario: string;
    cantidad: number;
    monto: number;
}

export interface AlertasOperativas {
    /** Vendido en el periodo: sin esto no se puede decir si un monto es mucho. */
    ventasDelPeriodo: number;
    indicadores: Indicador[];
    borradosPorUsuario: PorUsuario[];
    anuladosPorUsuario: PorUsuario[];
    egresosPorUsuario: PorUsuario[];
    motivosFrecuentes: Array<{ motivo: string; veces: number }>;
}

/** Desde aqui, lo borrado o anulado pesa demasiado sobre la venta del periodo. */
const PESO_SOSPECHOSO_PCT = 2;

/**
 * Dos formas de saltar, porque hay dos formas de que esto sea un problema.
 *
 * Por FRECUENCIA: se borra el doble que el periodo anterior. Util para pillar un
 * cambio de habito.
 *
 * Por PESO: el monto pasa del 2% de lo vendido. Esta hacia falta. Mirando solo
 * la cantidad, S/ 3,957 en items borrados repartidos en 30 registros se leia
 * como "nada raro", cuando es plata que entro al pedido y salio sin cobrarse.
 * Un monto no se juzga solo: se juzga contra lo que se vendio.
 */
function esAnomalo(
    cantidad: number,
    anterior: number,
    monto: number,
    ventas: number
): boolean {
    if (ventas > 0 && (monto / ventas) * 100 >= PESO_SOSPECHOSO_PCT) return true;
    if (cantidad < 5) return false;
    if (anterior === 0) return cantidad >= 10;
    return cantidad >= anterior * 2;
}

function variacion(actual: number, anterior: number): number | null {
    if (!anterior) return null;
    return redondear(((actual - anterior) / anterior) * 100);
}

async function unaFila(sql: string): Promise<{ cantidad: number; monto: number }> {
    const r: any = await prisma.$queryRawUnsafe(sql);
    const f = r?.[0] ?? {};
    return { cantidad: Number(f.cantidad ?? 0), monto: redondear(Number(f.monto ?? 0)) };
}

function listaSedes(idsedes: number[]): string {
    return idsedes.filter((n) => Number.isInteger(n) && n > 0).join(',');
}

/** Consulta cruda: quien y cuanto, ordenado por cantidad. */
async function porUsuario(sql: string): Promise<PorUsuario[]> {
    const r: any = await prisma.$queryRawUnsafe(sql);
    return (r ?? []).map((f: any) => ({
        usuario: String(f.usuario ?? 'SIN USUARIO'),
        cantidad: Number(f.cantidad ?? 0),
        monto: redondear(Number(f.monto ?? 0))
    }));
}

export type TipoDetalle =
    | 'pedidos_anulados'
    | 'ventas_anuladas'
    | 'items_borrados'
    | 'egresos_caja';

export interface DiaOperaciones {
    fecha: string;
    cantidad: number;
    monto: number;
}

/** De donde sale cada tipo: tabla, columna de fecha, de monto y filtro. */
const ORIGEN: Record<TipoDetalle, { sql: (sedes: string) => string }> = {
    pedidos_anulados: {
        sql: (sedes) => `SELECT DATE_FORMAT(p.fecha_hora, '%Y-%m-%d') f, COUNT(*) c, SUM(p.total_r) m
            FROM pedido p WHERE p.idsede IN (${sedes}) AND p.estado = 3`
    },
    ventas_anuladas: {
        sql: (sedes) => `SELECT DATE_FORMAT(rp.fecha_hora, '%Y-%m-%d') f, COUNT(*) c, SUM(rp.total) m
            FROM registro_pago rp WHERE rp.idsede IN (${sedes}) AND rp.estado = 1`
    },
    items_borrados: {
        sql: (sedes) => `SELECT DATE_FORMAT(p.fecha_hora, '%Y-%m-%d') f, COUNT(*) c, SUM(pd.ptotal_r) m
            FROM pedido_detalle pd INNER JOIN pedido p ON p.idpedido = pd.idpedido
            WHERE p.idsede IN (${sedes}) AND pd.borrado = 1`
    },
    egresos_caja: {
        sql: (sedes) => `SELECT DATE_FORMAT(ic.fecha_hora, '%Y-%m-%d') f, COUNT(*) c, SUM(ic.monto) m
            FROM ie_caja ic WHERE ic.idsede IN (${sedes}) AND ic.tipo = 2 AND ic.estado = 0`
    }
};

/**
 * El mismo dato, repartido por dia.
 *
 * `detalleOperaciones` corta en 30 filas para no inundar al modelo, asi que
 * agrupar a partir de ella daria un reparto falso: el dia mas caro puede estar
 * fuera del corte. Esto cuenta sobre el total, sin limite.
 */
export async function operacionesPorDia(
    tipo: TipoDetalle,
    idsedes: number[],
    desde: string,
    hasta: string
): Promise<DiaOperaciones[]> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    const col = tipo === 'egresos_caja' ? 'ic.fecha_hora' : tipo === 'ventas_anuladas' ? 'rp.fecha_hora' : 'p.fecha_hora';

    const filas: any = await prisma.$queryRawUnsafe(
        `${ORIGEN[tipo].sql(sedes)}
           AND ${col} >= '${desde} 00:00:00' AND ${col} <= '${hasta} 23:59:59'
         GROUP BY f ORDER BY f`
    );

    return (filas ?? []).map((r: any) => ({
        fecha: String(r.f ?? ''),
        cantidad: Number(r.c) || 0,
        monto: redondear(Number(r.m) || 0)
    }));
}

export interface OperacionDetalle {
    referencia: string;
    fecha: string;
    usuario: string;
    monto: number;
    motivo: string | null;
    /** Solo en pedidos anulados: las lineas del pedido. */
    items?: Array<{ producto: string; cantidad: number; importe: number }>;
}

/**
 * Detalle linea por linea de una operacion.
 *
 * `alertasOperativas` responde "cuanto" y "quien"; esto responde "cual". Hace
 * falta porque la pregunta natural despues de "hubo 2 pedidos anulados" es
 * "cuales", y sin esto el asistente tenia que mandar al usuario a buscar en caja.
 */
export async function detalleOperaciones(
    tipo: TipoDetalle,
    idsedes: number[],
    desde: string,
    hasta: string,
    limite = 15
): Promise<OperacionDetalle[]> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return [];

    const tope = Math.min(Math.max(limite, 1), 30);
    const entre = (col: string) => `${col} >= '${desde} 00:00:00' AND ${col} <= '${hasta} 23:59:59'`;

    if (tipo === 'pedidos_anulados') {
        const filas: any = await prisma.$queryRawUnsafe(`
            SELECT p.idpedido, p.numpedido, p.fecha_hora, p.total_r monto,
                   p.motivo_anular motivo, COALESCE(u.nombres,'SIN USUARIO') usuario
            FROM pedido p
            LEFT JOIN usuario u ON u.idusuario = p.idusuario
            WHERE p.idsede IN (${sedes}) AND p.estado = 3 AND ${entre('p.fecha_hora')}
            ORDER BY p.fecha_hora DESC LIMIT ${tope}`);

        const salida: OperacionDetalle[] = [];
        for (const f of filas ?? []) {
            const items: any = await prisma.$queryRawUnsafe(`
                SELECT pd.descripcion producto, pd.cantidad_r cantidad, pd.ptotal_r importe
                FROM pedido_detalle pd
                WHERE pd.idpedido = ${Number(f.idpedido)} AND pd.estado = 0
                ORDER BY pd.idpedido_detalle LIMIT 20`);

            salida.push({
                referencia: `Pedido ${f.numpedido ?? f.idpedido}`,
                fecha: String(f.fecha_hora ?? ''),
                usuario: String(f.usuario),
                monto: redondear(Number(f.monto) || 0),
                motivo: f.motivo ? String(f.motivo) : null,
                items: (items ?? []).map((i: any) => ({
                    producto: String(i.producto ?? ''),
                    cantidad: Number(i.cantidad) || 0,
                    importe: redondear(Number(i.importe) || 0)
                }))
            });
        }
        return salida;
    }

    if (tipo === 'ventas_anuladas') {
        const filas: any = await prisma.$queryRawUnsafe(`
            SELECT rp.idregistro_pago, rp.correlativo, rp.fecha_hora, rp.total monto,
                   rp.motivo_anular motivo, COALESCE(u.nombres,'SIN USUARIO') usuario,
                   COALESCE(up.nombres,'') autorizo
            FROM registro_pago rp
            LEFT JOIN usuario u ON u.idusuario = rp.idusuario
            LEFT JOIN usuario up ON up.idusuario = rp.idusuario_permiso
            WHERE rp.idsede IN (${sedes}) AND rp.estado = 1 AND ${entre('rp.fecha_hora')}
            ORDER BY rp.fecha_hora DESC LIMIT ${tope}`);

        return (filas ?? []).map((f: any) => ({
            referencia: `Venta ${f.correlativo || f.idregistro_pago}`,
            fecha: String(f.fecha_hora ?? ''),
            usuario: String(f.usuario) + (f.autorizo ? ` (autorizo ${f.autorizo})` : ''),
            monto: redondear(Number(f.monto) || 0),
            motivo: f.motivo ? String(f.motivo) : null
        }));
    }

    if (tipo === 'items_borrados') {
        const filas: any = await prisma.$queryRawUnsafe(`
            SELECT pd.descripcion producto, pd.cantidad_r cantidad, pd.ptotal_r monto,
                   pd.motivo_borrado motivo, p.numpedido, p.fecha_hora,
                   COALESCE(u.nombres,'SIN USUARIO') usuario
            FROM pedido_detalle pd
            INNER JOIN pedido p ON p.idpedido = pd.idpedido
            LEFT JOIN usuario u ON u.idusuario = p.idusuario
            WHERE p.idsede IN (${sedes}) AND pd.borrado = 1 AND ${entre('p.fecha_hora')}
            ORDER BY p.fecha_hora DESC LIMIT ${tope}`);

        return (filas ?? []).map((f: any) => ({
            referencia: `${f.producto} (pedido ${f.numpedido})`,
            fecha: String(f.fecha_hora ?? ''),
            usuario: String(f.usuario),
            monto: redondear(Number(f.monto) || 0),
            motivo: f.motivo ? String(f.motivo) : null
        }));
    }

    const filas: any = await prisma.$queryRawUnsafe(`
        SELECT ic.idie_caja, ic.fecha_hora, ic.monto, ic.motivo,
               COALESCE(u.nombres,'SIN USUARIO') usuario
        FROM ie_caja ic
        LEFT JOIN usuario u ON u.idusuario = ic.idusuario
        WHERE ic.idsede IN (${sedes}) AND ic.tipo = 2 AND ic.estado = 0
          AND ${entre('ic.fecha_hora')}
        ORDER BY CAST(ic.monto AS DECIMAL(10,2)) DESC LIMIT ${tope}`);

    return (filas ?? []).map((f: any) => ({
        referencia: `Salida de caja #${f.idie_caja}`,
        fecha: String(f.fecha_hora ?? ''),
        usuario: String(f.usuario),
        monto: redondear(Number(f.monto) || 0),
        motivo: f.motivo ? String(f.motivo) : null
    }));
}

export async function alertasOperativas(
    idsedes: number[],
    desde: string,
    hasta: string,
    desdeAnterior: string,
    hastaAnterior: string
): Promise<AlertasOperativas> {
    const sedes = listaSedes(idsedes);
    if (!sedes) return { ventasDelPeriodo: 0, indicadores: [], borradosPorUsuario: [], anuladosPorUsuario: [], egresosPorUsuario: [], motivosFrecuentes: [] };

    const entre = (col: string, a: string, b: string) => `${col} >= '${a} 00:00:00' AND ${col} <= '${b} 23:59:59'`;

    // --- items borrados de un pedido ---
    const sqlBorrados = (a: string, b: string) => `
        SELECT COUNT(*) cantidad, COALESCE(SUM(pd.ptotal_r),0) monto
        FROM pedido_detalle pd
        INNER JOIN pedido p ON p.idpedido = pd.idpedido
        WHERE p.idsede IN (${sedes}) AND pd.borrado = 1 AND ${entre('p.fecha_hora', a, b)}`;

    // --- pedidos anulados (pedido.estado = 3) ---
    const sqlPedidosAnulados = (a: string, b: string) => `
        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(p.total_r AS DECIMAL(10,2))),0) monto
        FROM pedido p
        WHERE p.idsede IN (${sedes}) AND p.estado = 3 AND ${entre('p.fecha_hora', a, b)}`;

    // --- ventas anuladas (registro_pago.estado = 1) ---
    const sqlVentasAnuladas = (a: string, b: string) => `
        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))),0) monto
        FROM registro_pago rp
        WHERE rp.idsede IN (${sedes}) AND rp.estado = 1 AND ${entre('rp.fecha_hora', a, b)}`;

    // --- descuentos aplicados (solo los reales: importe > 0) ---
    const sqlDescuentos = (a: string, b: string) => `
        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(rpd.importe AS DECIMAL(10,2))),0) monto
        FROM registro_pago_descuento rpd
        INNER JOIN registro_pago rp ON rp.idregistro_pago = rpd.idregistro_pago
        WHERE rp.idsede IN (${sedes}) AND rpd.estado = 0 AND rp.estado = 0
          AND CAST(rpd.importe AS DECIMAL(10,2)) > 0 AND ${entre('rp.fecha_hora', a, b)}`;

    // --- salidas de caja ---
    const sqlEgresos = (a: string, b: string) => `
        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(ic.monto AS DECIMAL(10,2))),0) monto
        FROM ie_caja ic
        WHERE ic.idsede IN (${sedes}) AND ic.tipo = 2 AND ic.estado = 0
          AND ${entre('ic.fecha_hora', a, b)}`;

    const definiciones: Array<[string, string, (a: string, b: string) => string]> = [
        ['items_borrados', 'Items borrados de pedidos', sqlBorrados],
        ['pedidos_anulados', 'Pedidos anulados', sqlPedidosAnulados],
        ['ventas_anuladas', 'Ventas anuladas', sqlVentasAnuladas],
        ['descuentos', 'Descuentos aplicados', sqlDescuentos],
        ['egresos_caja', 'Salidas de caja', sqlEgresos]
    ];

    // La referencia contra la que se juzga todo lo demas. Sin esto, decir si
    // S/ 3,957 en borrados es mucho o poco es adivinar.
    const ventas = await unaFila(`
        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))),0) monto
        FROM registro_pago rp
        WHERE rp.idsede IN (${sedes}) AND rp.estado = 0
          AND ${entre('rp.fecha_hora', desde, hasta)}`);

    const indicadores: Indicador[] = [];
    for (const [clave, etiqueta, sql] of definiciones) {
        const hoy = await unaFila(sql(desde, hasta));
        const antes = await unaFila(sql(desdeAnterior, hastaAnterior));
        indicadores.push({
            clave,
            etiqueta,
            cantidad: hoy.cantidad,
            monto: hoy.monto,
            cantidadAnterior: antes.cantidad,
            montoAnterior: antes.monto,
            variacionPct: variacion(hoy.cantidad, antes.cantidad),
            pctSobreVentas: ventas.monto ? redondear((hoy.monto / ventas.monto) * 100) : null,
            anomalo: esAnomalo(hoy.cantidad, antes.cantidad, hoy.monto, ventas.monto)
        });
    }

    // Quien borra, quien anula y quien saca plata: sin nombre no hay accion posible.
    const borradosPorUsuario = await porUsuario(`
        SELECT u.nombres usuario, COUNT(*) cantidad, COALESCE(SUM(pd.ptotal_r),0) monto
        FROM pedido_detalle pd
        INNER JOIN pedido p ON p.idpedido = pd.idpedido
        LEFT JOIN usuario u ON u.idusuario = p.idusuario
        WHERE p.idsede IN (${sedes}) AND pd.borrado = 1 AND ${entre('p.fecha_hora', desde, hasta)}
        GROUP BY u.nombres ORDER BY cantidad DESC LIMIT 5`);

    const anuladosPorUsuario = await porUsuario(`
        SELECT u.nombres usuario, COUNT(*) cantidad,
               COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))),0) monto
        FROM registro_pago rp
        LEFT JOIN usuario u ON u.idusuario = rp.idusuario
        WHERE rp.idsede IN (${sedes}) AND rp.estado = 1 AND ${entre('rp.fecha_hora', desde, hasta)}
        GROUP BY u.nombres ORDER BY cantidad DESC LIMIT 5`);

    const egresosPorUsuario = await porUsuario(`
        SELECT u.nombres usuario, COUNT(*) cantidad,
               COALESCE(SUM(CAST(ic.monto AS DECIMAL(10,2))),0) monto
        FROM ie_caja ic
        LEFT JOIN usuario u ON u.idusuario = ic.idusuario
        WHERE ic.idsede IN (${sedes}) AND ic.tipo = 2 AND ic.estado = 0
          AND ${entre('ic.fecha_hora', desde, hasta)}
        GROUP BY u.nombres ORDER BY monto DESC LIMIT 5`);

    const motivos: any = await prisma.$queryRawUnsafe(`
        SELECT TRIM(pd.motivo_borrado) motivo, COUNT(*) veces
        FROM pedido_detalle pd
        INNER JOIN pedido p ON p.idpedido = pd.idpedido
        WHERE p.idsede IN (${sedes}) AND pd.borrado = 1
          AND pd.motivo_borrado IS NOT NULL AND TRIM(pd.motivo_borrado) <> ''
          AND ${entre('p.fecha_hora', desde, hasta)}
        GROUP BY TRIM(pd.motivo_borrado) ORDER BY veces DESC LIMIT 5`);

    return {
        ventasDelPeriodo: ventas.monto,
        indicadores,
        borradosPorUsuario,
        anuladosPorUsuario,
        egresosPorUsuario,
        motivosFrecuentes: (motivos ?? []).map((m: any) => ({
            motivo: String(m.motivo),
            veces: Number(m.veces)
        }))
    };
}
