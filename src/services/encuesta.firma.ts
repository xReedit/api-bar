// Firmas de la encuesta publica (encuesta.papaya.com.pe). Sin estado: todo se valida con HMAC.
//
//  - Venta: el link del comprobante / WhatsApp lleva ?v=<idregistro_pago>.<firma>. Sin el secreto no se
//    puede inventar una venta ajena. El POS legacy genera la MISMA firma al imprimir:
//      PHP: substr(hash_hmac('sha256', "venta.$token.$idregistro_pago", ENCUESTA_SECRET), 0, 16)
//  - Nonce: lo entrega el GET y lo exige el POST. Prueba que se abrio la encuesta (no se postea directo),
//    impone un tiempo minimo de llenado y ata la respuesta a la version que vio el cliente.
//
// Cada uso firma con un prefijo distinto ("venta." / "nonce.") para que una firma no sirva por la otra.
import { createHmac, timingSafeEqual } from 'crypto';

export const NONCE_MIN_MS = 3_000;
export const NONCE_MAX_MS = 45 * 60_000;

/** El secreto, o null si falta o es debil: sin secreto el modulo no atiende (nunca queda abierto). */
export const secretoEncuesta = (): string | null => {
    const s = process.env.ENCUESTA_SECRET ?? '';
    return s.length >= 32 ? s : null;
};

const hmac = (secreto: string, datos: string, largo: number) =>
    createHmac('sha256', secreto).update(datos).digest('hex').slice(0, largo);

const iguales = (a: string, b: string) => {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
};

// ---------- venta ----------

export const firmaVenta = (secreto: string, token: string, idpago: number) =>
    hmac(secreto, `venta.${token}.${idpago}`, 16);

/** Valor del parametro v para un link de comprobante. */
export const parametroVenta = (secreto: string, token: string, idpago: number) =>
    `${idpago}.${firmaVenta(secreto, token, idpago)}`;

/** idregistro_pago si ?v= es valido para ese token; null si falta, esta mal formado o la firma no calza. */
export const leerVenta = (secreto: string, token: string, v: unknown): number | null => {
    if (typeof v !== 'string') return null;
    const m = /^(\d{1,10})\.([a-f0-9]{16})$/.exec(v);
    if (!m) return null;
    const idpago = Number(m[1]);
    if (!Number.isSafeInteger(idpago) || idpago <= 0) return null;
    return iguales(m[2], firmaVenta(secreto, token, idpago)) ? idpago : null;
};

// ---------- nonce ----------

export interface Nonce {
    /** idenc_publicacion */
    p: number;
    /** idenc_encuesta (version que vio el cliente) */
    e: number;
    /** idregistro_pago, 0 si no viene de un comprobante */
    v: number;
    /** momento del GET, epoch ms */
    t: number;
}

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

export const crearNonce = (secreto: string, n: Nonce): string => {
    const cuerpo = b64url(JSON.stringify({ p: n.p, e: n.e, v: n.v, t: n.t }));
    return `${cuerpo}.${hmac(secreto, `nonce.${cuerpo}`, 32)}`;
};

export type LecturaNonce =
    | { ok: true; nonce: Nonce }
    | { ok: false; motivo: 'invalido' | 'rapido' | 'vencido' };

export const leerNonce = (secreto: string, valor: unknown, ahora = Date.now()): LecturaNonce => {
    if (typeof valor !== 'string' || valor.length > 300) return { ok: false, motivo: 'invalido' };
    const partes = valor.split('.');
    if (partes.length !== 2 || !/^[a-f0-9]{32}$/.test(partes[1])) return { ok: false, motivo: 'invalido' };
    if (!iguales(partes[1], hmac(secreto, `nonce.${partes[0]}`, 32))) return { ok: false, motivo: 'invalido' };

    let n: Nonce;
    try {
        n = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    } catch {
        return { ok: false, motivo: 'invalido' };
    }
    const entero = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0;
    if (!n || !entero(n.p) || !entero(n.e) || !entero(n.v) || !entero(n.t)) return { ok: false, motivo: 'invalido' };

    const edad = ahora - n.t;
    if (edad < NONCE_MIN_MS) return { ok: false, motivo: 'rapido' };
    if (edad > NONCE_MAX_MS) return { ok: false, motivo: 'vencido' };
    return { ok: true, nonce: n };
};
