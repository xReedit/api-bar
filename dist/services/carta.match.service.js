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
var tokens = function (s) { return new Set((0, exports.normalizarTexto)(s).split(' ').filter(function (t) { return t.length > 1; })); };
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
var UMBRAL = 0.6;
var matchLineas = function (lineas, items) {
    // score de cada par (línea, item); asignación greedy de mayor a menor score,
    // cada item se usa una sola vez ("Ceviche" no debe robarle el match a "Ceviche de toyo")
    var itemTokens = items.map(function (it) { return (__assign(__assign({}, it), { toks: tokens(it.descripcion) })); });
    var pares = [];
    lineas.forEach(function (l, li) {
        var lt = tokens(l.texto);
        itemTokens.forEach(function (it, ii) {
            var s = dice(lt, it.toks);
            if (s >= UMBRAL)
                pares.push({ li: li, item: ii, score: s });
        });
    });
    pares.sort(function (a, b) { return b.score - a.score; });
    var asignadoLinea = new Map();
    var usadoItem = new Set();
    for (var _i = 0, pares_1 = pares; _i < pares_1.length; _i++) {
        var p = pares_1[_i];
        if (asignadoLinea.has(p.li) || usadoItem.has(p.item))
            continue;
        asignadoLinea.set(p.li, p.item);
        usadoItem.add(p.item);
    }
    return lineas.map(function (l, li) { return (__assign(__assign({}, l), { iditem: asignadoLinea.has(li) ? itemTokens[asignadoLinea.get(li)].iditem : null })); });
};
exports.matchLineas = matchLineas;
