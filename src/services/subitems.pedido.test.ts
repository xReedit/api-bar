import { describe, expect, it } from 'vitest';
import type { Grupo, ItemAgrupado, OpcionGrupo } from './subitems.pedido';
import {
    MAX_CANT_OPCION,
    aRespuestaTool,
    agruparItemsBot,
    esBasura,
    normalizarGruposSP,
    precioExtra,
    resolverOpciones,
    sanitizarDes,
} from './subitems.pedido';

// --- fábricas de fixtures -------------------------------------------------

const opcion = (p: Partial<OpcionGrupo> & { id: number; des: string }): OpcionGrupo => ({
    extra: 0,
    idporcion: 0,
    idproducto: 0,
    idsubreceta: 0,
    cantidad_porcion: '1',
    descuenta: 1,
    agotada: false,
    ...p,
});

const grupo = (p: Partial<Grupo> & { id: number; opciones: OpcionGrupo[] }): Grupo => ({
    titulo: 'GRUPO',
    obligatorio: true,
    elegir: 1,
    con_cantidad: false,
    ...p,
});

const item = (p: Partial<ItemAgrupado>): ItemAgrupado => ({
    iditem: 100,
    descripcion: 'POLLO A LA BRASA',
    cantidad: 1,
    precio: 30,
    indicaciones: '',
    lineas: [],
    ...p,
});

const PRESAS = grupo({
    id: 1,
    titulo: 'ELIGE TU PRESA',
    opciones: [
        opcion({ id: 307, des: 'PECHO', idporcion: 47 }),
        opcion({ id: 352, des: 'PIERNA' }),
        opcion({ id: 400, des: 'ALITA', extra: 10 }),
    ],
});

// --- sanitizarDes ---------------------------------------------------------

describe('sanitizarDes', () => {
    it('aplana el caso real de produccion (saltos de linea + 48 espacios)', () => {
        const sucio = 'AA 200GR\r\n CECINA' + ' '.repeat(48) + '\tDOBLE';
        expect(sanitizarDes(sucio)).toBe('AA 200GR CECINA DOBLE');
    });

    it('elimina comillas simples, dobles y backslash (rompen el INSERT por CONCAT)', () => {
        expect(sanitizarDes(`AJI D'GALLINA`)).toBe('AJI DGALLINA');
        expect(sanitizarDes('SALSA "BBQ" \\ EXTRA')).toBe('SALSA BBQ EXTRA');
        expect(sanitizarDes(`  '  MAKI  '  `)).toBe('MAKI');
    });

    it('corta a 60 caracteres y tolera null/undefined/numeros', () => {
        expect(sanitizarDes('X'.repeat(80))).toHaveLength(60);
        expect(sanitizarDes(null)).toBe('');
        expect(sanitizarDes(undefined)).toBe('');
        expect(sanitizarDes(123)).toBe('123');
    });
});

// --- precioExtra ----------------------------------------------------------

describe('precioExtra', () => {
    it('normaliza la data sucia real de la sede piloto', () => {
        expect(precioExtra('')).toBe(0);
        expect(precioExtra('00')).toBe(0);
        expect(precioExtra('0.00')).toBe(0);
        expect(precioExtra('2.00')).toBe(2);
        expect(precioExtra('16')).toBe(16);
    });

    it('nunca devuelve NaN ni negativos', () => {
        for (const v of [null, undefined, 'abc', {}, [], '-5', '-0.5', NaN]) {
            expect(precioExtra(v)).toBe(0);
        }
        expect(Number.isNaN(precioExtra('abc'))).toBe(false);
    });

    it('rechaza notacion cientifica y comas (parseFloat inventaba sobreprecio)', () => {
        expect(precioExtra('1e3')).toBe(0);
        expect(precioExtra('10,50')).toBe(0);
        for (const v of ['1E3', '2e-2', ' 1e3 ', '1.2.3', '3 soles', '0x10', 'Infinity', '2.000', '+2', '.5']) {
            expect(precioExtra(v), v).toBe(0);
        }
        // lo valido sigue valido
        expect(precioExtra(' 2.50 ')).toBe(2.5);
        expect(precioExtra(16)).toBe(16);
    });
});

