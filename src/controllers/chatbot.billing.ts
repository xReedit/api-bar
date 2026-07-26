// Recarga de conversaciones del chatbot (panel Piter): saldo, packs en venta,
// y cobro con Niubiz. El monto SIEMPRE sale de la BD; el pago se verifica
// server-side (authorization) y la acreditación al chatbot-go es idempotente
// por tx_id — reintentar confirmar nunca duplica saldo.
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import { buildRecargaPayload, validarConfirmar, validarIniciar } from '../services/billing.helpers';
import * as chatbotgo from '../services/chatbotgo.service';
import * as niubiz from '../services/niubiz.service';

const router = express.Router();
const prisma = new PrismaClient();

interface PagoRow {
    id: number;
    idsede: number;
    conversaciones: number;
    monto: number;
    estado: 'pendiente' | 'procesando' | 'pagado' | 'fallido';
    niubiz_tx: string | null;
}

/** Saldo actual de la sede (proxy del chatbot-go). */
router.get('/saldo/:idsede', async (req: Request, res: Response) => {
    try {
        const saldo = await chatbotgo.getSaldo(String(req.params.idsede));
        res.status(200).json({ success: true, saldo });
    } catch (error) {
        console.error('billing saldo:', error);
        res.status(502).json({ success: false, error: 'saldo no disponible' });
    }
});

/** Paquetes activos en venta. */
router.get('/packs', async (_req: Request, res: Response) => {
    try {
        const packs = await prisma.$queryRaw`
            SELECT id, conversaciones, precio_soles FROM chatbot_pack
            WHERE activo = 1 ORDER BY conversaciones ASC`;
        res.status(200).json({ success: true, packs });
    } catch (error) {
        console.error('billing packs:', error);
        res.status(500).json({ success: false, error: 'no se pudieron listar los paquetes' });
    }
});

