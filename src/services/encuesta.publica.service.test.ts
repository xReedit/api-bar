import { describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => ({ PrismaClient: class {}, Prisma: { PrismaClientKnownRequestError: class extends Error {} } }));

const { calcularMetricas, horaLima, normalizarPreguntas, validarRespuestas } = await import('./encuesta.publica.service');

const preguntas = normalizarPreguntas([
    { id: 1, orden: 1, tipo: 'csat', texto: 'A', obligatorio: 1, opciones: null },
    { id: 2, orden: 2, tipo: 'csat', texto: 'B', obligatorio: 0, opciones: null },
    { id: 3, orden: 3, tipo: 'ces', texto: 'C', obligatorio: 0, opciones: null },
    { id: 4, orden: 4, tipo: 'opcion', texto: 'D', obligatorio: 0, opciones: ['X', 'Y'] },
    { id: 5, orden: 5, tipo: 'texto', texto: 'E', obligatorio: 0, opciones: null },
]);

describe('normalizarPreguntas', () => {
    it('opciones llega como JSON string o arreglo; en otros tipos queda vacio', () => {
        const [p] = normalizarPreguntas([{ id: '9', orden: '2', tipo: 'opcion', texto: 'Z', obligatorio: '1', opciones: '["a",1,"b"]' }]);
        expect(p).toEqual({ id: 9, orden: 2, tipo: 'opcion', texto: 'Z', obligatorio: true, opciones: ['a', 'b'] });
        expect(preguntas[3].opciones).toEqual(['X', 'Y']);
        expect(preguntas[0].opciones).toEqual([]);
    });
});

describe('validarRespuestas', () => {
    it('un comentario vacio o solo espacios cuenta como no respondido', () => {
        const v = validarRespuestas(preguntas, [{ id: 1, valor: 5 }, { id: 5, valor: '   ' }]);
        expect(v.map((x) => x.pregunta.id)).toEqual([1]);
    });

    it('no acepta mas respuestas que preguntas ni un envio vacio', () => {
        expect(() => validarRespuestas(preguntas, new Array(6).fill({ id: 1, valor: 1 }))).toThrow();
        const soloOpcionales = normalizarPreguntas([{ id: 1, orden: 1, tipo: 'texto', texto: 'E', obligatorio: 0 }]);
        expect(() => validarRespuestas(soloOpcionales, [])).toThrow('al menos una');
    });

    it('rangos por tipo: csat 1-5, ces 1-7', () => {
        expect(() => validarRespuestas(preguntas, [{ id: 1, valor: 0 }])).toThrow();
        expect(() => validarRespuestas(preguntas, [{ id: 1, valor: 5 }, { id: 3, valor: 8 }])).toThrow();
        expect(() => validarRespuestas(preguntas, [{ id: 1, valor: '5' }])).toThrow();
        expect(validarRespuestas(preguntas, [{ id: 1, valor: 1 }, { id: 3, valor: 7 }])).toHaveLength(2);
    });
});

describe('calcularMetricas', () => {
    it('promedia las csat, toma nps/ces y marca comentario', () => {
        const v = validarRespuestas(preguntas, [{ id: 1, valor: 4 }, { id: 2, valor: 5 }, { id: 3, valor: 6 }, { id: 5, valor: 'ok' }]);
        expect(calcularMetricas(v)).toEqual({ csat_prom: 4.5, nps_valor: null, nps_cat: null, ces_valor: 6, tiene_comentario: 1 });
    });

    it('categoria NPS: 0-6 detractor, 7-8 pasivo, 9-10 promotor', () => {
        const nps = normalizarPreguntas([{ id: 1, orden: 1, tipo: 'nps', texto: 'N', obligatorio: 1 }]);
        const cat = (n: number) => calcularMetricas(validarRespuestas(nps, [{ id: 1, valor: n }])).nps_cat;
        expect([0, 6, 7, 8, 9, 10].map(cat)).toEqual(['detractor', 'detractor', 'pasivo', 'pasivo', 'promotor', 'promotor']);
    });
});

describe('horaLima', () => {
    it('convierte a America/Lima (UTC-5) con formato de MySQL', () => {
        expect(horaLima(new Date('2026-09-17T03:30:05Z'))).toEqual({ fecha: '2026-09-16', fechaHora: '2026-09-16 22:30:05' });
    });
});
