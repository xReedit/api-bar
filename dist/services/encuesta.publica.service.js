"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.guardarRespuesta = exports.validarVenta = exports.buscarPreguntas = exports.buscarPublicacion = exports.horaLima = exports.calcularMetricas = exports.validarRespuestas = exports.normalizarPreguntas = exports.TOPE_DIARIO_QR = exports.VENTA_DIAS = exports.TOKEN_RE = exports.ErrorEncuesta = void 0;
// Encuesta publica: resolver el link, validar la respuesta del cliente y guardarla.
// Tablas del POS legacy (migraciones 031/032): enc_canal_sede, enc_publicacion, enc_encuesta,
// enc_pregunta, enc_respuesta, enc_respuesta_detalle. Solo $queryRaw parametrizado: estas tablas no
// estan en schema.prisma y no hace falta `prisma db pull`.
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
/** Errores de negocio con codigo estable: la app muestra una pantalla por codigo. */
var ErrorEncuesta = /** @class */ (function (_super) {
    __extends(ErrorEncuesta, _super);
    function ErrorEncuesta(status, codigo, mensaje) {
        var _this = _super.call(this, mensaje) || this;
        _this.status = status;
        _this.codigo = codigo;
        // tsconfig no fija "target" (compila a ES5): sin esto `instanceof ErrorEncuesta` da false en ts-node/dist
        Object.setPrototypeOf(_this, ErrorEncuesta.prototype);
        return _this;
    }
    return ErrorEncuesta;
}(Error));
exports.ErrorEncuesta = ErrorEncuesta;
exports.TOKEN_RE = /^[a-f0-9]{24}$/;
exports.VENTA_DIAS = 15;
// QR fijo: respuestas por IP al dia en una misma publicacion. Generoso: en el local muchos celulares salen por el
// mismo wifi. No aplica a la tablet (una sola IP por diseno) ni a comprobante/WhatsApp (ya limitados por venta).
exports.TOPE_DIARIO_QR = 30;
var RANGO = { csat: [1, 5], nps: [0, 10], ces: [1, 7] };
var TEXTO_MAX = 500;
// ---------- logica pura ----------
var opcionesDe = function (valor) {
    // MySQL JSON llega ya parseado o como string segun el driver
    var v = typeof valor === 'string' ? (function () { try {
        return JSON.parse(valor);
    }
    catch (_a) {
        return [];
    } })() : valor;
    return Array.isArray(v) ? v.filter(function (o) { return typeof o === 'string'; }) : [];
};
var normalizarPreguntas = function (filas) {
    return filas.map(function (f) { return ({
        id: Number(f.id),
        orden: Number(f.orden),
        tipo: f.tipo,
        texto: String(f.texto),
        obligatorio: Number(f.obligatorio) === 1,
        opciones: f.tipo === 'opcion' ? opcionesDe(f.opciones) : []
    }); });
};
exports.normalizarPreguntas = normalizarPreguntas;
/**
 * Valida lo que envio el cliente contra las preguntas de la version que vio. Lanza ErrorEncuesta(422)
 * con un mensaje apto para mostrar. Un comentario vacio cuenta como "no respondido".
 */
