"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.marcarDisparada = exports.evaluarSede = exports.borrarRegla = exports.crearRegla = exports.listarReglas = exports.definicionDe = exports.CATALOGO = void 0;
var client_1 = require("@prisma/client");
var errores_1 = require("../dash/errores");
var agregados_1 = require("../dash/agregados");
var metas_1 = require("../dash/metas");
var alertas_1 = require("../dash/alertas");
var dashVentas = __importStar(require("../dash/ventas"));
var prisma = new client_1.PrismaClient();
exports.CATALOGO = [
    {
        tipo: 'meta_bajo_pct',
        etiqueta: 'Avance de meta por debajo de un porcentaje',
        unidad: 'porcentaje',
        plantilla: function (u) { return "Avisarme si el avance de meta del mes baja del ".concat(u, "%"); },
        periodo: 'mes'
    },
    {
        tipo: 'ventas_dia_bajo',
        etiqueta: 'Venta del dia por debajo de un monto',
        unidad: 'soles',
        plantilla: function (u) { return "Avisarme si la venta del dia no llega a S/ ".concat(u); },
        periodo: 'dia'
    },
    {
        tipo: 'items_borrados',
        etiqueta: 'Demasiados items borrados en un dia',
        unidad: 'cantidad',
        plantilla: function (u) { return "Avisarme si se borran mas de ".concat(u, " items en un dia"); },
        periodo: 'dia'
    },
    {
        tipo: 'anulaciones_monto',
        etiqueta: 'Anulaciones por encima de un monto',
        unidad: 'soles',
        plantilla: function (u) { return "Avisarme si las ventas anuladas del dia pasan de S/ ".concat(u); },
        periodo: 'dia'
    },
    {
        tipo: 'egresos_caja_monto',
        etiqueta: 'Salidas de caja por encima de un monto',
        unidad: 'soles',
        plantilla: function (u) { return "Avisarme si las salidas de caja del dia pasan de S/ ".concat(u); },
        periodo: 'dia'
    },
    {
        tipo: 'descuentos_monto',
        etiqueta: 'Descuentos por encima de un monto',
        unidad: 'soles',
        plantilla: function (u) { return "Avisarme si los descuentos del dia pasan de S/ ".concat(u); },
        periodo: 'dia'
    }
];
function definicionDe(tipo) {
    var d = exports.CATALOGO.find(function (c) { return c.tipo === tipo; });
    if (!d)
        throw new errores_1.ErrorValidacion("Tipo de alerta desconocido: ".concat(tipo));
    return d;
}
exports.definicionDe = definicionDe;
function aRegla(f) {
    return {
        id: Number(f.id),
        idsede: Number(f.idsede),
        tipo: String(f.tipo),
        umbral: Number(f.umbral),
        descripcion: String(f.descripcion),
        activa: Number(f.activa) === 1,
        ultimoDisparo: f.ultimo_disparo ? String(f.ultimo_disparo).slice(0, 10) : null
    };
}
function listarReglas(idsedes) {
    return __awaiter(this, void 0, void 0, function () {
        var ids, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ids = idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; });
                    if (ids.length === 0)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, idsede, tipo, umbral, descripcion, activa, ultimo_disparo\n         FROM asistente_regla_alerta\n         WHERE idsede IN (".concat(ids.join(','), ")\n         ORDER BY activa DESC, id DESC"))];
                case 1:
                    filas = _a.sent();
                    return [2 /*return*/, (filas !== null && filas !== void 0 ? filas : []).map(aRegla)];
            }
        });
    });
}
exports.listarReglas = listarReglas;
/** Quien llama debe haber comprobado que la sede es del usuario. */
function crearRegla(idorg, idsede, idusuario, tipo, umbral) {
    return __awaiter(this, void 0, void 0, function () {
        var def, valor, descripcion, ahora, filas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    def = definicionDe(tipo);
                    valor = Number(umbral);
                    if (!Number.isFinite(valor) || valor <= 0) {
                        throw new errores_1.ErrorValidacion('El umbral debe ser un numero mayor que cero');
                    }
                    if (def.unidad === 'porcentaje' && valor > 100) {
                        throw new errores_1.ErrorValidacion('Un porcentaje no puede pasar de 100');
                    }
                    descripcion = def.plantilla(valor);
                    ahora = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        INSERT INTO asistente_regla_alerta\n            (idorg, idsede, idusuario, tipo, umbral, descripcion, activa, creado_en)\n        VALUES (", ", ", ", ", ", ", ", ", ", ", ", 1, ", ")"], ["\n        INSERT INTO asistente_regla_alerta\n            (idorg, idsede, idusuario, tipo, umbral, descripcion, activa, creado_en)\n        VALUES (", ", ", ", ", ", ", ", ", ", ", ", 1, ", ")"])), idorg, idsede, idusuario, tipo, valor, descripcion, ahora)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT id, idsede, tipo, umbral, descripcion, activa, ultimo_disparo\n        FROM asistente_regla_alerta WHERE idsede = ", " ORDER BY id DESC LIMIT 1"], ["\n        SELECT id, idsede, tipo, umbral, descripcion, activa, ultimo_disparo\n        FROM asistente_regla_alerta WHERE idsede = ", " ORDER BY id DESC LIMIT 1"])), idsede)];
                case 2:
                    filas = _a.sent();
                    return [2 /*return*/, aRegla(filas[0])];
            }
        });
    });
}
exports.crearRegla = crearRegla;
function borrarRegla(id, idsedes) {
    return __awaiter(this, void 0, void 0, function () {
        var ids, borradas;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ids = idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; });
                    if (ids.length === 0)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, prisma.$executeRawUnsafe("DELETE FROM asistente_regla_alerta WHERE id = ".concat(Number(id), " AND idsede IN (").concat(ids.join(','), ")"))];
                case 1:
                    borradas = _a.sent();
                    return [2 /*return*/, Number(borradas) > 0];
            }
        });
    });
}
exports.borrarRegla = borrarRegla;
function rango(desde, hasta) {
    return { periodo: 'rango', rango_start_date: desde, rango_end_date: hasta };
}
function primerDiaDelMes(fecha) {
    return "".concat(fecha.slice(0, 7), "-01");
}
/**
 * Evalua una regla y devuelve el disparo si corresponde.
 * Null significa "todo en orden", que es el caso normal y no se notifica.
 */
