// Encuesta publica: que un anonimo solo pueda responder lo publicado, una vez por venta, sin inventar datos.
// @prisma/client se mockea con una BD en memoria minima (nada toca MySQL).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SECRETO = 's'.repeat(40);
const TOKEN = 'c855a701b8d52180e7b8db53';

const h = vi.hoisted(() => ({
    publicacion: null as any,
    preguntas: [] as any[],
    ventas: new Map<number, any>(),
    respondidas: new Set<number>(),
    vigente: 3 as number | null,
    respuestasHoy: 0,
    inserts: [] as { sql: string; valores: any[] }[],
}));

vi.mock('@prisma/client', () => {
    class PrismaClientKnownRequestError extends Error {}
    const sqlDe = (strings: any) => (Array.isArray(strings) ? strings.join('?') : String(strings));
    class PrismaClient {
        async $queryRaw(strings: any, ...valores: any[]) {
            const sql = sqlDe(strings);
            if (sql.includes('FROM enc_canal_sede')) return valores[0] === TOKEN && h.publicacion ? [h.publicacion] : [];
            if (sql.includes('FROM enc_pregunta')) return h.preguntas;
            if (sql.includes('FROM registro_pago')) {
                const v = h.ventas.get(Number(valores[0]));
                return v ? [{ ...v, respondidas: h.respondidas.has(v.idregistro_pago) ? 1 : 0 }] : [];
            }
            if (sql.includes('FROM enc_publicacion') && sql.includes('LOCK IN SHARE MODE')) return h.vigente ? [{ idenc_encuesta: h.vigente }] : [];
            if (sql.includes('AS respuestas_hoy')) return [{ respuestas_hoy: BigInt(h.respuestasHoy) }];
            if (sql.includes('LAST_INSERT_ID')) return [{ id: 99n }];
            return [];
        }
        async $executeRaw(strings: any, ...valores: any[]) {
            h.inserts.push({ sql: sqlDe(strings), valores });
            return 1;
        }
        async $transaction(fn: (tx: any) => Promise<any>) {
            return fn(this);
        }
    }
    return { PrismaClient, Prisma: { PrismaClientKnownRequestError } };
});

const { crearNonce, parametroVenta } = await import('../services/encuesta.firma');
const router: any = (await import('./encuesta.publica')).default;

const handler = (metodo: 'get' | 'post', ruta: string) => {
    const capa = router.stack.find((l: any) => l?.route?.path === ruta && l.route.methods[metodo]);
    return capa.route.stack[capa.route.stack.length - 1].handle as (req: any, res: any) => Promise<any>;
};
const guardia = router.stack.find((l: any) => !l.route).handle as (req: any, res: any, next: any) => any;

const fakeRes = () => {
    const res: any = { code: 0, body: null, headers: {} };
    res.status = (c: number) => ((res.code = c), res);
    res.json = (b: any) => ((res.body = b), res);
    res.set = (k: string, v: string) => ((res.headers[k] = v), res);
    return res;
};

const get = async (query: any = {}) => {
    const res = fakeRes();
    await handler('get', '/:token')({ params: { token: TOKEN }, query, headers: {} }, res);
    return res;
};
const post = async (body: any, ip = '1.2.3.4') => {
    const res = fakeRes();
    await handler('post', '/:token/respuestas')({ params: { token: TOKEN }, body, headers: {}, ip }, res);
    return res;
};
const nonceValido = (v = 0, e = 3) => crearNonce(SECRETO, { p: 7, e, v, t: Date.now() - 5_000 });

beforeEach(() => {
    process.env.ENCUESTA_SECRET = SECRETO;
    h.publicacion = { idsede: 13, canal: 'qr_local', local: 'EL ASADOR', idenc_publicacion: 7, idorg: 16, idenc_encuesta: 3, texto_inicio: 'Hola', texto_fin: 'Gracias' };
    h.preguntas = [
        { id: 1, orden: 1, tipo: 'csat', texto: '¿Como fue?', obligatorio: 1, opciones: null },
        { id: 2, orden: 2, tipo: 'nps', texto: '¿Recomendarias?', obligatorio: 1, opciones: null },
        { id: 3, orden: 3, tipo: 'opcion', texto: '¿Que te gusto?', obligatorio: 0, opciones: '["Comida","Atencion"]' },
        { id: 4, orden: 4, tipo: 'texto', texto: 'Comentario', obligatorio: 0, opciones: null },
    ];
    h.ventas = new Map([[4871, { idregistro_pago: 4871, idsede: 13, fecha_hora: new Date(), idpedido: 555, idusuario: 103, nummesa: '5 ', total: '76.00' }]]);
    h.respondidas = new Set();
    h.vigente = 3;
    h.respuestasHoy = 0;
    h.inserts = [];
});