var validarRespuestas = function (preguntas, entrada) {
    var invalido = function (m) { return new ErrorEncuesta(422, 'DATOS_INVALIDOS', m); };
    if (!Array.isArray(entrada) || entrada.length > preguntas.length)
        throw invalido('Respuestas con formato invalido.');
    var porId = new Map(preguntas.map(function (p) { return [p.id, p]; }));
    var vistas = new Set();
    var validas = [];
    for (var _i = 0, entrada_1 = entrada; _i < entrada_1.length; _i++) {
        var r = entrada_1[_i];
        if (!r || typeof r !== 'object')
            throw invalido('Respuestas con formato invalido.');
        var id = r.id;
        var valor = r.valor;
        var p = Number.isSafeInteger(id) ? porId.get(id) : undefined;
        if (!p)
            throw invalido('Una respuesta no corresponde a esta encuesta.');
        if (vistas.has(id))
            throw invalido('Hay respuestas repetidas.');
        vistas.add(id);
        if (p.tipo === 'csat' || p.tipo === 'nps' || p.tipo === 'ces') {
            var _a = RANGO[p.tipo], min = _a[0], max = _a[1];
            if (!Number.isInteger(valor) || valor < min || valor > max)
                throw invalido("Valor fuera de rango en \"".concat(p.texto, "\"."));
            validas.push({ pregunta: p, valor_num: valor, valor_texto: null });
        }
        else if (p.tipo === 'opcion') {
            if (typeof valor !== 'string' || !p.opciones.includes(valor))
                throw invalido("Opcion no valida en \"".concat(p.texto, "\"."));
            validas.push({ pregunta: p, valor_num: null, valor_texto: valor });
        }
        else {
            if (typeof valor !== 'string')
                throw invalido("Comentario invalido en \"".concat(p.texto, "\"."));
            var texto = valor.trim();
            if (texto.length > TEXTO_MAX)
                throw invalido("El comentario supera los ".concat(TEXTO_MAX, " caracteres."));
            if (texto)
                validas.push({ pregunta: p, valor_num: null, valor_texto: texto });
        }
    }
    var faltante = preguntas.find(function (p) { return p.obligatorio && !validas.some(function (v) { return v.pregunta.id === p.id; }); });
    if (faltante)
        throw invalido("Falta responder \"".concat(faltante.texto, "\"."));
    if (!validas.length)
        throw invalido('Responde al menos una pregunta.');
    return validas;
};
exports.validarRespuestas = validarRespuestas;
/** Metricas precalculadas de UNA respuesta (los reportes del POS leen estas columnas sin JOIN). */
var calcularMetricas = function (validas) {
    var _a, _b;
    var nums = function (t) { return validas.filter(function (v) { return v.pregunta.tipo === t; }).map(function (v) { return v.valor_num; }); };
    var csat = nums('csat');
    var nps = (_a = nums('nps')[0]) !== null && _a !== void 0 ? _a : null;
    return {
        csat_prom: csat.length ? Math.round((csat.reduce(function (a, b) { return a + b; }, 0) / csat.length) * 100) / 100 : null,
        nps_valor: nps,
        nps_cat: nps === null ? null : nps <= 6 ? 'detractor' : nps <= 8 ? 'pasivo' : 'promotor',
        ces_valor: (_b = nums('ces')[0]) !== null && _b !== void 0 ? _b : null,
        tiene_comentario: validas.some(function (v) { return v.pregunta.tipo === 'texto' && v.valor_texto; }) ? 1 : 0
    };
};
exports.calcularMetricas = calcularMetricas;
/** Fecha y fecha-hora en America/Lima, como las guarda el POS. */
var horaLima = function (d) {
    if (d === void 0) { d = new Date(); }
    var partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(d).map(function (p) { return [p.type, p.value]; }));
    var fecha = "".concat(partes.year, "-").concat(partes.month, "-").concat(partes.day);
    return { fecha: fecha, fechaHora: "".concat(fecha, " ").concat(partes.hour, ":").concat(partes.minute, ":").concat(partes.second) };
};
exports.horaLima = horaLima;
// ---------- datos ----------
/** Publicacion activa del link. 404 si el token no existe; 410 si el canal ya no tiene encuesta. */
var buscarPublicacion = function (token) { return __awaiter(void 0, void 0, void 0, function () {
    var filas, f;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT cs.idsede, cs.canal, s.nombre AS local,\n               p.idenc_publicacion, p.idorg, e.idenc_encuesta, e.texto_inicio, e.texto_fin\n        FROM enc_canal_sede cs\n        JOIN sede s ON s.idsede = cs.idsede\n        LEFT JOIN enc_publicacion p ON p.idsede = cs.idsede AND p.canal = cs.canal AND p.activa = 1\n        LEFT JOIN enc_encuesta e ON e.idenc_encuesta = p.idenc_encuesta AND e.estado <> 'archivada'\n        WHERE cs.token = ", "\n        LIMIT 1"], ["\n        SELECT cs.idsede, cs.canal, s.nombre AS local,\n               p.idenc_publicacion, p.idorg, e.idenc_encuesta, e.texto_inicio, e.texto_fin\n        FROM enc_canal_sede cs\n        JOIN sede s ON s.idsede = cs.idsede\n        LEFT JOIN enc_publicacion p ON p.idsede = cs.idsede AND p.canal = cs.canal AND p.activa = 1\n        LEFT JOIN enc_encuesta e ON e.idenc_encuesta = p.idenc_encuesta AND e.estado <> 'archivada'\n        WHERE cs.token = ", "\n        LIMIT 1"])), token)];
            case 1:
                filas = _c.sent();
                f = filas[0];
                if (!f)
                    throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
                if (!f.idenc_publicacion || !f.idenc_encuesta) {
                    throw new ErrorEncuesta(410, 'SIN_ENCUESTA', 'Esta encuesta ya no esta disponible.');
                }
                return [2 /*return*/, {
                        idenc_publicacion: Number(f.idenc_publicacion),
                        idenc_encuesta: Number(f.idenc_encuesta),
                        idorg: Number(f.idorg),
                        idsede: Number(f.idsede),
                        canal: f.canal,
                        local: String(f.local),
                        texto_inicio: (_a = f.texto_inicio) !== null && _a !== void 0 ? _a : null,
                        texto_fin: (_b = f.texto_fin) !== null && _b !== void 0 ? _b : null
                    }];
        }
    });
}); };
exports.buscarPublicacion = buscarPublicacion;
var buscarPreguntas = function (idencuesta) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = exports.normalizarPreguntas;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT idenc_pregunta AS id, orden, tipo, texto, obligatorio, opciones\n        FROM enc_pregunta WHERE idenc_encuesta = ", " ORDER BY orden"], ["\n        SELECT idenc_pregunta AS id, orden, tipo, texto, obligatorio, opciones\n        FROM enc_pregunta WHERE idenc_encuesta = ", " ORDER BY orden"])), idencuesta)];
            case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
        }
    });
}); };
exports.buscarPreguntas = buscarPreguntas;
/**
 * Venta del link de comprobante: debe ser de la misma sede, de hace menos de VENTA_DIAS y sin responder.
 * La firma ya se valido antes; aqui solo reglas de negocio.
 */
