"use strict";
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
exports.__esModule = true;
exports.matchLineas = exports.normalizarTexto = void 0;
var normalizarTexto = function (s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
exports.normalizarTexto = normalizarTexto;
// Palabras vacías fuera del score: "Sopa DE pollo" y "Saltado DE pollo" comparten
// "de" y "pollo" (Dice 0.667 > umbral) y en producción el agotado le robaba la
// línea al plato vivo. La similitud debe salir de las palabras que distinguen.
var VACIAS = new Set([
    'de', 'del', 'la', 'el', 'lo', 'los', 'las', 'con', 'al', 'en',
    'un', 'una', 'por', 'para', 'su', 'sus', 'mas', 'sin'
]);
var tokens = function (s) {
    return new Set((0, exports.normalizarTexto)(s).split(' ').filter(function (t) { return t.length > 1 && !VACIAS.has(t); }));
};
// Números como secuencias de dígitos del texto original normalizado ("1/4" → 1 y 4).
// No entran al Dice (los de 1 dígito se filtran arriba); son una guardia aparte.
var numeros = function (s) { return new Set((0, exports.normalizarTexto)(s).match(/\d+/g) || []); };
var dice = function (a, b) {
    if (!a.size || !b.size)
        return 0;
    var inter = 0;
    // forEach y no for..of: el tsconfig compila sin downlevelIteration y ahí
    // recorrer un Set con for..of no compila (TS2802).
    a.forEach(function (t) {
        if (b.has(t))
            inter++;
    });
    return (2 * inter) / (a.size + b.size);
};
// Guardia numérica: todos los números del ITEM deben aparecer en la línea
// ("Pollo a la brasa 1/2" no puede tachar la línea del 1/4). Los números extra
// de la línea (precios) no molestan porque el item no los tiene.
var numerosCompatibles = function (numLinea, numItem) {
    var ok = true;
    numItem.forEach(function (n) {
        if (!numLinea.has(n))
            ok = false;
    });
    return ok;
};
var UMBRAL = 0.6;
// Dos candidatos casi empatados = ambigüedad real (platos hermanos): no se tacha
// ninguno en vez de adivinar. Con un ganador claro (1.0 vs 0.8) no interviene.
var MARGEN = 0.1;
var matchLineas = function (lineas, items) {
    // score de cada par (línea, item); asignación greedy de mayor a menor score,
    // cada item se usa una sola vez ("Ceviche" no debe robarle el match a "Ceviche de toyo")
    var itemTokens = items.map(function (it) { return (__assign(__assign({}, it), { toks: tokens(it.descripcion), nums: numeros(it.descripcion) })); });
    var pares = [];
    lineas.forEach(function (l, li) {
        var lt = tokens(l.texto);
        var ln = numeros(l.texto);
        itemTokens.forEach(function (it, ii) {
            if (!numerosCompatibles(ln, it.nums))
                return;
            var s = dice(lt, it.toks);
            if (s >= UMBRAL)
                pares.push({ li: li, item: ii, score: s });
        });
    });
    // Ambigüedad por línea y por item: si los dos mejores candidatos de un lado
    // quedan a menos de MARGEN, ese lado se excluye entero (falla-seguro).
    var mejores = function (clave) {
        var top = new Map();
        for (var _i = 0, pares_1 = pares; _i < pares_1.length; _i++) {
            var p = pares_1[_i];
            var arr = top.get(p[clave]) || [];
            arr.push(p.score);
            top.set(p[clave], arr);
        }
        var ambiguos = new Set();
        top.forEach(function (scores, k) {
            scores.sort(function (a, b) { return b - a; });
            if (scores.length > 1 && scores[0] - scores[1] < MARGEN)
                ambiguos.add(k);
        });
        return ambiguos;
    };
    var lineasAmbiguas = mejores('li');
    var itemsAmbiguos = mejores('item');
    var paresLimpios = pares.filter(function (p) { return !lineasAmbiguas.has(p.li) && !itemsAmbiguos.has(p.item); });
    paresLimpios.sort(function (a, b) { return b.score - a.score; });
    var asignadoLinea = new Map();
    var usadoItem = new Set();
    for (var _i = 0, paresLimpios_1 = paresLimpios; _i < paresLimpios_1.length; _i++) {
        var p = paresLimpios_1[_i];
        if (asignadoLinea.has(p.li) || usadoItem.has(p.item))
            continue;
        asignadoLinea.set(p.li, p.item);
        usadoItem.add(p.item);
    }
    return lineas.map(function (l, li) { return (__assign(__assign({}, l), { iditem: asignadoLinea.has(li) ? itemTokens[asignadoLinea.get(li)].iditem : null })); });
};
exports.matchLineas = matchLineas;
