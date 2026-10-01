"use strict";
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
exports.avanceDeMeta = exports.guardarMeta = exports.listarMetas = exports.metaDeSede = void 0;
var client_1 = require("@prisma/client");
var agregados_1 = require("./agregados");
var prisma = new client_1.PrismaClient();
function aNumero(v) {
    var n = parseFloat(String(v !== null && v !== void 0 ? v : '0').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}
function metaDeSede(idsede) {
    return __awaiter(this, void 0, void 0, function () {
        var filas, m, meta;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT diaria, mensual, anual FROM sede_meta\n        WHERE idsede = ", " AND estado = 0 LIMIT 1"], ["\n        SELECT diaria, mensual, anual FROM sede_meta\n        WHERE idsede = ", " AND estado = 0 LIMIT 1"])), idsede)];
                case 1:
                    filas = _a.sent();
                    m = filas === null || filas === void 0 ? void 0 : filas[0];
                    if (!m)
                        return [2 /*return*/, null];
                    meta = {
                        diaria: aNumero(m.diaria),
                        mensual: aNumero(m.mensual),
                        anual: aNumero(m.anual)
                    };
                    // Una fila con todo en cero es lo mismo que no tener meta.
                    return [2 /*return*/, meta.diaria || meta.mensual || meta.anual ? meta : null];
            }
        });
    });
}
exports.metaDeSede = metaDeSede;
/** Metas de varias sedes, incluidas las que no tienen ninguna. */
function listarMetas(idsedes) {
    return __awaiter(this, void 0, void 0, function () {
        var ids, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (idsedes.length === 0)
                        return [2 /*return*/, []];
                    ids = idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; });
                    if (ids.length === 0)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT s.idsede, s.nombre, m.diaria, m.mensual, m.anual\n         FROM sede s\n         LEFT JOIN sede_meta m ON m.idsede = s.idsede AND m.estado = 0\n         WHERE s.idsede IN (".concat(ids.join(','), ")\n         ORDER BY s.nombre"))];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, filas.map(function (f) {
                            var _a;
                            return ({
                                idsede: Number(f.idsede),
                                nombre: String((_a = f.nombre) !== null && _a !== void 0 ? _a : ''),
                                diaria: aNumero(f.diaria),
                                mensual: aNumero(f.mensual),
                                anual: aNumero(f.anual),
                                tieneMeta: f.diaria !== null || f.mensual !== null || f.anual !== null
                            });
                        })];
            }
        });
    });
}
exports.listarMetas = listarMetas;
/**
 * Crea o actualiza la meta de una sede.
 *
 * Quien llama DEBE haber comprobado que la sede es del usuario: aqui solo se
 * valida la forma de los datos, no el permiso.
 */
function guardarMeta(idsede, idorg, meta) {
    return __awaiter(this, void 0, void 0, function () {
        var valores, existentes, hoy;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    valores = {
                        diaria: Math.max(0, Number(meta.diaria) || 0),
                        mensual: Math.max(0, Number(meta.mensual) || 0),
                        anual: Math.max(0, Number(meta.anual) || 0)
                    };
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT idsede_meta FROM sede_meta WHERE idsede = ", " AND estado = 0 LIMIT 1"], ["\n        SELECT idsede_meta FROM sede_meta WHERE idsede = ", " AND estado = 0 LIMIT 1"])), idsede)];
                case 1:
                    existentes = _a.sent();
                    hoy = new Date().toISOString().slice(0, 10);
                    if (!(existentes === null || existentes === void 0 ? void 0 : existentes[0])) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n            UPDATE sede_meta\n            SET diaria = ", ",\n                mensual = ", ",\n                anual = ", ",\n                fecha = ", "\n            WHERE idsede_meta = ", ""], ["\n            UPDATE sede_meta\n            SET diaria = ", ",\n                mensual = ", ",\n                anual = ", ",\n                fecha = ", "\n            WHERE idsede_meta = ", ""])), String(valores.diaria), String(valores.mensual), String(valores.anual), hoy, Number(existentes[0].idsede_meta))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, prisma.$executeRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            INSERT INTO sede_meta (idorg, idsede, diaria, mensual, anual, fecha, estado)\n            VALUES (", ", ", ", ", ",\n                    ", ", ", ", ", ", 0)"], ["\n            INSERT INTO sede_meta (idorg, idsede, diaria, mensual, anual, fecha, estado)\n            VALUES (", ", ", ", ", ",\n                    ", ", ", ", ", ", 0)"])), idorg, idsede, String(valores.diaria), String(valores.mensual), String(valores.anual), hoy)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, valores];
            }
        });
    });
}
exports.guardarMeta = guardarMeta;
function diasDelMes(ano, mes) {
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
function esMesCompleto(desde, hasta) {
    var _a = desde.split('-').map(Number), a1 = _a[0], m1 = _a[1], d1 = _a[2];
    var _b = hasta.split('-').map(Number), a2 = _b[0], m2 = _b[1], d2 = _b[2];
    return a1 === a2 && m1 === m2 && d1 === 1 && d2 === diasDelMes(a1, m1);
}
function esAnoCompleto(desde, hasta) {
    return desde.endsWith('-01-01') && hasta.endsWith('-12-31') && desde.slice(0, 4) === hasta.slice(0, 4);
}
function diasEntre(desde, hasta) {
    var a = Date.parse(desde + 'T00:00:00Z');
    var b = Date.parse(hasta + 'T00:00:00Z');
    return Math.round((b - a) / 86400000) + 1;
}
/**
 * Avance contra la meta del periodo.
 *
 * La meta de un rango arbitrario sale de la diaria por los dias; solo si el
 * rango es exactamente un mes o un ano naturales se usan la mensual o la anual,
 * que el negocio puede haber fijado sin que cuadren con diaria x 30.
 *
 * La proyeccion es lineal sobre lo que va del periodo. Es una regla de tres, no
 * un modelo: sirve para "vas corto" o "vas holgado", no para decidir un credito.
 */
function avanceDeMeta(meta, vendido, desde, hasta, hoyISO) {
    var diasTotales = Math.max(1, diasEntre(desde, hasta));
    var objetivo;
    var origen;
    if (esAnoCompleto(desde, hasta) && meta.anual) {
        objetivo = meta.anual;
        origen = 'anual';
    }
    else if (esMesCompleto(desde, hasta) && meta.mensual) {
        objetivo = meta.mensual;
        origen = 'mensual';
    }
    else {
        objetivo = meta.diaria * diasTotales;
        origen = 'diaria_por_dias';
    }
    var enCurso = hoyISO >= desde && hoyISO <= hasta;
    var diasTranscurridos = enCurso ? Math.max(1, diasEntre(desde, hoyISO)) : diasTotales;
    var proyeccion = enCurso ? (0, agregados_1.redondear)((vendido / diasTranscurridos) * diasTotales) : null;
    return {
        meta: (0, agregados_1.redondear)(objetivo),
        origen: origen,
        vendido: (0, agregados_1.redondear)(vendido),
        avancePct: objetivo ? (0, agregados_1.redondear)((vendido / objetivo) * 100) : 0,
        faltante: (0, agregados_1.redondear)(Math.max(objetivo - vendido, 0)),
        proyeccion: proyeccion,
        proyeccionPct: proyeccion && objetivo ? (0, agregados_1.redondear)((proyeccion / objetivo) * 100) : null,
        diasTranscurridos: diasTranscurridos,
        diasTotales: diasTotales,
        enCurso: enCurso
    };
}
exports.avanceDeMeta = avanceDeMeta;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
