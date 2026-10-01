"use strict";
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
exports.alertasOperativas = exports.detalleOperaciones = void 0;
var client_1 = require("@prisma/client");
var agregados_1 = require("./agregados");
var prisma = new client_1.PrismaClient();
/**
 * Umbral de anomalia: el doble que el periodo anterior, con un minimo absoluto
 * para no gritar porque se paso de 1 a 3. Es deliberadamente simple: el objetivo
 * es senalar donde mirar, no clasificar fraude.
 */
function esAnomalo(cantidad, anterior) {
    if (cantidad < 5)
        return false;
    if (anterior === 0)
        return cantidad >= 10;
    return cantidad >= anterior * 2;
}
function variacion(actual, anterior) {
    if (!anterior)
        return null;
    return (0, agregados_1.redondear)(((actual - anterior) / anterior) * 100);
}
function unaFila(sql) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var r, f;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, prisma.$queryRawUnsafe(sql)];
                case 1:
                    r = _d.sent();
                    f = (_a = r === null || r === void 0 ? void 0 : r[0]) !== null && _a !== void 0 ? _a : {};
                    return [2 /*return*/, { cantidad: Number((_b = f.cantidad) !== null && _b !== void 0 ? _b : 0), monto: (0, agregados_1.redondear)(Number((_c = f.monto) !== null && _c !== void 0 ? _c : 0)) }];
            }
        });
    });
}
function listaSedes(idsedes) {
    return idsedes.filter(function (n) { return Number.isInteger(n) && n > 0; }).join(',');
}
/** Consulta cruda: quien y cuanto, ordenado por cantidad. */
function porUsuario(sql) {
    return __awaiter(this, void 0, void 0, function () {
        var r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$queryRawUnsafe(sql)];
                case 1:
                    r = _a.sent();
                    return [2 /*return*/, (r !== null && r !== void 0 ? r : []).map(function (f) {
                            var _a, _b, _c;
                            return ({
                                usuario: String((_a = f.usuario) !== null && _a !== void 0 ? _a : 'SIN USUARIO'),
                                cantidad: Number((_b = f.cantidad) !== null && _b !== void 0 ? _b : 0),
                                monto: (0, agregados_1.redondear)(Number((_c = f.monto) !== null && _c !== void 0 ? _c : 0))
                            });
                        })];
            }
        });
    });
}
/**
 * Detalle linea por linea de una operacion.
 *
 * `alertasOperativas` responde "cuanto" y "quien"; esto responde "cual". Hace
 * falta porque la pregunta natural despues de "hubo 2 pedidos anulados" es
 * "cuales", y sin esto el asistente tenia que mandar al usuario a buscar en caja.
 */
