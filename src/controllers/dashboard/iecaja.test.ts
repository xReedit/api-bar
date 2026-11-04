// get-cierres: valida entrada y no interpola fechas/sede en el SQL. @prisma/client mockeado: nada toca MySQL.
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ sql: '', valores: [] as any[] }));

vi.mock('@prisma/client', async (original) => {
    const real: any = await original();
    class PrismaClient {
        async $queryRaw(strings: any, ...valores: any[]) {
            const q = real.Prisma.sql(strings, ...valores);
            h.sql = q.sql;
            h.valores = q.values;
            return [{ id: 1, numintentos: 2n, detalle_cierre: '[]' }];
        }
    }
    return { ...real, PrismaClient };
});

const router: any = (await import('./iecaja')).default;
const capa = router.stack.find((l: any) => l?.route?.path === '/get-cierres');
const handle = capa.route.stack[capa.route.stack.length - 1].handle;

const llamar = async (body: any) => {
    const res: any = { code: 0, body: null };
    res.status = (c: number) => ((res.code = c), res);
    res.json = (b: any) => ((res.body = b), res);
    await handle({ body }, res);
    return res;
};

describe('POST /get-cierres', () => {
    it('rechaza fechas mal formadas (evita inyeccion)', async () => {
        const r = await llamar({ idsede: 13, params: { rango_start_date: "2026-01-01' OR 1=1 --", rango_end_date: '2026-01-02' } });
        expect(r.code).toBe(400);
    });

    it('consulta parametrizada y numintentos como number', async () => {
        const r = await llamar({ idsede: 13, params: { rango_start_date: '2026-09-01', rango_end_date: '2026-09-17' } });
        expect(r.code).toBe(200);
        expect(h.sql).not.toContain('2026-09-01');
        expect(h.valores).toEqual([13, '2026-09-01', '2026-09-17']);
        expect(r.body[0].numintentos).toBe(2);
    });
});
