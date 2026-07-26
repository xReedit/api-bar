// Lógica pura del cobro de recargas del chatbot (sin IO): validación de
// entradas y parseo de la respuesta de autorización de Niubiz. Separada del
// router para poder testearla sin Express ni red.

/** Entrada validada de POST /chat-bot/billing/pago/iniciar. */
export const validarIniciar = (body: unknown): { idsede: number; idPack: number } | null => {
    const b = body as Record<string, unknown> | null;
    const idsede = Number(b?.idsede);
    const idPack = Number(b?.id_pack);
    if (!Number.isInteger(idsede) || idsede <= 0) { return null; }
    if (!Number.isInteger(idPack) || idPack <= 0) { return null; }
    return { idsede, idPack };
};

/** Entrada validada de POST /chat-bot/billing/pago/confirmar. */
export const validarConfirmar = (body: unknown): { purchaseNumber: number; transactionToken: string } | null => {
    const b = body as Record<string, unknown> | null;
    const purchaseNumber = Number(b?.purchaseNumber);
    const transactionToken = typeof b?.transactionToken === 'string' ? b.transactionToken.trim() : '';
    if (!Number.isInteger(purchaseNumber) || purchaseNumber <= 0) { return null; }
    if (!transactionToken) { return null; }
    return { purchaseNumber, transactionToken };
};

/**
 * Resultado normalizado de la autorización de Niubiz.
 * `reconocido` distingue un rechazo REAL (Niubiz contestó con un ACTION_CODE,
 * aprobado o no) de una respuesta irreconocible (5xx, HTML, token expirado,
 * etc: no hay ACTION_CODE). Solo un rechazo `reconocido` es terminal
 * ('fallido'); lo irreconocible debe tratarse como falla de red (reintentable).
 */
export interface AuthResult {
    ok: boolean;
    reconocido: boolean;
    actionCode: string;
    transactionId: string;
    descripcion: string;
}

/**
 * Normaliza la respuesta de POST api.authorization/v3. Niubiz devuelve los
 * campos en `dataMap` (200) o en `data` (400 con rechazo). Aprobado =
 * ACTION_CODE '000'. Tolerante: cualquier forma inesperada = no aprobado
 * y `reconocido=false` (no hubo ACTION_CODE, no es un veredicto real).
 */
export const parseAuthorizationResponse = (data: unknown): AuthResult => {
    const d = data as Record<string, any> | null;
    const map = (d && typeof d === 'object' && (d.dataMap || d.data)) || {};
    const actionCode = String(map.ACTION_CODE ?? '');
    return {
        ok: actionCode === '000',
        reconocido: actionCode !== '',
        actionCode,
        transactionId: String(map.TRANSACTION_ID ?? ''),
        descripcion: String(map.ACTION_DESCRIPTION ?? d?.errorMessage ?? ''),
    };
};

/** Payload de acreditación para POST /billing/recarga del chatbot-go. */
export const buildRecargaPayload = (pago: {
    idsede: number;
    conversaciones: number;
    monto: number;
    niubizTx: string;
}): { tx_id: string; idsede: string; cantidad: number; monto: number } => ({
    tx_id: `niubiz-${pago.niubizTx}`,
    idsede: String(pago.idsede),
    cantidad: pago.conversaciones,
    monto: pago.monto,
});
