import { describe, it, expect } from 'vitest';
import { extraerLineas } from './carta.ocr.service';

// Fixture mínimo con la forma real de fullTextAnnotation (pages>blocks>paragraphs>words>symbols)
const fixture = {
    fullTextAnnotation: {
        pages: [{
            width: 1000, height: 2000,
            blocks: [{
                paragraphs: [
                    {
                        words: [
                            { symbols: [{ text: 'A' }, { text: 'j' }, { text: 'í' }], boundingBox: { vertices: [{ x: 100, y: 600 }, { x: 160, y: 600 }, { x: 160, y: 640 }, { x: 100, y: 640 }] } },
                            { symbols: [{ text: 'd' }, { text: 'e' }], boundingBox: { vertices: [{ x: 170, y: 600 }, { x: 210, y: 600 }, { x: 210, y: 640 }, { x: 170, y: 640 }] } },
                            { symbols: [{ text: 'g' }, { text: 'a' }, { text: 'l' }, { text: 'l' }, { text: 'i' }, { text: 'n' }, { text: 'a' }], boundingBox: { vertices: [{ x: 220, y: 600 }, { x: 400, y: 600 }, { x: 400, y: 640 }, { x: 220, y: 640 }] } }
                        ]
                    }
                ]
            }]
        }]
    }
};

describe('extraerLineas', () => {
    it('convierte párrafos en líneas con caja relativa 0-1', () => {
        const r = extraerLineas(fixture)!;
        expect(r.width).toBe(1000);
        expect(r.height).toBe(2000);
        expect(r.lineas).toHaveLength(1);
        expect(r.lineas[0].texto).toBe('Ají de gallina');
        // caja = unión de las cajas de las palabras, normalizada
        expect(r.lineas[0].box.x).toBeCloseTo(0.1);
        expect(r.lineas[0].box.y).toBeCloseTo(0.3);
        expect(r.lineas[0].box.w).toBeCloseTo(0.3);
        expect(r.lineas[0].box.h).toBeCloseTo(0.02);
    });

    it('devuelve null si la respuesta no trae fullTextAnnotation', () => {
        expect(extraerLineas({})).toBeNull();
        expect(extraerLineas(null)).toBeNull();
    });

    it('descarta líneas de menos de 4 caracteres (precios sueltos, adornos)', () => {
        const f = JSON.parse(JSON.stringify(fixture));
        f.fullTextAnnotation.pages[0].blocks[0].paragraphs[0].words = [
            { symbols: [{ text: 'S' }, { text: '/' }], boundingBox: { vertices: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }] } }
        ];
        expect(extraerLineas(f)!.lineas).toHaveLength(0);
    });
});