describe('guardia del router', () => {
    it('sin ENCUESTA_SECRET (o corto) responde 503 y no deja pasar', () => {
        process.env.ENCUESTA_SECRET = 'corto';
        const res = fakeRes();
        const next = vi.fn();
        guardia({ path: `/${TOKEN}` }, res, next);
        expect(res.code).toBe(503);
        expect(next).not.toHaveBeenCalled();
    });

    it('un token con forma invalida se corta antes de la BD', () => {
        for (const path of ['/abc', `/${TOKEN}X`, `/${TOKEN.toUpperCase()}`, "/' OR 1=1 --", '/']) {
            const res = fakeRes();
            const next = vi.fn();
            guardia({ path }, res, next);
            expect(res.code).toBe(404);
            expect(next).not.toHaveBeenCalled();
        }
    });

    it('token valido pasa con cabeceras no-store', () => {
        const res = fakeRes();
        const next = vi.fn();
        guardia({ path: `/${TOKEN}/respuestas` }, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.headers['Cache-Control']).toBe('no-store');
    });
});

describe('GET /:token', () => {
    it('devuelve la encuesta sin datos internos y con nonce', async () => {
        const res = await get();
        expect(res.code).toBe(200);
        expect(res.body.data).toMatchObject({ local: 'EL ASADOR', canal: 'qr_local', texto_inicio: 'Hola' });
        expect(res.body.data.preguntas[2]).toEqual({ id: 3, tipo: 'opcion', texto: '¿Que te gusto?', obligatorio: false, opciones: ['Comida', 'Atencion'] });
        expect(JSON.stringify(res.body)).not.toMatch(/idorg|idsede|idenc_publicacion/);
        expect(res.body.data.nonce).toMatch(/^[\w-]+\.[a-f0-9]{32}$/);
    });

    it('token inexistente → 404 LINK_INVALIDO; canal sin encuesta → 410 SIN_ENCUESTA', async () => {
        h.publicacion = null;
        expect((await get()).body.codigo).toBe('LINK_INVALIDO');
        h.publicacion = { idsede: 13, canal: 'kiosko', local: 'X', idenc_publicacion: null, idenc_encuesta: null };
        const res = await get();
        expect(res.code).toBe(410);
        expect(res.body.codigo).toBe('SIN_ENCUESTA');
    });

    it('link de comprobante: firma valida pasa; alterada, de otra sede, vencida o respondida no', async () => {
        expect((await get({ v: parametroVenta(SECRETO, TOKEN, 4871) })).code).toBe(200);

        const [, firma] = parametroVenta(SECRETO, TOKEN, 4871).split('.');
        expect((await get({ v: `4872.${firma}` })).body.codigo).toBe('LINK_INVALIDO');

        h.ventas.set(900, { idregistro_pago: 900, idsede: 99, fecha_hora: new Date(), idpedido: null, idusuario: null, nummesa: null, total: null });
        expect((await get({ v: parametroVenta(SECRETO, TOKEN, 900) })).body.codigo).toBe('LINK_INVALIDO');

        h.ventas.set(901, { idregistro_pago: 901, idsede: 13, fecha_hora: new Date(Date.now() - 16 * 86_400_000), idpedido: null, idusuario: null, nummesa: null, total: null });
        expect((await get({ v: parametroVenta(SECRETO, TOKEN, 901) })).body.codigo).toBe('LINK_VENCIDO');

        h.respondidas.add(4871);
        const res = await get({ v: parametroVenta(SECRETO, TOKEN, 4871) });
        expect(res.code).toBe(409);
        expect(res.body.codigo).toBe('YA_RESPONDIDA');
    });
});

