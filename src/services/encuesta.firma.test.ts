import { describe, expect, it } from 'vitest';
import { crearNonce, firmaVenta, leerNonce, leerVenta, NONCE_MAX_MS, parametroVenta } from './encuesta.firma';

const S = 'x'.repeat(40);
const T = 'c855a701b8d52180e7b8db53';

describe('firma de venta', () => {
    it('acepta la firma generada y devuelve el idregistro_pago', () => {
        expect(leerVenta(S, T, parametroVenta(S, T, 4871))).toBe(4871);
    });

    it('coincide con la formula que usa el POS en PHP (venta.<token>.<id>, 16 hex)', () => {
        expect(firmaVenta(S, T, 4871)).toMatch(/^[a-f0-9]{16}$/);
        expect(firmaVenta(S, T, 4871)).not.toBe(firmaVenta(S, T, 4872));
    });

    it('rechaza otra venta con la firma de una venta real (no se puede enumerar)', () => {
        const [, firma] = parametroVenta(S, T, 4871).split('.');
        expect(leerVenta(S, T, `4872.${firma}`)).toBeNull();
    });

    it('rechaza la firma de otro token, otro secreto o mal formada', () => {
        const v = parametroVenta(S, T, 4871);
        expect(leerVenta(S, 'a'.repeat(24), v)).toBeNull();
        expect(leerVenta('y'.repeat(40), T, v)).toBeNull();
        for (const malo of ['', '4871', '4871.', 'abc.1234567890abcdef', '0.1234567890abcdef', '4871.XYZ', undefined, 4871, ['4871.x']]) {
            expect(leerVenta(S, T, malo)).toBeNull();
        }
    });
});

describe('nonce', () => {
    const base = { p: 7, e: 3, v: 0, t: 1_000_000 };

    it('es valido entre 3 s y 45 min despues del GET', () => {
        const n = crearNonce(S, base);
        expect(leerNonce(S, n, base.t + 3_000)).toEqual({ ok: true, nonce: base });
        expect(leerNonce(S, n, base.t + NONCE_MAX_MS)).toEqual({ ok: true, nonce: base });
    });

    it('rechaza envios demasiado rapidos (bots) y nonces vencidos', () => {
        const n = crearNonce(S, base);
        expect(leerNonce(S, n, base.t + 500)).toEqual({ ok: false, motivo: 'rapido' });
        expect(leerNonce(S, n, base.t + NONCE_MAX_MS + 1)).toEqual({ ok: false, motivo: 'vencido' });
    });

    it('rechaza un nonce alterado: no se puede cambiar la version, la venta ni la hora', () => {
        const n = crearNonce(S, base);
        const firma = n.split('.')[1];
        const falso = Buffer.from(JSON.stringify({ ...base, v: 999 })).toString('base64url');
        expect(leerNonce(S, `${falso}.${firma}`, base.t + 5_000)).toEqual({ ok: false, motivo: 'invalido' });
        expect(leerNonce('y'.repeat(40), n, base.t + 5_000)).toEqual({ ok: false, motivo: 'invalido' });
    });

    it('rechaza basura sin lanzar', () => {
        for (const malo of [undefined, null, 1, '', 'a.b', 'x'.repeat(400), `.${'a'.repeat(32)}`]) {
            expect(leerNonce(S, malo, base.t + 5_000)).toEqual({ ok: false, motivo: 'invalido' });
        }
    });

    it('una firma de venta no sirve como nonce (dominios separados)', () => {
        const cuerpo = Buffer.from(JSON.stringify(base)).toString('base64url');
        const firmaVentaComoNonce = firmaVenta(S, cuerpo, 1).padEnd(32, '0');
        expect(leerNonce(S, `${cuerpo}.${firmaVentaComoNonce}`, base.t + 5_000)).toEqual({ ok: false, motivo: 'invalido' });
    });
});
