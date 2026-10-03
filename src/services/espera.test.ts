import { describe, it, expect } from 'vitest';
import { esperarConTope, EN_PROCESO } from './espera';

const tarda = <T>(ms: number, valor: T) => new Promise<T>((r) => setTimeout(() => r(valor), ms));

describe('esperarConTope', () => {
    it('devuelve el resultado si la promesa termina antes del tope', async () => {
        expect(await esperarConTope(tarda(5, 'ok'), 100)).toBe('ok');
    });

    it('devuelve EN_PROCESO si el tope vence primero (la promesa sigue viva)', async () => {
        let terminó = false;
        const lenta = tarda(60, 'tarde').then((v) => { terminó = true; return v; });
        expect(await esperarConTope(lenta, 10)).toBe(EN_PROCESO);
        expect(terminó).toBe(false);
        await lenta;
        expect(terminó).toBe(true); // el trabajo NO se cancela: termina en segundo plano
    });

    it('propaga el error si la promesa falla antes del tope', async () => {
        await expect(esperarConTope(Promise.reject(new Error('x')), 100)).rejects.toThrow('x');
    });
});
