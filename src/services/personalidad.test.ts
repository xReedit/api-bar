import { describe, expect, it } from 'vitest';
import { PERSONALIDADES, PERSONALIDAD_DEFAULT, resolverPersonalidad } from './personalidad';

describe('resolverPersonalidad', () => {
    it('acepta las 6 voces del contrato', () => {
        for (const p of PERSONALIDADES) expect(resolverPersonalidad(p)).toBe(p);
    });

    it('normaliza mayúsculas y espacios del panel', () => {
        expect(resolverPersonalidad('  AchoRado ')).toBe('achorado');
    });

    it('dato sucio o voz inexistente cae al default, nunca deja al bot sin voz', () => {
        for (const v of [null, undefined, '', 42, {}, 'sarcastico']) {
            expect(resolverPersonalidad(v)).toBe(PERSONALIDAD_DEFAULT);
        }
    });
});
