import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// =============================================================================
// Configuración VAPID
// =============================================================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn(
            '[push] VAPID keys no configuradas. Define VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en .env. ' +
            'Genera unas con: npx web-push generate-vapid-keys'
        );
        return false;
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
}

// =============================================================================
// Tipos
// =============================================================================
export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: Record<string, unknown>;
}

interface PushSubscriptionRow {
    id: number;
    idusuario: number;
    idsede: number;
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
}

// =============================================================================
// Envío
// =============================================================================

/**
 * Envía un push a todos los dispositivos suscritos de una sede.
 */
export async function sendPushToSede(idsede: number, payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return;

    const subs = await prisma.$queryRawUnsafe<PushSubscriptionRow[]>(
        `SELECT id, idusuario, idsede, endpoint, p256dh_key, auth_key
         FROM push_subscriptions
         WHERE idsede = ? AND enabled = 1`,
        idsede
    );

    await Promise.all(subs.map((s) => deliverOne(s, payload)));
}

/**
 * Envía un push a todos los dispositivos suscritos de un usuario.
 */
export async function sendPushToUser(idusuario: number, payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return;

    const subs = await prisma.$queryRawUnsafe<PushSubscriptionRow[]>(
        `SELECT id, idusuario, idsede, endpoint, p256dh_key, auth_key
         FROM push_subscriptions
         WHERE idusuario = ? AND enabled = 1`,
        idusuario
    );

    await Promise.all(subs.map((s) => deliverOne(s, payload)));
}

async function deliverOne(sub: PushSubscriptionRow, payload: PushPayload): Promise<void> {
    const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
    };

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err: any) {
        // 404 = endpoint inválido, 410 = suscripción expirada
        if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.$executeRawUnsafe(
                `UPDATE push_subscriptions SET enabled = 0, last_error = ? WHERE id = ?`,
                `gone:${err.statusCode}`,
                sub.id
            );
        } else {
            const msg = String(err.message ?? err).slice(0, 250);
            await prisma.$executeRawUnsafe(
                `UPDATE push_subscriptions SET last_error = ? WHERE id = ?`,
                msg,
                sub.id
            );
        }
    }
}

// =============================================================================
// Helpers de eventos de negocio
// =============================================================================

/**
 * Verifica que el evento no se haya enviado ya hoy para esa sede.
 * Útil para "meta alcanzada" o cualquier evento que debe disparar solo una vez al día.
 */
export async function shouldSendOncePerDay(
    idsede: number,
    evento: string,
    fecha: string
): Promise<boolean> {
    try {
        const result = await prisma.$executeRawUnsafe(
            `INSERT INTO push_notification_log (idsede, evento, fecha) VALUES (?, ?, ?)`,
            idsede,
            evento,
            fecha
        );
        return Number(result) > 0;
    } catch {
        // Constraint UNIQUE violada → ya se envió hoy
        return false;
    }
}

/**
 * Notifica stock crítico o sin stock de un producto.
 */
export async function notifyStockAlert(
    idsede: number,
    producto: { idproducto: number; descripcion: string; stock: number; stock_minimo: number }
): Promise<void> {
    const stockNum = Number(producto.stock);
    const minimoNum = Number(producto.stock_minimo);

    if (stockNum === 0) {
        await sendPushToSede(idsede, {
            title: '⚠️ Sin stock',
            body: `${producto.descripcion} se quedó sin stock`,
            tag: `stock-${producto.idproducto}`,
            url: '/productos',
            requireInteraction: true
        });
    } else if (stockNum <= minimoNum * 0.5) {
        await sendPushToSede(idsede, {
            title: 'Stock crítico',
            body: `${producto.descripcion}: solo quedan ${stockNum} unidades`,
            tag: `stock-${producto.idproducto}`,
            url: '/productos'
        });
    }
}

/**
 * Notifica meta del día alcanzada (una sola vez por día).
 */
export async function notifyMetaAlcanzada(
    idsede: number,
    totalVentas: number,
    meta: number,
    fecha: string
): Promise<void> {
    const enviar = await shouldSendOncePerDay(idsede, 'meta_alcanzada', fecha);
    if (!enviar) return;

    await sendPushToSede(idsede, {
        title: '🎯 ¡Meta alcanzada!',
        body: `Hoy llegaste a S/ ${totalVentas.toFixed(2)} (meta: S/ ${meta.toFixed(2)})`,
        tag: `meta-alcanzada-${fecha}`,
        url: '/hoy'
    });
}

/**
 * Notifica el cierre del día (meta no alcanzada). Disparar desde un cron al final del día.
 */
export async function notifyCierreDia(
    idsede: number,
    totalVentas: number,
    meta: number,
    fecha: string
): Promise<void> {
    const enviar = await shouldSendOncePerDay(idsede, 'cierre_dia', fecha);
    if (!enviar) return;

    const porcentaje = meta > 0 ? ((totalVentas / meta) * 100).toFixed(1) : '0';

    await sendPushToSede(idsede, {
        title: 'Cierre del día',
        body: `Ventas: S/ ${totalVentas.toFixed(2)} de meta S/ ${meta.toFixed(2)} (${porcentaje}%)`,
        tag: `cierre-${fecha}`,
        url: '/hoy'
    });
}

/**
 * Notifica una anulación de venta importante.
 */
export async function notifyAnulacionGrande(
    idsede: number,
    monto: number,
    usuarioQueAnula: string,
    motivo: string,
    idregistro_pago: number,
    umbral = 200
): Promise<void> {
    if (monto < umbral) return;

    await sendPushToSede(idsede, {
        title: '🚨 Anulación importante',
        body: `${usuarioQueAnula} anuló S/ ${monto.toFixed(2)}${motivo ? ` (${motivo})` : ''}`,
        tag: `anulacion-${idregistro_pago}`,
        url: '/ventas',
        requireInteraction: true
    });
}
