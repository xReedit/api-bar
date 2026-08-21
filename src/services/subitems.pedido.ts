// Opciones / seleccionables de un plato (tamaños, toppings, acompañamientos).
//
// Módulo PURO: sin Prisma, sin HTTP, sin I/O. Quien llama ya leyó los grupos
// de BD con `CALL porcedure_pwa_pedido_carta_get_subitens(iditem)` y le pasa
// aquí la columna `respuesta` tal cual.
//
// Salida final: el array `subitems_view` que consume
// `procedure_pwa_pedido_guardar`. Ese procedure arma el INSERT de
// pedido_detalle con CONCAT de strings y mete el JSON entre comillas simples:
//   - CONCAT(..., NULL, ...) = NULL en MySQL, así que una sola clave faltante
//     anula la sentencia entera y el pedido se guarda SIN detalle, en
//     silencio. Por eso todas las claves llevan default explícito.
//   - una comilla dentro de una descripción ("AJI D'GALLINA") rompe el pedido
//     completo. Por eso `sanitizarDes` elimina ' " y \ SIEMPRE.
//
// REGLA DE ORO: para cartas planas (platos sin grupos configurados) todo esto
// es inerte: `resolverOpciones` devuelve { subitems_view: [], sobreprecio_total: 0 }
// y el payload queda idéntico al de hoy.

export type OpcionGrupo = {
    id: number; des: string; extra: number;
    idporcion: number; idproducto: number; idsubreceta: number;
    cantidad_porcion: string; descuenta: number; agotada: boolean;
    /**
     * Stock crudo de la opción tal como lo trae el SP en la columna `cantidad`
     * (32, 0, ...) o 'ND' cuando no lleva control de stock. Viaja hasta
     * `subitems[].cantidad`, que el procedure espera con valor: la fila real de
     * producción trae un número ahí, NUNCA null. Opcional para no romper a
     * quien construya un OpcionGrupo a mano: si falta, se emite 'ND'.
     */
    stock?: number | string;
};

export type Grupo = {
    id: number; titulo: string; obligatorio: boolean; elegir: number;
    con_cantidad: boolean; opciones: OpcionGrupo[];
};

export type LineaBot = {
    cantidad: number;
    indicaciones: string;
    opciones: { id: number; cantidad?: number }[];
};

export type ItemAgrupado = {
    iditem: number; descripcion: string; cantidad: number; precio: number;
    indicaciones: string; lineas: LineaBot[];
};

const MAX_DES = 60;

