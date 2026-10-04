import { describe, it, expect } from 'vitest';
import { stockNumerico, itemsDeCarta } from './menu.stock';

describe('stockNumerico (misma regla que ve el bot en el contexto)', () => {
    it("'ND' = sin control de stock ⇒ 1000 (nunca agotado)", () => {
        expect(stockNumerico('ND')).toBe(1000);
    });
    it('numérico o texto numérico ⇒ su valor', () => {
        expect(stockNumerico('5')).toBe(5);
        expect(stockNumerico(0)).toBe(0);
    });
    it('vacío / null / basura ⇒ 0 (agotado, igual que el contexto del bot)', () => {
        expect(stockNumerico(null)).toBe(0);
        expect(stockNumerico('')).toBe(0);
        expect(stockNumerico('abc')).toBe(0);
    });
});

describe('itemsDeCarta (estructura del procedure porcedure_pwa_pedido_carta)', () => {
    const f0 = [
        {
            secciones: [
                { idseccion: 1, items: [
                    { iditem: '10', des: 'Causa rellena con pollo', cantidad: '0' },
                    { iditem: '11', des: 'Causa enrollada con pollo', cantidad: 'ND' }
                ] },
                { idseccion: 2, items: [
                    { iditem: '10', des: 'Causa rellena con pollo', cantidad: '0' }, // repetido en otra sección
                    { iditem: 12, des: 'Escabeche de gallina', cantidad: '3' }
                ] }
            ]
        }
    ];

    it('aplana categorías/secciones, sin repetir items, con stock numérico', () => {
        expect(itemsDeCarta(f0)).toEqual([
            { iditem: 10, descripcion: 'Causa rellena con pollo', stock: 0 },
            { iditem: 11, descripcion: 'Causa enrollada con pollo', stock: 1000 },
            { iditem: 12, descripcion: 'Escabeche de gallina', stock: 3 }
        ]);
    });

    it('tolera estructura vacía o rota', () => {
        expect(itemsDeCarta(undefined)).toEqual([]);
        expect(itemsDeCarta([{ secciones: null }])).toEqual([]);
    });
});
