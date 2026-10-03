"use strict";
exports.__esModule = true;
exports.variantesTelefono = exports.normalizarTelefono = void 0;
// Forma canónica de un teléfono para guardar y buscar referencias de cliente.
// El panel recibe "51906828331" de WhatsApp pero el operador teclea "906828331":
// sin normalizar, la nota se guardaba en un formato y se buscaba en el otro.
var normalizarTelefono = function (raw) {
    var d = String(raw !== null && raw !== void 0 ? raw : '').replace(/\D/g, '');
    return d.length === 9 && d.startsWith('9') ? "51".concat(d) : d;
};
exports.normalizarTelefono = normalizarTelefono;
// Formas bajo las que puede estar guardado un número (incluye la legacy de 9
// dígitos, de antes de normalizar). Otros largos (extranjeros, LID) van tal cual.
var variantesTelefono = function (raw) {
    var n = (0, exports.normalizarTelefono)(raw);
    return n.length === 11 && n.startsWith('51') ? [n, n.slice(2)] : [n];
};
exports.variantesTelefono = variantesTelefono;
