import { describe, it, expect, vi } from 'vitest';
import { authSede } from './auth';

// req/res mínimos: authSede solo lee token (puesto por `auth`) y params.idsede.
const resMock = () => {
    const r: any = { statusCode: 0, body: null };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    return r;
};
const reqCon = (token: any, idsede: any) => ({ token, params: { idsede } } as any);

describe('authSede', () => {
    it('deja pasar cuando el idsede de la URL es el del token (string vs number)', () => {
        const next = vi.fn();
        authSede(reqCon({ idsede: 13 }, '13'), resMock(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('403 cuando el token es de otra sede', () => {
        const next = vi.fn();
        const res = resMock();
        authSede(reqCon({ idsede: 13 }, '14'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('deja pasar si la sede está en el claim sedes[] (token de dashboard multi-sede)', () => {
        const next = vi.fn();
        authSede(reqCon({ idsede: 1, sedes: [{ idsede: 1 }, { idsede: 24 }] }, '24'), resMock(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('403 si el token no trae idsede (token viejo o malformado)', () => {
        const next = vi.fn();
        const res = resMock();
        authSede(reqCon({ id: 5 }, '13'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('403 si el idsede de la URL no es numérico', () => {
        const next = vi.fn();
        const res = resMock();
        authSede(reqCon({ idsede: 13 }, 'abc'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });
});
