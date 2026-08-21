// Pruebas del controller del chatbot centradas en los SELECCIONABLES.
//
// Lo que se protege aquí es, sobre todo, la INERCIA de las cartas planas: el
// pedido sin opciones tiene que salir hacia cocina exactamente como salía antes
// del feature. Lo demás es blindaje del camino nuevo (fallo parcial de un CALL,
// respuesta determinista de la tool, recorte visible).
//
// El módulo instancia su propio PrismaClient: se mockea @prisma/client para que
// nada toque la BD (que además está caída) y para poder simular un CALL que se
// cae.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    calls: [] as number[],
    fallan: new Set<number>(),
    sinGrupos: new Set<number>(),
}));

const spDe = (iditem: number) => JSON.stringify([
    {
        iditem_subitem_content: 50 + iditem,
        des: 'ELIGE TU TAMANO',
        subitem_required_select: 1,
        subitem_cant_select: 1,
        show_cant_item: 0,
        opciones: [
            { iditem_subitem: iditem * 10 + 1, des: 'PERSONAL', precio: '0', cantidad: 'ND' },
            { iditem_subitem: iditem * 10 + 2, des: 'FAMILIAR', precio: '8', cantidad: 'ND' },
        ],
    },
]);

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        $queryRaw(strings: any, ...valores: any[]) {
            const sql = Array.isArray(strings) ? strings.join(' ? ') : String(strings);
            if (sql.includes('porcedure_pwa_pedido_carta_get_subitens')) {
                const iditem = Number(valores[0]);
                h.calls.push(iditem);
                if (h.fallan.has(iditem)) return Promise.reject(new Error('MySQL server has gone away'));
                if (h.sinGrupos.has(iditem)) return Promise.resolve([{ respuesta: null }]);
                return Promise.resolve([{ respuesta: spDe(iditem) }]);
            }
            return Promise.resolve([]);
        }
    },
}));

const cargar = async () => await import('./chatbot.v2');

const handlerDe = async (ruta: string) => {
    const router: any = (await cargar()).default;
    const capa = router.stack.find((l: any) => l?.route?.path === ruta && l?.route?.methods?.post);
    if (!capa) throw new Error(`no existe la ruta POST ${ruta}`);
    return capa.route.stack[capa.route.stack.length - 1].handle as (req: any, res: any) => Promise<any>;
};

const fakeRes = () => {
    const res: any = { code: 0, body: null };
    res.status = (c: number) => { res.code = c; return res; };
    res.json = (b: any) => { res.body = b; return res; };
    return res;
};

beforeEach(() => {
    h.calls.length = 0;
    h.fallan.clear();
    h.sinGrupos.clear();
});

// --- INERCIA DE LA CARTA PLANA -------------------------------------------

describe('itemsParaCocinarPlano (camino histórico)', () => {
    // Copia literal del map que corría en producción antes de seleccionables.
    const historico = (items: any[]) => items.map((item: any) => ({
        iditem: item.iditem,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio: item.precio,
        indicaciones: item.indicaciones || '',
        observaciones: item.indicaciones || ''
    }));

    const RAROS = [
        { iditem: 900, descripcion: 'INKA KOLA', cantidad: 2, precio: 5, indicaciones: 'helada' },
        { iditem: 900, descripcion: 'INKA KOLA', cantidad: 1, precio: 5, indicaciones: 'sin hielo' },
        { iditem: '901', descripcion: 'CEVICHE', cantidad: 2.5, precio: 30 },
        { iditem: 0, descripcion: 'ITEM RARO', cantidad: 1, precio: 1 },
        { iditem: 902, descripcion: 'ARROZ', cantidad: 0, precio: 12, indicaciones: '' },
    ];

    it('devuelve exactamente lo mismo que el map histórico (campos y orden)', async () => {
        const { itemsParaCocinarPlano } = await cargar();
        const salida = itemsParaCocinarPlano(RAROS);
        expect(salida).toEqual(historico(RAROS));
        expect(JSON.stringify(salida)).toBe(JSON.stringify(historico(RAROS)));
        expect(Object.keys(salida[0])).toEqual(
            ['iditem', 'descripcion', 'cantidad', 'precio', 'indicaciones', 'observaciones'],
        );
    });

    it('no fusiona repetidos, no normaliza cantidades ni iditem, no descarta nada', async () => {
        const { itemsParaCocinarPlano } = await cargar();
        const salida = itemsParaCocinarPlano(RAROS);
        expect(salida).toHaveLength(5);                       // sin fusionar las dos INKA KOLA
        expect(salida[0].cantidad).toBe(2);
        expect(salida[1].cantidad).toBe(1);
        expect(salida[0].observaciones).toBe('helada');       // sin unir indicaciones
        expect(salida[2].iditem).toBe('901');                 // string tal cual, sin Number()
        expect(salida[2].cantidad).toBe(2.5);                 // sin floor
        expect(salida[3].iditem).toBe(0);                     // no se descarta
        expect(salida[4].cantidad).toBe(0);                   // 0 no se convierte en 1
    });
});

// --- QUÉ PLATOS SE RECOTIZAN ---------------------------------------------