// --- esBasura -------------------------------------------------------------

describe('esBasura', () => {
    it('mata la basura de pruebas', () => {
        for (const v of ['AAAAA', 'QQQQQQQQ', 'CVCCCC', 'RTRRRRR', 'QWWWWW', 'TTTTTTT', 'PPAPAPAPA', 'XX', '']) {
            expect(esBasura(v), v).toBe(true);
        }
    });

    it('deja pasar los platos reales', () => {
        for (const v of ['AJI', 'PECHO', 'MAKI AVOCADO', '7UP', '1/8 DE POLLO', 'PAPA', 'AA 200GR CECINA']) {
            expect(esBasura(v), v).toBe(false);
        }
    });
});

// --- normalizarGruposSP ---------------------------------------------------

const SP_JSON = JSON.stringify([
    {
        iditem_subitem_content: 55,
        iditem: 100,
        des: 'ELIGE TU\n   PRESA',
        subitem_required_select: '1',
        subitem_cant_select: '1',
        show_cant_item: 0,
        opciones: [
            { iditem_subitem: 307, des: "PECHO D'ORO", precio: '0.00', cantidad: 'ND', idporcion: 47, idproducto: 0, idsubreceta: 0, cantidad_porcion: '1', descuenta: 1 },
            { iditem_subitem: 352, des: 'PIERNA', precio: '2.00', cantidad: '5', idporcion: 0, idproducto: 0, idsubreceta: 0, cantidad_porcion: '1', descuenta: 1 },
            { iditem_subitem: 999, des: 'ALITA AGOTADA', precio: '', cantidad: '0', idporcion: 0, idproducto: 0, idsubreceta: 0, cantidad_porcion: '1', descuenta: 1 },
            { iditem_subitem: 998, des: 'QQQQQQQQ', precio: '', cantidad: 'ND', idporcion: 0, idproducto: 0, idsubreceta: 0, cantidad_porcion: '1', descuenta: 1 },
        ],
    },
]);

