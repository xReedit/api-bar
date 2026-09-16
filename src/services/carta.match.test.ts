import { describe, it, expect } from 'vitest';
import { normalizarTexto, matchLineas } from './carta.match.service';

const box = { x: 0, y: 0, w: 0.1, h: 0.02 };

describe('normalizarTexto', () => {
    it('quita tildes, símbolos y colapsa espacios', () => {
        expect(normalizarTexto('  Ají de Gallina — S/.20.00 ')).toBe('aji de gallina s 20 00');
    });
});

describe('matchLineas', () => {
    const items = [
        { iditem: 1, descripcion: 'Ají de gallina' },
        { iditem: 2, descripcion: 'Ceviche de toyo' },
        { iditem: 3, descripcion: 'Estofado de gallina' }
    ];

    it('matchea exacto ignorando tildes/precio en la línea', () => {
        const r = matchLineas([{ texto: 'Aji de gallina S/. 20.00', box }], items);
        expect(r[0].iditem).toBe(1);
    });

    it('elige el item con MÁS tokens en común (gallina sola no roba el match)', () => {
        const r = matchLineas([{ texto: 'Estofado de gallina', box }], items);
        expect(r[0].iditem).toBe(3);
    });

    it('sin match razonable deja iditem null', () => {
        const r = matchLineas([{ texto: 'PLATOS DE FONDO', box }], items);
        expect(r[0].iditem).toBeNull();
    });

    it('un item no se asigna a dos líneas (gana la de mejor score)', () => {
        const r = matchLineas(
            [{ texto: 'Ceviche', box }, { texto: 'Ceviche de toyo', box }],
            items
        );
        expect(r[0].iditem).toBeNull();
        expect(r[1].iditem).toBe(2);
    });
});
