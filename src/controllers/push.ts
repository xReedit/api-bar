import * as express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendPushToSede } from '../services/push.sender';

dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

function hashEndpoint(endpoint: string): string {
    return crypto.createHash('sha256').update(endpoint).digest('hex');
}

/**
 * GET /push - healthcheck
 */
router.get('/', (req, res) => {
    res.status(200).json({ message: 'Push notifications API' });
});

/**
 * POST /push/subscribe
 * Body: {
 *   idusuario: number,
 *   idsede: number,
 *   subscription: { endpoint, keys: { p256dh, auth } },
 *   userAgent?: string
 * }
 */
router.post('/subscribe', async (req, res) => {
    try {
        const { idusuario, idsede, subscription, userAgent } = req.body;

        if (
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return res.status(400).json({ error: 'Suscripción inválida' });
        }
        if (typeof idusuario !== 'number' || typeof idsede !== 'number') {
            return res.status(400).json({ error: 'idusuario e idsede son obligatorios' });
        }

        const endpointHash = hashEndpoint(subscription.endpoint);

        // Upsert manual: si existe el endpoint_hash, actualiza; si no, inserta
        await prisma.$executeRawUnsafe(
            `INSERT INTO push_subscriptions
                (idusuario, idsede, endpoint, endpoint_hash, p256dh_key, auth_key, user_agent, enabled)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                idusuario = VALUES(idusuario),
                idsede = VALUES(idsede),
                endpoint = VALUES(endpoint),
                p256dh_key = VALUES(p256dh_key),
                auth_key = VALUES(auth_key),
                user_agent = VALUES(user_agent),
                enabled = 1,
                last_error = NULL`,
            idusuario,
            idsede,
            subscription.endpoint,
            endpointHash,
            subscription.keys.p256dh,
            subscription.keys.auth,
            userAgent ?? null
        );

        res.json({ ok: true });
    } catch (error) {
        console.error('Error en /push/subscribe:', error);
        res.status(500).json({ error: 'Error guardando suscripción' });
    }
});

/**
 * POST /push/unsubscribe
 * Body: { endpoint: string }
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({ error: 'endpoint requerido' });
        }

        await prisma.$executeRawUnsafe(
            `UPDATE push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?`,
            hashEndpoint(endpoint)
        );

        res.json({ ok: true });
    } catch (error) {
        console.error('Error en /push/unsubscribe:', error);
        res.status(500).json({ error: 'Error desuscribiendo' });
    }
});

/**
 * POST /push/resubscribe
 * Llamado por el Service Worker cuando el navegador rota la suscripción.
 * Body: { oldEndpoint: string | null, subscription: {...} }
 */
router.post('/resubscribe', async (req, res) => {
    try {
        const { oldEndpoint, subscription } = req.body;

        if (
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return res.status(400).json({ error: 'Suscripción inválida' });
        }

        const newHash = hashEndpoint(subscription.endpoint);

        if (oldEndpoint) {
            // Actualiza la fila previa con el nuevo endpoint y keys
            const oldHash = hashEndpoint(oldEndpoint);
            const updated = await prisma.$executeRawUnsafe(
                `UPDATE push_subscriptions
                 SET endpoint = ?, endpoint_hash = ?, p256dh_key = ?, auth_key = ?, enabled = 1, last_error = NULL
                 WHERE endpoint_hash = ?`,
                subscription.endpoint,
                newHash,
                subscription.keys.p256dh,
                subscription.keys.auth,
                oldHash
            );
            if (Number(updated) > 0) return res.json({ ok: true });
        }

        // Si no había suscripción previa identificable, no podemos asociar usuario/sede
        // El cliente debe volver a llamar a /subscribe con idusuario/idsede.
        res.json({ ok: false, message: 'Re-suscripción requerida desde el cliente' });
    } catch (error) {
        console.error('Error en /push/resubscribe:', error);
        res.status(500).json({ error: 'Error en resubscribe' });
    }
});

/**
 * POST /push/test
 * Envía una notificación de prueba a todas las suscripciones de una sede.
 * Body: { idsede: number, title?: string, body?: string }
 *
 * SOLO PARA TESTING. Quitar o proteger más en producción.
 */
router.post('/test', async (req, res) => {
    try {
        const { idsede, title, body } = req.body;
        if (typeof idsede !== 'number') {
            return res.status(400).json({ error: 'idsede requerido' });
        }

        await sendPushToSede(idsede, {
            title: title || 'Prueba de notificación',
            body: body || 'Si ves esto, las push notifications funcionan ✅',
            url: '/hoy'
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('Error en /push/test:', error);
        res.status(500).json({ error: 'Error enviando push de prueba' });
    }
});

export default router;
