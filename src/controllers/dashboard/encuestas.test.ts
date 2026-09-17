// Dashboard de encuestas: reglas de "mala experiencia" y, sobre todo, que nadie lea ni atienda encuestas de
// otro negocio cambiando el idsede. @prisma/client se mockea: nada toca MySQL.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ consultas: [] as string[], sedeRespuesta: 13 as number | null, inserts: 0, duplicado: false }));

vi.mock('@prisma/client', async (original) => {
    const real: any = await original();
    class PrismaClient {
        async $queryRaw(strings: any, ...valores: any[]) {
            const sql = real.Prisma.sql(strings, ...valores).sql as string;
            h.consultas.push(sql);
            if (sql.includes('SELECT idsede FROM enc_respuesta')) return h.sedeRespuesta === null ? [] : [{ idsede: h.sedeRespuesta }];
            if (sql.includes('SELECT nombres FROM usuario')) return [{ nombres: 'ADMIN' }];
            if (sql.includes('COUNT(*) AS total')) return [{ total: 0n }];
            return [];
        }
        async $executeRaw(strings: any, ...valores: any[]) {
            h.consultas.push(real.Prisma.sql(strings, ...valores).sql);
            if (h.duplicado) throw new real.Prisma.PrismaClientKnownRequestError("Duplicate entry '7' for key 'PRIMARY'", { code: 'P2010', clientVersion: 'x' });
            h.inserts++;
            return 1;
        }
    }
    return { ...real, PrismaClient };
});

const dash = await import('../../services/encuesta.dash.service');
const router: any = (await import('./encuestas')).default;

const handler = (ruta: string) => {
    const capa = router.stack.find((l: any) => l?.route?.path === ruta && l.route.methods.post);
    return capa.route.stack[capa.route.stack.length - 1].handle as (req: any, res: any) => Promise<any>;
};
const TOKEN = { id: 103, idorg: 16, sedes: [{ idsede: 13, nombre: 'EL ASADOR' }, { idsede: 15, nombre: 'TARAPOTO' }] };
const PARAMS = { rango_start_date: '2026-09-01', rango_end_date: '2026-09-17' };

const llamar = async (ruta: string, body: any, token: any = TOKEN) => {
    const res: any = { code: 0, body: null };
    res.status = (c: number) => ((res.code = c), res);
    res.json = (b: any) => ((res.body = b), res);
    await handler(ruta)({ body, token }, res);
    return res;
};

beforeEach(() => { h.consultas = []; h.sedeRespuesta = 13; h.inserts = 0; h.duplicado = false; });

describe('reglas: mala experiencia', () => {
    it('cualquier señal mala: csat <= 2, NPS <= 6 o CES <= 3', () => {
        expect(dash.esMala(2, null, null)).toBe(true);
        expect(dash.esMala(null, 6, null)).toBe(true);
        expect(dash.esMala(null, null, 3)).toBe(true);
        expect(dash.esMala(2.5, 7, 4)).toBe(false);
        expect(dash.esMala(null, null, null)).toBe(false);
    });

    it('motivos legibles y severidad: la peor escala manda, varias señales suman', () => {
        expect(dash.motivosMala(1.5, 3, 2)).toEqual(['Satisfacción baja (1.5)', 'Detractor (NPS 3)', 'Difícil (CES 2)']);
        expect(dash.severidad(1, null, null)).toBe(100);
        expect(dash.severidad(null, 6, null)).toBe(40);
        expect(dash.severidad(2, 0, null)).toBe(100);
        expect(dash.severidad(5, 10, 7)).toBe(0);
        expect(dash.severidad(2, 6, null)).toBeGreaterThan(dash.severidad(2, null, null));
    });

    it('NPS, tasa, puntaje y día de la semana', () => {
        expect(dash.calcularNps(6, 2, 10)).toBe(40);
        expect(dash.calcularNps(0, 0, 0)).toBeNull();
        expect(dash.tasa(3, 40)).toBe(7.5);
        expect(dash.tasa(3, 0)).toBeNull();
        expect(dash.puntaje100('csat', 3)).toBe(50);
        expect(dash.puntaje100('nps', 10)).toBe(100);
        expect([1, 2, 7].map(dash.diaSemanaLunes)).toEqual([7, 1, 6]); // MySQL: 1=domingo, 2=lunes, 7=sabado
    });

    it('rango anterior del mismo largo, justo antes (cruza meses)', () => {
        expect(dash.rangoAnterior({ inicio: '2026-09-01', fin: '2026-09-17' })).toEqual({ inicio: '2026-08-15', fin: '2026-08-31' });
        expect(dash.rangoAnterior({ inicio: '2026-09-17', fin: '2026-09-17' })).toEqual({ inicio: '2026-09-16', fin: '2026-09-16' });
    });
});