describe('normalizarGruposSP', () => {
    it('parsea el string JSON del SP y limpia la data sucia', () => {
        const [g] = normalizarGruposSP(SP_JSON);
        expect(g.id).toBe(55);
        expect(g.titulo).toBe('ELIGE TU PRESA');
        expect(g.obligatorio).toBe(true); // llego como "1" string
        expect(g.elegir).toBe(1);
        expect(g.con_cantidad).toBe(false);
        expect(g.opciones.map((o) => o.id)).toEqual([307, 352]);
        expect(g.opciones[0].des).toBe('PECHO DORO'); // sin la comilla
        expect(g.opciones[0].extra).toBe(0);
        expect(g.opciones[1].extra).toBe(2);
        expect(g.opciones[0].idporcion).toBe(47);
    });

    it('descarta la opcion agotada pero no la que tiene stock ND', () => {
        const [g] = normalizarGruposSP(SP_JSON);
        expect(g.opciones.find((o) => o.id === 999)).toBeUndefined(); // cantidad '0'
        expect(g.opciones.find((o) => o.id === 307)).toBeDefined(); // cantidad 'ND'
    });

    it('acepta el objeto ya parseado', () => {
        expect(normalizarGruposSP(JSON.parse(SP_JSON))).toEqual(normalizarGruposSP(SP_JSON));
    });

    it('devuelve [] con null, vacio o basura, sin lanzar', () => {
        for (const v of [null, undefined, '', '   ', 'no soy json', '{', 42, {}, [], [null, 'x']]) {
            expect(normalizarGruposSP(v)).toEqual([]);
        }
    });

    it('GUARDA: si el filtro dejaria el grupo vacio, devuelve las opciones sin filtrar', () => {
        const sp = JSON.stringify([
            {
                iditem_subitem_content: 7,
                des: '',
                subitem_required_select: 1,
                subitem_cant_select: 1,
                show_cant_item: 1,
                opciones: [
                    { iditem_subitem: 11, des: 'AAAAA', precio: '', cantidad: 'ND' },
                    { iditem_subitem: 12, des: '', precio: '3', cantidad: 'ND' },
                ],
            },
        ]);
        const [g] = normalizarGruposSP(sp);
        expect(g.titulo).toBe('OPCIONES');
        expect(g.con_cantidad).toBe(true);
        expect(g.opciones.map((o) => o.id)).toEqual([11, 12]);
        expect(g.opciones[1].des).toBe('OPCION 12'); // nunca vacio
    });

    it('propaga el stock crudo del SP y usa ND cuando no hay control', () => {
        const [g] = normalizarGruposSP(SP_JSON);
        expect(g.opciones.find((o) => o.id === 307)!.stock).toBe('ND'); // cantidad 'ND'
        expect(g.opciones.find((o) => o.id === 352)!.stock).toBe(5); // cantidad '5'
        const sp = JSON.stringify([
            {
                iditem_subitem_content: 8,
                des: 'TAMANO',
                subitem_required_select: 1,
                subitem_cant_select: 1,
                opciones: [
                    { iditem_subitem: 31, des: 'FAMILIAR', precio: '5', cantidad: 32 },
                    { iditem_subitem: 32, des: 'PERSONAL', precio: '', cantidad: 'basura' },
                    { iditem_subitem: 33, des: 'MEDIANA', precio: '', cantidad: '' },
                ],
            },
        ]);
        const [t] = normalizarGruposSP(sp);
        expect(t.opciones.map((o) => o.stock)).toEqual([32, 'ND', 'ND']);
        expect(t.opciones.every((o) => o.agotada === false)).toBe(true);
    });

    it('sanea la comilla en cantidad_porcion (rompe el INSERT igual que un des)', () => {
        const sp = JSON.stringify([
            {
                iditem_subitem_content: 9,
                des: 'PORCION',
                subitem_required_select: 1,
                subitem_cant_select: 1,
                opciones: [
                    { iditem_subitem: 41, des: 'MEDIA', precio: '', cantidad: 'ND', cantidad_porcion: `1/2 D'ONZA` },
                    { iditem_subitem: 42, des: 'ENTERA', precio: '', cantidad: 'ND', cantidad_porcion: null },
                ],
            },
        ]);
        const [g] = normalizarGruposSP(sp);
        expect(g.opciones[0].cantidad_porcion).toBe('1/2 DONZA');
        expect(g.opciones[0].cantidad_porcion).not.toMatch(/['"\\]/);
        expect(g.opciones[1].cantidad_porcion).toBe('ND'); // nunca vacio
    });

    it('omite el grupo cuando el SP no trajo ninguna opcion', () => {
        const sp = JSON.stringify([{ iditem_subitem_content: 7, des: 'VACIO', subitem_required_select: 1, opciones: [] }]);
        expect(normalizarGruposSP(sp)).toEqual([]);
    });
});

// --- aRespuestaTool -------------------------------------------------------

describe('aRespuestaTool', () => {
    it('expone solo los campos compactos (ahorro de tokens en el historial)', () => {
        const [g] = aRespuestaTool([PRESAS]);
        expect(Object.keys(g).sort()).toEqual(['con_cantidad', 'elegir', 'id', 'obligatorio', 'opciones', 'titulo']);
        expect(Object.keys(g.opciones[0]).sort()).toEqual(['des', 'extra', 'id']);
        expect(g.opciones[2]).toEqual({ id: 400, des: 'ALITA', extra: 10 });
    });

    it('tolera entrada vacia', () => {
        expect(aRespuestaTool([])).toEqual([]);
        expect(aRespuestaTool(null as any)).toEqual([]);
    });

    it('marca agotada:true (y solo entonces) para que el bot no la ofrezca a ciegas', () => {
        const g = grupo({
            id: 6,
            titulo: 'TAMANO',
            opciones: [
                opcion({ id: 50, des: 'FAMILIAR', agotada: true, stock: 0 }),
                opcion({ id: 51, des: 'PERSONAL' }),
            ],
        });
        const [r] = aRespuestaTool([g]);
        expect(r.opciones[0]).toEqual({ id: 50, des: 'FAMILIAR', extra: 0, agotada: true });
        // la disponible NO lleva la clave: el caso normal no paga tokens
        expect(r.opciones[1]).toEqual({ id: 51, des: 'PERSONAL', extra: 0 });
        expect('agotada' in r.opciones[1]).toBe(false);
    });
});

// --- agruparItemsBot ------------------------------------------------------

describe('agruparItemsBot', () => {
    it('junta el mismo iditem repetido y conserva una linea por combinacion', () => {
        const r = agruparItemsBot([
            { iditem: 100, descripcion: 'POLLO', cantidad: 2, precio: 30, indicaciones: 'sin aji', opciones: [{ id: 307 }] },
            { iditem: 100, descripcion: 'POLLO', cantidad: 2, precio: 30, indicaciones: '', opciones: [{ id: 352 }] },
            { iditem: 200, descripcion: 'GASEOSA', cantidad: 1, precio: 8 },
        ]);
        expect(r).toHaveLength(2);
        expect(r[0].cantidad).toBe(4); // antes se perdian 2 en silencio
        expect(r[0].descripcion).toBe('POLLO');
        expect(r[0].precio).toBe(30);
        expect(r[0].indicaciones).toBe('sin aji');
        expect(r[0].lineas).toHaveLength(2);
        expect(r[0].lineas[1]).toEqual({ cantidad: 2, indicaciones: '', opciones: [{ id: 352, cantidad: 1 }] });
        expect(r[1].lineas[0]).toEqual({ cantidad: 1, indicaciones: '', opciones: [] });
    });

    it('trata iditem string y number como el mismo plato', () => {
        const r = agruparItemsBot([
            { iditem: '100', cantidad: 1 },
            { iditem: 100, cantidad: 3 },
        ]);
        expect(r).toHaveLength(1);
        expect(r[0].iditem).toBe(100);
        expect(r[0].cantidad).toBe(4);
    });

    it('une indicaciones distintas sin duplicar y tolera campos ausentes', () => {
        const r = agruparItemsBot([
            { iditem: 100, indicaciones: 'sin aji' },
            { iditem: 100, indicaciones: 'sin aji' },
            { iditem: 100, indicaciones: 'bien cocido' },
        ]);
        expect(r[0].indicaciones).toBe('sin aji, bien cocido');
        expect(r[0].cantidad).toBe(3); // cantidad ausente => 1
        expect(r[0].lineas[0].opciones).toEqual([]);
    });

    it('ignora entradas invalidas y entrada no-array', () => {
        expect(agruparItemsBot([null, 'x', {}, { iditem: 0 }] as any)).toEqual([]);
        expect(agruparItemsBot(null as any)).toEqual([]);
    });
});

// --- resolverOpciones -----------------------------------------------------

describe('resolverOpciones - inercia (cartas planas)', () => {
    it('plato sin grupos configurados: payload identico al de hoy', () => {
        expect(resolverOpciones(item({ cantidad: 2, lineas: [{ cantidad: 2, indicaciones: '', opciones: [{ id: 307 }] }] }), []))
            .toEqual({ subitems_view: [], sobreprecio_total: 0 });
    });

    it('ninguna linea trae opciones y el grupo es OPCIONAL (+EXTRAS): inerte', () => {
        const opcionales = grupo({ ...PRESAS, obligatorio: false, elegir: 0 });
        expect(resolverOpciones(item({ cantidad: 2, lineas: [{ cantidad: 2, indicaciones: 'sin aji', opciones: [] }] }), [opcionales]))
            .toEqual({ subitems_view: [], sobreprecio_total: 0 });
    });

    it('sin lineas: inerte', () => {
        expect(resolverOpciones(item({}), [PRESAS])).toEqual({ subitems_view: [], sobreprecio_total: 0 });
    });
});

describe('resolverOpciones - plato +ELIGE sin el campo opciones', () => {
    // El modelo omite `opciones` en el resumen con frecuencia. Antes se salía
    // inerte y el pedido se guardaba sin tamaño y sin sobreprecio; la red de
    // seguridad de resolverLinea quedaba inalcanzable.
    it('autoelige la opcion sin costo cuando el grupo es OBLIGATORIO', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [] }] }),
            [PRESAS],
        );
        expect(r.subitems_view).toHaveLength(1);
        expect(r.subitems_view[0].des).toBe('PECHO'); // primera sin extra
        expect(r.sobreprecio_total).toBe(0);          // jamas cobra de mas por autoelegir
        expect(r.subitems_view[0].subitems[0].iditem_subitem).toBe(307);
        expect(JSON.stringify(r.subitems_view)).not.toContain('null');
    });

    it('cubre TODAS las unidades del plato (no deja remanente sin presa)', () => {
        const r = resolverOpciones(
            item({ cantidad: 4, lineas: [{ cantidad: 4, indicaciones: '', opciones: [] }] }),
            [PRESAS],
        );
        expect(r.subitems_view.reduce((a: number, e: any) => a + e.cantidad_seleccionada, 0)).toBe(4);
    });

    it('un grupo obligatorio arrastra tambien a los opcionales del mismo plato, sin inventarles opciones', () => {
        const extras = grupo({
            id: 2, titulo: 'EXTRAS', obligatorio: false, elegir: 0,
            opciones: [opcion({ id: 900, des: 'QUESO', extra: 5 })],
        });
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [] }] }),
            [PRESAS, extras],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.iditem_subitem)).toEqual([307]);
        expect(r.sobreprecio_total).toBe(0);
    });
});