var validarVenta = function (idpago, idsede, ahora) {
    if (ahora === void 0) { ahora = new Date(); }
    return __awaiter(void 0, void 0, void 0, function () {
        var filas, f, fecha;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        SELECT rp.idregistro_pago, rp.idsede, rp.fecha_hora,\n               p.idpedido, p.idusuario, p.nummesa, p.total,\n               (SELECT COUNT(*) FROM enc_respuesta r WHERE r.idregistro_pago = rp.idregistro_pago) AS respondidas\n        FROM registro_pago rp\n        LEFT JOIN pedido p ON p.idpedido = (SELECT MIN(p2.idpedido) FROM pedido p2 WHERE p2.idregistro_pago = rp.idregistro_pago)\n        WHERE rp.idregistro_pago = ", "\n        LIMIT 1"], ["\n        SELECT rp.idregistro_pago, rp.idsede, rp.fecha_hora,\n               p.idpedido, p.idusuario, p.nummesa, p.total,\n               (SELECT COUNT(*) FROM enc_respuesta r WHERE r.idregistro_pago = rp.idregistro_pago) AS respondidas\n        FROM registro_pago rp\n        LEFT JOIN pedido p ON p.idpedido = (SELECT MIN(p2.idpedido) FROM pedido p2 WHERE p2.idregistro_pago = rp.idregistro_pago)\n        WHERE rp.idregistro_pago = ", "\n        LIMIT 1"])), idpago)];
                case 1:
                    filas = _a.sent();
                    f = filas[0];
                    // venta inexistente o de otra sede: mismo mensaje que un link falso, sin dar pistas
                    if (!f || Number(f.idsede) !== idsede)
                        throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
                    fecha = new Date(f.fecha_hora);
                    if (isNaN(fecha.getTime()) || ahora.getTime() - fecha.getTime() > exports.VENTA_DIAS * 86400000) {
                        throw new ErrorEncuesta(410, 'LINK_VENCIDO', 'Este enlace ya vencio.');
                    }
                    if (Number(f.respondidas) > 0)
                        throw new ErrorEncuesta(409, 'YA_RESPONDIDA', 'Ya respondiste esta encuesta. ¡Gracias!');
                    return [2 /*return*/, {
                            idregistro_pago: Number(f.idregistro_pago),
                            idsede: Number(f.idsede),
                            fecha_hora: fecha,
                            idpedido: f.idpedido === null ? null : Number(f.idpedido),
                            idusuario: f.idusuario === null ? null : Number(f.idusuario),
                            nummesa: f.nummesa === null ? null : String(f.nummesa).trim(),
                            total: f.total === null ? null : String(f.total)
                        }];
            }
        });
    });
};
exports.validarVenta = validarVenta;
/**
 * Guarda la respuesta en una transaccion. Antes vuelve a leer, con bloqueo compartido, que la publicacion siga
 * activa y sirviendo la misma version que vio el cliente (si el admin versiono en el medio: 409).
 */
