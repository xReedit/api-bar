"use strict";
exports.__esModule = true;
exports.leerNonce = exports.crearNonce = exports.leerVenta = exports.parametroVenta = exports.firmaVenta = exports.secretoEncuesta = exports.NONCE_MAX_MS = exports.NONCE_MIN_MS = void 0;
// Firmas de la encuesta publica (encuesta.papaya.com.pe). Sin estado: todo se valida con HMAC.
//
//  - Venta: el link del comprobante / WhatsApp lleva ?v=<idregistro_pago>.<firma>. Sin el secreto no se
//    puede inventar una venta ajena. El POS legacy genera la MISMA firma al imprimir:
//      PHP: substr(hash_hmac('sha256', "venta.$token.$idregistro_pago", ENCUESTA_SECRET), 0, 16)
//  - Nonce: lo entrega el GET y lo exige el POST. Prueba que se abrio la encuesta (no se postea directo),
//    impone un tiempo minimo de llenado y ata la respuesta a la version que vio el cliente.
//
// Cada uso firma con un prefijo distinto ("venta." / "nonce.") para que una firma no sirva por la otra.
var crypto_1 = require("crypto");
exports.NONCE_MIN_MS = 3000;
exports.NONCE_MAX_MS = 45 * 60000;
/** El secreto, o null si falta o es debil: sin secreto el modulo no atiende (nunca queda abierto). */
var secretoEncuesta = function () {
    var _a;
    var s = (_a = process.env.ENCUESTA_SECRET) !== null && _a !== void 0 ? _a : '';
    return s.length >= 32 ? s : null;
};
exports.secretoEncuesta = secretoEncuesta;
var hmac = function (secreto, datos, largo) {
    return (0, crypto_1.createHmac)('sha256', secreto).update(datos).digest('hex').slice(0, largo);
};
var iguales = function (a, b) {
    var x = Buffer.from(a);
    var y = Buffer.from(b);
    return x.length === y.length && (0, crypto_1.timingSafeEqual)(x, y);
};
// ---------- venta ----------
var firmaVenta = function (secreto, token, idpago) {
    return hmac(secreto, "venta.".concat(token, ".").concat(idpago), 16);
};
exports.firmaVenta = firmaVenta;
/** Valor del parametro v para un link de comprobante. */
var parametroVenta = function (secreto, token, idpago) {
    return "".concat(idpago, ".").concat((0, exports.firmaVenta)(secreto, token, idpago));
};
exports.parametroVenta = parametroVenta;
/** idregistro_pago si ?v= es valido para ese token; null si falta, esta mal formado o la firma no calza. */
var leerVenta = function (secreto, token, v) {
    if (typeof v !== 'string')
        return null;
    var m = /^(\d{1,10})\.([a-f0-9]{16})$/.exec(v);
    if (!m)
        return null;
    var idpago = Number(m[1]);
    if (!Number.isSafeInteger(idpago) || idpago <= 0)
        return null;
    return iguales(m[2], (0, exports.firmaVenta)(secreto, token, idpago)) ? idpago : null;
};
exports.leerVenta = leerVenta;
var b64url = function (s) { return Buffer.from(s, 'utf8').toString('base64url'); };
var crearNonce = function (secreto, n) {
    var cuerpo = b64url(JSON.stringify({ p: n.p, e: n.e, v: n.v, t: n.t }));
    return "".concat(cuerpo, ".").concat(hmac(secreto, "nonce.".concat(cuerpo), 32));
};
exports.crearNonce = crearNonce;
var leerNonce = function (secreto, valor, ahora) {
    if (ahora === void 0) { ahora = Date.now(); }
    if (typeof valor !== 'string' || valor.length > 300)
        return { ok: false, motivo: 'invalido' };
    var partes = valor.split('.');
    if (partes.length !== 2 || !/^[a-f0-9]{32}$/.test(partes[1]))
        return { ok: false, motivo: 'invalido' };
    if (!iguales(partes[1], hmac(secreto, "nonce.".concat(partes[0]), 32)))
        return { ok: false, motivo: 'invalido' };
    var n;
    try {
        n = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    }
    catch (_a) {
        return { ok: false, motivo: 'invalido' };
    }
    var entero = function (x) { return Number.isSafeInteger(x) && x >= 0; };
    if (!n || !entero(n.p) || !entero(n.e) || !entero(n.v) || !entero(n.t))
        return { ok: false, motivo: 'invalido' };
    var edad = ahora - n.t;
    if (edad < exports.NONCE_MIN_MS)
        return { ok: false, motivo: 'rapido' };
    if (edad > exports.NONCE_MAX_MS)
        return { ok: false, motivo: 'vencido' };
    return { ok: true, nonce: n };
};
exports.leerNonce = leerNonce;