describe('resolverOpciones - precio y cantidades', () => {
    it('1 combinacion, cantidad 2, extra 10 => precio 20 acumulado', () => {
        const r = resolverOpciones(
            item({ cantidad: 2, lineas: [{ cantidad: 2, indicaciones: '', opciones: [{ id: 400 }] }] }),
            [PRESAS],
        );
        expect(r.subitems_view).toHaveLength(1);
        const e = r.subitems_view[0];
        expect(e.id).toBe('400');
        expect(e.des).toBe('ALITA');
        expect(e.precio).toBe(20);
        expect(e.precio_mostrar).toBe('20.00');
        expect(e.cantidad_seleccionada).toBe(2);
        expect(e.subitems[0].cantidad_selected).toBe(1);
        expect(e.subitems[0].precio).toBe(10); // extra unitario
        expect(e.subitems[0].precio_visible).toBe(true);
        expect(e.subitems[0].iditem_subitem).toBe(400);
        expect(e.subitems[0].idporcion).toBe(0);
        expect(r.sobreprecio_total).toBe(20);
    });

    it('2 combinaciones (2 pecho / 2 pierna) => 2 elementos que suman 4', () => {
        const r = resolverOpciones(
            item({
                cantidad: 4,
                lineas: [
                    { cantidad: 2, indicaciones: '', opciones: [{ id: 307 }] },
                    { cantidad: 2, indicaciones: '', opciones: [{ id: 352 }] },
                ],
            }),
            [PRESAS],
        );
        expect(r.subitems_view).toHaveLength(2);
        expect(r.subitems_view.map((e: any) => e.des)).toEqual(['PECHO', 'PIERNA']);
        expect(r.subitems_view.reduce((a: number, e: any) => a + e.cantidad_seleccionada, 0)).toBe(4);
        expect(r.sobreprecio_total).toBe(0); // ninguna presa cuesta extra
    });

    it('recorta desde la ultima cuando las lineas suman de mas', () => {
        const r = resolverOpciones(
            item({
                cantidad: 3,
                lineas: [
                    { cantidad: 2, indicaciones: '', opciones: [{ id: 307 }] },
                    { cantidad: 2, indicaciones: '', opciones: [{ id: 352 }] },
                ],
            }),
            [PRESAS],
        );
        expect(r.subitems_view.map((e: any) => e.cantidad_seleccionada)).toEqual([2, 1]);
    });

    it('completa la diferencia en la primera combinacion si hay grupo obligatorio', () => {
        const r = resolverOpciones(
            item({ cantidad: 4, lineas: [{ cantidad: 2, indicaciones: '', opciones: [{ id: 307 }] }] }),
            [PRESAS],
        );
        expect(r.subitems_view).toHaveLength(1);
        expect(r.subitems_view[0].cantidad_seleccionada).toBe(4);
    });

    it('deja el remanente si todos los grupos son opcionales (4 pollos, uno con extra queso)', () => {
        const extras = grupo({ id: 2, titulo: 'EXTRAS', obligatorio: false, elegir: 0, opciones: [opcion({ id: 900, des: 'EXTRA QUESO', extra: 3 })] });
        const r = resolverOpciones(
            item({ cantidad: 4, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 900 }] }] }),
            [extras],
        );
        expect(r.subitems_view).toHaveLength(1);
        expect(r.subitems_view[0].cantidad_seleccionada).toBe(1);
        expect(r.sobreprecio_total).toBe(3);
    });

    it('fusiona lineas con la misma combinacion sumando cantidades', () => {
        const r = resolverOpciones(
            item({
                cantidad: 3,
                lineas: [
                    { cantidad: 1, indicaciones: '', opciones: [{ id: 400 }] },
                    { cantidad: 2, indicaciones: '', opciones: [{ id: 400 }] },
                ],
            }),
            [PRESAS],
        );
        expect(r.subitems_view).toHaveLength(1);
        expect(r.subitems_view[0].cantidad_seleccionada).toBe(3);
        expect(r.subitems_view[0].precio).toBe(30);
    });
});