/** Aplana, quita comillas/backslash y recorta. Blindaje del INSERT por CONCAT. */
export function sanitizarDes(s: any): string {
    return String(s ?? '')
        .replace(/['"\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_DES)
        .trim();
}

/**
 * Dinero simple: dígitos, punto decimal opcional, máximo 2 decimales.
 * La columna es varchar con basura real y `parseFloat` es demasiado permisivo:
 * convierte '1e3' en 1000 y '10,50' en 10.5, es decir, sobreprecio inventado
 * que el cliente termina pagando. Lo que no case con el regex vale 0.
 */
const RE_DINERO = /^\d+(?:\.\d{1,2})?$/;

/** `precio` del subitem = incremento absoluto en soles. Tolerante y nunca NaN. */
export function precioExtra(p: any): number {
    const s = String(p ?? '').trim();
    if (!RE_DINERO.test(s)) return 0;
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100) / 100;
}

const RE_VOCAL = /[aeiouáéíóúàèìòùäëïöüâêîôû]/i;

/**
 * Basura de pruebas que quedó en la carta (AAAAA, QQQQQQQQ, CVCCCC, PPAPAPAPA).
 * (a) muy corta, (b) sin vocales, (c) sin variedad real de letras: un solo
 * carácter repetido, o solo dos caracteres distintos en 6+ posiciones.
 * Un plato real ("PAPA", "AJI", "7UP", "1/8 DE POLLO") sobrevive.
 */
export function esBasura(des: string): boolean {
    const s = String(des ?? '').trim();
    if (s.length < 3) return true;
    if (!RE_VOCAL.test(s)) return true;
    const compacto = s.replace(/\s+/g, '').toUpperCase();
    const distintos = new Set(compacto.split('')).size;
    if (distintos <= 1) return true;
    if (distintos <= 2 && compacto.length >= 6) return true;
    return false;
}

function numero(v: any, def = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

function mapOpcion(o: any): OpcionGrupo {
    const stock = String(o?.cantidad ?? 'ND').trim().toUpperCase();
    const nStock = Number(stock);
    // 'ND' (o vacío, o basura no numérica) = sin control de stock.
    const conStock = stock !== 'ND' && stock !== '' && Number.isFinite(nStock);
    return {
        id: numero(o?.iditem_subitem) || 0,
        des: sanitizarDes(o?.des),
        extra: precioExtra(o?.precio),
        idporcion: numero(o?.idporcion) || 0,
        idproducto: numero(o?.idproducto) || 0,
        idsubreceta: numero(o?.idsubreceta) || 0,
        // También viaja crudo al INSERT por CONCAT: una comilla aquí rompe el
        // pedido completo igual que en un `des`.
        cantidad_porcion: sanitizarDes(o?.cantidad_porcion) || 'ND',
        descuenta: numero(o?.descuenta) || 1,
        stock: conStock ? nStock : 'ND',
        agotada: conStock && nStock <= 0,
    };
}

const conDes = (o: OpcionGrupo): OpcionGrupo => (o.des ? o : { ...o, des: `OPCION ${o.id}` });

/** Parsea la columna `respuesta` del SP (string JSON | objeto | null). Nunca lanza. */
export function normalizarGruposSP(respuesta: any): Grupo[] {
    let raw: any = respuesta;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) return [];
        try { raw = JSON.parse(t); } catch { return []; }
    }
    // El driver a veces entrega la fila entera: { respuesta: '...' }.
    if (raw && !Array.isArray(raw) && typeof raw === 'object' && 'respuesta' in raw) {
        const dentro = (raw as any).respuesta;
        return typeof dentro === 'string' || Array.isArray(dentro) ? normalizarGruposSP(dentro) : [];
    }
    if (!Array.isArray(raw)) return [];

    const grupos: Grupo[] = [];
    for (const g of raw) {
        if (!g || typeof g !== 'object') continue;
        // Caso real: [{ respuesta: '[...]' }] -> una sola fila con el JSON dentro.
        if ('respuesta' in g && !('opciones' in g)) {
            grupos.push(...normalizarGruposSP((g as any).respuesta));
            continue;
        }
        const todas: OpcionGrupo[] = (Array.isArray((g as any).opciones) ? (g as any).opciones : [])
            .map(mapOpcion)
            .filter((o: OpcionGrupo) => o.id > 0);
        const limpias = todas.filter((o) => o.des !== '' && !esBasura(o.des) && !o.agotada);
        // GUARDA: si el filtro deja el grupo en cero, mejor una opción fea que
        // un grupo obligatorio imposible de responder. Si ni así hay opciones,
        // el grupo no existe para el bot.
        const opciones = (limpias.length > 0 ? limpias : todas).map(conDes);
        if (opciones.length === 0) continue;
        grupos.push({
            id: numero((g as any).iditem_subitem_content) || 0,
            titulo: sanitizarDes((g as any).des) || 'OPCIONES',
            obligatorio: numero((g as any).subitem_required_select) === 1,
            elegir: Math.max(0, Math.floor(numero((g as any).subitem_cant_select))),
            con_cantidad: numero((g as any).show_cant_item) === 1,
            opciones,
        });
    }
    return grupos;
}

/** Forma compacta que ve el LLM (se queda en el historial: hay que ahorrar tokens). */
export function aRespuestaTool(grupos: Grupo[]): any[] {
    return (Array.isArray(grupos) ? grupos : []).map((g) => ({
        id: g.id,
        titulo: g.titulo,
        obligatorio: g.obligatorio,
        elegir: g.elegir,
        con_cantidad: g.con_cantidad,
        // `agotada` se emite SOLO cuando es true: en el caso normal (todo con
        // stock) el payload queda igual que antes y no infla tokens. El
        // consumidor (el prompt del bot) las trata como último recurso: solo
        // las ofrece si el grupo obligatorio no tiene ninguna disponible, que
        // es justo lo que devuelve la GUARDA de normalizarGruposSP cuando el
        // grupo entero está agotado.
        opciones: g.opciones.map((o) => (o.agotada
            ? { id: o.id, des: o.des, extra: o.extra, agotada: true }
            : { id: o.id, des: o.des, extra: o.extra })),
    }));
}

/**
 * Freno anti-modelo, NO una regla de negocio: nadie pide 50 bolas de helado en
 * una sola línea, pero el LLM puede escribirlo y ese multiplicador se va al
 * precio y al descuento de stock. Solo aplica a grupos `con_cantidad` sin
 * `elegir`; cuando el grupo declara `elegir`, manda ese tope, que es el real.
 */
