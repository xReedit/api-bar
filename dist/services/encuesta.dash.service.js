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
exports.encuestas = exports.locales = exports.comentarios = exports.POR_PAGINA = exports.atender = exports.sedeDeRespuesta = exports.alertas = exports.tablero = exports.diaSemanaLunes = exports.puntaje100 = exports.rangoAnterior = exports.tasa = exports.calcularNps = exports.severidad = exports.motivosMala = exports.esMala = exports.SQL_MALA = exports.UMBRAL = exports.ErrorDash = void 0;
// Encuestas en el dashboard: resultados, alertas de malas experiencias y seguimiento.
// Contrato: plan/ENCUESTAS-DASHBOARD-PLAN.md del POS legacy. Tablas enc_* (migraciones 031-034), solo $queryRaw
// parametrizado (no estan en schema.prisma). Las metricas por respuesta ya vienen precalculadas en enc_respuesta.
var client_1 = require("@prisma/client");
var encuesta_publica_service_1 = require("./encuesta.publica.service");
var prisma = new client_1.PrismaClient();
/** Error con estado HTTP para el controller. */
var ErrorDash = /** @class */ (function (_super) {
    __extends(ErrorDash, _super);
    function ErrorDash(status, mensaje) {
        var _this = _super.call(this, mensaje) || this;
        _this.status = status;
        // tsconfig sin "target" (ES5): sin esto instanceof falla en ts-node/dist
        Object.setPrototypeOf(_this, ErrorDash.prototype);
        return _this;
    }
    return ErrorDash;
}(Error));
exports.ErrorDash = ErrorDash;
// ---------- reglas de negocio (puras) ----------
/** Mala experiencia (decision del usuario): cualquier senal mala en la respuesta. */
exports.UMBRAL = { csat: 2, nps: 6, ces: 3 };
/** Misma regla en SQL. COALESCE: un NULL (pregunta no incluida) no cuenta como malo ni rompe el NOT. */
exports.SQL_MALA = client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["(COALESCE(r.csat_prom <= 2, 0) OR COALESCE(r.nps_valor <= 6, 0) OR COALESCE(r.ces_valor <= 3, 0))"], ["(COALESCE(r.csat_prom <= 2, 0) OR COALESCE(r.nps_valor <= 6, 0) OR COALESCE(r.ces_valor <= 3, 0))"])));
var esMala = function (csat, nps, ces) {
    return (csat !== null && csat <= exports.UMBRAL.csat) || (nps !== null && nps <= exports.UMBRAL.nps) || (ces !== null && ces <= exports.UMBRAL.ces);
};
exports.esMala = esMala;
var motivosMala = function (csat, nps, ces) {
    var m = [];
    if (csat !== null && csat <= exports.UMBRAL.csat)
        m.push("Satisfacci\u00F3n baja (".concat(csat, ")"));
    if (nps !== null && nps <= exports.UMBRAL.nps)
        m.push("Detractor (NPS ".concat(nps, ")"));
    if (ces !== null && ces <= exports.UMBRAL.ces)
        m.push("Dif\u00EDcil (CES ".concat(ces, ")"));
    return m;
};
exports.motivosMala = motivosMala;
/** 0-100, mayor = peor: la peor de las tres escalas normalizada, +10 si hay mas de una senal mala. */
var severidad = function (csat, nps, ces) {
    var malos = [
        csat === null ? null : (5 - csat) / 4,
        nps === null ? null : (10 - nps) / 10,
        ces === null ? null : (7 - ces) / 6,
    ].filter(function (x) { return x !== null; });
    if (!malos.length)
        return 0;
    var extra = (0, exports.motivosMala)(csat, nps, ces).length > 1 ? 10 : 0;
    return Math.min(100, Math.round(Math.max.apply(Math, malos) * 100) + extra);
};
exports.severidad = severidad;
var calcularNps = function (promotores, detractores, total) {
    return total > 0 ? Math.round(((promotores - detractores) * 100) / total) : null;
};
exports.calcularNps = calcularNps;
var tasa = function (respuestas, ventas) {
    return ventas > 0 ? Math.round((respuestas * 1000) / ventas) / 10 : null;
};
exports.tasa = tasa;
var num = function (x) { return (x === null || x === undefined ? 0 : Number(x)); };
var numONull = function (x) { return (x === null || x === undefined ? null : Math.round(Number(x) * 100) / 100); };
/** Rango valido YYYY-MM-DD y rango anterior del mismo largo, justo antes. */
var rangoAnterior = function (r) {
    var ini = new Date(r.inicio + 'T00:00:00Z');
    var fin = new Date(r.fin + 'T00:00:00Z');
    var dias = Math.round((fin.getTime() - ini.getTime()) / 86400000) + 1;
    var finAnt = new Date(ini.getTime() - 86400000);
    var iniAnt = new Date(finAnt.getTime() - (dias - 1) * 86400000);
    var f = function (d) { return d.toISOString().slice(0, 10); };
    return { inicio: f(iniAnt), fin: f(finAnt) };
};
exports.rangoAnterior = rangoAnterior;
var ESCALA = { csat: [1, 5], nps: [0, 10], ces: [1, 7] };
var puntaje100 = function (tipo, promedio) {
    var _a = ESCALA[tipo], min = _a[0], max = _a[1];
    return Math.round(((promedio - min) / (max - min)) * 100);
};
exports.puntaje100 = puntaje100;
/** 1 = lunes ... 7 = domingo, desde DAYOFWEEK de MySQL (1 = domingo). */
var diaSemanaLunes = function (dayofweek) { return ((dayofweek + 5) % 7) + 1; };
exports.diaSemanaLunes = diaSemanaLunes;
// ---------- consultas ----------
var filtroRespuestas = function (sedes, r) {
    return client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["r.idsede IN (", ") AND r.fecha_local BETWEEN ", " AND ", ""], ["r.idsede IN (", ") AND r.fecha_local BETWEEN ", " AND ", ""])), client_1.Prisma.join(sedes), r.inicio, r.fin);
};
var kpis = function (idsede, r) { return __awaiter(void 0, void 0, void 0, function () {
    var k, ventas, respuestas, conCsat;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        SELECT COUNT(*) AS respuestas,\n               SUM(r.nps_valor IS NOT NULL) AS con_nps,\n               SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'pasivo') AS pasivos, SUM(r.nps_cat = 'detractor') AS detractores,\n               AVG(r.csat_prom) AS csat_prom, SUM(r.csat_prom IS NOT NULL) AS con_csat, SUM(r.csat_prom >= 4) AS csat_ok,\n               AVG(r.ces_valor) AS ces_prom,\n               SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas,\n               SUM(CASE WHEN ", " AND g.idenc_respuesta IS NULL THEN 1 ELSE 0 END) AS malas_pendientes,\n               SUM(r.tiene_comentario) AS comentarios\n        FROM enc_respuesta r\n        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta\n        WHERE ", ""], ["\n        SELECT COUNT(*) AS respuestas,\n               SUM(r.nps_valor IS NOT NULL) AS con_nps,\n               SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'pasivo') AS pasivos, SUM(r.nps_cat = 'detractor') AS detractores,\n               AVG(r.csat_prom) AS csat_prom, SUM(r.csat_prom IS NOT NULL) AS con_csat, SUM(r.csat_prom >= 4) AS csat_ok,\n               AVG(r.ces_valor) AS ces_prom,\n               SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas,\n               SUM(CASE WHEN ", " AND g.idenc_respuesta IS NULL THEN 1 ELSE 0 END) AS malas_pendientes,\n               SUM(r.tiene_comentario) AS comentarios\n        FROM enc_respuesta r\n        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta\n        WHERE ", ""])), exports.SQL_MALA, exports.SQL_MALA, filtroRespuestas([idsede], r))];
            case 1:
                k = (_c.sent())[0];
                return [4 /*yield*/, contarVentas([idsede], r)];
            case 2:
                ventas = _c.sent();
                respuestas = num(k === null || k === void 0 ? void 0 : k.respuestas);
                conCsat = num(k === null || k === void 0 ? void 0 : k.con_csat);
                return [2 /*return*/, {
                        respuestas: respuestas,
                        ventas: (_a = ventas.get(idsede)) !== null && _a !== void 0 ? _a : 0,
                        tasa_respuesta: (0, exports.tasa)(respuestas, (_b = ventas.get(idsede)) !== null && _b !== void 0 ? _b : 0),
                        nps: (0, exports.calcularNps)(num(k === null || k === void 0 ? void 0 : k.promotores), num(k === null || k === void 0 ? void 0 : k.detractores), num(k === null || k === void 0 ? void 0 : k.con_nps)),
                        promotores: num(k === null || k === void 0 ? void 0 : k.promotores), pasivos: num(k === null || k === void 0 ? void 0 : k.pasivos), detractores: num(k === null || k === void 0 ? void 0 : k.detractores),
                        csat_prom: numONull(k === null || k === void 0 ? void 0 : k.csat_prom),
                        csat_satisfechos_pct: conCsat ? Math.round((num(k === null || k === void 0 ? void 0 : k.csat_ok) * 1000) / conCsat) / 10 : null,
                        ces_prom: numONull(k === null || k === void 0 ? void 0 : k.ces_prom),
                        malas: num(k === null || k === void 0 ? void 0 : k.malas), malas_pendientes: num(k === null || k === void 0 ? void 0 : k.malas_pendientes), comentarios: num(k === null || k === void 0 ? void 0 : k.comentarios)
                    }];
        }
    });
}); };
/** Ventas validas (registro_pago estado 0) por sede en el rango. */
var contarVentas = function (sedes, r) { return __awaiter(void 0, void 0, void 0, function () {
    var filas;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n        SELECT idsede, COUNT(*) AS ventas FROM registro_pago\n        WHERE idsede IN (", ") AND estado = 0\n          AND fecha_hora >= ", " AND fecha_hora < DATE_ADD(", ", INTERVAL 1 DAY)\n        GROUP BY idsede"], ["\n        SELECT idsede, COUNT(*) AS ventas FROM registro_pago\n        WHERE idsede IN (", ") AND estado = 0\n          AND fecha_hora >= ", " AND fecha_hora < DATE_ADD(", ", INTERVAL 1 DAY)\n        GROUP BY idsede"])), client_1.Prisma.join(sedes), r.inicio + ' 00:00:00', r.fin)];
            case 1:
                filas = _a.sent();
                return [2 /*return*/, new Map(filas.map(function (f) { return [Number(f.idsede), num(f.ventas)]; }))];
        }
    });
}); };
var tablero = function (idsede, r) { return __awaiter(void 0, void 0, void 0, function () {
    var anterior, activas, _a, k, kAnt, tendencia, canales, preguntas, opciones, distribucion, mozos, horas, ventas, totalVentas;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                anterior = (0, exports.rangoAnterior)(r);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n        SELECT COUNT(*) AS n FROM enc_publicacion WHERE idsede = ", " AND activa = 1"], ["\n        SELECT COUNT(*) AS n FROM enc_publicacion WHERE idsede = ", " AND activa = 1"])), idsede)];
            case 1:
                activas = (_c.sent())[0];
                return [4 /*yield*/, Promise.all([
                        kpis(idsede, r),
                        kpis(idsede, anterior),
                        prisma.$queryRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            SELECT DATE_FORMAT(r.fecha_local, '%Y-%m-%d') AS fecha, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.fecha_local ORDER BY r.fecha_local"], ["\n            SELECT DATE_FORMAT(r.fecha_local, '%Y-%m-%d') AS fecha, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.fecha_local ORDER BY r.fecha_local"])), exports.SQL_MALA, filtroRespuestas([idsede], r)),
                        prisma.$queryRaw(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n            SELECT r.canal, COUNT(*) AS respuestas, SUM(r.idregistro_pago IS NOT NULL) AS con_venta,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.canal"], ["\n            SELECT r.canal, COUNT(*) AS respuestas, SUM(r.idregistro_pago IS NOT NULL) AS con_venta,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.canal"])), exports.SQL_MALA, filtroRespuestas([idsede], r)),
                        prisma.$queryRaw(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS texto, d.tipo, COUNT(*) AS respuestas, AVG(d.valor_num) AS promedio,\n                   SUM(CASE WHEN (d.tipo = 'csat' AND d.valor_num <= 2) OR (d.tipo = 'nps' AND d.valor_num <= 6) OR (d.tipo = 'ces' AND d.valor_num <= 3) THEN 1 ELSE 0 END) AS bajas\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL\n            GROUP BY d.tipo, d.pregunta_texto"], ["\n            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS texto, d.tipo, COUNT(*) AS respuestas, AVG(d.valor_num) AS promedio,\n                   SUM(CASE WHEN (d.tipo = 'csat' AND d.valor_num <= 2) OR (d.tipo = 'nps' AND d.valor_num <= 6) OR (d.tipo = 'ces' AND d.valor_num <= 3) THEN 1 ELSE 0 END) AS bajas\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL\n            GROUP BY d.tipo, d.pregunta_texto"])), filtroRespuestas([idsede], r)),
                        prisma.$queryRaw(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS pregunta, d.valor_texto AS opcion, COUNT(*) AS cantidad\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo = 'opcion' AND d.valor_texto IS NOT NULL\n            GROUP BY d.pregunta_texto, d.valor_texto ORDER BY d.pregunta_texto, cantidad DESC"], ["\n            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS pregunta, d.valor_texto AS opcion, COUNT(*) AS cantidad\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo = 'opcion' AND d.valor_texto IS NOT NULL\n            GROUP BY d.pregunta_texto, d.valor_texto ORDER BY d.pregunta_texto, cantidad DESC"])), filtroRespuestas([idsede], r)),
                        // cuantas veces se dio cada nota de cada escala: para el grafico de distribucion
                        prisma.$queryRaw(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n            SELECT d.tipo, d.valor_num AS valor, COUNT(*) AS cantidad\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL\n            GROUP BY d.tipo, d.valor_num ORDER BY d.tipo, d.valor_num"], ["\n            SELECT d.tipo, d.valor_num AS valor, COUNT(*) AS cantidad\n            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n            WHERE ", " AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL\n            GROUP BY d.tipo, d.valor_num ORDER BY d.tipo, d.valor_num"])), filtroRespuestas([idsede], r)),
                        prisma.$queryRaw(templateObject_11 || (templateObject_11 = __makeTemplateObject(["\n            SELECT r.idusuario_atendio AS idusuario, MAX(u.nombres) AS nombre, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n            WHERE ", " AND r.idusuario_atendio IS NOT NULL\n            GROUP BY r.idusuario_atendio"], ["\n            SELECT r.idusuario_atendio AS idusuario, MAX(u.nombres) AS nombre, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n            WHERE ", " AND r.idusuario_atendio IS NOT NULL\n            GROUP BY r.idusuario_atendio"])), exports.SQL_MALA, filtroRespuestas([idsede], r)),
                        prisma.$queryRaw(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n            SELECT DAYOFWEEK(r.respondido_en) AS dow, HOUR(r.respondido_en) AS hora, COUNT(*) AS respuestas,\n                   SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY dow, hora"], ["\n            SELECT DAYOFWEEK(r.respondido_en) AS dow, HOUR(r.respondido_en) AS hora, COUNT(*) AS respuestas,\n                   SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY dow, hora"])), exports.SQL_MALA, filtroRespuestas([idsede], r)),
                        contarVentas([idsede], r),
                    ])];
            case 2:
                _a = _c.sent(), k = _a[0], kAnt = _a[1], tendencia = _a[2], canales = _a[3], preguntas = _a[4], opciones = _a[5], distribucion = _a[6], mozos = _a[7], horas = _a[8], ventas = _a[9];
                totalVentas = (_b = ventas.get(idsede)) !== null && _b !== void 0 ? _b : 0;
                return [2 /*return*/, {
                        hay_activas: num(activas === null || activas === void 0 ? void 0 : activas.n) > 0,
                        rango: r,
                        rango_anterior: anterior,
                        kpis: k,
                        kpis_anterior: kAnt,
                        tendencia: tendencia.map(function (t) { return ({
                            fecha: String(t.fecha), respuestas: num(t.respuestas),
                            nps: (0, exports.calcularNps)(num(t.promotores), num(t.detractores), num(t.con_nps)),
                            csat_prom: numONull(t.csat_prom), malas: num(t.malas)
                        }); }),
                        canales: canales.map(function (c) { return ({
                            canal: c.canal, respuestas: num(c.respuestas),
                            nps: (0, exports.calcularNps)(num(c.promotores), num(c.detractores), num(c.con_nps)),
                            csat_prom: numONull(c.csat_prom), malas: num(c.malas),
                            // solo comprobante y WhatsApp estan ligados a una venta; tablet y QR fijo no tienen denominador real
                            tasa_respuesta: c.canal === 'ticket' || c.canal === 'whatsapp' ? (0, exports.tasa)(num(c.con_venta), totalVentas) : null
                        }); }),
                        preguntas: preguntas
                            .map(function (p) {
                            var _a;
                            var tipo = p.tipo;
                            var promedio = (_a = numONull(p.promedio)) !== null && _a !== void 0 ? _a : 0;
                            var respuestas = num(p.respuestas);
                            return {
                                idenc_pregunta: Number(p.idenc_pregunta), texto: String(p.texto),
                                tipo: tipo,
                                respuestas: respuestas,
                                promedio: promedio,
                                escala_min: ESCALA[tipo][0], escala_max: ESCALA[tipo][1],
                                puntaje_100: (0, exports.puntaje100)(tipo, promedio),
                                pct_bajo: respuestas ? Math.round((num(p.bajas) * 1000) / respuestas) / 10 : 0
                            };
                        })
                            .sort(function (a, b) { return a.puntaje_100 - b.puntaje_100; }),
                        distribucion: distribucion.map(function (d) { return ({ tipo: d.tipo, valor: Number(d.valor), cantidad: num(d.cantidad) }); }),
                        // el front agrupa por idenc_pregunta: una sola id por texto, aunque cada opcion venga de otra version
                        opciones: opciones.map(function (o) { return ({
                            idenc_pregunta: Math.min.apply(Math, opciones.filter(function (x) { return x.pregunta === o.pregunta; }).map(function (x) { return Number(x.idenc_pregunta); })), pregunta: String(o.pregunta), opcion: String(o.opcion), cantidad: num(o.cantidad)
                        }); }),
                        mozos: mozos
                            .map(function (m) { return ({
                            idusuario: Number(m.idusuario), nombre: m.nombre ? String(m.nombre) : "Usuario ".concat(m.idusuario),
                            respuestas: num(m.respuestas),
                            nps: (0, exports.calcularNps)(num(m.promotores), num(m.detractores), num(m.con_nps)),
                            csat_prom: numONull(m.csat_prom), malas: num(m.malas)
                        }); })
                            .sort(function (a, b) { var _a, _b; return ((_a = a.csat_prom) !== null && _a !== void 0 ? _a : 99) - ((_b = b.csat_prom) !== null && _b !== void 0 ? _b : 99); }),
                        horas: horas.map(function (h) { return ({ dia_semana: (0, exports.diaSemanaLunes)(num(h.dow)), hora: num(h.hora), respuestas: num(h.respuestas), malas: num(h.malas) }); })
                    }];
        }
    });
}); };
exports.tablero = tablero;
var alertas = function (idsede, r, estado) { return __awaiter(void 0, void 0, void 0, function () {
    var filtroEstado, filas, ids, detalles, porRespuesta, _i, detalles_1, d, k;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                filtroEstado = estado === 'pendientes' ? client_1.Prisma.sql(templateObject_13 || (templateObject_13 = __makeTemplateObject(["AND g.idenc_respuesta IS NULL"], ["AND g.idenc_respuesta IS NULL"]))) : estado === 'atendidas' ? client_1.Prisma.sql(templateObject_14 || (templateObject_14 = __makeTemplateObject(["AND g.idenc_respuesta IS NOT NULL"], ["AND g.idenc_respuesta IS NOT NULL"]))) : client_1.Prisma.empty;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_15 || (templateObject_15 = __makeTemplateObject(["\n        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,\n               s.nombre AS sede, e.nombre AS encuesta, r.csat_prom, r.nps_valor, r.ces_valor,\n               r.nummesa, u.nombres AS mozo, r.total_pedido,\n               g.nota, DATE_FORMAT(g.atendida_en, '%Y-%m-%d %H:%i:%s') AS atendida_en, ua.nombres AS atendida_por\n        FROM enc_respuesta r\n        JOIN sede s ON s.idsede = r.idsede\n        JOIN enc_encuesta e ON e.idenc_encuesta = r.idenc_encuesta\n        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta\n        LEFT JOIN usuario ua ON ua.idusuario = g.idusuario\n        WHERE ", " AND ", " ", "\n        ORDER BY r.respondido_en DESC\n        LIMIT 500"], ["\n        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,\n               s.nombre AS sede, e.nombre AS encuesta, r.csat_prom, r.nps_valor, r.ces_valor,\n               r.nummesa, u.nombres AS mozo, r.total_pedido,\n               g.nota, DATE_FORMAT(g.atendida_en, '%Y-%m-%d %H:%i:%s') AS atendida_en, ua.nombres AS atendida_por\n        FROM enc_respuesta r\n        JOIN sede s ON s.idsede = r.idsede\n        JOIN enc_encuesta e ON e.idenc_encuesta = r.idenc_encuesta\n        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta\n        LEFT JOIN usuario ua ON ua.idusuario = g.idusuario\n        WHERE ", " AND ", " ", "\n        ORDER BY r.respondido_en DESC\n        LIMIT 500"])), filtroRespuestas([idsede], r), exports.SQL_MALA, filtroEstado)];
            case 1:
                filas = _a.sent();
                if (!filas.length)
                    return [2 /*return*/, []];
                ids = filas.map(function (f) { return Number(f.id); });
                return [4 /*yield*/, prisma.$queryRaw(templateObject_16 || (templateObject_16 = __makeTemplateObject(["\n        SELECT idenc_respuesta, pregunta_texto, tipo, valor_num, valor_texto\n        FROM enc_respuesta_detalle WHERE idenc_respuesta IN (", ") ORDER BY idenc_respuesta, orden"], ["\n        SELECT idenc_respuesta, pregunta_texto, tipo, valor_num, valor_texto\n        FROM enc_respuesta_detalle WHERE idenc_respuesta IN (", ") ORDER BY idenc_respuesta, orden"])), client_1.Prisma.join(ids))];
            case 2:
                detalles = _a.sent();
                porRespuesta = new Map();
                for (_i = 0, detalles_1 = detalles; _i < detalles_1.length; _i++) {
                    d = detalles_1[_i];
                    k = Number(d.idenc_respuesta);
                    if (!porRespuesta.has(k))
                        porRespuesta.set(k, []);
                    porRespuesta.get(k).push(d);
                }
                return [2 /*return*/, filas
                        .map(function (f) {
                        var _a, _b, _c, _d, _e;
                        var csat = numONull(f.csat_prom), nps = f.nps_valor === null ? null : num(f.nps_valor), ces = f.ces_valor === null ? null : num(f.ces_valor);
                        var det = (_a = porRespuesta.get(Number(f.id))) !== null && _a !== void 0 ? _a : [];
                        var comentario = (_c = (_b = det.find(function (d) { return d.tipo === 'texto' && d.valor_texto; })) === null || _b === void 0 ? void 0 : _b.valor_texto) !== null && _c !== void 0 ? _c : null;
                        return {
                            id: Number(f.id), respondido_en: String(f.respondido_en), canal: f.canal,
                            sede: String(f.sede), encuesta: String(f.encuesta),
                            csat_prom: csat, nps_valor: nps, ces_valor: ces,
                            motivos: (0, exports.motivosMala)(csat, nps, ces), severidad: (0, exports.severidad)(csat, nps, ces),
                            comentario: comentario,
                            nummesa: (_d = f.nummesa) !== null && _d !== void 0 ? _d : null, mozo: (_e = f.mozo) !== null && _e !== void 0 ? _e : null,
                            total_pedido: f.total_pedido === null ? null : Number(f.total_pedido),
                            detalle: det.map(function (d) { var _a; return ({ pregunta: String(d.pregunta_texto), tipo: String(d.tipo), valor_num: d.valor_num === null ? null : num(d.valor_num), valor_texto: (_a = d.valor_texto) !== null && _a !== void 0 ? _a : null }); }),
                            atencion: f.atendida_en ? { por: f.atendida_por ? String(f.atendida_por) : '', nota: String(f.nota), en: String(f.atendida_en) } : null
                        };
                    })
                        .sort(function (a, b) { return b.severidad - a.severidad || (a.respondido_en < b.respondido_en ? 1 : -1); })
                        .slice(0, 200)];
        }
    });
}); };
exports.alertas = alertas;
/** Sede de una respuesta (para validar que el usuario puede atenderla). */
var sedeDeRespuesta = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var f;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_17 || (templateObject_17 = __makeTemplateObject(["SELECT idsede FROM enc_respuesta WHERE idenc_respuesta = ", ""], ["SELECT idsede FROM enc_respuesta WHERE idenc_respuesta = ", ""])), id)];
            case 1:
                f = (_a.sent())[0];
                return [2 /*return*/, f ? Number(f.idsede) : null];
        }
    });
}); };
exports.sedeDeRespuesta = sedeDeRespuesta;
var atender = function (id, idusuario, nota) { return __awaiter(void 0, void 0, void 0, function () {
    var fechaHora, e_1, u;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fechaHora = (0, encuesta_publica_service_1.horaLima)().fechaHora;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$executeRaw(templateObject_18 || (templateObject_18 = __makeTemplateObject(["\n            INSERT INTO enc_alerta_gestion (idenc_respuesta, idusuario, nota, atendida_en) VALUES (", ", ", ", ", ", ", ")"], ["\n            INSERT INTO enc_alerta_gestion (idenc_respuesta, idusuario, nota, atendida_en) VALUES (", ", ", ", ", ", ", ")"])), id, idusuario, nota, fechaHora)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                e_1 = _a.sent();
                if (e_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && /Duplicate entry|PRIMARY/.test(e_1.message)) {
                    throw new ErrorDash(409, 'Esta mala experiencia ya fue atendida.');
                }
                throw e_1;
            case 4: return [4 /*yield*/, prisma.$queryRaw(templateObject_19 || (templateObject_19 = __makeTemplateObject(["SELECT nombres FROM usuario WHERE idusuario = ", ""], ["SELECT nombres FROM usuario WHERE idusuario = ", ""])), idusuario)];
            case 5:
                u = (_a.sent())[0];
                return [2 /*return*/, { por: (u === null || u === void 0 ? void 0 : u.nombres) ? String(u.nombres) : '', nota: nota, en: fechaHora }];
        }
    });
}); };
exports.atender = atender;
exports.POR_PAGINA = 10;
var comentarios = function (idsede, r, filtro, pagina) { return __awaiter(void 0, void 0, void 0, function () {
    var f, base, total, offset, items;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                f = filtro === 'malos' ? client_1.Prisma.sql(templateObject_20 || (templateObject_20 = __makeTemplateObject(["AND ", ""], ["AND ", ""])), exports.SQL_MALA) : filtro === 'buenos' ? client_1.Prisma.sql(templateObject_21 || (templateObject_21 = __makeTemplateObject(["AND NOT ", " AND (COALESCE(r.csat_prom >= 4, 0) OR COALESCE(r.nps_valor >= 9, 0))"], ["AND NOT ", " AND (COALESCE(r.csat_prom >= 4, 0) OR COALESCE(r.nps_valor >= 9, 0))"])), exports.SQL_MALA) : client_1.Prisma.empty;
                base = client_1.Prisma.sql(templateObject_22 || (templateObject_22 = __makeTemplateObject(["\n        FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n        WHERE ", " AND d.tipo = 'texto' AND d.valor_texto IS NOT NULL AND d.valor_texto <> '' ", ""], ["\n        FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta\n        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio\n        WHERE ", " AND d.tipo = 'texto' AND d.valor_texto IS NOT NULL AND d.valor_texto <> '' ", ""])), filtroRespuestas([idsede], r), f);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_23 || (templateObject_23 = __makeTemplateObject(["SELECT COUNT(*) AS total ", ""], ["SELECT COUNT(*) AS total ", ""])), base)];
            case 1:
                total = (_a.sent())[0].total;
                offset = (pagina - 1) * exports.POR_PAGINA;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_24 || (templateObject_24 = __makeTemplateObject(["\n        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,\n               d.pregunta_texto AS pregunta, d.valor_texto AS comentario, ", " AS mala,\n               r.csat_prom, r.nps_valor, r.nummesa, u.nombres AS mozo\n        ", "\n        ORDER BY r.respondido_en DESC\n        LIMIT ", " OFFSET ", ""], ["\n        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,\n               d.pregunta_texto AS pregunta, d.valor_texto AS comentario, ", " AS mala,\n               r.csat_prom, r.nps_valor, r.nummesa, u.nombres AS mozo\n        ", "\n        ORDER BY r.respondido_en DESC\n        LIMIT ", " OFFSET ", ""])), exports.SQL_MALA, base, exports.POR_PAGINA, offset)];
            case 2:
                items = _a.sent();
                return [2 /*return*/, {
                        total: num(total),
                        pagina: pagina,
                        por_pagina: exports.POR_PAGINA,
                        items: items.map(function (i) {
                            var _a, _b;
                            return ({
                                id: Number(i.id), respondido_en: String(i.respondido_en), canal: i.canal,
                                pregunta: String(i.pregunta), comentario: String(i.comentario), mala: num(i.mala) === 1,
                                csat_prom: numONull(i.csat_prom), nps_valor: i.nps_valor === null ? null : num(i.nps_valor),
                                nummesa: (_a = i.nummesa) !== null && _a !== void 0 ? _a : null, mozo: (_b = i.mozo) !== null && _b !== void 0 ? _b : null
                            });
                        })
                    }];
        }
    });
}); };
exports.comentarios = comentarios;
var locales = function (sedes, r) { return __awaiter(void 0, void 0, void 0, function () {
    var ids, _a, filas, ventas, porSede;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                ids = sedes.map(function (s) { return s.idsede; });
                return [4 /*yield*/, Promise.all([
                        prisma.$queryRaw(templateObject_25 || (templateObject_25 = __makeTemplateObject(["\n            SELECT r.idsede, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, AVG(r.ces_valor) AS ces_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.idsede"], ["\n            SELECT r.idsede, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, AVG(r.ces_valor) AS ces_prom, SUM(CASE WHEN ", " THEN 1 ELSE 0 END) AS malas\n            FROM enc_respuesta r WHERE ", "\n            GROUP BY r.idsede"])), exports.SQL_MALA, filtroRespuestas(ids, r)),
                        contarVentas(ids, r),
                    ])];
            case 1:
                _a = _b.sent(), filas = _a[0], ventas = _a[1];
                porSede = new Map(filas.map(function (f) { return [Number(f.idsede), f]; }));
                return [2 /*return*/, sedes.map(function (s) {
                        var _a;
                        var f = porSede.get(s.idsede);
                        var respuestas = num(f === null || f === void 0 ? void 0 : f.respuestas);
                        var v = (_a = ventas.get(s.idsede)) !== null && _a !== void 0 ? _a : 0;
                        return {
                            idsede: s.idsede, nombre: s.nombre,
                            respuestas: respuestas,
                            ventas: v, tasa_respuesta: (0, exports.tasa)(respuestas, v),
                            nps: (0, exports.calcularNps)(num(f === null || f === void 0 ? void 0 : f.promotores), num(f === null || f === void 0 ? void 0 : f.detractores), num(f === null || f === void 0 ? void 0 : f.con_nps)),
                            csat_prom: numONull(f === null || f === void 0 ? void 0 : f.csat_prom), ces_prom: numONull(f === null || f === void 0 ? void 0 : f.ces_prom), malas: num(f === null || f === void 0 ? void 0 : f.malas),
                            pct_malas: respuestas ? Math.round((num(f === null || f === void 0 ? void 0 : f.malas) * 1000) / respuestas) / 10 : null
                        };
                    })];
        }
    });
}); };
exports.locales = locales;
var encuestas = function (idorg, sedes, idsede) { return __awaiter(void 0, void 0, void 0, function () {
    var sedesStats, _a, lista, stats, pubs, raicesVivas, statsPor, pubsPor, _i, pubs_1, p, k, vivas, activas, historial, archivadas, ultimaArchivadaPorRaiz, _b, lista_1, e, id, raiz, s, item;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                sedesStats = idsede ? [idsede] : sedes;
                return [4 /*yield*/, Promise.all([
                        prisma.$queryRaw(templateObject_26 || (templateObject_26 = __makeTemplateObject(["\n            SELECT e.idenc_encuesta AS id, e.idenc_raiz AS id_raiz, e.version, e.nombre, e.estado,\n                   DATE_FORMAT(e.creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en,\n                   (SELECT COUNT(*) FROM enc_pregunta p WHERE p.idenc_encuesta = e.idenc_encuesta) AS preguntas\n            FROM enc_encuesta e WHERE e.idorg = ", " ORDER BY e.creado_en DESC"], ["\n            SELECT e.idenc_encuesta AS id, e.idenc_raiz AS id_raiz, e.version, e.nombre, e.estado,\n                   DATE_FORMAT(e.creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en,\n                   (SELECT COUNT(*) FROM enc_pregunta p WHERE p.idenc_encuesta = e.idenc_encuesta) AS preguntas\n            FROM enc_encuesta e WHERE e.idorg = ", " ORDER BY e.creado_en DESC"])), idorg),
                        prisma.$queryRaw(templateObject_27 || (templateObject_27 = __makeTemplateObject(["\n            SELECT r.idenc_encuesta, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, DATE_FORMAT(MAX(r.respondido_en), '%Y-%m-%d %H:%i:%s') AS ultima\n            FROM enc_respuesta r WHERE r.idorg = ", " AND r.idsede IN (", ")\n            GROUP BY r.idenc_encuesta"], ["\n            SELECT r.idenc_encuesta, COUNT(*) AS respuestas,\n                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,\n                   AVG(r.csat_prom) AS csat_prom, DATE_FORMAT(MAX(r.respondido_en), '%Y-%m-%d %H:%i:%s') AS ultima\n            FROM enc_respuesta r WHERE r.idorg = ", " AND r.idsede IN (", ")\n            GROUP BY r.idenc_encuesta"])), idorg, client_1.Prisma.join(sedesStats)),
                        prisma.$queryRaw(templateObject_28 || (templateObject_28 = __makeTemplateObject(["\n            SELECT p.idenc_encuesta, p.canal, s.nombre AS sede\n            FROM enc_publicacion p JOIN sede s ON s.idsede = p.idsede\n            WHERE p.idorg = ", " AND p.activa = 1 AND p.idsede IN (", ")\n            ORDER BY p.canal, s.nombre"], ["\n            SELECT p.idenc_encuesta, p.canal, s.nombre AS sede\n            FROM enc_publicacion p JOIN sede s ON s.idsede = p.idsede\n            WHERE p.idorg = ", " AND p.activa = 1 AND p.idsede IN (", ")\n            ORDER BY p.canal, s.nombre"])), idorg, client_1.Prisma.join(sedes)),
                        prisma.$queryRaw(templateObject_29 || (templateObject_29 = __makeTemplateObject(["\n            SELECT DISTINCT idenc_raiz FROM enc_encuesta WHERE idorg = ", " AND estado <> 'archivada'"], ["\n            SELECT DISTINCT idenc_raiz FROM enc_encuesta WHERE idorg = ", " AND estado <> 'archivada'"])), idorg),
                    ])];
            case 1:
                _a = _d.sent(), lista = _a[0], stats = _a[1], pubs = _a[2], raicesVivas = _a[3];
                statsPor = new Map(stats.map(function (s) { return [Number(s.idenc_encuesta), s]; }));
                pubsPor = new Map();
                for (_i = 0, pubs_1 = pubs; _i < pubs_1.length; _i++) {
                    p = pubs_1[_i];
                    k = Number(p.idenc_encuesta);
                    if (!pubsPor.has(k))
                        pubsPor.set(k, []);
                    pubsPor.get(k).push({ canal: p.canal, sede: String(p.sede) });
                }
                vivas = new Set(raicesVivas.map(function (x) { return Number(x.idenc_raiz); }));
                activas = [], historial = [], archivadas = [];
                ultimaArchivadaPorRaiz = new Set();
                for (_b = 0, lista_1 = lista; _b < lista_1.length; _b++) {
                    e = lista_1[_b];
                    id = Number(e.id), raiz = Number(e.id_raiz);
                    s = statsPor.get(id);
                    item = {
                        id: id,
                        id_raiz: raiz, version: num(e.version), nombre: String(e.nombre), estado: e.estado,
                        creado_en: String(e.creado_en), preguntas: num(e.preguntas), respuestas: num(s === null || s === void 0 ? void 0 : s.respuestas),
                        nps: (0, exports.calcularNps)(num(s === null || s === void 0 ? void 0 : s.promotores), num(s === null || s === void 0 ? void 0 : s.detractores), num(s === null || s === void 0 ? void 0 : s.con_nps)),
                        csat_prom: numONull(s === null || s === void 0 ? void 0 : s.csat_prom), ultima_respuesta: (s === null || s === void 0 ? void 0 : s.ultima) ? String(s.ultima) : null,
                        publicaciones: (_c = pubsPor.get(id)) !== null && _c !== void 0 ? _c : []
                    };
                    if (e.estado !== 'archivada')
                        activas.push(item);
                    else if (vivas.has(raiz)) {
                        if (item.respuestas > 0)
                            historial.push(item);
                    }
                    // raiz sin versiones vivas: solo se muestra su version mas reciente (lista viene por creado_en desc)
                    else if (!ultimaArchivadaPorRaiz.has(raiz)) {
                        ultimaArchivadaPorRaiz.add(raiz);
                        archivadas.push(item);
                    }
                }
                return [2 /*return*/, { activas: activas, historial: historial, archivadas: archivadas }];
        }
    });
}); };
exports.encuestas = encuestas;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29;
