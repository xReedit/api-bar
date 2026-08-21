// Cliente delgado del API de Niubiz (botón de pago web).
// Flujo: getAccessToken (Basic) → createSession (monto) → [checkout.js en el
// front] → authorize (transactionToken). Sandbox por defecto; producción se
// configura por env (NIUBIZ_BASE_URL=https://apiprod.vnforapps.com y el
// checkout.js sin ?qa=true).
import axios from 'axios';
import { AuthResult, parseAuthorizationResponse } from './billing.helpers';

// Solo el host: pegar la URL completa de un endpoint en NIUBIZ_BASE_URL es el
// error fácil de cometer y produce un 404 con la ruta duplicada.
const BASE = () => {
    const crudo = process.env.NIUBIZ_BASE_URL || 'https://apisandbox.vnforappstest.com';
    try {
        return new URL(crudo).origin;
    } catch {
        return crudo.replace(/\/+$/, '');
    }
};
const TIMEOUT_MS = 15000;

export const niubizMerchantId = (): string => process.env.NIUBIZ_MERCHANT_ID || '';

export const niubizCheckoutJsUrl = (): string =>
    process.env.NIUBIZ_STATIC_JS_URL || 'https://static-content-qas.vnforapps.com/v2/js/checkout.js?qa=true';

/** Logo que muestra el lightbox del checkout (merchantlogo). Vacío = logo por defecto de Niubiz. */
export const niubizLogoUrl = (): string => process.env.NIUBIZ_LOGO_URL || '';

/** true si las credenciales mínimas están configuradas. */
export const niubizConfigurado = (): boolean =>
    Boolean(process.env.NIUBIZ_USER && process.env.NIUBIZ_PASS && process.env.NIUBIZ_MERCHANT_ID);

/** Token de acceso (texto plano) vía Basic auth. */
export const getAccessToken = async (): Promise<string> => {
    const resp = await axios.get(`${BASE()}/api.security/v1/security`, {
        auth: { username: process.env.NIUBIZ_USER || '', password: process.env.NIUBIZ_PASS || '' },
        timeout: TIMEOUT_MS,
        responseType: 'text',
        transformResponse: [(d) => d], // el token llega como texto plano, no JSON
    });
    return String(resp.data).trim();
};

/** Crea la sesión de pago por el monto exacto; devuelve el sessionKey del checkout. */
export const createSession = async (accessToken: string, amount: number, clientIp: string): Promise<string> => {
    const resp = await axios.post(
        `${BASE()}/api.ecommerce/v2/ecommerce/token/session/${niubizMerchantId()}`,
        {
            channel: 'web',
            amount,
            antifraud: { clientIp, merchantDefineData: { MDD4: 'integraciones@papaya.com.pe', MDD32: 'papaya', MDD75: 'Registrado', MDD77: 1 } },
        },
        { headers: { Authorization: accessToken, 'Content-Type': 'application/json' }, timeout: TIMEOUT_MS },
    );
    return String(resp.data?.sessionKey || '');
};

/** Autoriza (cobra) la transacción del checkout. Nunca lanza por rechazo: lo normaliza. */
export const authorize = async (
    accessToken: string,
    order: { tokenId: string; purchaseNumber: number; amount: number },
): Promise<AuthResult> => {
    const resp = await axios.post(
        `${BASE()}/api.authorization/v3/authorization/ecommerce/${niubizMerchantId()}`,
        {
            channel: 'web',
            captureType: 'manual',
            countable: true,
            order: {
                tokenId: order.tokenId,
                purchaseNumber: String(order.purchaseNumber),
                amount: order.amount,
                currency: 'PEN',
            },
        },
        {
            headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
            timeout: TIMEOUT_MS,
            validateStatus: () => true, // un rechazo llega como 400: lo parseamos, no lo tiramos
        },
    );
    const resultado = parseAuthorizationResponse(resp.data);
    if (!resultado.ok) {
        // Rechazo real o respuesta irreconocible (5xx, HTML, token expirado): dejamos
        // rastro forense — sin esto, un 5xx de Niubiz se pierde y no hay forma de
        // diagnosticar por qué un pago quedó en 'procesando' o se marcó 'fallido'.
        console.error('niubiz: authorize sin aprobación', {
            status: resp.status,
            reconocido: resultado.reconocido,
            actionCode: resultado.actionCode,
            data: String(JSON.stringify(resp.data) ?? '').slice(0, 2000),
        });
    }
    return resultado;
};