var guardarRespuesta = function (datos) { return __awaiter(void 0, void 0, void 0, function () {
    var pub, validas, venta, ip, m, _a, fecha, fechaHora, total, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                pub = datos.pub, validas = datos.validas, venta = datos.venta, ip = datos.ip;
                m = (0, exports.calcularMetricas)(validas);
                _a = (0, exports.horaLima)(), fecha = _a.fecha, fechaHora = _a.fechaHora;
                total = (venta === null || venta === void 0 ? void 0 : venta.total) !== null && (venta === null || venta === void 0 ? void 0 : venta.total) !== undefined && !isNaN(Number(venta.total)) ? Number(venta.total) : null;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var vigente, hoy, id, idrespuesta, _i, validas_1, v;
                        var _a, _b, _c, _d, _e, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0: return [4 /*yield*/, tx.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n                SELECT idenc_encuesta FROM enc_publicacion\n                WHERE idenc_publicacion = ", " AND activa = 1 LOCK IN SHARE MODE"], ["\n                SELECT idenc_encuesta FROM enc_publicacion\n                WHERE idenc_publicacion = ", " AND activa = 1 LOCK IN SHARE MODE"])), pub.idenc_publicacion)];
                                case 1:
                                    vigente = _g.sent();
                                    if (!vigente[0] || Number(vigente[0].idenc_encuesta) !== pub.idenc_encuesta) {
                                        throw new ErrorEncuesta(409, 'ENCUESTA_CAMBIO', 'La encuesta se actualizo. Vuelve a empezar.');
                                    }
                                    if (!(pub.canal === 'qr_local' && ip)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, tx.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n                    SELECT COUNT(*) AS respuestas_hoy FROM enc_respuesta\n                    WHERE ip = ", " AND idenc_publicacion = ", " AND respondido_en >= ", ""], ["\n                    SELECT COUNT(*) AS respuestas_hoy FROM enc_respuesta\n                    WHERE ip = ", " AND idenc_publicacion = ", " AND respondido_en >= ", ""])), ip, pub.idenc_publicacion, fecha + ' 00:00:00')];
                                case 2:
                                    hoy = _g.sent();
                                    if (Number((_b = (_a = hoy[0]) === null || _a === void 0 ? void 0 : _a.respuestas_hoy) !== null && _b !== void 0 ? _b : 0) >= exports.TOPE_DIARIO_QR) {
                                        throw new ErrorEncuesta(429, 'DEMASIADAS_SOLICITUDES', 'Ya recibimos muchas respuestas desde esta conexion hoy. ¡Gracias!');
                                    }
                                    _g.label = 3;
                                case 3: return [4 /*yield*/, tx.$executeRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n                INSERT INTO enc_respuesta (idenc_publicacion, idenc_encuesta, idorg, idsede, canal, respondido_en, fecha_local,\n                    idregistro_pago, idpedido, idusuario_atendio, nummesa, total_pedido,\n                    csat_prom, nps_valor, nps_cat, ces_valor, tiene_comentario, ip)\n                VALUES (", ", ", ", ", ", ", ", ", ", ", ", ", ",\n                    ", ", ", ", ", ",\n                    ", ", ", ",\n                    ", ", ", ", ", ", ", ", ", ", ", ")"], ["\n                INSERT INTO enc_respuesta (idenc_publicacion, idenc_encuesta, idorg, idsede, canal, respondido_en, fecha_local,\n                    idregistro_pago, idpedido, idusuario_atendio, nummesa, total_pedido,\n                    csat_prom, nps_valor, nps_cat, ces_valor, tiene_comentario, ip)\n                VALUES (", ", ", ", ", ", ", ", ", ", ", ", ", ",\n                    ", ", ", ", ", ",\n                    ", ", ", ",\n                    ", ", ", ", ", ", ", ", ", ", ", ")"])), pub.idenc_publicacion, pub.idenc_encuesta, pub.idorg, pub.idsede, pub.canal, fechaHora, fecha, (_c = venta === null || venta === void 0 ? void 0 : venta.idregistro_pago) !== null && _c !== void 0 ? _c : null, (_d = venta === null || venta === void 0 ? void 0 : venta.idpedido) !== null && _d !== void 0 ? _d : null, (_e = venta === null || venta === void 0 ? void 0 : venta.idusuario) !== null && _e !== void 0 ? _e : null, (_f = venta === null || venta === void 0 ? void 0 : venta.nummesa) !== null && _f !== void 0 ? _f : null, total, m.csat_prom, m.nps_valor, m.nps_cat, m.ces_valor, m.tiene_comentario, ip)];
                                case 4:
                                    _g.sent();
                                    return [4 /*yield*/, tx.$queryRaw(templateObject_7 || (templateObject_7 = __makeTemplateObject(["SELECT LAST_INSERT_ID() AS id"], ["SELECT LAST_INSERT_ID() AS id"])))];
                                case 5:
                                    id = _g.sent();
                                    idrespuesta = id[0].id;
                                    _i = 0, validas_1 = validas;
                                    _g.label = 6;
                                case 6:
                                    if (!(_i < validas_1.length)) return [3 /*break*/, 9];
                                    v = validas_1[_i];
                                    return [4 /*yield*/, tx.$executeRaw(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n                    INSERT INTO enc_respuesta_detalle (idenc_respuesta, idenc_pregunta, pregunta_texto, tipo, orden, valor_num, valor_texto)\n                    VALUES (", ", ", ", ", ", ", ", ", ",\n                        ", ", ", ")"], ["\n                    INSERT INTO enc_respuesta_detalle (idenc_respuesta, idenc_pregunta, pregunta_texto, tipo, orden, valor_num, valor_texto)\n                    VALUES (", ", ", ", ", ", ", ", ", ",\n                        ", ", ", ")"])), idrespuesta, v.pregunta.id, v.pregunta.texto, v.pregunta.tipo, v.pregunta.orden, v.valor_num, v.valor_texto)];
                                case 7:
                                    _g.sent();
                                    _g.label = 8;
                                case 8:
                                    _i++;
                                    return [3 /*break*/, 6];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                _b.sent();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                // dos envios simultaneos de la misma venta: el indice unico gana la carrera
                if (error_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && /ux_resp_pago|Duplicate entry/.test(error_1.message)) {
                    throw new ErrorEncuesta(409, 'YA_RESPONDIDA', 'Ya respondiste esta encuesta. ¡Gracias!');
                }
                throw error_1;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.guardarRespuesta = guardarRespuesta;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8;