describe('resolverOpciones - red de seguridad contra el modelo', () => {
    const SABORES = grupo({
        id: 3,
        titulo: 'ELIGE 2 SABORES',
        elegir: 2,
        opciones: [
            opcion({ id: 10, des: 'FRESA', extra: 5 }),
            opcion({ id: 11, des: 'VAINILLA' }),
            opcion({ id: 12, des: 'CHOCOLATE' }),
        ],
    });

    it('autoelige la primera opcion sin costo cuando el modelo no eligio del grupo obligatorio', () => {
        const extras = grupo({ id: 2, titulo: 'EXTRAS', obligatorio: false, elegir: 0, opciones: [opcion({ id: 900, des: 'EXTRA QUESO', extra: 3 })] });
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 900 }] }] }),
            [SABORES, extras],
        );
        // FRESA cuesta 5, se salta: entran VAINILLA y CHOCOLATE (extra 0).
        expect(r.subitems_view[0].subitems.map((s: any) => s.des)).toEqual(['VAINILLA', 'CHOCOLATE', 'EXTRA QUESO']);
        expect(r.sobreprecio_total).toBe(3);
    });

    it('elegir:2 con 3 ids => se quedan los 2 primeros en el orden del grupo', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 12 }, { id: 11 }, { id: 10 }] }] }),
            [SABORES],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.iditem_subitem)).toEqual([10, 11]);
        expect(r.subitems_view[0].id).toBe('1011');
        expect(r.subitems_view[0].precio).toBe(5); // el extra sale del grupo, no del input
    });

    it('descarta ids alucinados o de otro plato', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 307 }, { id: 424242 }] }] }),
            [PRESAS],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.iditem_subitem)).toEqual([307]);
    });

    it('ignora el extra que mande el modelo y usa el de BD', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 400, precio: 0 } as any] }] }),
            [PRESAS],
        );
        expect(r.subitems_view[0].precio).toBe(10);
    });

    it('con show_cant_item respeta la cantidad por opcion', () => {
        const conCant = grupo({ id: 4, titulo: 'CHOPP', con_cantidad: true, elegir: 0, opciones: [opcion({ id: 20, des: 'CHOPP', extra: 6 })] });
        const r = resolverOpciones(
            item({ cantidad: 2, lineas: [{ cantidad: 2, indicaciones: '', opciones: [{ id: 20, cantidad: 3 }] }] }),
            [conCant],
        );
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(3);
        expect(r.subitems_view[0].precio).toBe(36); // 6 * 3 * 2
    });

    it('pega las indicaciones de la linea al des (el SP las descarta en esta rama)', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: 'sin sal', opciones: [{ id: 307 }] }] }),
            [PRESAS],
        );
        expect(r.subitems_view[0].des).toBe('PECHO | sin sal');
    });
});