function evaluar(regla, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var def, meta, desde, filas, avance, filas, total, datos, porTipo, indicador, valor, comoTexto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    def = definicionDe(regla.tipo);
                    if (!(regla.tipo === 'meta_bajo_pct')) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, metas_1.metaDeSede)(regla.idsede)];
                case 1:
                    meta = _a.sent();
                    if (!meta)
                        return [2 /*return*/, null];
                    desde = primerDiaDelMes(fecha);
                    return [4 /*yield*/, dashVentas.ventasTotal(regla.idsede, rango(desde, fecha))];
                case 2:
                    filas = (_a.sent());
                    avance = (0, metas_1.avanceDeMeta)(meta, (0, agregados_1.resumenVentas)(filas).total, desde, fecha, fecha);
                    if (avance.avancePct >= regla.umbral)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            regla: regla,
                            valorActual: avance.avancePct,
                            mensaje: "Vas en ".concat(avance.avancePct, "% de la meta del mes (S/ ").concat(avance.vendido, " de S/ ").concat(avance.meta, ").")
                        }];
                case 3:
                    if (!(regla.tipo === 'ventas_dia_bajo')) return [3 /*break*/, 5];
                    return [4 /*yield*/, dashVentas.ventasTotal(regla.idsede, rango(fecha, fecha))];
                case 4:
                    filas = (_a.sent());
                    total = (0, agregados_1.resumenVentas)(filas).total;
                    if (total >= regla.umbral)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            regla: regla,
                            valorActual: total,
                            mensaje: "La venta del dia fue S/ ".concat(total, ", por debajo de los S/ ").concat(regla.umbral, " que pediste vigilar.")
                        }];
                case 5: return [4 /*yield*/, (0, alertas_1.alertasOperativas)([regla.idsede], fecha, fecha, fecha, fecha)];
                case 6:
                    datos = _a.sent();
                    porTipo = {
                        items_borrados: 'items_borrados',
                        anulaciones_monto: 'ventas_anuladas',
                        egresos_caja_monto: 'egresos_caja',
                        descuentos_monto: 'descuentos'
                    };
                    indicador = datos.indicadores.find(function (i) { return i.clave === porTipo[regla.tipo]; });
                    if (!indicador)
                        return [2 /*return*/, null];
                    valor = def.unidad === 'cantidad' ? indicador.cantidad : indicador.monto;
                    if (valor <= regla.umbral)
                        return [2 /*return*/, null];
                    comoTexto = def.unidad === 'cantidad' ? "".concat(valor) : "S/ ".concat((0, agregados_1.redondear)(valor));
                    return [2 /*return*/, {
                            regla: regla,
                            valorActual: valor,
                            mensaje: "".concat(indicador.etiqueta, ": ").concat(comoTexto, " hoy, por encima del limite que pusiste.")
                        }];
            }
        });
    });
}
/** Evalua todas las reglas activas de una sede para una fecha. */
function evaluarSede(idsede, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        var reglas, disparadas, _i, reglas_1, regla, d, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, listarReglas([idsede])];
                case 1:
                    reglas = (_a.sent()).filter(function (r) { return r.activa && r.ultimoDisparo !== fecha; });
                    disparadas = [];
                    _i = 0, reglas_1 = reglas;
                    _a.label = 2;
                case 2:
                    if (!(_i < reglas_1.length)) return [3 /*break*/, 7];
                    regla = reglas_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, evaluar(regla, fecha)];
                case 4:
                    d = _a.sent();
                    if (d)
                        disparadas.push(d);
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    console.error("[reglas] regla ".concat(regla.id, ":"), err_1);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [2 /*return*/, disparadas];
            }
        });
    });
}
exports.evaluarSede = evaluarSede;
function marcarDisparada(id, fecha) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$executeRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        UPDATE asistente_regla_alerta SET ultimo_disparo = ", " WHERE id = ", ""], ["\n        UPDATE asistente_regla_alerta SET ultimo_disparo = ", " WHERE id = ", ""])), fecha, id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.marcarDisparada = marcarDisparada;
var templateObject_1, templateObject_2, templateObject_3;
