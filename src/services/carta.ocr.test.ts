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

// Envuelve palabras en la forma page>blocks>paragraphs para no repetir el andamiaje
const conPalabras = (words: any[]) => ({
    fullTextAnnotation: { pages: [{ width: 1000, height: 2000, blocks: [{ paragraphs: [{ words }] }] }] }
});

// Palabra con caja rectangular (x0,y0)-(x1,y1) y, opcional, un salto en su último símbolo
const palabra = (texto: string, x0: number, y0: number, x1: number, y1: number, salto?: string) => ({
    symbols: texto.split('').map((text, i) => (
        salto && i === texto.length - 1
            ? { text, property: { detectedBreak: { type: salto } } }
            : { text }
    )),
    boundingBox: { vertices: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] }
});

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

    it('parte un párrafo en líneas visuales con detectedBreak (un plato que hace wrap)', () => {
        // Vision mete nombre + descripción + precio en un solo paragraph; si no se corta,
        // la caja abarcaría varias filas y el tachado cruzaría platos vecinos.
        const r = extraerLineas(conPalabras([
            palabra('Lomo', 100, 600, 200, 640, 'SPACE'), // SPACE no corta
            palabra('saltado', 210, 600, 400, 640, 'LINE_BREAK'),
            palabra('con', 100, 700, 180, 740),
            palabra('papas', 190, 700, 340, 740)
        ]))!;
        expect(r.lineas).toHaveLength(2);
        expect(r.lineas[0].texto).toBe('Lomo saltado');
        expect(r.lineas[1].texto).toBe('con papas');
        // cada línea con su propia caja: alturas de una sola fila, no de las dos
        expect(r.lineas[0].box.y).toBeCloseTo(0.3);
        expect(r.lineas[0].box.h).toBeCloseTo(0.02);
        expect(r.lineas[1].box.y).toBeCloseTo(0.35);
        expect(r.lineas[1].box.h).toBeCloseTo(0.02);
    });

    it('trata la coordenada ausente como 0 (Vision omite los ceros del borde)', () => {
        const r = extraerLineas(conPalabras([
            {
                symbols: 'Ceviche'.split('').map((text) => ({ text })),
                // esquina superior izquierda en (0,0): Vision no emite esas coordenadas
                boundingBox: { vertices: [{}, { x: 300 }, { x: 300, y: 40 }, { y: 40 }] }
            }
        ]))!;
        expect(r.lineas).toHaveLength(1); // antes se descartaba entera
        expect(r.lineas[0].box.x).toBe(0);
        expect(r.lineas[0].box.y).toBe(0);
        expect(r.lineas[0].box.w).toBeCloseTo(0.3);
        expect(r.lineas[0].box.h).toBeCloseTo(0.02);
    });
});
