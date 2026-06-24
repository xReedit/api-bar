/**
 * push.watcher.ts
 *
 * Watcher periódico que detecta los 3 eventos de negocio y dispara Web Push:
 *  - Stock crítico / sin stock
 *  - Meta del día alcanzada
 *  - Anulación de venta grande
 *
 * Las apps que descuentan stock o anulan ventas son externas a este backend
 * (escriben directo a MySQL), así que hacemos polling.
 *
 * Para activarlo, importar y llamar `startPushWatcher()` desde app.ts.
 * Solo arranca si en .env está PUSH_WATCHER_ENABLED=true.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import {
    notifyStockAlert,
    notifyMetaAlcanzada,
    notifyCierreDia,
    notifyAnulacionGrande,
    shouldSendOncePerDay
} from './push.sender';

dotenv.config();

const prisma = new PrismaClient();

// =============================================================================
// Config
// =============================================================================
const INTERVAL_ANULACIONES_MS = 60_000;          // cada 1 minuto
const INTERVAL_STOCK_MS = 5 * 60_000;            // cada 5 minutos
const INTERVAL_META_MS = 15 * 60_000;            // cada 15 minutos
const UMBRAL_ANULACION = Number(process.env.PUSH_UMBRAL_ANULACION ?? 200);

// Cursor en memoria: último idregistro_pago procesado por sede para anulaciones
const cursorAnulacionPorSede = new Map<number, number>();

// =============================================================================
// API pública
// =============================================================================
export function startPushWatcher(): void {
    if (process.env.PUSH_WATCHER_ENABLED !== 'true') {
        console.log('[push-watcher] Deshabilitado (PUSH_WATCHER_ENABLED != true)');
        return;
    }

    console.log('[push-watcher] Iniciado');

    // Ejecutar una vez al arrancar y luego cada N ms
    void runAnulaciones();
    void runStock();
    void runMeta();

    setInterval(() => void runAnulaciones(), INTERVAL_ANULACIONES_MS);
    setInterval(() => void runStock(), INTERVAL_STOCK_MS);
    setInterval(() => void runMeta(), INTERVAL_META_MS);
}

// =============================================================================
// 1) ANULACIONES GRANDES
// =============================================================================
async function runAnulaciones(): Promise<void> {
    try {
        // Trae anulaciones del día actual con monto >= umbral
        const rows = await prisma.$queryRawUnsafe<
            Array<{
                idregistro_pago: number;
                idsede: number;
                total: number;
                motivo_anular: string | null;
                idusuario_permiso: number | null;
                nom_usuario: string | null;
            }>
        >(
            `SELECT rp.idregistro_pago, rp.idsede, CAST(rp.total AS DECIMAL(10,2)) AS total,
                    rp.motivo_anular, rp.idusuario_permiso,
                    u.nombres AS nom_usuario
             FROM registro_pago rp
             LEFT JOIN usuario u ON u.idusuario = rp.idusuario_permiso
             WHERE rp.estado != 0
               AND CAST(rp.total AS DECIMAL(10,2)) >= ?
               AND DATE(rp.fecha_hora) = CURDATE()`,
            UMBRAL_ANULACION
        );

        for (const row of rows) {
            // Dedup: solo enviar una vez por idregistro_pago (usa la tabla notification_log)
            const enviar = await shouldSendOncePerDay(
                row.idsede,
                `anulacion-${row.idregistro_pago}`,
                new Date().toISOString().slice(0, 10)
            );
            if (!enviar) continue;

            await notifyAnulacionGrande(
                row.idsede,
                Number(row.total),
                row.nom_usuario || 'Usuario',
                row.motivo_anular || '',
                row.idregistro_pago,
                UMBRAL_ANULACION
            );

            cursorAnulacionPorSede.set(row.idsede, row.idregistro_pago);
        }
    } catch (err) {
        console.error('[push-watcher] runAnulaciones error:', err);
    }
}

// =============================================================================
// 2) STOCK CRÍTICO / SIN STOCK
// =============================================================================
async function runStock(): Promise<void> {
    try {
        // Productos en estado crítico o sin stock, por sede
        const rows = await prisma.$queryRawUnsafe<
            Array<{
                idsede: number;
                idproducto: number;
                descripcion: string;
                stock: number;
                stock_minimo: number;
            }>
        >(
            `SELECT p.idsede, p.idproducto, p.descripcion,
                    CAST(ps.stock AS DECIMAL(10,2)) AS stock,
                    CAST(p.stock_minimo AS DECIMAL(10,2)) AS stock_minimo
             FROM producto p
             INNER JOIN producto_stock ps ON p.idproducto = ps.idproducto
             WHERE p.estado = 0
               AND (
                   CAST(ps.stock AS DECIMAL(10,2)) = 0
                   OR CAST(ps.stock AS DECIMAL(10,2)) <= CAST(p.stock_minimo AS DECIMAL(10,2)) * 0.5
               )
               AND CAST(p.stock_minimo AS DECIMAL(10,2)) > 0`
        );

        const fecha = new Date().toISOString().slice(0, 10);

        for (const row of rows) {
            const enviar = await shouldSendOncePerDay(
                row.idsede,
                `stock-${row.idproducto}`,
                fecha
            );
            if (!enviar) continue;

            await notifyStockAlert(row.idsede, {
                idproducto: row.idproducto,
                descripcion: row.descripcion,
                stock: Number(row.stock),
                stock_minimo: Number(row.stock_minimo)
            });
        }
    } catch (err) {
        console.error('[push-watcher] runStock error:', err);
    }
}

// =============================================================================
// 3) META DEL DÍA
// =============================================================================
async function runMeta(): Promise<void> {
    try {
        // Para cada sede que tenga meta activa, calcular el total de ventas de hoy
        const sedes = await prisma.$queryRawUnsafe<
            Array<{ idsede: number; meta: number }>
        >(
            `SELECT sm.idsede, CAST(sm.diaria AS DECIMAL(10,2)) AS meta
             FROM sede_meta sm
             WHERE sm.estado = '0' AND CAST(sm.diaria AS DECIMAL(10,2)) > 0`
        );

        const fecha = new Date().toISOString().slice(0, 10);

        for (const s of sedes) {
            const ventas = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
                `SELECT COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) AS total
                 FROM registro_pago rp
                 WHERE rp.idsede = ?
                   AND rp.estado = 0
                   AND DATE(rp.fecha_hora) = CURDATE()`,
                s.idsede
            );

            const totalHoy = Number(ventas[0]?.total ?? 0);
            const meta = Number(s.meta);

            if (meta > 0 && totalHoy >= meta) {
                // notifyMetaAlcanzada usa shouldSendOncePerDay internamente
                await notifyMetaAlcanzada(s.idsede, totalHoy, meta, fecha);
            }
        }
    } catch (err) {
        console.error('[push-watcher] runMeta error:', err);
    }
}

// =============================================================================
// 4) CIERRE DEL DÍA (función expuesta — invocar desde cron externo o endpoint)
// =============================================================================
/**
 * Llamar UNA vez al cierre del día (ej. cron a las 23:55 o desde un endpoint).
 * Envía push de "Cierre del día" a cada sede con el resumen vs meta.
 */
export async function dispararCierreDia(fechaISO?: string): Promise<void> {
    const fecha = fechaISO ?? new Date().toISOString().slice(0, 10);

    const sedes = await prisma.$queryRawUnsafe<
        Array<{ idsede: number; meta: number }>
    >(
        `SELECT sm.idsede, CAST(sm.diaria AS DECIMAL(10,2)) AS meta
         FROM sede_meta sm
         WHERE sm.estado = '0'`
    );

    for (const s of sedes) {
        const ventas = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
            `SELECT COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) AS total
             FROM registro_pago rp
             WHERE rp.idsede = ?
               AND rp.estado = 0
               AND DATE(rp.fecha_hora) = ?`,
            s.idsede,
            fecha
        );

        const totalHoy = Number(ventas[0]?.total ?? 0);
        const meta = Number(s.meta);

        await notifyCierreDia(s.idsede, totalHoy, meta, fecha);
    }
}