describe('resolverOpciones - cantidades por opcion (con_cantidad)', () => {
    const BOLAS = grupo({
        id: 3,
        titulo: 'ELIGE 2 BOLAS',
        elegir: 2,
        con_cantidad: true,
        opciones: [
            opcion({ id: 10, des: 'FRESA', extra: 5 }),
            opcion({ id: 11, des: 'VAINILLA' }),
            opcion({ id: 12, des: 'CHOCOLATE' }),
        ],
    });

    it('2 bolas de fresa cubren el elegir:2 y NO autocompleta una tercera', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 10, cantidad: 2 }] }] }),
            [BOLAS],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.des)).toEqual(['FRESA']);
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(2);
        expect(r.subitems_view[0].precio).toBe(10); // 5 * 2 bolas * 1 helado
    });

    it('sigue autocompletando cuando de verdad faltan unidades', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 10, cantidad: 1 }] }] }),
            [BOLAS],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.des)).toEqual(['FRESA', 'VAINILLA']);
        expect(r.subitems_view[0].subitems.map((s: any) => s.cantidad_selected)).toEqual([1, 1]);
    });

    it('la suma de cantidades del grupo no pasa de elegir (recorta desde la ultima)', () => {
        const r = resolverOpciones(
            item({
                cantidad: 1,
                lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 10, cantidad: 2 }, { id: 11, cantidad: 2 }] }],
            }),
            [BOLAS],
        );
        expect(r.subitems_view[0].subitems.map((s: any) => s.iditem_subitem)).toEqual([10]);
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(2);
    });

    it('cantidad 50 en un elegir:2 queda acotada a 2 (no 50 de stock ni x50 de precio)', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 10, cantidad: 50 }] }] }),
            [BOLAS],
        );
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(2);
        expect(r.sobreprecio_total).toBe(10);
    });

    it('sin elegir, la cantidad por opcion topa en MAX_CANT_OPCION', () => {
        const libre = grupo({
            id: 5,
            titulo: 'BOLAS',
            obligatorio: false,
            elegir: 0,
            con_cantidad: true,
            opciones: [opcion({ id: 10, des: 'FRESA', extra: 2 })],
        });
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 10, cantidad: 50 }] }] }),
            [libre],
        );
        expect(MAX_CANT_OPCION).toBe(20);
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(MAX_CANT_OPCION);
        expect(r.sobreprecio_total).toBe(40); // antes: 100
    });

    it('sin con_cantidad la cantidad por opcion es siempre 1', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 400, cantidad: 9 }] }] }),
            [PRESAS],
        );
        expect(r.subitems_view[0].subitems[0].cantidad_selected).toBe(1);
        expect(r.sobreprecio_total).toBe(10);
    });
});

