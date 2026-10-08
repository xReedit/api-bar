// Aviso proactivo del comprobante: cuando la emisión tarda más que el tope y el
// bot ya le dijo al cliente "se está generando", el resultado llega después y
// nadie se lo entregaba (caso real 08/10: el cliente esperó y nunca lo recibió).
// Al terminar, se le escribe por el canal /chatbot/emitir de backend-pedidos
// (el mismo de los recordatorios del bot → gateway WhatsApp de la sede).
import axios from 'axios';
import { logger } from '../utils/logger';

type Resultado = { success: boolean; numero?: string; url_pdf?: string; error?: string };
type Config = { url: string; key: string };
type Poster = (url: string, body: any, opts: any) => Promise<any>;

/** session_id = numero_idorg_idsede (chatbot-go). */
export const numeroDeSesion = (sessionId: string): string | null => {
    const numero = String(sessionId || '').split('_')[0];
    return /^\d{6,15}$/.test(numero) ? numero : null;
};

export const mensajeAvisoComprobante = (tipo: string, r: Resultado): string => {
    if (r.success && r.numero) {
        return `Listo 🙌 tu ${tipo} ${r.numero} ya está lista${r.url_pdf ? `: ${r.url_pdf}` : ''}`;
    }
    return `No pudimos generar tu ${tipo} por aquí 😔. Solicítala en caja y te la emiten al momento 🙏`;
};

export const configAviso = (): Config => ({
    url: process.env.CHATBOT_EMITIR_URL || '',
    key: process.env.CHATBOT_EMITIR_KEY || ''
});

/** Nunca lanza: corre en segundo plano, después de haberle respondido al bot. */
export const avisarComprobante = async (
    d: { session_id: string; idorg: number | string; idsede: number | string; tipo: string; resultado: Resultado },
    cfg: Config = configAviso(),
    post: Poster = axios.post
): Promise<boolean> => {
    const numero = numeroDeSesion(d.session_id);
    if (!cfg.url || !cfg.key || !numero) {
        logger.warn(`aviso-comprobante: sin canal (url/key/numero) para sesión ${d.session_id}; el cliente deberá repedirlo`);
        return false;
    }
    try {
        await post(cfg.url, {
            idorg: String(d.idorg), idsede: String(d.idsede), numero,
            mensaje: mensajeAvisoComprobante(d.tipo, d.resultado)
        }, { timeout: 10000, headers: { 'x-api-key': cfg.key } });
        return true;
    } catch (e: any) {
        logger.error(`aviso-comprobante: no se pudo avisar a la sesión ${d.session_id}:`, e?.message);
        return false;
    }
};