describe('idsQueNecesitanOpciones', () => {
    const marcador = new Map<number, { req: number; tot: number }>([
        [1008, { req: 1, tot: 2 }],   // pizza "+ELIGE"
        [1009, { req: 0, tot: 3 }],   // solo extras opcionales "+EXTRAS"
    ]);
    const agrupado = (iditem: number, opciones: any[] = []) =>
        ({ iditem, lineas: [{ cantidad: 1, indicaciones: '', opciones }] });

    it('incluye el plato con grupos obligatorios aunque el modelo omita opciones', async () => {
        const { idsQueNecesitanOpciones } = await cargar();
        expect(idsQueNecesitanOpciones([agrupado(1008)], marcador)).toEqual([1008]);
    });

    it('incluye el plato que sí trae opciones aunque no esté en el marcador', async () => {
        const { idsQueNecesitanOpciones } = await cargar();
        expect(idsQueNecesitanOpciones([agrupado(2000, [{ id: 5 }])], marcador)).toEqual([2000]);
    });

    it('CARTA PLANA: sin opciones y sin obligatorios no se consulta nada', async () => {
        const { idsQueNecesitanOpciones } = await cargar();
        expect(idsQueNecesitanOpciones([agrupado(1009), agrupado(3000)], marcador)).toEqual([]);
        expect(idsQueNecesitanOpciones([], marcador)).toEqual([]);
        expect(idsQueNecesitanOpciones([agrupado(1009)], new Map())).toEqual([]);
    });
});

// --- FALLO PARCIAL DE LOS CALL -------------------------------------------

describe('leerGruposDeItems', () => {
    it('un CALL caído no borra las opciones de los demás platos', async () => {
        const { leerGruposDeItems } = await cargar();
        const leer = async (iditem: number) => {
            if (iditem === 2) throw new Error('Lock wait timeout exceeded');
            return [{ id: iditem, opciones: [{ id: iditem * 10 }] }] as any[];
        };
        const mapa = await leerGruposDeItems([1, 2, 3], leer);
        expect(mapa.get(1)).toHaveLength(1);
        expect(mapa.get(3)).toHaveLength(1);
        expect(mapa.get(2)).toEqual([]);
    });

    it('devuelve una entrada por cada iditem pedido, deduplicado', async () => {
        const { leerGruposDeItems } = await cargar();
        const mapa = await leerGruposDeItems([7, 7, 8, 0, -3, NaN as any], async () => []);
        expect([...mapa.keys()]).toEqual([7, 8]);
    });

    it('acota la concurrencia a MAX_ITEMS_OPCIONES', async () => {
        const { leerGruposDeItems, MAX_ITEMS_OPCIONES } = await cargar();
        let enVuelo = 0;
        let pico = 0;
        const leer = async () => {
            enVuelo++;
            pico = Math.max(pico, enVuelo);
            await new Promise((r) => setTimeout(r, 1));
            enVuelo--;
            return [] as any[];
        };
        const ids = Array.from({ length: 25 }, (_, i) => i + 1);
        await leerGruposDeItems(ids, leer);
        expect(pico).toBeLessThanOrEqual(MAX_ITEMS_OPCIONES);
    });
});

// --- ENDPOINT DE LA TOOL --------------------------------------------------

describe('POST /opciones-items', () => {
    it('responde por TODOS los iditem pedidos, con grupos [] si no hay o si el CALL falla', async () => {
        const handler = await handlerDe('/opciones-items');
        h.sinGrupos.add(20);
        h.fallan.add(30);
        const res = fakeRes();
        await handler({ body: { iditems: [10, 20, 30] } }, res);

        expect(res.code).toBe(200);
        expect(res.body.platos.map((p: any) => p.iditem)).toEqual([10, 20, 30]);
        expect(res.body.platos[0].grupos[0].opciones.map((o: any) => o.des)).toEqual(['PERSONAL', 'FAMILIAR']);
        expect(res.body.platos[1].grupos).toEqual([]);
        expect(res.body.platos[2].grupos).toEqual([]);
        expect(res.body.omitidos).toBeUndefined();
    });

    it('avisa qué iditem quedaron fuera del tope en vez de recortarlos en silencio', async () => {
        const { MAX_ITEMS_OPCIONES } = await cargar();
        const handler = await handlerDe('/opciones-items');
        const ids = Array.from({ length: MAX_ITEMS_OPCIONES + 3 }, (_, i) => 100 + i);
        const res = fakeRes();
        await handler({ body: { iditems: ids } }, res);

        expect(res.body.platos).toHaveLength(MAX_ITEMS_OPCIONES);
        expect(res.body.omitidos).toEqual(ids.slice(MAX_ITEMS_OPCIONES));
        expect(h.calls).toHaveLength(MAX_ITEMS_OPCIONES);
    });
});

describe('limitarIdsOpciones', () => {
    it('dedup, ignora basura y separa el excedente', async () => {
        const { limitarIdsOpciones, MAX_ITEMS_OPCIONES } = await cargar();
        expect(limitarIdsOpciones([5, 5, '6', 0, -1, null, 'x'])).toEqual({ ids: [5, 6], omitidos: [] });
        const muchos = Array.from({ length: MAX_ITEMS_OPCIONES + 2 }, (_, i) => i + 1);
        const { ids, omitidos } = limitarIdsOpciones(muchos);
        expect(ids).toHaveLength(MAX_ITEMS_OPCIONES);
        expect(omitidos).toEqual([MAX_ITEMS_OPCIONES + 1, MAX_ITEMS_OPCIONES + 2]);
        expect(limitarIdsOpciones(undefined)).toEqual({ ids: [], omitidos: [] });
    });
});
