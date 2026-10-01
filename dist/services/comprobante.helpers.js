"use strict";
// Mapea la estructura guardada de un pedido confirmado (pedido_preview.estructura)
// al formato que espera la emisión de CPE en backend-pedidos
// (/bot/generar-comprobante → /v3/service/facturacion-e).
//
// Regla clave: los subtotales "extra" (costo delivery, set descartables, etc.)
// se convierten en ITEMS del comprobante — si no, la suma de items no cuadra
// con el total y SUNAT/apifac rechaza el documento.
//
// Regla clave 2: el importe de cada línea es `precio_print`, NO `precio_total`.
// Las reglas de carta (combos, plato de cortesía) rebajan el precio en
// `precio_print`/`precio_total_calc` y dejan `precio_total` con el precio de
// lista. El "Sub Total" del ticket se calcula con precio_print, así que leer
// precio_total inflaba la suma y el cuadre de backend-pedidos rebotaba con
// "el detalle del pedido no cuadra con el total" (caso real 12-08: entrada de
// cortesía en 0.00 dentro de un pedido de S/ 29.00).
exports.__esModule = true;
exports.validarDocumento = exports.mapearEstructuraAComprobante = void 0;
var esFilaEstandar = function (descripcion) {
    var d = String(descripcion || '').trim();
    return /^sub\s*\.?\s*total/i.test(d)
        || /^i\.?\s*g\.?\s*v/i.test(d)
        || /^total$/i.test(d.replace(/[.\s]+$/g, ''));
};
var mapearEstructuraAComprobante = function (estructura) {
    var _a, _b, _c;
    var secciones = ((_c = (_b = (_a = estructura === null || estructura === void 0 ? void 0 : estructura.p_body) === null || _a === void 0 ? void 0 : _a.tipoconsumo) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.secciones) || [];
    var items = [];
    for (var _i = 0, secciones_1 = secciones; _i < secciones_1.length; _i++) {
        var seccion = secciones_1[_i];
        for (var _d = 0, _e = (seccion === null || seccion === void 0 ? void 0 : seccion.items) || []; _d < _e.length; _d++) {
            var it = _e[_d];
            var cantidad = Number(it === null || it === void 0 ? void 0 : it.cantidad_seleccionada) || 0;
            // Orden de preferencia = el mismo que usa el ticket y el Sub Total.
            var cobrado = [it === null || it === void 0 ? void 0 : it.precio_print, it === null || it === void 0 ? void 0 : it.precio_total_calc, it === null || it === void 0 ? void 0 : it.precio_total]
                .map(Number).find(function (n) { return Number.isFinite(n); });
            var precioTotal = Number(cobrado) || 0;
            if (cantidad <= 0 || precioTotal <= 0)
                continue;
            // Unitario de lista solo si cuadra con lo cobrado (evita perder
            // centavos al dividir); si la regla rebajó la línea, se deriva.
            var deLista = Number(it === null || it === void 0 ? void 0 : it.precio_unitario) || Number(it === null || it === void 0 ? void 0 : it.precio) || 0;
            var punitario = Math.abs(deLista * cantidad - precioTotal) < 0.01
                ? deLista
                : precioTotal / cantidad;
            items.push({
                id: Number(it === null || it === void 0 ? void 0 : it.iditem) || 0,
                des: String((it === null || it === void 0 ? void 0 : it.des) || (it === null || it === void 0 ? void 0 : it.descripcion) || 'CONSUMO'),
                cantidad: cantidad,
                punitario: Number(punitario.toFixed(2)),
                precio_total: Number(precioTotal.toFixed(2))
            });
        }
    }
    var subtotales = ((estructura === null || estructura === void 0 ? void 0 : estructura.p_subtotales) || []).map(function (s) {
        var _a;
        return ({
            descripcion: String((s === null || s === void 0 ? void 0 : s.descripcion) || ''),
            importe: String((_a = s === null || s === void 0 ? void 0 : s.importe) !== null && _a !== void 0 ? _a : '0')
        });
    });
    // Filas extra (delivery, descartables...) → items del CPE.
    for (var _f = 0, subtotales_1 = subtotales; _f < subtotales_1.length; _f++) {
        var fila = subtotales_1[_f];
        if (esFilaEstandar(fila.descripcion))
            continue;
        var importe = Number(fila.importe) || 0;
        if (importe <= 0)
            continue;
        items.push({
            id: 0,
            des: fila.descripcion.toUpperCase(),
            cantidad: 1,
            punitario: Number(importe.toFixed(2)),
            precio_total: Number(importe.toFixed(2))
        });
    }
    return { items: [{ items: items }], subtotales: subtotales };
};
exports.mapearEstructuraAComprobante = mapearEstructuraAComprobante;
/** Valida el documento según el tipo de comprobante. */
var validarDocumento = function (tipo, numDoc) {
    var doc = String(numDoc || '').replace(/\D/g, '');
    if (tipo === 'factura') {
        return doc.length === 11 ? { ok: true } : { ok: false, error: 'para factura necesito un RUC de 11 dígitos' };
    }
    if (tipo === 'boleta') {
        return doc.length === 8 ? { ok: true } : { ok: false, error: 'para boleta necesito un DNI de 8 dígitos' };
    }
    return { ok: false, error: 'tipo de comprobante inválido (boleta o factura)' };
};
exports.validarDocumento = validarDocumento;