/** Crea el pago pendiente y la sesión Niubiz para abrir el checkout. */
router.post('/pago/iniciar', async (req: Request, res: Response) => {
    const entrada = validarIniciar(req.body);
    if (!entrada) {
        return res.status(400).json({ success: false, error: 'idsede e id_pack son obligatorios' });
    }
    if (!niubiz.niubizConfigurado()) {
        return res.status(503).json({ success: false, error: 'pasarela de pago no configurada' });
    }
    // No cobrar lo que no se va a poder acreditar: sin esta key, chatbot-go
    // rechazaría la acreditación y el pago quedaría cobrado sin saldo aplicado.
    if (!process.env.CHATBOT_BILLING_KEY) {
        return res.status(503).json({ success: false, error: 'acreditación no configurada' });
    }
    try {
        const packs = await prisma.$queryRaw<{ id: number; conversaciones: number; precio_soles: number }[]>`
            SELECT id, conversaciones, precio_soles FROM chatbot_pack
            WHERE id = ${entrada.idPack} AND activo = 1`;
        if (!packs.length) {
            return res.status(404).json({ success: false, error: 'paquete no disponible' });
        }
        const pack = packs[0];
        const monto = Number(pack.precio_soles);

        // El pago nace pendiente; su id es el purchaseNumber de Niubiz.
        // LAST_INSERT_ID es estado por conexión: la transacción interactiva fija
        // ambas queries a la misma conexión del pool (sin ella, dos iniciar
        // concurrentes podrían leerse el id el uno al otro).
        const purchaseNumber = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                INSERT INTO chatbot_pago (idsede, id_pack, conversaciones, monto)
                VALUES (${entrada.idsede}, ${pack.id}, ${pack.conversaciones}, ${monto})`;
            const idRows = await tx.$queryRaw<{ id: number }[]>`SELECT LAST_INSERT_ID() AS id`;
            return Number(idRows[0].id);
        });

        const accessToken = await niubiz.getAccessToken();
        const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
        const sessionKey = await niubiz.createSession(accessToken, monto, clientIp.split(',')[0].trim());

        res.status(200).json({
            success: true,
            purchaseNumber: String(purchaseNumber),
            amount: monto,
            sessionKey,
            merchantId: niubiz.niubizMerchantId(),
            checkoutJsUrl: niubiz.niubizCheckoutJsUrl(),
        });
    } catch (error) {
        console.error('billing iniciar:', error);
        res.status(500).json({ success: false, error: 'no se pudo iniciar el pago' });
    }
});

/**
 * Verifica el pago contra Niubiz y acredita en chatbot-go. Reintentable:
 * un pago ya pagado no se re-cobra, solo re-intenta la acreditación.
 */
router.post('/pago/confirmar', async (req: Request, res: Response) => {
    const entrada = validarConfirmar(req.body);
    if (!entrada) {
        return res.status(400).json({ success: false, error: 'purchaseNumber y transactionToken son obligatorios' });
    }
    try {
        const pagos = await prisma.$queryRaw<PagoRow[]>`
            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx FROM chatbot_pago
            WHERE id = ${entrada.purchaseNumber}`;
        if (!pagos.length) {
            return res.status(404).json({ success: false, error: 'pago no encontrado' });
        }
        const pago = pagos[0];

        // Reintento de un pago ya cobrado: solo re-acreditar (idempotente).
        if (pago.estado === 'pagado' && pago.niubiz_tx) {
            const resultado = await acreditar({ ...pago, niubiz_tx: pago.niubiz_tx });
            return res.status(200).json({ success: true, ...resultado });
        }
        if (pago.estado !== 'pendiente') {
            return res.status(409).json({ success: false, error: `pago en estado ${pago.estado}` });
        }

        // Reclamar el pago antes de llamar a Niubiz: solo un confirmar concurrente
        // gana; el resto recibe 409 y puede reintentar cuando el ganador termine.
        const reclamado = await prisma.$executeRaw`
            UPDATE chatbot_pago SET estado = 'procesando' WHERE id = ${pago.id} AND estado = 'pendiente'`;
        if (Number(reclamado) !== 1) {
            return res.status(409).json({ success: false, error: 'pago en proceso, reintenta en unos segundos' });
        }

        // Esta ventana (getAccessToken + authorize) es la ÚNICA que revierte a
        // 'pendiente': si Niubiz no respondió, no hay veredicto y el reclamo se
        // libera para reintentar. Una vez que `auth` existe, SÍ hay veredicto de
        // Niubiz y ya no corresponde revertir (ver los bloques de abajo).
        let auth;
        try {
            const accessToken = await niubiz.getAccessToken();
            auth = await niubiz.authorize(accessToken, {
                tokenId: entrada.transactionToken,
                purchaseNumber: pago.id,
                amount: Number(pago.monto),
            });
        } catch (authError) {
            // Niubiz no respondió (red/timeout): liberar el reclamo para permitir reintentar.
            await prisma.$executeRaw`
                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ${pago.id} AND estado = 'procesando'`;
            throw authError;
        }

        if (!auth.ok && !auth.reconocido) {
            // Respuesta irreconocible (5xx, HTML, token de acceso expirado, etc.):
            // Niubiz no dio un veredicto real, no hay ACTION_CODE. Se trata igual
            // que "no respondió": se libera el reclamo, es reintentable. Marcar
            // 'fallido' aquí perdería el intento sin que hubiera un rechazo real.
            await prisma.$executeRaw`
                UPDATE chatbot_pago SET estado = 'pendiente' WHERE id = ${pago.id} AND estado = 'procesando'`;
            console.warn('billing: respuesta de Niubiz irreconocible, se libera el reclamo', { purchaseNumber: pago.id });
            return res.status(502).json({ success: false, error: 'pasarela no disponible, reintenta', retryable: true });
        }

        if (!auth.ok) {
            // Rechazo real: Niubiz contestó con un ACTION_CODE de rechazo. Terminal.
            await prisma.$executeRaw`
                UPDATE chatbot_pago SET estado = 'fallido' WHERE id = ${pago.id} AND estado = 'procesando'`;
            console.warn('billing: pago rechazado', { purchaseNumber: pago.id, actionCode: auth.actionCode });
            return res.status(402).json({
                success: false,
                error: auth.descripcion || 'pago rechazado',
                actionCode: auth.actionCode,
            });
        }

        // auth.ok === true: Niubiz YA aprobó y cobró. De acá para abajo, si algo
        // falla NO se revierte a 'pendiente' — el tokenId de Niubiz es de un solo
        // uso, un reintento del cliente lo reenviaría y sería rechazado, y
        // perderíamos el transactionId. Se deja en 'procesando' para revisión
        // manual (el tx id al menos queda en el log de abajo).
        try {
            await prisma.$executeRaw`
                UPDATE chatbot_pago SET estado = 'pagado', niubiz_tx = ${auth.transactionId}
                WHERE id = ${pago.id} AND estado = 'procesando'`;
            console.log('billing: pago aprobado', { purchaseNumber: pago.id, tx: auth.transactionId });

            const resultado = await acreditar({ ...pago, niubiz_tx: auth.transactionId });
            return res.status(200).json({ success: true, ...resultado });
        } catch (dbError) {
            console.error('billing: PAGO APROBADO POR NIUBIZ PERO NO REGISTRADO EN BD (revisar manualmente)', {
                purchaseNumber: pago.id,
                transactionId: auth.transactionId,
                actionCode: auth.actionCode,
                error: dbError,
            });
            return res.status(500).json({
                success: false,
                error: 'pago aprobado pero no registrado; NO reintentar: contactar soporte',
                purchaseNumber: String(pago.id),
            });
        }
    } catch (error) {
        console.error('billing confirmar:', error);
        res.status(500).json({ success: false, error: 'no se pudo confirmar el pago' });
    }
});

/**
 * Acredita el pago en chatbot-go y devuelve { acreditado, saldo? }. Si la
 * acreditación falla, el pago YA está cobrado: se responde success con
 * acreditado=false y el front puede reintentar confirmar (idempotente).
 */
const acreditar = async (
    pago: { idsede: number; conversaciones: number; monto: number; niubiz_tx: string },
): Promise<{ acreditado: boolean; saldo?: any }> => {
    try {
        await chatbotgo.acreditarRecarga(buildRecargaPayload({
            idsede: pago.idsede,
            conversaciones: pago.conversaciones,
            monto: Number(pago.monto),
            niubizTx: pago.niubiz_tx,
        }));
    } catch (error) {
        console.error('billing: pago cobrado pero NO acreditado (reintentar confirmar)', error);
        return { acreditado: false };
    }
    try {
        const saldo = await chatbotgo.getSaldo(String(pago.idsede));
        return { acreditado: true, saldo };
    } catch {
        return { acreditado: true }; // acreditado; el saldo se verá al recargar el panel
    }
};

export default router;