describe('POST /:token/respuestas', () => {
    const respuestas = [{ id: 1, valor: 4 }, { id: 2, valor: 10 }, { id: 3, valor: 'Comida' }, { id: 4, valor: '  Muy rico  ' }];

    it('guarda la respuesta con metricas precalculadas y detalle con snapshot', async () => {
        const res = await post({ nonce: nonceValido(), respuestas, sitio: '' });
        expect(res.code).toBe(201);
        expect(res.body.data.texto_fin).toBe('Gracias');

        const cab = h.inserts.find((i) => i.sql.includes('INTO enc_respuesta ('))!;
        // idpub, idenc, idorg, idsede, canal, respondido_en, fecha_local, idpago, idpedido, idusuario, nummesa, total, csat, nps, nps_cat, ces, comentario, ip
        expect(cab.valores.slice(0, 5)).toEqual([7, 3, 16, 13, 'qr_local']);
        expect(cab.valores.slice(7, 18)).toEqual([null, null, null, null, null, 4, 10, 'promotor', null, 1, '1.2.3.4']);
        const detalles = h.inserts.filter((i) => i.sql.includes('enc_respuesta_detalle'));
        expect(detalles).toHaveLength(4);
        expect(detalles[3].valores).toEqual([99n, 4, 'Comentario', 'texto', 4, null, 'Muy rico']);
    });

    it('venta: guarda la trazabilidad (pedido, mozo, mesa, monto)', async () => {
        const res = await post({ nonce: nonceValido(4871), respuestas: [{ id: 1, valor: 2 }, { id: 2, valor: 3 }] });
        expect(res.code).toBe(201);
        const cab = h.inserts.find((i) => i.sql.includes('INTO enc_respuesta ('))!;
        expect(cab.valores.slice(7, 15)).toEqual([4871, 555, 103, '5', 76, 2, 3, 'detractor']);
    });

    it('campo trampa relleno: finge exito y no guarda nada', async () => {
        const res = await post({ nonce: nonceValido(), respuestas, sitio: 'http://spam' });
        expect(res.code).toBe(201);
        expect(h.inserts).toHaveLength(0);
    });

    it('sin nonce, nonce alterado o enviado demasiado rapido → 400, sin guardar', async () => {
        expect((await post({ respuestas })).body.codigo).toBe('NONCE_INVALIDO');
        const n = nonceValido();
        const alterado = n.slice(0, -1) + (n.endsWith('0') ? '1' : '0');
        expect((await post({ nonce: alterado, respuestas })).code).toBe(400);
        const rapido = crearNonce(SECRETO, { p: 7, e: 3, v: 0, t: Date.now() - 500 });
        expect((await post({ nonce: rapido, respuestas })).code).toBe(400);
        expect(h.inserts).toHaveLength(0);
    });

    it('la encuesta se versiono mientras respondia → 409 ENCUESTA_CAMBIO', async () => {
        expect((await post({ nonce: nonceValido(0, 2), respuestas })).body.codigo).toBe('ENCUESTA_CAMBIO');
        h.vigente = 8; // versionada entre la lectura y la transaccion
        expect((await post({ nonce: nonceValido(), respuestas })).body.codigo).toBe('ENCUESTA_CAMBIO');
        expect(h.inserts).toHaveLength(0);
    });

    it('venta ya respondida en otro envio → 409', async () => {
        h.respondidas.add(4871);
        expect((await post({ nonce: nonceValido(4871), respuestas })).body.codigo).toBe('YA_RESPONDIDA');
    });

    it('canal comprobante o WhatsApp sin venta firmada → 404 (el token del ticket es publico)', async () => {
        for (const canal of ['ticket', 'whatsapp']) {
            h.publicacion.canal = canal;
            expect((await get()).body.codigo).toBe('LINK_INVALIDO');
            expect((await post({ nonce: nonceValido(), respuestas })).body.codigo).toBe('LINK_INVALIDO');
            expect((await get({ v: parametroVenta(SECRETO, TOKEN, 4871) })).code).toBe(200);
        }
        expect(h.inserts).toHaveLength(0);
    });

    it('QR fijo: tope diario por IP; la tablet no tiene tope', async () => {
        h.respuestasHoy = 30;
        const res = await post({ nonce: nonceValido(), respuestas });
        expect(res.code).toBe(429);
        expect(h.inserts).toHaveLength(0);
        h.publicacion.canal = 'kiosko';
        expect((await post({ nonce: nonceValido(), respuestas })).code).toBe(201);
    });

    it('una IP invalida (X-Forwarded-For falsificado) no llega a la BD', async () => {
        expect((await post({ nonce: nonceValido(), respuestas }, '<img src=x onerror=alert(1)>')).code).toBe(201);
        const cab = h.inserts.find((i) => i.sql.includes('INTO enc_respuesta ('))!;
        expect(cab.valores[17]).toBeNull();
    });

    it.each([
        ['csat fuera de rango', [{ id: 1, valor: 9 }, { id: 2, valor: 5 }]],
        ['nps decimal', [{ id: 1, valor: 3 }, { id: 2, valor: 5.5 }]],
        ['opcion inexistente', [{ id: 1, valor: 3 }, { id: 2, valor: 5 }, { id: 3, valor: 'Precio' }]],
        ['pregunta de otra encuesta', [{ id: 1, valor: 3 }, { id: 2, valor: 5 }, { id: 77, valor: 1 }]],
        ['repetida', [{ id: 1, valor: 3 }, { id: 1, valor: 4 }, { id: 2, valor: 5 }]],
        ['falta obligatoria', [{ id: 1, valor: 3 }]],
        ['comentario largo', [{ id: 1, valor: 3 }, { id: 2, valor: 5 }, { id: 4, valor: 'x'.repeat(501) }]],
        ['no es arreglo', 'hola'],
    ])('422 DATOS_INVALIDOS: %s', async (_caso, datos) => {
        const res = await post({ nonce: nonceValido(), respuestas: datos });
        expect(res.code).toBe(422);
        expect(res.body.codigo).toBe('DATOS_INVALIDOS');
        expect(h.inserts).toHaveLength(0);
    });

    it('un error inesperado de BD no filtra detalles', async () => {
        h.vigente = null;
        const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await post({ nonce: nonceValido(), respuestas });
        expect(res.body.codigo).toBe('ENCUESTA_CAMBIO');
        espia.mockRestore();
    });
});