export const MAX_CANT_OPCION = 20;

const cantidadEntera = (v: any, def = 1): number => {
    const n = Math.floor(numero(v, def));
    return n >= 1 ? n : def;
};

function normalizarOpcionesInput(v: any): { id: number; cantidad?: number }[] {
    if (!Array.isArray(v)) return [];
    const out: { id: number; cantidad?: number }[] = [];
    for (const o of v) {
        if (o === null || o === undefined) continue;
        if (typeof o === 'number' || typeof o === 'string') {
            const id = numero(o) || 0;
            if (id > 0) out.push({ id });
            continue;
        }
        if (typeof o !== 'object') continue;
        const id = numero((o as any).id ?? (o as any).iditem_subitem) || 0;
        if (id <= 0) continue;
        out.push({ id, cantidad: cantidadEntera((o as any).cantidad, 1) });
    }
    return out;
}

const unirIndicaciones = (a: string, b: string): string => {
    const partes = [...a.split(',').map((s) => s.trim()), b.trim()].filter((s) => s !== '');
    return Array.from(new Set(partes)).join(', ');
};

/**
 * El bot puede repetir el mismo iditem (4 pollos: 2 con pecho y 2 con pierna).
 * Agrupa por iditem y guarda cada entrada original como una `linea`
 * (= una combinación de opciones). Arregla además un bug existente: hoy un
 * iditem repetido perdía cantidad en silencio.
 */
export function agruparItemsBot(items: any[]): ItemAgrupado[] {
    const lista = Array.isArray(items) ? items : [];
    const mapa = new Map<number, ItemAgrupado>();
    for (const it of lista) {
        if (!it || typeof it !== 'object') continue;
        const iditem = numero((it as any).iditem) || 0;
        if (iditem <= 0) continue;
        const cantidad = cantidadEntera((it as any).cantidad, 1);
        const indicaciones = String((it as any).indicaciones ?? '').trim();
        const linea: LineaBot = {
            cantidad,
            indicaciones,
            opciones: normalizarOpcionesInput((it as any).opciones),
        };
        const prev = mapa.get(iditem);
        if (!prev) {
            mapa.set(iditem, {
                iditem,
                descripcion: String((it as any).descripcion ?? ''),
                cantidad,
                precio: numero((it as any).precio),
                indicaciones,
                lineas: [linea],
            });
            continue;
        }
        mapa.set(iditem, {
            ...prev,
            cantidad: prev.cantidad + cantidad,
            indicaciones: unirIndicaciones(prev.indicaciones, indicaciones),
            lineas: [...prev.lineas, linea],
        });
    }
    return Array.from(mapa.values());
}

type Elegida = { opIdx: number; opcion: OpcionGrupo; cantidad: number };
type Combo = { elegidas: Elegida[]; cantidad: number; indicaciones: string };

/** Unidades que aporta una selección: Σ cantidad, o 1 por opción distinta. */
const totalUnidades = (es: Elegida[], conCantidad: boolean): number =>
    conCantidad ? es.reduce((a, e) => a + e.cantidad, 0) : es.length;

/**
 * Acota Σ cantidad del grupo al tope recortando desde la ÚLTIMA opción: las
 * primeras conservan lo pedido y las últimas pierden el cupo sobrante.
 */
function recortarPorTope(enOrden: Elegida[], tope: number): Elegida[] {
    let libre = tope;
    const out: Elegida[] = [];
    for (const e of enOrden) {
        if (libre <= 0) break;
        const c = Math.min(e.cantidad, libre);
        out.push(c === e.cantidad ? e : { ...e, cantidad: c });
        libre -= c;
    }
    return out;
}