function detalleOperaciones(tipo, idsedes, desde, hasta, limite) {
    var _a, _b;
    if (limite === void 0) { limite = 15; }
    return __awaiter(this, void 0, void 0, function () {
        var sedes, tope, entre, filas_1, salida, _i, _c, f, items, filas_2, filas_3, filas;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    sedes = listaSedes(idsedes);
                    if (!sedes)
                        return [2 /*return*/, []];
                    tope = Math.min(Math.max(limite, 1), 30);
                    entre = function (col) { return "".concat(col, " >= '").concat(desde, " 00:00:00' AND ").concat(col, " <= '").concat(hasta, " 23:59:59'"); };
                    if (!(tipo === 'pedidos_anulados')) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("\n            SELECT p.idpedido, p.numpedido, p.fecha_hora, p.total_r monto,\n                   p.motivo_anular motivo, COALESCE(u.nombres,'SIN USUARIO') usuario\n            FROM pedido p\n            LEFT JOIN usuario u ON u.idusuario = p.idusuario\n            WHERE p.idsede IN (".concat(sedes, ") AND p.estado = 3 AND ").concat(entre('p.fecha_hora'), "\n            ORDER BY p.fecha_hora DESC LIMIT ").concat(tope))];
                case 1:
                    filas_1 = _d.sent();
                    salida = [];
                    _i = 0, _c = filas_1 !== null && filas_1 !== void 0 ? filas_1 : [];
                    _d.label = 2;
                case 2:
                    if (!(_i < _c.length)) return [3 /*break*/, 5];
                    f = _c[_i];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("\n                SELECT pd.descripcion producto, pd.cantidad_r cantidad, pd.ptotal_r importe\n                FROM pedido_detalle pd\n                WHERE pd.idpedido = ".concat(Number(f.idpedido), " AND pd.estado = 0\n                ORDER BY pd.idpedido_detalle LIMIT 20"))];
                case 3:
                    items = _d.sent();
                    salida.push({
                        referencia: "Pedido ".concat((_a = f.numpedido) !== null && _a !== void 0 ? _a : f.idpedido),
                        fecha: String((_b = f.fecha_hora) !== null && _b !== void 0 ? _b : ''),
                        usuario: String(f.usuario),
                        monto: (0, agregados_1.redondear)(Number(f.monto) || 0),
                        motivo: f.motivo ? String(f.motivo) : null,
                        items: (items !== null && items !== void 0 ? items : []).map(function (i) {
                            var _a;
                            return ({
                                producto: String((_a = i.producto) !== null && _a !== void 0 ? _a : ''),
                                cantidad: Number(i.cantidad) || 0,
                                importe: (0, agregados_1.redondear)(Number(i.importe) || 0)
                            });
                        })
                    });
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, salida];
                case 6:
                    if (!(tipo === 'ventas_anuladas')) return [3 /*break*/, 8];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("\n            SELECT rp.idregistro_pago, rp.correlativo, rp.fecha_hora, rp.total monto,\n                   rp.motivo_anular motivo, COALESCE(u.nombres,'SIN USUARIO') usuario,\n                   COALESCE(up.nombres,'') autorizo\n            FROM registro_pago rp\n            LEFT JOIN usuario u ON u.idusuario = rp.idusuario\n            LEFT JOIN usuario up ON up.idusuario = rp.idusuario_permiso\n            WHERE rp.idsede IN (".concat(sedes, ") AND rp.estado = 1 AND ").concat(entre('rp.fecha_hora'), "\n            ORDER BY rp.fecha_hora DESC LIMIT ").concat(tope))];
                case 7:
                    filas_2 = _d.sent();
                    return [2 /*return*/, (filas_2 !== null && filas_2 !== void 0 ? filas_2 : []).map(function (f) {
                            var _a;
                            return ({
                                referencia: "Venta ".concat(f.correlativo || f.idregistro_pago),
                                fecha: String((_a = f.fecha_hora) !== null && _a !== void 0 ? _a : ''),
                                usuario: String(f.usuario) + (f.autorizo ? " (autorizo ".concat(f.autorizo, ")") : ''),
                                monto: (0, agregados_1.redondear)(Number(f.monto) || 0),
                                motivo: f.motivo ? String(f.motivo) : null
                            });
                        })];
                case 8:
                    if (!(tipo === 'items_borrados')) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.$queryRawUnsafe("\n            SELECT pd.descripcion producto, pd.cantidad_r cantidad, pd.ptotal_r monto,\n                   pd.motivo_borrado motivo, p.numpedido, p.fecha_hora,\n                   COALESCE(u.nombres,'SIN USUARIO') usuario\n            FROM pedido_detalle pd\n            INNER JOIN pedido p ON p.idpedido = pd.idpedido\n            LEFT JOIN usuario u ON u.idusuario = p.idusuario\n            WHERE p.idsede IN (".concat(sedes, ") AND pd.borrado = 1 AND ").concat(entre('p.fecha_hora'), "\n            ORDER BY p.fecha_hora DESC LIMIT ").concat(tope))];
                case 9:
                    filas_3 = _d.sent();
                    return [2 /*return*/, (filas_3 !== null && filas_3 !== void 0 ? filas_3 : []).map(function (f) {
                            var _a;
                            return ({
                                referencia: "".concat(f.producto, " (pedido ").concat(f.numpedido, ")"),
                                fecha: String((_a = f.fecha_hora) !== null && _a !== void 0 ? _a : ''),
                                usuario: String(f.usuario),
                                monto: (0, agregados_1.redondear)(Number(f.monto) || 0),
                                motivo: f.motivo ? String(f.motivo) : null
                            });
                        })];
                case 10: return [4 /*yield*/, prisma.$queryRawUnsafe("\n        SELECT ic.idie_caja, ic.fecha_hora, ic.monto, ic.motivo,\n               COALESCE(u.nombres,'SIN USUARIO') usuario\n        FROM ie_caja ic\n        LEFT JOIN usuario u ON u.idusuario = ic.idusuario\n        WHERE ic.idsede IN (".concat(sedes, ") AND ic.tipo = 2 AND ic.estado = 0\n          AND ").concat(entre('ic.fecha_hora'), "\n        ORDER BY CAST(ic.monto AS DECIMAL(10,2)) DESC LIMIT ").concat(tope))];
                case 11:
                    filas = _d.sent();
                    return [2 /*return*/, (filas !== null && filas !== void 0 ? filas : []).map(function (f) {
                            var _a;
                            return ({
                                referencia: "Salida de caja #".concat(f.idie_caja),
                                fecha: String((_a = f.fecha_hora) !== null && _a !== void 0 ? _a : ''),
                                usuario: String(f.usuario),
                                monto: (0, agregados_1.redondear)(Number(f.monto) || 0),
                                motivo: f.motivo ? String(f.motivo) : null
                            });
                        })];
            }
        });
    });
}
exports.detalleOperaciones = detalleOperaciones;
function alertasOperativas(idsedes, desde, hasta, desdeAnterior, hastaAnterior) {
    return __awaiter(this, void 0, void 0, function () {
        var sedes, entre, sqlBorrados, sqlPedidosAnulados, sqlVentasAnuladas, sqlDescuentos, sqlEgresos, definiciones, indicadores, _i, definiciones_1, _a, clave, etiqueta, sql, hoy, antes, borradosPorUsuario, anuladosPorUsuario, egresosPorUsuario, motivos;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sedes = listaSedes(idsedes);
                    if (!sedes)
                        return [2 /*return*/, { indicadores: [], borradosPorUsuario: [], anuladosPorUsuario: [], egresosPorUsuario: [], motivosFrecuentes: [] }];
                    entre = function (col, a, b) { return "".concat(col, " >= '").concat(a, " 00:00:00' AND ").concat(col, " <= '").concat(b, " 23:59:59'"); };
                    sqlBorrados = function (a, b) { return "\n        SELECT COUNT(*) cantidad, COALESCE(SUM(pd.ptotal_r),0) monto\n        FROM pedido_detalle pd\n        INNER JOIN pedido p ON p.idpedido = pd.idpedido\n        WHERE p.idsede IN (".concat(sedes, ") AND pd.borrado = 1 AND ").concat(entre('p.fecha_hora', a, b)); };
                    sqlPedidosAnulados = function (a, b) { return "\n        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(p.total_r AS DECIMAL(10,2))),0) monto\n        FROM pedido p\n        WHERE p.idsede IN (".concat(sedes, ") AND p.estado = 3 AND ").concat(entre('p.fecha_hora', a, b)); };
                    sqlVentasAnuladas = function (a, b) { return "\n        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))),0) monto\n        FROM registro_pago rp\n        WHERE rp.idsede IN (".concat(sedes, ") AND rp.estado = 1 AND ").concat(entre('rp.fecha_hora', a, b)); };
                    sqlDescuentos = function (a, b) { return "\n        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(rpd.importe AS DECIMAL(10,2))),0) monto\n        FROM registro_pago_descuento rpd\n        INNER JOIN registro_pago rp ON rp.idregistro_pago = rpd.idregistro_pago\n        WHERE rp.idsede IN (".concat(sedes, ") AND rpd.estado = 0 AND rp.estado = 0\n          AND CAST(rpd.importe AS DECIMAL(10,2)) > 0 AND ").concat(entre('rp.fecha_hora', a, b)); };
                    sqlEgresos = function (a, b) { return "\n        SELECT COUNT(*) cantidad, COALESCE(SUM(CAST(ic.monto AS DECIMAL(10,2))),0) monto\n        FROM ie_caja ic\n        WHERE ic.idsede IN (".concat(sedes, ") AND ic.tipo = 2 AND ic.estado = 0\n          AND ").concat(entre('ic.fecha_hora', a, b)); };
                    definiciones = [
                        ['items_borrados', 'Items borrados de pedidos', sqlBorrados],
                        ['pedidos_anulados', 'Pedidos anulados', sqlPedidosAnulados],
                        ['ventas_anuladas', 'Ventas anuladas', sqlVentasAnuladas],
                        ['descuentos', 'Descuentos aplicados', sqlDescuentos],
                        ['egresos_caja', 'Salidas de caja', sqlEgresos]
                    ];
                    indicadores = [];
                    _i = 0, definiciones_1 = definiciones;
                    _b.label = 1;
                case 1:
                    if (!(_i < definiciones_1.length)) return [3 /*break*/, 5];
                    _a = definiciones_1[_i], clave = _a[0], etiqueta = _a[1], sql = _a[2];
                    return [4 /*yield*/, unaFila(sql(desde, hasta))];
                case 2:
                    hoy = _b.sent();
                    return [4 /*yield*/, unaFila(sql(desdeAnterior, hastaAnterior))];
                case 3:
                    antes = _b.sent();
                    indicadores.push({
                        clave: clave,
                        etiqueta: etiqueta,
                        cantidad: hoy.cantidad,
                        monto: hoy.monto,
                        cantidadAnterior: antes.cantidad,
                        montoAnterior: antes.monto,
                        variacionPct: variacion(hoy.cantidad, antes.cantidad),
                        anomalo: esAnomalo(hoy.cantidad, antes.cantidad)
                    });
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [4 /*yield*/, porUsuario("\n        SELECT u.nombres usuario, COUNT(*) cantidad, COALESCE(SUM(pd.ptotal_r),0) monto\n        FROM pedido_detalle pd\n        INNER JOIN pedido p ON p.idpedido = pd.idpedido\n        LEFT JOIN usuario u ON u.idusuario = p.idusuario\n        WHERE p.idsede IN (".concat(sedes, ") AND pd.borrado = 1 AND ").concat(entre('p.fecha_hora', desde, hasta), "\n        GROUP BY u.nombres ORDER BY cantidad DESC LIMIT 5"))];
                case 6:
                    borradosPorUsuario = _b.sent();
                    return [4 /*yield*/, porUsuario("\n        SELECT u.nombres usuario, COUNT(*) cantidad,\n               COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))),0) monto\n        FROM registro_pago rp\n        LEFT JOIN usuario u ON u.idusuario = rp.idusuario\n        WHERE rp.idsede IN (".concat(sedes, ") AND rp.estado = 1 AND ").concat(entre('rp.fecha_hora', desde, hasta), "\n        GROUP BY u.nombres ORDER BY cantidad DESC LIMIT 5"))];
                case 7:
                    anuladosPorUsuario = _b.sent();
                    return [4 /*yield*/, porUsuario("\n        SELECT u.nombres usuario, COUNT(*) cantidad,\n               COALESCE(SUM(CAST(ic.monto AS DECIMAL(10,2))),0) monto\n        FROM ie_caja ic\n        LEFT JOIN usuario u ON u.idusuario = ic.idusuario\n        WHERE ic.idsede IN (".concat(sedes, ") AND ic.tipo = 2 AND ic.estado = 0\n          AND ").concat(entre('ic.fecha_hora', desde, hasta), "\n        GROUP BY u.nombres ORDER BY monto DESC LIMIT 5"))];
                case 8:
                    egresosPorUsuario = _b.sent();
                    return [4 /*yield*/, prisma.$queryRawUnsafe("\n        SELECT TRIM(pd.motivo_borrado) motivo, COUNT(*) veces\n        FROM pedido_detalle pd\n        INNER JOIN pedido p ON p.idpedido = pd.idpedido\n        WHERE p.idsede IN (".concat(sedes, ") AND pd.borrado = 1\n          AND pd.motivo_borrado IS NOT NULL AND TRIM(pd.motivo_borrado) <> ''\n          AND ").concat(entre('p.fecha_hora', desde, hasta), "\n        GROUP BY TRIM(pd.motivo_borrado) ORDER BY veces DESC LIMIT 5"))];
                case 9:
                    motivos = _b.sent();
                    return [2 /*return*/, {
                            indicadores: indicadores,
                            borradosPorUsuario: borradosPorUsuario,
                            anuladosPorUsuario: anuladosPorUsuario,
                            egresosPorUsuario: egresosPorUsuario,
                            motivosFrecuentes: (motivos !== null && motivos !== void 0 ? motivos : []).map(function (m) { return ({
                                motivo: String(m.motivo),
                                veces: Number(m.veces)
                            }); })
                        }];
            }
        });
    });
}
exports.alertasOperativas = alertasOperativas;
