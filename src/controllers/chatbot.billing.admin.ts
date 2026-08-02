// Administración del catálogo de paquetes de recarga (chatbot_pack) y vista de
// los pagos de clientes (chatbot_pago). Lo consume SOLO el dashboard del
// chatbot-go vía proxy (montado bajo /chatbot/billing-admin con x-api-key =
// CHATBOT_API_KEY); el dueño del SaaS administra desde ahí, no desde Piter.
// El panel Piter sigue leyendo únicamente los packs activos por
// GET /chat-bot/billing/packs (JWT del restaurante).
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';

const router = express.Router();
const prisma = new PrismaClient();

/** Catálogo completo (incluye inactivos, para poder reactivarlos). */
router.get('/packs', async (_req: Request, res: Response) => {
    try {
        const packs = await prisma.$queryRaw`
            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack
            ORDER BY activo DESC, precio_soles ASC`;
        res.status(200).json({ success: true, packs });
    } catch (error) {
        console.error('billing-admin packs:', error);
        res.status(500).json({ success: false, error: 'no se pudieron listar los paquetes' });
    }
});

/**
 * Crea (sin id) o actualiza (con id) un paquete. Actualizar un pack no altera
 * pagos históricos: chatbot_pago copia conversaciones y monto al comprar.
 */
router.post('/packs', async (req: Request, res: Response) => {
    const id = req.body?.id != null ? Number(req.body.id) : null;
    const conversaciones = Number(req.body?.conversaciones);
    const precio = Number(req.body?.precio_soles);
    const activo = req.body?.activo == null ? 1 : (Number(req.body.activo) ? 1 : 0);
    if (!Number.isInteger(conversaciones) || conversaciones <= 0 || !Number.isFinite(precio) || precio <= 0) {
        return res.status(400).json({ success: false, error: 'conversaciones (entero > 0) y precio_soles (> 0) son obligatorios' });
    }
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ success: false, error: 'id inválido' });
    }
    try {
        if (id === null) {
            await prisma.$executeRaw`
                INSERT INTO chatbot_pack (conversaciones, precio_soles, activo)
                VALUES (${conversaciones}, ${precio}, ${activo})`;
        } else {
            const afectadas = await prisma.$executeRaw`
                UPDATE chatbot_pack SET conversaciones = ${conversaciones},
                    precio_soles = ${precio}, activo = ${activo}
                WHERE id = ${id}`;
            if (Number(afectadas) === 0) {
                return res.status(404).json({ success: false, error: 'paquete no encontrado' });
            }
        }
        const packs = await prisma.$queryRaw`
            SELECT id, conversaciones, precio_soles, activo FROM chatbot_pack
            ORDER BY activo DESC, precio_soles ASC`;
        res.status(200).json({ success: true, packs });
    } catch (error) {
        console.error('billing-admin guardar pack:', error);
        res.status(500).json({ success: false, error: 'no se pudo guardar el paquete' });
    }
});

/** Últimas recargas de los clientes (todas las sedes, todos los estados). */
router.get('/pagos', async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    try {
        const pagos = await prisma.$queryRaw`
            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx, creado_en
            FROM chatbot_pago ORDER BY id DESC LIMIT ${limit}`;
        res.status(200).json({ success: true, pagos });
    } catch (error) {
        console.error('billing-admin pagos:', error);
        res.status(500).json({ success: false, error: 'no se pudieron listar los pagos' });
    }
});

// ── Activaciones del chatbot (autoservicio desde Piter) ──────────────────────

/** Últimas activaciones con los datos de contacto de la sede. */
router.get('/activaciones', async (_req: Request, res: Response) => {
    try {
        const activaciones = await prisma.$queryRaw`
            SELECT cs.id, cs.idsede, cs.atendido_en, s.nombre, s.telefono, s.ciudad
            FROM chatbot_solicitud cs
            LEFT JOIN sede s ON s.idsede = cs.idsede
            WHERE cs.estado = 'atendida'
            ORDER BY cs.atendido_en DESC
            LIMIT 50`;
        res.status(200).json({ success: true, activaciones });
    } catch (error) {
        console.error('billing-admin activaciones:', error);
        res.status(500).json({ success: false, error: 'no se pudieron listar las activaciones' });
    }
});

export default router;
