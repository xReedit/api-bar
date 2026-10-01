import { describe, expect, it } from 'vitest';
import { CATALOGO, definicionDe } from './reglas';

/**
 * El catalogo es la frontera: el modelo propone un tipo y un umbral, y si el
 * tipo no esta aqui no se crea nada. Sin esto, una regla inventada por el
 * modelo llegaria a la base.
 */
describe('catalogo de reglas de aviso', () => {
    it('rechaza un tipo que no existe', () => {
        expect(() => definicionDe('borrar_todo')).toThrow(/desconocido/i);
    });

    it('cada tipo construye una descripcion legible con el umbral', () => {
        for (const def of CATALOGO) {
            const texto = def.plantilla(70);
            expect(texto).toContain('70');
            expect(texto.length).toBeGreaterThan(20);
        }
    });

    it('no hay tipos repetidos', () => {
        const tipos = CATALOGO.map((c) => c.tipo);
        expect(new Set(tipos).size).toBe(tipos.length);
    });
});
