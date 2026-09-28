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

    // El caso de arriba lo resuelve el umbral ('Ceviche' sola no llega a 0.6), así que no
    // ejercita el greedy. Acá las DOS líneas superan el umbral contra el MISMO item (1.0 y
    // 0.75): sin el candado de item usado, el iditem 2 se repetiría en ambas.
    it('con dos líneas sobre el umbral del mismo item, solo la de mejor score se lo queda', () => {
        const r = matchLineas(
            [{ texto: 'Ceviche de toyo', box }, { texto: 'Ceviche de toyo S/. 25.00', box }],
            items
        );
        expect(r[0].iditem).toBe(2);
        expect(r[1].iditem).toBeNull();
    });

    // Bug reportado en producción (2026-09-27): "Sopa de pollo" y "Saltado de pollo"
    // comparten "de" y "pollo" (Dice 0.667 > 0.6) — si la línea del saltado no aparece
    // en la imagen, el agotado le robaba la línea a la sopa y se tachaba el plato vivo.
    // Las palabras vacías no cuentan como similitud: sopa/pollo vs saltado/pollo = 0.5.
    describe('platos hermanos (palabras vacías fuera del score)', () => {
        it('el agotado sin línea propia NO roba la línea del plato parecido', () => {
            const r = matchLineas(
                [{ texto: 'Sopa de pollo', box }],
                [{ iditem: 2, descripcion: 'Saltado de pollo' }]
            );
            expect(r[0].iditem).toBeNull();
        });

        it('con ambos platos en el sistema, cada línea va a su item exacto', () => {
            const r = matchLineas(
                [{ texto: 'Sopa de pollo', box }, { texto: 'Saltado de pollo', box }],
                [{ iditem: 1, descripcion: 'Sopa de pollo' }, { iditem: 2, descripcion: 'Saltado de pollo' }]
            );
            expect(r[0].iditem).toBe(1);
            expect(r[1].iditem).toBe(2);
        });
    });

    describe('ambigüedad: mejor no tachar que tachar mal', () => {
        it('dos items empatados contra la misma línea ⇒ la línea queda sin match', () => {
            const r = matchLineas(
                [{ texto: 'Ají de gallina', box }],
                [
                    { iditem: 1, descripcion: 'Ají de gallina especial' },
                    { iditem: 2, descripcion: 'Ají de gallina clásico' }
                ]
            );
            expect(r[0].iditem).toBeNull();
        });

        it('con un ganador claro el margen no bloquea (exacto 1.0 vs parcial 0.8)', () => {
            const r = matchLineas(
                [{ texto: 'Ceviche mixto', box }, { texto: 'Ceviche mixto especial', box }],
                [{ iditem: 1, descripcion: 'Ceviche mixto' }, { iditem: 2, descripcion: 'Ceviche mixto especial' }]
            );
            expect(r[0].iditem).toBe(1);
            expect(r[1].iditem).toBe(2);
        });
    });

    describe('guardia numérica (porciones 1/2 vs 1/4)', () => {
        it('los números del item deben estar en la línea: 1/2 no tacha la línea del 1/4', () => {
            const r = matchLineas(
                [{ texto: 'Pollo a la brasa 1/4 S/. 25.00', box }],
                [{ iditem: 2, descripcion: 'Pollo a la brasa 1/2' }]
            );
            expect(r[0].iditem).toBeNull();
        });

        it('misma porción sí matchea aunque la línea traiga precio', () => {
            const r = matchLineas(
                [{ texto: 'Pollo a la brasa 1/4 S/. 25.00', box }],
                [{ iditem: 1, descripcion: 'Pollo a la brasa 1/4' }]
            );
            expect(r[0].iditem).toBe(1);
        });
    });
});