describe('resolverOpciones - subitems[].cantidad = stock, nunca null', () => {
    it('propaga el stock de BD y no deja ni un null en el payload', () => {
        const sp = JSON.stringify([
            {
                iditem_subitem_content: 8,
                des: 'TAMANO',
                subitem_required_select: 1,
                subitem_cant_select: 1,
                opciones: [
                    { iditem_subitem: 31, des: 'FAMILIAR', precio: '5', cantidad: 32, cantidad_porcion: '1' },
                    { iditem_subitem: 32, des: 'PERSONAL', precio: '', cantidad: 'ND', cantidad_porcion: '1' },
                ],
            },
        ]);
        const gs = normalizarGruposSP(sp);
        const r = resolverOpciones(
            item({
                cantidad: 2,
                lineas: [
                    { cantidad: 1, indicaciones: '', opciones: [{ id: 31 }] },
                    { cantidad: 1, indicaciones: '', opciones: [{ id: 32 }] },
                ],
            }),
            gs,
        );
        expect(r.subitems_view[0].subitems[0].cantidad).toBe(32);
        expect(r.subitems_view[1].subitems[0].cantidad).toBe('ND');
        expect(JSON.stringify(r.subitems_view)).not.toContain('null');
    });

    it('sin stock conocido en el grupo tampoco aparece null', () => {
        const r = resolverOpciones(
            item({ cantidad: 1, lineas: [{ cantidad: 1, indicaciones: '', opciones: [{ id: 307 }] }] }),
            [PRESAS], // las fixtures no traen `stock`
        );
        expect(r.subitems_view[0].subitems[0].cantidad).toBe('ND');
        expect(JSON.stringify(r.subitems_view)).not.toContain('null');
    });
});

