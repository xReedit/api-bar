// Cliente del servicio chatbot-go (saldo de conversaciones). Los endpoints
// /billing/* del chatbot exigen x-api-key (BILLING_API_KEY de ese servicio).
import axios from 'axios';

const BASE = () => process.env.CHATBOT_GO_URL || 'http://localhost:8080';
const KEY = () => process.env.CHATBOT_BILLING_KEY || '';
const TIMEOUT_MS = 10000;

/** Saldo actual de la sede (proxy directo del JSON del chatbot). */
export const getSaldo = async (idsede: string): Promise<any> => {
    const resp = await axios.get(`${BASE()}/billing/saldo`, {
        params: { idsede },
        headers: { 'x-api-key': KEY() },
        timeout: TIMEOUT_MS,
    });
    return resp.data;
};

/** Acredita una recarga (idempotente por tx_id del lado del chatbot). */
export const acreditarRecarga = async (payload: {
    tx_id: string;
    idsede: string;
    cantidad: number;
    monto: number;
}): Promise<void> => {
    await axios.post(`${BASE()}/billing/recarga`, payload, {
        headers: { 'x-api-key': KEY(), 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
    });
};
