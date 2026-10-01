"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.resolverOpciones = exports.agruparItemsBot = exports.MAX_CANT_OPCION = exports.aRespuestaTool = exports.normalizarGruposSP = exports.esBasura = exports.precioExtra = exports.sanitizarDes = void 0;
var MAX_DES = 60;
/** Aplana, quita comillas/backslash y recorta. Blindaje del INSERT por CONCAT. */
function sanitizarDes(s) {
    return String(s !== null && s !== void 0 ? s : '')
        .replace(/['"\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_DES)
        .trim();
}
exports.sanitizarDes = sanitizarDes;
/**
 * Dinero simple: dígitos, punto decimal opcional, máximo 2 decimales.
 * La columna es varchar con basura real y `parseFloat` es demasiado permisivo:
 * convierte '1e3' en 1000 y '10,50' en 10.5, es decir, sobreprecio inventado
 * que el cliente termina pagando. Lo que no case con el regex vale 0.
 */
var RE_DINERO = /^\d+(?:\.\d{1,2})?$/;
/** `precio` del subitem = incremento absoluto en soles. Tolerante y nunca NaN. */
function precioExtra(p) {
    var s = String(p !== null && p !== void 0 ? p : '').trim();
    if (!RE_DINERO.test(s))
        return 0;
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n <= 0)
        return 0;
    return Math.round(n * 100) / 100;
}
exports.precioExtra = precioExtra;
var RE_VOCAL = /[aeiouáéíóúàèìòùäëïöüâêîôû]/i;
/**
 * Basura de pruebas que quedó en la carta (AAAAA, QQQQQQQQ, CVCCCC, PPAPAPAPA).
 * (a) muy corta, (b) sin vocales, (c) sin variedad real de letras: un solo
 * carácter repetido, o solo dos caracteres distintos en 6+ posiciones.
 * Un plato real ("PAPA", "AJI", "7UP", "1/8 DE POLLO") sobrevive.
 */
function esBasura(des) {
    var s = String(des !== null && des !== void 0 ? des : '').trim();
    if (s.length < 3)
        return true;
    if (!RE_VOCAL.test(s))
        return true;
    var compacto = s.replace(/\s+/g, '').toUpperCase();
    var distintos = new Set(compacto.split('')).size;
    if (distintos <= 1)
        return true;
    if (distintos <= 2 && compacto.length >= 6)
        return true;
    return false;
}
exports.esBasura = esBasura;
function numero(v, def) {
    if (def === void 0) { def = 0; }
    var n = Number(v);
    return Number.isFinite(n) ? n : def;
}
function mapOpcion(o) {
    var _a;
    var stock = String((_a = o === null || o === void 0 ? void 0 : o.cantidad) !== null && _a !== void 0 ? _a : 'ND').trim().toUpperCase();
    var nStock = Number(stock);
    // 'ND' (o vacío, o basura no numérica) = sin control de stock.
    var conStock = stock !== 'ND' && stock !== '' && Number.isFinite(nStock);
    return {
        id: numero(o === null || o === void 0 ? void 0 : o.iditem_subitem) || 0,
        des: sanitizarDes(o === null || o === void 0 ? void 0 : o.des),
        extra: precioExtra(o === null || o === void 0 ? void 0 : o.precio),
        idporcion: numero(o === null || o === void 0 ? void 0 : o.idporcion) || 0,
        idproducto: numero(o === null || o === void 0 ? void 0 : o.idproducto) || 0,
        idsubreceta: numero(o === null || o === void 0 ? void 0 : o.idsubreceta) || 0,
        // También viaja crudo al INSERT por CONCAT: una comilla aquí rompe el
        // pedido completo igual que en un `des`.
        cantidad_porcion: sanitizarDes(o === null || o === void 0 ? void 0 : o.cantidad_porcion) || 'ND',
        descuenta: numero(o === null || o === void 0 ? void 0 : o.descuenta) || 1,
        stock: conStock ? nStock : 'ND',
        agotada: conStock && nStock <= 0
    };
}
var conDes = function (o) { return (o.des ? o : __assign(__assign({}, o), { des: "OPCION ".concat(o.id) })); };
/** Parsea la columna `respuesta` del SP (string JSON | objeto | null). Nunca lanza. */
function normalizarGruposSP(respuesta) {
    var raw = respuesta;
    if (typeof raw === 'string') {
        var t = raw.trim();
        if (!t)
            return [];
        try {
            raw = JSON.parse(t);
        }
        catch (_a) {
            return [];
        }
    }
    // El driver a veces entrega la fila entera: { respuesta: '...' }.
    if (raw && !Array.isArray(raw) && typeof raw === 'object' && 'respuesta' in raw) {
        var dentro = raw.respuesta;
        return typeof dentro === 'string' || Array.isArray(dentro) ? normalizarGruposSP(dentro) : [];
    }
    if (!Array.isArray(raw))
        return [];
    var grupos = [];
    for (var _i = 0, raw_1 = raw; _i < raw_1.length; _i++) {
        var g = raw_1[_i];
        if (!g || typeof g !== 'object')
            continue;
        // Caso real: [{ respuesta: '[...]' }] -> una sola fila con el JSON dentro.
        if ('respuesta' in g && !('opciones' in g)) {
            grupos.push.apply(grupos, normalizarGruposSP(g.respuesta));
            continue;
        }
        var todas = (Array.isArray(g.opciones) ? g.opciones : [])
            .map(mapOpcion)
            .filter(function (o) { return o.id > 0; });
        var limpias = todas.filter(function (o) { return o.des !== '' && !esBasura(o.des) && !o.agotada; });
        // GUARDA: si el filtro deja el grupo en cero, mejor una opción fea que
        // un grupo obligatorio imposible de responder. Si ni así hay opciones,
        // el grupo no existe para el bot.
        var opciones = (limpias.length > 0 ? limpias : todas).map(conDes);
        if (opciones.length === 0)
            continue;
        grupos.push({
            id: numero(g.iditem_subitem_content) || 0,
            titulo: sanitizarDes(g.des) || 'OPCIONES',
            obligatorio: numero(g.subitem_required_select) === 1,
            elegir: Math.max(0, Math.floor(numero(g.subitem_cant_select))),
            con_cantidad: numero(g.show_cant_item) === 1,
            opciones: opciones
        });
    }
    return grupos;
}
exports.normalizarGruposSP = normalizarGruposSP;
/** Forma compacta que ve el LLM (se queda en el historial: hay que ahorrar tokens). */
function aRespuestaTool(grupos) {
    return (Array.isArray(grupos) ? grupos : []).map(function (g) { return ({
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
        opciones: g.opciones.map(function (o) { return (o.agotada
            ? { id: o.id, des: o.des, extra: o.extra, agotada: true }
            : { id: o.id, des: o.des, extra: o.extra }); })
    }); });
}
exports.aRespuestaTool = aRespuestaTool;
/**
 * Freno anti-modelo, NO una regla de negocio: nadie pide 50 bolas de helado en
 * una sola línea, pero el LLM puede escribirlo y ese multiplicador se va al
 * precio y al descuento de stock. Solo aplica a grupos `con_cantidad` sin
 * `elegir`; cuando el grupo declara `elegir`, manda ese tope, que es el real.
 */
exports.MAX_CANT_OPCION = 20;
var cantidadEntera = function (v, def) {
    if (def === void 0) { def = 1; }
    var n = Math.floor(numero(v, def));
    return n >= 1 ? n : def;
};
function normalizarOpcionesInput(v) {
    var _a;
    if (!Array.isArray(v))
        return [];
    var out = [];
    for (var _i = 0, v_1 = v; _i < v_1.length; _i++) {
        var o = v_1[_i];
        if (o === null || o === undefined)
            continue;
        if (typeof o === 'number' || typeof o === 'string') {
            var id_1 = numero(o) || 0;
            if (id_1 > 0)
                out.push({ id: id_1 });
            continue;
        }
        if (typeof o !== 'object')
            continue;
        var id = numero((_a = o.id) !== null && _a !== void 0 ? _a : o.iditem_subitem) || 0;
        if (id <= 0)
            continue;
        out.push({ id: id, cantidad: cantidadEntera(o.cantidad, 1) });
    }
    return out;
}
var unirIndicaciones = function (a, b) {
    var partes = __spreadArray(__spreadArray([], a.split(',').map(function (s) { return s.trim(); }), true), [b.trim()], false).filter(function (s) { return s !== ''; });
    return Array.from(new Set(partes)).join(', ');
};
/**
 * El bot puede repetir el mismo iditem (4 pollos: 2 con pecho y 2 con pierna).
 * Agrupa por iditem y guarda cada entrada original como una `linea`
 * (= una combinación de opciones). Arregla además un bug existente: hoy un
 * iditem repetido perdía cantidad en silencio.
 */
function agruparItemsBot(items) {
    var _a, _b;
    var lista = Array.isArray(items) ? items : [];
    var mapa = new Map();
    for (var _i = 0, lista_1 = lista; _i < lista_1.length; _i++) {
        var it = lista_1[_i];
        if (!it || typeof it !== 'object')
            continue;
        var iditem = numero(it.iditem) || 0;
        if (iditem <= 0)
            continue;
        var cantidad = cantidadEntera(it.cantidad, 1);
        var indicaciones = String((_a = it.indicaciones) !== null && _a !== void 0 ? _a : '').trim();
        var linea = {
            cantidad: cantidad,
            indicaciones: indicaciones,
            opciones: normalizarOpcionesInput(it.opciones)
        };
        var prev = mapa.get(iditem);
        if (!prev) {
            mapa.set(iditem, {
                iditem: iditem,
                descripcion: String((_b = it.descripcion) !== null && _b !== void 0 ? _b : ''),
                cantidad: cantidad,
                precio: numero(it.precio),
                indicaciones: indicaciones,
                lineas: [linea]
            });
            continue;
        }
        mapa.set(iditem, __assign(__assign({}, prev), { cantidad: prev.cantidad + cantidad, indicaciones: unirIndicaciones(prev.indicaciones, indicaciones), lineas: __spreadArray(__spreadArray([], prev.lineas, true), [linea], false) }));
    }
    return Array.from(mapa.values());
}
exports.agruparItemsBot = agruparItemsBot;
/** Unidades que aporta una selección: Σ cantidad, o 1 por opción distinta. */
var totalUnidades = function (es, conCantidad) {
    return conCantidad ? es.reduce(function (a, e) { return a + e.cantidad; }, 0) : es.length;
};
/**
 * Acota Σ cantidad del grupo al tope recortando desde la ÚLTIMA opción: las
 * primeras conservan lo pedido y las últimas pierden el cupo sobrante.
 */
function recortarPorTope(enOrden, tope) {
    var libre = tope;
    var out = [];
    for (var _i = 0, enOrden_1 = enOrden; _i < enOrden_1.length; _i++) {
        var e = enOrden_1[_i];
        if (libre <= 0)
            break;
        var c = Math.min(e.cantidad, libre);
        out.push(c === e.cantidad ? e : __assign(__assign({}, e), { cantidad: c }));
        libre -= c;
    }
    return out;
}
/** Resuelve las opciones de UNA línea contra los grupos reales del plato. */
function resolverLinea(linea, gs) {
    var _a;
    var porGrupo = new Map();
    var _loop_1 = function (sel) {
        // Un id que no pertenece a un grupo de ESTE plato se descarta: bloquea
        // ids alucinados por el modelo y opciones de otros platos.
        var gi = -1;
        var oi = -1;
        gs.forEach(function (g, i) {
            if (gi >= 0)
                return;
            var j = g.opciones.findIndex(function (o) { return o.id === sel.id; });
            if (j >= 0) {
                gi = i;
                oi = j;
            }
        });
        if (gi < 0)
            return "continue";
        var g = gs[gi];
        // Sin `con_cantidad` la opción vale exactamente 1 unidad.
        var cant = g.con_cantidad ? Math.min(cantidadEntera(sel.cantidad, 1), exports.MAX_CANT_OPCION) : 1;
        var mapa = (_a = porGrupo.get(gi)) !== null && _a !== void 0 ? _a : new Map();
        var prev = mapa.get(sel.id);
        mapa.set(sel.id, prev
            ? __assign(__assign({}, prev), { cantidad: g.con_cantidad ? Math.min(prev.cantidad + cant, exports.MAX_CANT_OPCION) : 1 }) : { opIdx: oi, opcion: g.opciones[oi], cantidad: cant });
        porGrupo.set(gi, mapa);
    };
    for (var _i = 0, _b = linea.opciones; _i < _b.length; _i++) {
        var sel = _b[_i];
        _loop_1(sel);
    }
    return gs.flatMap(function (g, gi) {
        var _a, _b;
        var enOrden = Array.from((_b = (_a = porGrupo.get(gi)) === null || _a === void 0 ? void 0 : _a.values()) !== null && _b !== void 0 ? _b : []).sort(function (a, b) { return a.opIdx - b.opIdx; });
        // `elegir` cuenta UNIDADES cuando el grupo lleva cantidades ("2 bolas",
        // aunque sean las dos de fresa) y OPCIONES DISTINTAS cuando no.
        var sel = g.elegir <= 0
            ? enOrden
            : g.con_cantidad
                ? recortarPorTope(enOrden, g.elegir)
                : enOrden.slice(0, g.elegir);
        if (!g.obligatorio)
            return sel;
        // Red de seguridad server-side: un grupo obligatorio SIEMPRE queda
        // resuelto (el bot pregunta una vez; si el cliente evade, se elige la
        // primera opción sin costo y se avanza).
        var necesita = g.elegir > 0 ? g.elegir : 1;
        // 2 bolas de fresa YA cubren un "elige 2": comparar contra `.length`
        // autocompletaba una tercera bola de otro sabor que nadie pidió.
        var yaCubierto = totalUnidades(sel, g.con_cantidad);
        if (yaCubierto >= necesita)
            return sel;
        var yaElegidas = new Set(sel.map(function (s) { return s.opcion.id; }));
        var libres = g.opciones.map(function (o, i) { return ({ o: o, i: i }); }).filter(function (x) { return !yaElegidas.has(x.o.id); });
        var candidatos = __spreadArray(__spreadArray([], libres.filter(function (x) { return x.o.extra <= 0; }), true), libres.filter(function (x) { return x.o.extra > 0; }), true);
        var faltan = candidatos
            .slice(0, necesita - yaCubierto)
            .map(function (c) { return ({ opIdx: c.i, opcion: c.o, cantidad: 1 }); });
        return __spreadArray(__spreadArray([], sel, true), faltan, true).sort(function (a, b) { return a.opIdx - b.opIdx; });
    });
}
var claveCombo = function (e, indicaciones) {
    return "".concat(e.map(function (x) { return "".concat(x.opcion.id, "x").concat(x.cantidad); }).join('-'), "|").concat(indicaciones);
};
/**
 * Fusiona líneas con la misma combinación (y las mismas indicaciones, que van
 * dentro del `des`): menos elementos en subitems_view, que es lo deseable.
 */
function fusionar(combos) {
    var mapa = new Map();
    for (var _i = 0, combos_1 = combos; _i < combos_1.length; _i++) {
        var c = combos_1[_i];
        var k = claveCombo(c.elegidas, c.indicaciones);
        var prev = mapa.get(k);
        mapa.set(k, prev ? __assign(__assign({}, prev), { cantidad: prev.cantidad + c.cantidad }) : c);
    }
    return Array.from(mapa.values());
}
/** Cuadra las cantidades de las combinaciones contra la cantidad del plato. */
function cuadrar(combos, totalPlato, hayObligatorio) {
    if (combos.length === 0)
        return combos;
    var suma = combos.reduce(function (a, c) { return a + c.cantidad; }, 0);
    if (suma === totalPlato)
        return combos;
    if (suma < totalPlato) {
        // Con grupos obligatorios TODAS las unidades llevan elección: la
        // diferencia se suma a la primera combinación (además evita la fila
        // "diferencia" del SP, que pierde las indicaciones). Si todos los
        // grupos son opcionales el remanente es legítimo ("4 pollos, uno con
        // extra queso").
        if (!hayObligatorio)
            return combos;
        return combos.map(function (c, i) { return (i === 0 ? __assign(__assign({}, c), { cantidad: c.cantidad + (totalPlato - suma) }) : c); });
    }
    // Sobra: recorta desde la última (si no, el procedure cobra y descuenta de más).
    var exceso = suma - totalPlato;
    var recortado = __spreadArray([], combos, true);
    for (var i = recortado.length - 1; i >= 0 && exceso > 0; i--) {
        var quita = Math.min(exceso, recortado[i].cantidad);
        recortado[i] = __assign(__assign({}, recortado[i]), { cantidad: recortado[i].cantidad - quita });
        exceso -= quita;
    }
    return recortado.filter(function (c) { return c.cantidad > 0; });
}
function construirElemento(combo) {
    var cantidad_seleccionada = cantidadEntera(combo.cantidad, 1);
    var extraUnidad = combo.elegidas.reduce(function (a, e) { return a + e.opcion.extra * cantidadEntera(e.cantidad, 1); }, 0);
    var precio = Math.round(extraUnidad * cantidad_seleccionada * 100) / 100;
    var desOpciones = combo.elegidas
        .map(function (e) { return e.opcion.des || "OPCION ".concat(e.opcion.id); })
        .join(', ');
    // El SP descarta item.indicaciones en esta rama: pegarlas al `des` es la
    // única vía para que lleguen a la comanda.
    var ind = sanitizarDes(combo.indicaciones);
    var des = sanitizarDes(ind ? "".concat(desOpciones, " | ").concat(ind) : desOpciones) || 'OPCION';
    return {
        id: combo.elegidas.map(function (e) { return String(e.opcion.id); }).join(''),
        des: des,
        precio: precio,
        cantidad_seleccionada: cantidad_seleccionada,
        indicaciones: '',
        indicaciones_item: '',
        precio_mostrar: precio.toFixed(2),
        subitems: combo.elegidas.map(function (e) {
            var _a;
            return ({
                des: e.opcion.des || "OPCION ".concat(e.opcion.id),
                precio: e.opcion.extra,
                // El SP arma el INSERT con CONCAT: un null aquí anula la sentencia
                // entera. La fila real de producción trae el STOCK de la opción
                // (no la cantidad pedida, que va en `cantidad_selected`).
                cantidad: (_a = e.opcion.stock) !== null && _a !== void 0 ? _a : 'ND',
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
                cantidad_selected: cantidadEntera(e.cantidad, 1)
            });
        })
    };
}
/**
 * Recotiza contra los grupos de BD y construye `subitems_view`.
 * Nunca confía en el modelo: el extra SIEMPRE sale del grupo, no del input.
 */
function resolverOpciones(item, grupos) {
    var vacio = { subitems_view: [], sobreprecio_total: 0 };
    var gs = (Array.isArray(grupos) ? grupos : []).filter(function (g) { return g && Array.isArray(g.opciones) && g.opciones.length > 0; });
    var lineas = Array.isArray(item === null || item === void 0 ? void 0 : item.lineas) ? item.lineas : [];
    // Carta plana: sin grupos no hay nada que resolver. Inerte, payload idéntico
    // al de hoy.
    if (gs.length === 0 || lineas.length === 0)
        return vacio;
    var hayObligatorio = gs.some(function (g) { return g.obligatorio; });
    // El bot no eligió nada. Si TODOS los grupos son opcionales ("+EXTRAS"), no
    // elegir es una respuesta válida y se sale inerte. Pero con un grupo
    // OBLIGATORIO ("+ELIGE") hay que seguir: el modelo omite `opciones` en el
    // resumen más de lo que uno querría y salir aquí dejaba inalcanzable la red
    // de seguridad de `resolverLinea` (pizza guardada sin tamaño, sin
    // sobreprecio y sin que el POS pueda prepararla).
    if (!hayObligatorio && !lineas.some(function (l) { return Array.isArray(l === null || l === void 0 ? void 0 : l.opciones) && l.opciones.length > 0; }))
        return vacio;
    var combos = fusionar(lineas
        .map(function (l) {
        var _a, _b;
        return ({
            elegidas: resolverLinea({
                cantidad: cantidadEntera(l === null || l === void 0 ? void 0 : l.cantidad, 1),
                indicaciones: String((_a = l === null || l === void 0 ? void 0 : l.indicaciones) !== null && _a !== void 0 ? _a : ''),
                opciones: normalizarOpcionesInput(l === null || l === void 0 ? void 0 : l.opciones)
            }, gs),
            cantidad: cantidadEntera(l === null || l === void 0 ? void 0 : l.cantidad, 1),
            indicaciones: String((_b = l === null || l === void 0 ? void 0 : l.indicaciones) !== null && _b !== void 0 ? _b : '').trim()
        });
    })
        .filter(function (c) { return c.elegidas.length > 0; }));
    if (combos.length === 0)
        return vacio;
    var cuadrados = cuadrar(combos, cantidadEntera(item === null || item === void 0 ? void 0 : item.cantidad, 1), hayObligatorio);
    var subitems_view = cuadrados.map(construirElemento);
    var sobreprecio_total = Math.round(subitems_view.reduce(function (a, e) { return a + e.precio; }, 0) * 100) / 100;
    return { subitems_view: subitems_view, sobreprecio_total: sobreprecio_total };
}
exports.resolverOpciones = resolverOpciones;