/** Resuelve las opciones de UNA línea contra los grupos reales del plato. */
function resolverLinea(linea: LineaBot, gs: Grupo[]): Elegida[] {
    const porGrupo = new Map<number, Map<number, Elegida>>();
    for (const sel of linea.opciones) {
        // Un id que no pertenece a un grupo de ESTE plato se descarta: bloquea
        // ids alucinados por el modelo y opciones de otros platos.
        let gi = -1;
        let oi = -1;
        gs.forEach((g, i) => {
            if (gi >= 0) return;
            const j = g.opciones.findIndex((o) => o.id === sel.id);
            if (j >= 0) { gi = i; oi = j; }
        });
        if (gi < 0) continue;
        const g = gs[gi];
        // Sin `con_cantidad` la opción vale exactamente 1 unidad.
        const cant = g.con_cantidad ? Math.min(cantidadEntera(sel.cantidad, 1), MAX_CANT_OPCION) : 1;
        const mapa = porGrupo.get(gi) ?? new Map<number, Elegida>();
        const prev = mapa.get(sel.id);
        mapa.set(sel.id, prev
            ? { ...prev, cantidad: g.con_cantidad ? Math.min(prev.cantidad + cant, MAX_CANT_OPCION) : 1 }
            : { opIdx: oi, opcion: g.opciones[oi], cantidad: cant });
        porGrupo.set(gi, mapa);
    }

    return gs.flatMap((g, gi) => {
        const enOrden = Array.from(porGrupo.get(gi)?.values() ?? []).sort((a, b) => a.opIdx - b.opIdx);
        // `elegir` cuenta UNIDADES cuando el grupo lleva cantidades ("2 bolas",
        // aunque sean las dos de fresa) y OPCIONES DISTINTAS cuando no.
        const sel = g.elegir <= 0
            ? enOrden
            : g.con_cantidad
                ? recortarPorTope(enOrden, g.elegir)
                : enOrden.slice(0, g.elegir);
        if (!g.obligatorio) return sel;
        // Red de seguridad server-side: un grupo obligatorio SIEMPRE queda
        // resuelto (el bot pregunta una vez; si el cliente evade, se elige la
        // primera opción sin costo y se avanza).
        const necesita = g.elegir > 0 ? g.elegir : 1;
        // 2 bolas de fresa YA cubren un "elige 2": comparar contra `.length`
        // autocompletaba una tercera bola de otro sabor que nadie pidió.
        const yaCubierto = totalUnidades(sel, g.con_cantidad);
        if (yaCubierto >= necesita) return sel;
        const yaElegidas = new Set(sel.map((s) => s.opcion.id));
        const libres = g.opciones.map((o, i) => ({ o, i })).filter((x) => !yaElegidas.has(x.o.id));
        const candidatos = [
            ...libres.filter((x) => x.o.extra <= 0),
            ...libres.filter((x) => x.o.extra > 0),
        ];
        const faltan = candidatos
            .slice(0, necesita - yaCubierto)
            .map((c) => ({ opIdx: c.i, opcion: c.o, cantidad: 1 }));
        return [...sel, ...faltan].sort((a, b) => a.opIdx - b.opIdx);
    });
}

const claveCombo = (e: Elegida[], indicaciones: string): string =>
    `${e.map((x) => `${x.opcion.id}x${x.cantidad}`).join('-')}|${indicaciones}`;

/**
 * Fusiona líneas con la misma combinación (y las mismas indicaciones, que van
 * dentro del `des`): menos elementos en subitems_view, que es lo deseable.
 */
function fusionar(combos: Combo[]): Combo[] {
    const mapa = new Map<string, Combo>();
    for (const c of combos) {
        const k = claveCombo(c.elegidas, c.indicaciones);
        const prev = mapa.get(k);
        mapa.set(k, prev ? { ...prev, cantidad: prev.cantidad + c.cantidad } : c);
    }
    return Array.from(mapa.values());
}

/** Cuadra las cantidades de las combinaciones contra la cantidad del plato. */
function cuadrar(combos: Combo[], totalPlato: number, hayObligatorio: boolean): Combo[] {
    if (combos.length === 0) return combos;
    const suma = combos.reduce((a, c) => a + c.cantidad, 0);
    if (suma === totalPlato) return combos;
    if (suma < totalPlato) {
        // Con grupos obligatorios TODAS las unidades llevan elección: la
        // diferencia se suma a la primera combinación (además evita la fila
        // "diferencia" del SP, que pierde las indicaciones). Si todos los
        // grupos son opcionales el remanente es legítimo ("4 pollos, uno con
        // extra queso").
        if (!hayObligatorio) return combos;
        return combos.map((c, i) => (i === 0 ? { ...c, cantidad: c.cantidad + (totalPlato - suma) } : c));
    }
    // Sobra: recorta desde la última (si no, el procedure cobra y descuenta de más).
    let exceso = suma - totalPlato;
    const recortado = [...combos];
    for (let i = recortado.length - 1; i >= 0 && exceso > 0; i--) {
        const quita = Math.min(exceso, recortado[i].cantidad);
        recortado[i] = { ...recortado[i], cantidad: recortado[i].cantidad - quita };
        exceso -= quita;
    }
    return recortado.filter((c) => c.cantidad > 0);
}