describe('resolverOpciones - invariantes del procedure', () => {
    const CLAVES_GRUPO = ['id', 'des', 'precio', 'cantidad_seleccionada', 'indicaciones', 'indicaciones_item', 'precio_mostrar'];
    const CLAVES_SUBITEM = [
        'des', 'precio', 'cantidad_selected', 'idporcion', 'idproducto', 'idsubreceta',
        'cantidad_porcion', 'descuenta', 'selected', 'disabled', 'classAgotado',
        'precio_visible', 'cantidad_visible', 'iditem_subitem',
    ];

    // Grupos armados desde datos sucios reales, para que la sanitizacion tenga trabajo.
    const sucios = normalizarGruposSP(SP_JSON);

    const casos: { nombre: string; r: { subitems_view: any[] } }[] = [
        {
            nombre: 'combinaciones multiples con data sucia',
            r: resolverOpciones(
                item({
                    cantidad: 5,
                    lineas: [
                        { cantidad: 2, indicaciones: `sin "aji" ni cebolla`, opciones: [{ id: 307 }] },
                        { cantidad: 2, indicaciones: '', opciones: [{ id: 352 }] },
                        { cantidad: 1, indicaciones: '', opciones: [] },
                    ],
                }),
                sucios,
            ),
        },
        {
            nombre: 'autoeleccion + ids alucinados',
            r: resolverOpciones(
                item({ cantidad: 2, lineas: [{ cantidad: 2, indicaciones: '', opciones: [{ id: 1 }, { id: 999999 }] }] }),
                sucios,
            ),
        },
    ];

    for (const caso of casos) {
        it(`ninguna clave critica queda undefined/NaN (${caso.nombre})`, () => {
            expect(caso.r.subitems_view.length).toBeGreaterThan(0);
            for (const e of caso.r.subitems_view) {
                for (const k of CLAVES_GRUPO) {
                    expect(e[k], k).not.toBeUndefined();
                    expect(e[k], k).not.toBeNull();
                    expect(Number.isNaN(e[k] as any), k).toBe(false);
                }
                expect(typeof e.id).toBe('string');
                expect(e.id.length).toBeGreaterThan(0);
                expect(e.des.length).toBeGreaterThan(0);
                expect(e.cantidad_seleccionada).toBeGreaterThanOrEqual(1);
                expect(Array.isArray(e.subitems)).toBe(true);
                expect(e.subitems.length).toBeGreaterThan(0);
                expect(e.subitems[0].iditem_subitem).toBeGreaterThan(0);
                for (const s of e.subitems) {
                    for (const k of CLAVES_SUBITEM) {
                        expect(s[k], k).not.toBeUndefined();
                        expect(s[k], k).not.toBeNull();
                        expect(Number.isNaN(s[k] as any), k).toBe(false);
                    }
                    expect(s.cantidad_selected).toBeGreaterThanOrEqual(1);
                }
            }
        });

        it(`ningun des lleva comillas y ninguna clave es null (${caso.nombre})`, () => {
            const json = JSON.stringify(caso.r.subitems_view);
            for (const e of caso.r.subitems_view) {
                expect(e.des).not.toMatch(/['"\\]/);
                for (const s of e.subitems) {
                    expect(s.des).not.toMatch(/['"\\]/);
                    expect(String(s.cantidad_porcion)).not.toMatch(/['"\\]/);
                }
            }
            expect(json).not.toContain("'");
            // CONCAT(..., NULL, ...) = NULL: un solo null anula el INSERT entero.
            expect(json).not.toContain('null');
        });
    }
});
