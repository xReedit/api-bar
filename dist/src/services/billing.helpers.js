"use strict";
// Lógica pura del cobro de recargas del chatbot (sin IO): validación de
// entradas y parseo de la respuesta de autorización de Niubiz. Separada del
// router para poder testearla sin Express ni red.
exports.__esModule = true;
exports.buildRecargaPayload = exports.parseAuthorizationResponse = exports.validarConfirmar = exports.validarIniciar = void 0;
/** Entrada validada de POST /chat-bot/billing/pago/iniciar. */
var validarIniciar = function (body) {
    var b = body;
    var idsede = Number(b === null || b === void 0 ? void 0 : b.idsede);
    var idPack = Number(b === null || b === void 0 ? void 0 : b.id_pack);
    if (!Number.isInteger(idsede) || idsede <= 0) {
        return null;
    }
    if (!Number.isInteger(idPack) || idPack <= 0) {
        return null;
    }
    return { idsede: idsede, idPack: idPack };
};
exports.validarIniciar = validarIniciar;
/** Entrada validada de POST /chat-bot/billing/pago/confirmar. */
var validarConfirmar = function (body) {
    var b = body;
    var purchaseNumber = Number(b === null || b === void 0 ? void 0 : b.purchaseNumber);
    var transactionToken = typeof (b === null || b === void 0 ? void 0 : b.transactionToken) === 'string' ? b.transactionToken.trim() : '';
    if (!Number.isInteger(purchaseNumber) || purchaseNumber <= 0) {
        return null;
    }
    if (!transactionToken) {
        return null;
    }
    return { purchaseNumber: purchaseNumber, transactionToken: transactionToken };
};
exports.validarConfirmar = validarConfirmar;
/**
 * Normaliza la respuesta de POST api.authorization/v3. Niubiz devuelve los
 * campos en `dataMap` (200) o en `data` (400 con rechazo). Aprobado =
 * ACTION_CODE '000'. Tolerante: cualquier forma inesperada = no aprobado
 * y `reconocido=false` (no hubo ACTION_CODE, no es un veredicto real).
 */
var parseAuthorizationResponse = function (data) {
    var _a, _b, _c, _d;
    var d = data;
    var map = (d && typeof d === 'object' && (d.dataMap || d.data)) || {};
    var actionCode = String((_a = map.ACTION_CODE) !== null && _a !== void 0 ? _a : '');
    return {
        ok: actionCode === '000',
        reconocido: actionCode !== '',
        actionCode: actionCode,
        transactionId: String((_b = map.TRANSACTION_ID) !== null && _b !== void 0 ? _b : ''),
        descripcion: String((_d = (_c = map.ACTION_DESCRIPTION) !== null && _c !== void 0 ? _c : d === null || d === void 0 ? void 0 : d.errorMessage) !== null && _d !== void 0 ? _d : '')
    };
};
exports.parseAuthorizationResponse = parseAuthorizationResponse;
/** Payload de acreditación para POST /billing/recarga del chatbot-go. */
var buildRecargaPayload = function (pago) { return ({
    tx_id: "niubiz-".concat(pago.niubizTx),
    idsede: String(pago.idsede),
    cantidad: pago.conversaciones,
    monto: pago.monto
}); };
exports.buildRecargaPayload = buildRecargaPayload;