describe('seguridad del router', () => {
    it.each(['/tablero', '/alertas', '/comentarios'])('%s: un local que no es del token → 403 sin consultar la BD', async (ruta) => {
        const res = await llamar(ruta, { idsede: 99, params: PARAMS });
        expect(res.code).toBe(403);
        expect(h.consultas).toHaveLength(0);
    });

    it('token sin sedes u org (otro tipo de login) → 403', async () => {
        expect((await llamar('/tablero', { idsede: 13, params: PARAMS }, { id: 1, usuario: 'x' })).code).toBe(403);
        expect((await llamar('/encuestas', {}, { id: 1, idorg: 16, sedes: [] })).code).toBe(403);
    });

    it('idsede o fechas inválidas → 400', async () => {
        expect((await llamar('/tablero', { idsede: 'abc', params: PARAMS })).code).toBe(400);
        expect((await llamar('/tablero', { idsede: 13, params: { rango_start_date: '2026-09-17', rango_end_date: '2026-09-01' } })).code).toBe(400);
        expect((await llamar('/tablero', { idsede: 13, params: { rango_start_date: "2026-09-01' OR 1=1", rango_end_date: '2026-09-17' } })).code).toBe(400);
    });

    it('/locales: rechaza si una sola sede pedida no es del token', async () => {
        expect((await llamar('/locales', { sedes: [13, 99], params: PARAMS })).code).toBe(403);
        expect((await llamar('/locales', { params: PARAMS })).code).toBe(200);
    });

    it('/alertas/atender: respuesta de otro negocio o inexistente → 403 sin escribir', async () => {
        h.sedeRespuesta = 99;
        expect((await llamar('/alertas/atender', { id: 7, nota: 'Llamé al cliente' })).code).toBe(403);
        h.sedeRespuesta = null;
        expect((await llamar('/alertas/atender', { id: 7, nota: 'Llamé al cliente' })).code).toBe(403);
        expect(h.inserts).toBe(0);
    });

    it('/alertas/atender: valida nota y registra con el usuario del token; dos veces → 409', async () => {
        expect((await llamar('/alertas/atender', { id: 7, nota: 'ok' })).code).toBe(400);
        const res = await llamar('/alertas/atender', { id: 7, nota: '  Se le devolvió el dinero  ' });
        expect(res.code).toBe(200);
        expect(res.body.atencion).toMatchObject({ por: 'ADMIN', nota: 'Se le devolvió el dinero' });
        expect(h.inserts).toBe(1);
        h.duplicado = true;
        expect((await llamar('/alertas/atender', { id: 7, nota: 'Otra vez' })).code).toBe(409);
    });

    it('las consultas filtran por las sedes pedidas y van parametrizadas (sin valores en el SQL)', async () => {
        await llamar('/tablero', { idsede: 13, params: PARAMS });
        expect(h.consultas.length).toBeGreaterThan(5);
        for (const sql of h.consultas) {
            expect(sql).not.toContain('2026-09-01');
            expect(sql).not.toMatch(/idsede IN \(13\)/);
        }
    });
});
