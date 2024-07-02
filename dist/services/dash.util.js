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
exports.normalizeResponse = void 0;
// normalizar respuesta procedures
var normalizeResponse = function (rptExec) {
    return rptExec.map(function (item) {
        return __assign(__assign({}, item), { num_semana: Number(item.num_semana) || 0, semana_actual: Number(item.semana_actual) || 0, num_dia: Number(item.num_dia) || 0, hoy: Number(item.hoy) || 0, num_mes: Number(item.num_mes) || 0, num_year: Number(item.num_year) || 0, recupera_stock: item.recupera_stock ? Number(item.recupera_stock) : 0 });
    });
};
exports.normalizeResponse = normalizeResponse;