function construirElemento(combo: Combo): any {
    const cantidad_seleccionada = cantidadEntera(combo.cantidad, 1);
    const extraUnidad = combo.elegidas.reduce(
        (a, e) => a + e.opcion.extra * cantidadEntera(e.cantidad, 1),
        0,
    );
    const precio = Math.round(extraUnidad * cantidad_seleccionada * 100) / 100;
    const desOpciones = combo.elegidas
        .map((e) => e.opcion.des || `OPCION ${e.opcion.id}`)
        .join(', ');
    // El SP descarta item.indicaciones en esta rama: pegarlas al `des` es la
    // única vía para que lleguen a la comanda.
    const ind = sanitizarDes(combo.indicaciones);
    const des = sanitizarDes(ind ? `${desOpciones} | ${ind}` : desOpciones) || 'OPCION';
    return {
        id: combo.elegidas.map((e) => String(e.opcion.id)).join(''),
        des,
        precio,
        cantidad_seleccionada,
        indicaciones: '',
        indicaciones_item: '',
        precio_mostrar: precio.toFixed(2),
        subitems: combo.elegidas.map((e) => ({
            des: e.opcion.des || `OPCION ${e.opcion.id}`,
            precio: e.opcion.extra,
            // El SP arma el INSERT con CONCAT: un null aquí anula la sentencia
            // entera. La fila real de producción trae el STOCK de la opción
            // (no la cantidad pedida, que va en `cantidad_selected`).
            cantidad: e.opcion.stock ?? 'ND',
            disabled: false,
            selected: true,
            descuenta: e.opcion.descuenta,
            idporcion: e.opcion.idporcion,
            idproducto: e.opcion.idproducto,
            idsubreceta: e.opcion.idsubreceta,
            classAgotado: '',
            iditem_subitem: e.opcion.id,
            precio_visible: e.opcion.extra > 0,
            cantidad_porcion: e.opcion.cantidad_porcion,
            cantidad_visible: false,
            cantidad_selected: cantidadEntera(e.cantidad, 1),
        })),
    };
}

/**
 * Recotiza contra los grupos de BD y construye `subitems_view`.
 * Nunca confía en el modelo: el extra SIEMPRE sale del grupo, no del input.
 */
export function resolverOpciones(
    item: ItemAgrupado,
    grupos: Grupo[],
): { subitems_view: any[]; sobreprecio_total: number } {
    const vacio = { subitems_view: [] as any[], sobreprecio_total: 0 };
    const gs = (Array.isArray(grupos) ? grupos : []).filter(
        (g) => g && Array.isArray(g.opciones) && g.opciones.length > 0,
    );
    const lineas = Array.isArray(item?.lineas) ? item.lineas : [];
    // Carta plana: sin grupos no hay nada que resolver. Inerte, payload idéntico
    // al de hoy.
    if (gs.length === 0 || lineas.length === 0) return vacio;
    const hayObligatorio = gs.some((g) => g.obligatorio);
    // El bot no eligió nada. Si TODOS los grupos son opcionales ("+EXTRAS"), no
    // elegir es una respuesta válida y se sale inerte. Pero con un grupo
    // OBLIGATORIO ("+ELIGE") hay que seguir: el modelo omite `opciones` en el
    // resumen más de lo que uno querría y salir aquí dejaba inalcanzable la red
    // de seguridad de `resolverLinea` (pizza guardada sin tamaño, sin
    // sobreprecio y sin que el POS pueda prepararla).
    if (!hayObligatorio && !lineas.some((l) => Array.isArray(l?.opciones) && l.opciones.length > 0)) return vacio;

    const combos = fusionar(
        lineas
            .map((l) => ({
                elegidas: resolverLinea(
                    {
                        cantidad: cantidadEntera(l?.cantidad, 1),
                        indicaciones: String(l?.indicaciones ?? ''),
                        opciones: normalizarOpcionesInput(l?.opciones),
                    },
                    gs,
                ),
                cantidad: cantidadEntera(l?.cantidad, 1),
                indicaciones: String(l?.indicaciones ?? '').trim(),
            }))
            .filter((c) => c.elegidas.length > 0),
    );
    if (combos.length === 0) return vacio;

    const cuadrados = cuadrar(combos, cantidadEntera(item?.cantidad, 1), hayObligatorio);
    const subitems_view = cuadrados.map(construirElemento);
    const sobreprecio_total = Math.round(subitems_view.reduce((a, e) => a + e.precio, 0) * 100) / 100;
    return { subitems_view, sobreprecio_total };
}
