"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var geocoding_service_1 = require("../services/geocoding.service");
var delivery_zonas_1 = require("../services/delivery.zonas");
var comprobante_helpers_1 = require("../services/comprobante.helpers");
var cocinar_pedido_1 = require("../services/cocinar.pedido");
var pedido_services_1 = __importDefault(require("../services/pedido.services"));
var json_print_services_1 = require("../services/json.print.services");
var ticket_image_service_1 = require("../services/ticket.image.service");
var axios_1 = __importDefault(require("axios"));
var prisma = new client_1.PrismaClient();
var router = express.Router();
// Función helper para calcular tiempo estimado con margen
var calcularTiempoEstimado = function (tiempoAproxMinutos) {
    var margenMenos = 5;
    var margenMas = 10;
    var tiempoMin = Math.max(15, tiempoAproxMinutos - margenMenos);
    var tiempoMax = tiempoAproxMinutos + margenMas;
    return "".concat(tiempoMin, "-").concat(tiempoMax, " min");
};
// Bloque `delivery` de /config y /contexto: una sola fuente de verdad del modo
// de cobro y su descripción (delivery.zonas.ts). En modo zonas expone nombres y
// precios SIN geometría (el bot no necesita coordenadas en el prompt).
var armarDeliveryConfig = function (parametros) {
    var modo = (0, delivery_zonas_1.resolverModo)(parametros);
    var zonas = modo === 'zonas' ? (0, delivery_zonas_1.validarZonas)(parametros.zonas) : [];
    return __assign(__assign({ habilitado: true, tipo: zonas.length > 0 ? 'zonas' : (modo === 'fijo' ? 'fijo' : 'distancia'), costo_base: Number(parametros.km_base_costo || 0), costo_por_km: Number(parametros.km_adicional_costo || 0), km_base: Number(parametros.km_base || 0), distancia_maxima_km: Number(parametros.km_limite || 5), calcular_advertencia: parametros.obtener_coordenadas_del_cliente, tiempo_estimado_base: calcularTiempoEstimado(Number(parametros.tiempo_aprox_entrega || 30)) }, (zonas.length > 0
        ? { zonas: zonas.map(function (z) { return ({ nombre: z.nombre, costo: z.costo, tiempo_aprox_entrega: z.tiempo_aprox_entrega }); }) }
        : {})), { descripcion: (0, delivery_zonas_1.describirDelivery)(parametros) });
};
// Normaliza una hora dicha por el cliente ("1pm", "13:00", "7.30 pm") a "HH:MM".
// Devuelve null si no se reconoce.
var normalizarHora = function (hora) {
    if (!hora)
        return null;
    var s = String(hora).trim().toLowerCase().replace(/\./g, ':').replace(/\s+/g, '');
    var m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
    if (!m)
        return null;
    var h = Number(m[1]);
    var min = Number(m[2] || 0);
    if (m[3] === 'pm' && h < 12)
        h += 12;
    if (m[3] === 'am' && h === 12)
        h = 0;
    if (h > 23 || min > 59)
        return null;
    return "".concat(String(h).padStart(2, '0'), ":").concat(String(min).padStart(2, '0'));
};
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Chatbot V2 API - Endpoints disponibles' });
        return [2 /*return*/];
    });
}); });
// Extrae el importe total del comprobante desde el resultado del SP. El SP
// devuelve un campo `datos` con el JSON del comprobante (formato SUNAT); se
// prueban las claves de total más comunes, y por si acaso columnas sueltas.
// Devuelve null si no encuentra un total confiable → verificación FAIL-CLOSED:
// sin total no se entrega el comprobante (nunca se expone uno sin verificar).
var extraerTotalComprobante = function (row) {
    var datos = row === null || row === void 0 ? void 0 : row.datos;
    if (typeof datos === 'string') {
        try {
            datos = JSON.parse(datos);
        }
        catch (_a) {
            datos = null;
        }
    }
    var candidatos = [
        datos === null || datos === void 0 ? void 0 : datos.mtoImporteTotal,
        datos === null || datos === void 0 ? void 0 : datos.total,
        datos === null || datos === void 0 ? void 0 : datos.importe_total,
        datos === null || datos === void 0 ? void 0 : datos.mto_imp_venta,
        row === null || row === void 0 ? void 0 : row.f2,
        row === null || row === void 0 ? void 0 : row.total,
        row === null || row === void 0 ? void 0 : row.importe,
    ];
    for (var _i = 0, candidatos_1 = candidatos; _i < candidatos_1.length; _i++) {
        var c = candidatos_1[_i];
        var n = Number(c);
        if (Number.isFinite(n) && n > 0)
            return n;
    }
    return null;
};
// Consulta el comprobante electrónico (boleta/factura) de un consumo para el
// chatbot. Va bajo /chatbot/* → protegido con x-api-key. Se busca por documento
// (DNI/RUC) + fecha, y SOLO se entrega si el importe total coincide con el que
// declara el cliente: el importe es un dato que solo el titular conoce, así se
// evita que un tercero pida un comprobante ajeno.
router.get('/comprobante/:idsede/:documento/:fecha/:importe', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, documento, fecha, importe, importeDeclarado_1, _dataSend, rpt, match, externalId, numeroComprobante, urlPdf, sedeApi, userId, _b, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 6, 7, 8]);
                _a = req.params, idsede = _a.idsede, documento = _a.documento, fecha = _a.fecha, importe = _a.importe;
                importeDeclarado_1 = Number(String(importe).replace(',', '.'));
                if (!documento || !fecha || !Number.isFinite(importeDeclarado_1) || importeDeclarado_1 <= 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'documento, fecha e importe son obligatorios' })];
                }
                _dataSend = {
                    idsede: Number(idsede),
                    dni: documento,
                    serie: '',
                    numero: '',
                    fecha: fecha.replace(/-/g, '/'),
                    isSearchByFecha: 1
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["call procedure_chatbot_getidexternal_comprobante(", ")"], ["call procedure_chatbot_getidexternal_comprobante(", ")"])), JSON.stringify(_dataSend))];
            case 1:
                rpt = _e.sent();
                if (!rpt || rpt.length === 0) {
                    return [2 /*return*/, res.status(200).json({ success: false })];
                }
                match = rpt.find(function (row) {
                    var total = extraerTotalComprobante(row);
                    return total != null && Math.abs(total - importeDeclarado_1) <= 0.05;
                });
                if (!match) {
                    return [2 /*return*/, res.status(200).json({ success: false })];
                }
                externalId = (_c = match.external_id) !== null && _c !== void 0 ? _c : match.f0;
                numeroComprobante = (_d = match.numero) !== null && _d !== void 0 ? _d : match.f1;
                urlPdf = void 0;
                if (!externalId) return [3 /*break*/, 5];
                _e.label = 2;
            case 2:
                _e.trys.push([2, 4, , 5]);
                return [4 /*yield*/, prisma.sede.findUnique({
                        where: { idsede: Number(idsede) }, select: { id_api_comprobante: true }
                    })];
            case 3:
                sedeApi = _e.sent();
                userId = (sedeApi === null || sedeApi === void 0 ? void 0 : sedeApi.id_api_comprobante) ? "/".concat(sedeApi.id_api_comprobante) : '';
                urlPdf = "https://apifac.papaya.com.pe/downloads/document/pdf/".concat(externalId).concat(userId);
                return [3 /*break*/, 5];
            case 4:
                _b = _e.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/, res.status(200).json(__assign({ success: true, numero_comprobante: numeroComprobante, external_id: externalId }, (urlPdf ? { url_pdf: urlPdf } : {})))];
            case 6:
                error_1 = _e.sent();
                console.error('Error en /comprobante:', error_1);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'No se pudo consultar el comprobante' })];
            case 7:
                prisma.$disconnect();
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Genera el comprobante (boleta/factura) del pedido CONFIRMADO de esta
// conversación — solo si el cliente lo solicita. Reusa la maquinaria de
// emisión de backend-pedidos (/bot/generar-comprobante). Idempotente por
// sesión: repetir la solicitud devuelve el mismo comprobante.
router.post('/generar-comprobante', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session_id_1, idorg, idsede, tipo, num_doc, val, numDoc, rows, prev, estructura, previo, antiguedadMs, _b, items, subtotales, botKey, claimed, marcar, liberar, URL_RESTOBAR, resp, d, e_1, e_2, status, _c, _d, error_2;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 24, , 25]);
                _a = req.body || {}, session_id_1 = _a.session_id, idorg = _a.idorg, idsede = _a.idsede, tipo = _a.tipo, num_doc = _a.num_doc;
                val = (0, comprobante_helpers_1.validarDocumento)(String(tipo || ''), String(num_doc || ''));
                if (!session_id_1 || !idsede || !val.ok) {
                    return [2 /*return*/, res.status(200).json({ success: false, error: val.error || 'faltan datos' })];
                }
                numDoc = String(num_doc).replace(/\D/g, '');
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT estructura, estado, idpedido, DATE(created_at) = CURDATE() AS es_hoy\n             FROM pedido_preview WHERE id = ? LIMIT 1", String(session_id_1))];
            case 1:
                rows = _f.sent();
                prev = rows === null || rows === void 0 ? void 0 : rows[0];
                if (!prev || prev.estado !== 'confirmed' || !prev.idpedido || !Number(prev.es_hoy)) {
                    return [2 /*return*/, res.status(200).json({
                            success: false,
                            error: 'no hay un pedido confirmado hoy en esta conversación; para consumos anteriores usa la consulta de comprobantes'
                        })];
                }
                estructura = typeof prev.estructura === 'string' ? JSON.parse(prev.estructura) : prev.estructura;
                previo = estructura === null || estructura === void 0 ? void 0 : estructura._comprobante;
                if (previo === null || previo === void 0 ? void 0 : previo.numero) {
                    if (String(previo.num_doc) === numDoc) {
                        return [2 /*return*/, res.status(200).json({ success: true, numero: previo.numero, url_pdf: previo.url_pdf, ya_emitido: true })];
                    }
                    return [2 /*return*/, res.status(200).json({ success: false, error: "ya se emiti\u00F3 el comprobante ".concat(previo.numero, " para este pedido; para cambios ac\u00E9rcate a caja") })];
                }
                if ((previo === null || previo === void 0 ? void 0 : previo.estado) === 'emitiendo') {
                    antiguedadMs = Date.now() - Number(previo.ts || 0);
                    if (!previo.ts || antiguedadMs > 5 * 60 * 1000) {
                        return [2 /*return*/, res.status(200).json({ success: false, error: 'el comprobante quedó en proceso; solicítalo en caja' })];
                    }
                    return [2 /*return*/, res.status(200).json({ success: false, error: 'tu comprobante se está generando, dame unos segundos y pídemelo de nuevo' })];
                }
                if ((previo === null || previo === void 0 ? void 0 : previo.estado) === 'bloqueado') {
                    return [2 /*return*/, res.status(200).json({ success: false, error: previo.error || 'el comprobante quedó en proceso; solicítalo en caja' })];
                }
                _b = (0, comprobante_helpers_1.mapearEstructuraAComprobante)(estructura), items = _b.items, subtotales = _b.subtotales;
                if (!items[0].items.length || !subtotales.length) {
                    return [2 /*return*/, res.status(200).json({ success: false, error: 'no se pudo leer el detalle del pedido; solicítalo en caja' })];
                }
                botKey = process.env.CHATBOT_BOT_KEY || '';
                if (!botKey) {
                    return [2 /*return*/, res.status(200).json({ success: false, error: 'la emisión de comprobantes no está habilitada todavía; solicítalo en caja' })];
                }
                return [4 /*yield*/, prisma.$executeRawUnsafe("UPDATE pedido_preview\n             SET estructura = JSON_SET(estructura, '$._comprobante', CAST(? AS JSON))\n             WHERE id = ? AND JSON_EXTRACT(estructura, '$._comprobante') IS NULL", JSON.stringify({ estado: 'emitiendo', ts: Date.now() }), String(session_id_1))];
            case 2:
                claimed = _f.sent();
                if (Number(claimed) === 0) {
                    return [2 /*return*/, res.status(200).json({ success: false, error: 'tu comprobante se está generando, dame unos segundos y pídemelo de nuevo' })];
                }
                marcar = function (obj) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE pedido_preview SET estructura = JSON_SET(estructura, '$._comprobante', CAST(? AS JSON)) WHERE id = ?", JSON.stringify(obj), String(session_id_1))];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                liberar = function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE pedido_preview SET estructura = JSON_REMOVE(estructura, '$._comprobante') WHERE id = ?", String(session_id_1))];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                _f.label = 3;
            case 3:
                _f.trys.push([3, 13, , 23]);
                URL_RESTOBAR = process.env.URL_RESTOBAR || 'http://localhost:3000';
                return [4 /*yield*/, axios_1["default"].post("".concat(URL_RESTOBAR, "/bot/generar-comprobante"), {
                        idorg: Number(idorg), idsede: Number(idsede), idpedido: Number(prev.idpedido),
                        tipo: tipo,
                        num_doc: numDoc,
                        items: items,
                        subtotales: subtotales
                    }, { timeout: 40000, headers: { 'x-bot-key': botKey } })];
            case 4:
                resp = _f.sent();
                d = resp.data;
                if (!!(d === null || d === void 0 ? void 0 : d.success)) return [3 /*break*/, 9];
                if (!((d === null || d === void 0 ? void 0 : d.reintentable) === false)) return [3 /*break*/, 6];
                // Estado incierto o definitivo (apifac caído, montos, sede):
                // bloquear reintentos del bot para no duplicar documentos.
                return [4 /*yield*/, marcar({ estado: 'bloqueado', error: (d === null || d === void 0 ? void 0 : d.error) || 'el comprobante quedó en proceso; solicítalo en caja' })];
            case 5:
                // Estado incierto o definitivo (apifac caído, montos, sede):
                // bloquear reintentos del bot para no duplicar documentos.
                _f.sent();
                return [3 /*break*/, 8];
            case 6: 
            // Error corregible (ej. RUC mal escrito): liberar para reintento.
            return [4 /*yield*/, liberar()];
            case 7:
                // Error corregible (ej. RUC mal escrito): liberar para reintento.
                _f.sent();
                _f.label = 8;
            case 8: return [2 /*return*/, res.status(200).json({ success: false, error: (d === null || d === void 0 ? void 0 : d.error) || 'no se pudo emitir el comprobante en este momento' })];
            case 9:
                _f.trys.push([9, 11, , 12]);
                return [4 /*yield*/, marcar({ numero: d.numero, url_pdf: d.url_pdf, num_doc: numDoc, external_id: d.external_id })];
            case 10:
                _f.sent();
                return [3 /*break*/, 12];
            case 11:
                e_1 = _f.sent();
                console.error("generar-comprobante: EMITIDO ".concat(d.numero, " (").concat(d.external_id, ") pero NO persistido para sesi\u00F3n ").concat(session_id_1, ":"), e_1 === null || e_1 === void 0 ? void 0 : e_1.message);
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/, res.status(200).json({ success: true, numero: d.numero, url_pdf: d.url_pdf })];
            case 13:
                e_2 = _f.sent();
                status = (_e = e_2 === null || e_2 === void 0 ? void 0 : e_2.response) === null || _e === void 0 ? void 0 : _e.status;
                if (!(status === 401 || status === 403)) return [3 /*break*/, 18];
                console.error('generar-comprobante: backend-pedidos rechazó la key (CHATBOT_BOT_KEY desincronizada)');
                _f.label = 14;
            case 14:
                _f.trys.push([14, 16, , 17]);
                return [4 /*yield*/, liberar()];
            case 15:
                _f.sent();
                return [3 /*break*/, 17];
            case 16:
                _c = _f.sent();
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/, res.status(200).json({ success: false, error: 'la emisión de comprobantes no está disponible en este momento; solicítalo en caja' })];
            case 18:
                // Red caída a mitad de camino = estado incierto: NO liberar (el CPE
                // pudo emitirse); que lo resuelva caja antes que duplicar.
                console.error('generar-comprobante: fallo llamando a backend-pedidos:', e_2 === null || e_2 === void 0 ? void 0 : e_2.message);
                _f.label = 19;
            case 19:
                _f.trys.push([19, 21, , 22]);
                return [4 /*yield*/, marcar({ estado: 'bloqueado', error: 'el comprobante quedó en proceso; solicítalo en caja' })];
            case 20:
                _f.sent();
                return [3 /*break*/, 22];
            case 21:
                _d = _f.sent();
                return [3 /*break*/, 22];
            case 22: return [2 /*return*/, res.status(200).json({ success: false, error: 'no se pudo generar el comprobante en este momento; solicítalo en caja' })];
            case 23: return [3 /*break*/, 25];
            case 24:
                error_2 = _f.sent();
                console.error('Error en /generar-comprobante:', error_2 === null || error_2 === void 0 ? void 0 : error_2.message);
                return [2 /*return*/, res.status(200).json({ success: false, error: 'no se pudo generar el comprobante en este momento; puedes pedirlo en caja' })];
            case 25: return [2 /*return*/];
        }
    });
}); });
router.get("/cliente/:idorg/:idsede/:telefono", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, telefono, telefonoSinCodigo, cliente, totalPedidos, ultimoPedido, direccionPwa, direccionCliente, error_3;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 5, , 6]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede, telefono = _a.telefono;
                telefonoSinCodigo = telefono.replace(/\D/g, '').replace(/^(51)?/, '');
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"])), idsede, idorg, '%' + telefonoSinCodigo + '%')];
            case 1:
                cliente = _d.sent();
                if (!cliente || cliente.length === 0) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            encontrado: false,
                            cliente: null,
                            descripcion: 'Cliente no encontrado en la base de datos'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n            SELECT COUNT(*) as total FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"], ["\n            SELECT COUNT(*) as total FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"])), cliente[0].idcliente, idsede)];
            case 2:
                totalPedidos = _d.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            SELECT fecha, hora FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            ORDER BY idpedido DESC LIMIT 1"], ["\n            SELECT fecha, hora FROM pedido \n            WHERE idcliente = ", " \n            AND idsede = ", "\n            ORDER BY idpedido DESC LIMIT 1"])), cliente[0].idcliente, idsede)];
            case 3:
                ultimoPedido = _d.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n            SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude, cpd.ciudad, cpd.provincia\n            FROM cliente_pwa_direccion cpd\n            WHERE cpd.idcliente = ", "\n            ORDER BY cpd.idcliente_pwa_direccion DESC\n            LIMIT 1"], ["\n            SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude, cpd.ciudad, cpd.provincia\n            FROM cliente_pwa_direccion cpd\n            WHERE cpd.idcliente = ", "\n            ORDER BY cpd.idcliente_pwa_direccion DESC\n            LIMIT 1"])), cliente[0].idcliente)];
            case 4:
                direccionPwa = _d.sent();
                direccionCliente = direccionPwa && direccionPwa.length > 0
                    ? {
                        idcliente_pwa_direccion: direccionPwa[0].idcliente_pwa_direccion,
                        direccion: direccionPwa[0].direccion,
                        referencia: direccionPwa[0].referencia,
                        latitude: direccionPwa[0].latitude,
                        longitude: direccionPwa[0].longitude,
                        ciudad: direccionPwa[0].ciudad,
                        provincia: direccionPwa[0].provincia
                    }
                    : {
                        idcliente_pwa_direccion: null,
                        direccion: cliente[0].direccion || '',
                        referencia: '',
                        latitude: '',
                        longitude: '',
                        ciudad: '',
                        provincia: ''
                    };
                res.status(200).json({
                    success: true,
                    encontrado: true,
                    cliente: {
                        id: cliente[0].idcliente,
                        nombre: cliente[0].nombres,
                        telefono: cliente[0].telefono,
                        direccion: direccionCliente,
                        total_pedidos: ((_b = totalPedidos[0]) === null || _b === void 0 ? void 0 : _b.total) || 0,
                        ultimo_pedido: ((_c = ultimoPedido[0]) === null || _c === void 0 ? void 0 : _c.fecha) || null
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_3 = _d.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al buscar cliente'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get("/menu/:idorg/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, rpt, carta, menuPlano, productos_1, itemsVistos_1, error_4;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_6 || (templateObject_6 = __makeTemplateObject(["call porcedure_pwa_pedido_carta(", ",", ",1)"], ["call porcedure_pwa_pedido_carta(", ",", ",1)"])), idorg, idsede)];
            case 1:
                rpt = _c.sent();
                carta = ((_b = rpt[0]) === null || _b === void 0 ? void 0 : _b.f0) || [];
                menuPlano = [];
                productos_1 = [];
                itemsVistos_1 = new Set();
                carta.forEach(function (categoria) {
                    var _a;
                    (_a = categoria.secciones) === null || _a === void 0 ? void 0 : _a.forEach(function (seccion) {
                        var _a;
                        (_a = seccion.items) === null || _a === void 0 ? void 0 : _a.forEach(function (item) {
                            var claveUnica = "".concat(item.iditem, "-").concat(item.des);
                            if (itemsVistos_1.has(claveUnica)) {
                                return;
                            }
                            itemsVistos_1.add(claveUnica);
                            var stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                            productos_1.push({
                                iditem: item.iditem,
                                idseccion: seccion.idseccion,
                                descripcion: item.des,
                                precio: Number(item.precio),
                                stock: stockNumerico
                            });
                        });
                    });
                });
                res.status(200).json({
                    success: true,
                    menu: productos_1
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _c.sent();
                console.error('Error en consultar_menu:', error_4);
                res.status(500).json({
                    success: false,
                    error: 'Error al consultar menu'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/calcular-delivery", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, direccion, referencia, session_id_2, lat, lon, latCliente, lonCliente, tieneGPS, sedeConfig, parametros, modo, tiempoGlobal, persistirDireccion, costo_1, direccionLegible_1, rev, zonas, sede, sedeTieneCoords, distanciaMaxima, ciudades, resultadoDistancia, desdeGuardada, direccionLegible, distancia, rev, coordsGuardadas, telefonoSesion, normalizar, dirPedida, guardadas, _i, _b, g, dirGuardada, lat_1, lng, error_5, distanciaGuardada, decision, costoEstimado, yaSugerida, prevPreview, prevDir, _c, distanciaKm, costo, tiempoMin, zonaNombre, margenZonasKm, r, costoEstimadoZona, kmBase, costoAdicional, costoBase, pedirReferencia, partesMensaje, error_6;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 30, , 31]);
                _a = req.body, idorg = _a.idorg, idsede = _a.idsede, direccion = _a.direccion, referencia = _a.referencia, session_id_2 = _a.session_id, lat = _a.lat, lon = _a.lon;
                latCliente = Number(lat);
                lonCliente = Number(lon);
                tieneGPS = Number.isFinite(latCliente) && Number.isFinite(lonCliente)
                    && latCliente !== 0 && lonCliente !== 0;
                if (!direccion && !tieneGPS) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Direccion es requerida'
                        })];
                }
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 1:
                sedeConfig = _d.sent();
                if (!sedeConfig) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Configuracion de delivery no encontrada'
                        })];
                }
                parametros = sedeConfig.parametros || {};
                modo = (0, delivery_zonas_1.resolverModo)(parametros);
                tiempoGlobal = Number(parametros.tiempo_aprox_entrega || 30);
                persistirDireccion = function (direccionData) { return __awaiter(void 0, void 0, void 0, function () {
                    var existingPreview;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!session_id_2)
                                    return [2 /*return*/];
                                return [4 /*yield*/, prisma.pedido_preview.findFirst({
                                        where: { id: session_id_2 }
                                    })];
                            case 1:
                                existingPreview = _a.sent();
                                if (!existingPreview) return [3 /*break*/, 3];
                                return [4 /*yield*/, prisma.pedido_preview.update({
                                        where: { id: session_id_2 },
                                        data: { direccion_cliente: direccionData }
                                    })];
                            case 2:
                                _a.sent();
                                return [3 /*break*/, 5];
                            case 3: return [4 /*yield*/, prisma.pedido_preview.create({
                                    data: {
                                        id: session_id_2,
                                        estructura: JSON.stringify({}),
                                        ticket_formateado: '',
                                        estado: 'pending',
                                        direccion_cliente: direccionData
                                    }
                                })];
                            case 4:
                                _a.sent();
                                _a.label = 5;
                            case 5: return [2 /*return*/];
                        }
                    });
                }); };
                if (!(modo === 'fijo')) return [3 /*break*/, 5];
                costo_1 = Number(parametros.costo_fijo || 0) || Number(parametros.km_base_costo || 0);
                direccionLegible_1 = direccion;
                rev = {};
                if (!(tieneGPS && (!direccion || String(direccion).toUpperCase() === 'GPS'))) return [3 /*break*/, 3];
                return [4 /*yield*/, geocoding_service_1.GeocodingService.obtenerDireccion(latCliente, lonCliente)];
            case 2:
                rev = _d.sent();
                direccionLegible_1 = rev.success && rev.direccion
                    ? rev.direccion
                    : "Ubicaci\u00F3n GPS (".concat(latCliente.toFixed(5), ", ").concat(lonCliente.toFixed(5), ")");
                _d.label = 3;
            case 3: return [4 /*yield*/, persistirDireccion({
                    direccion: direccionLegible_1,
                    referencia: referencia || '',
                    latitude: tieneGPS ? latCliente : null,
                    longitude: tieneGPS ? lonCliente : null,
                    ciudad: rev.ciudad || '',
                    provincia: rev.provincia || '',
                    departamento: rev.departamento || '',
                    pais: rev.pais || '',
                    codigo: rev.codigo || '',
                    distancia_km: 0,
                    costo_delivery: Number(costo_1.toFixed(2)),
                    verificada: true
                })];
            case 4:
                _d.sent();
                return [2 /*return*/, res.status(200).json({
                        success: true,
                        disponible: true,
                        costo: Number(costo_1.toFixed(2)),
                        distancia_km: 0,
                        // BUG D: antes hardcodeaba 10 min ignorando tiempo_aprox_entrega.
                        tiempo_estimado: calcularTiempoEstimado(tiempoGlobal),
                        mensaje: "Costo fijo de delivery",
                        direccion: direccionLegible_1
                    })];
            case 5:
                zonas = modo === 'zonas' ? (0, delivery_zonas_1.validarZonas)(parametros.zonas) : [];
                if (modo === 'zonas' && zonas.length === 0) {
                    // Misconfig del panel: no tumbar el delivery de la sede.
                    console.warn('calcular-delivery: modo zonas sin zonas válidas, fallback a variable', { idsede: idsede });
                    modo = 'variable';
                }
                return [4 /*yield*/, prisma.sede.findUnique({
                        where: { idsede: Number(idsede) },
                        select: {
                            latitude: true,
                            longitude: true
                        }
                    })];
            case 6:
                sede = _d.sent();
                sedeTieneCoords = Boolean(sede && sede.latitude && sede.longitude);
                // En zonas la contención no necesita las coordenadas de la sede; solo se
                // exigen para geocodificar direcciones de texto (sesgo por cercanía).
                if (!sedeTieneCoords && !(modo === 'zonas' && tieneGPS)) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Coordenadas del comercio no configuradas'
                        })];
                }
                distanciaMaxima = Number(parametros.km_limite || 10);
                ciudades = [];
                if (sedeConfig.ciudades) {
                    ciudades = sedeConfig.ciudades
                        .split(',')
                        .filter(function (c) { return c.length > 0; });
                }
                resultadoDistancia = void 0;
                desdeGuardada = false;
                direccionLegible = direccion;
                if (!tieneGPS) return [3 /*break*/, 9];
                distancia = sedeTieneCoords
                    ? (0, geocoding_service_1.estimarKmRuta)(geocoding_service_1.GeocodingService.calcularDistanciaHaversine(Number(sede.latitude), Number(sede.longitude), latCliente, lonCliente))
                    : 0;
                // km_limite solo gobierna el modo variable: en zonas la cobertura la
                // deciden las zonas dibujadas. Con GPS las coordenadas son reales:
                // el rechazo es legítimo, pero el bot NUNCA debe ofrecer recojo
                // como alternativa (el cliente pidió delivery; espantó ventas).
                if (modo === 'variable' && distancia > distanciaMaxima) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            disponible: false,
                            accion: 'Discúlpate con empatía. NO ofrezcas recojo en local ni otras alternativas salvo que el cliente las pida.',
                            mensaje: "Direcci\u00F3n fuera del rango de cobertura (".concat(distancia.toFixed(2), " km, m\u00E1ximo ").concat(distanciaMaxima, " km)")
                        })];
                }
                rev = {};
                if (!(!direccion || direccion.toUpperCase() === 'GPS')) return [3 /*break*/, 8];
                return [4 /*yield*/, geocoding_service_1.GeocodingService.obtenerDireccion(latCliente, lonCliente)];
            case 7:
                rev = _d.sent();
                direccionLegible = rev.success && rev.direccion
                    ? rev.direccion
                    : "Ubicaci\u00F3n GPS (".concat(latCliente.toFixed(5), ", ").concat(lonCliente.toFixed(5), ")");
                _d.label = 8;
            case 8:
                resultadoDistancia = {
                    success: true,
                    lat: latCliente,
                    lng: lonCliente,
                    distanciaKm: distancia,
                    ciudad: rev.ciudad || '',
                    provincia: rev.provincia || '',
                    departamento: rev.departamento || '',
                    pais: rev.pais || '',
                    codigo: rev.codigo || ''
                };
                return [3 /*break*/, 17];
            case 9:
                coordsGuardadas = null;
                _d.label = 10;
            case 10:
                _d.trys.push([10, 13, , 14]);
                telefonoSesion = String(session_id_2 || '').split('_')[0].replace(/\D/g, '');
                if (!(telefonoSesion.length >= 6 && direccion)) return [3 /*break*/, 12];
                normalizar = function (s) { return String(s || '')
                    .toLowerCase()
                    .normalize('NFD').replace(/[̀-ͯ]/g, '')
                    .replace(/[^a-z0-9]/g, ''); };
                dirPedida = normalizar(direccion);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n                        SELECT cpd.direccion, cpd.latitude, cpd.longitude\n                        FROM cliente_pwa_direccion cpd\n                        INNER JOIN cliente c ON c.idcliente = cpd.idcliente\n                        WHERE REPLACE(c.telefono, ' ', '') LIKE ", "\n                        ORDER BY cpd.idcliente_pwa_direccion DESC\n                        LIMIT 3"], ["\n                        SELECT cpd.direccion, cpd.latitude, cpd.longitude\n                        FROM cliente_pwa_direccion cpd\n                        INNER JOIN cliente c ON c.idcliente = cpd.idcliente\n                        WHERE REPLACE(c.telefono, ' ', '') LIKE ", "\n                        ORDER BY cpd.idcliente_pwa_direccion DESC\n                        LIMIT 3"])), '%' + telefonoSesion + '%')];
            case 11:
                guardadas = _d.sent();
                for (_i = 0, _b = guardadas || []; _i < _b.length; _i++) {
                    g = _b[_i];
                    dirGuardada = normalizar(g.direccion);
                    lat_1 = Number(g.latitude);
                    lng = Number(g.longitude);
                    if (dirPedida.length >= 10 && dirGuardada.length >= 10
                        && (dirPedida.includes(dirGuardada) || dirGuardada.includes(dirPedida))
                        && Number.isFinite(lat_1) && Number.isFinite(lng) && lat_1 !== 0 && lng !== 0) {
                        coordsGuardadas = { lat: lat_1, lng: lng, direccion: g.direccion };
                        break;
                    }
                }
                _d.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                error_5 = _d.sent();
                console.error('calcular-delivery: fallo buscando direccion guardada, sigue geocoding:', error_5.message);
                return [3 /*break*/, 14];
            case 14:
                if (!coordsGuardadas) return [3 /*break*/, 15];
                distanciaGuardada = (0, geocoding_service_1.estimarKmRuta)(geocoding_service_1.GeocodingService.calcularDistanciaHaversine(Number(sede.latitude), Number(sede.longitude), coordsGuardadas.lat, coordsGuardadas.lng));
                console.log("calcular-delivery: direccion guardada reusada (\"".concat(coordsGuardadas.direccion, "\", ").concat(distanciaGuardada, " km) \u2014 sin geocoding"));
                desdeGuardada = true;
                direccionLegible = coordsGuardadas.direccion;
                resultadoDistancia = {
                    success: true,
                    lat: coordsGuardadas.lat,
                    lng: coordsGuardadas.lng,
                    distanciaKm: distanciaGuardada,
                    confianza: 'alta',
                    ciudad: '', provincia: '', departamento: '', pais: '', codigo: ''
                };
                if (modo === 'variable' && distanciaGuardada > distanciaMaxima) {
                    resultadoDistancia = {
                        success: false,
                        fueraDeCobertura: true,
                        error: "Direcci\u00F3n fuera del rango de cobertura (".concat(distanciaGuardada.toFixed(2), " km, m\u00E1ximo ").concat(distanciaMaxima, " km)")
                    };
                }
                return [3 /*break*/, 17];
            case 15: return [4 /*yield*/, geocoding_service_1.GeocodingService.calcularDistanciaPorRango(direccion, Number(sede.latitude), Number(sede.longitude), 
                // 999999 neutraliza el gate interno del servicio en modo zonas:
                // ahí la cobertura la deciden las zonas, no km_limite.
                modo === 'zonas' ? 999999 : distanciaMaxima, ciudades)];
            case 16:
                resultadoDistancia = _d.sent();
                _d.label = 17;
            case 17:
                decision = (0, delivery_zonas_1.decidirDireccionTexto)(resultadoDistancia, modo, distanciaMaxima);
                if (!(decision === 'costo_base')) return [3 /*break*/, 23];
                costoEstimado = modo === 'zonas' && zonas.length > 0
                    ? Math.min.apply(Math, zonas.map(function (z) { return z.costo; })) : Number(parametros.km_base_costo || 0);
                yaSugerida = false;
                _d.label = 18;
            case 18:
                _d.trys.push([18, 20, , 21]);
                return [4 /*yield*/, prisma.pedido_preview.findFirst({
                        where: { id: session_id_2 }, select: { direccion_cliente: true }
                    })];
            case 19:
                prevPreview = _d.sent();
                prevDir = typeof (prevPreview === null || prevPreview === void 0 ? void 0 : prevPreview.direccion_cliente) === 'string'
                    ? JSON.parse(prevPreview.direccion_cliente)
                    : prevPreview === null || prevPreview === void 0 ? void 0 : prevPreview.direccion_cliente;
                yaSugerida = (prevDir === null || prevDir === void 0 ? void 0 : prevDir.ubicacion_sugerida) === true;
                return [3 /*break*/, 21];
            case 20:
                _c = _d.sent();
                return [3 /*break*/, 21];
            case 21: return [4 /*yield*/, persistirDireccion({
                    direccion: direccion,
                    referencia: referencia || '',
                    latitude: null,
                    longitude: null,
                    ciudad: '', provincia: '', departamento: '', pais: '', codigo: '',
                    distancia_km: 0,
                    costo_delivery: Number(costoEstimado.toFixed(2)),
                    verificada: false,
                    ubicacion_sugerida: true
                })];
            case 22:
                _d.sent();
                return [2 /*return*/, res.status(200).json({
                        success: true,
                        disponible: true,
                        costo: Number(costoEstimado.toFixed(2)),
                        distancia_km: 0,
                        tiempo_estimado: calcularTiempoEstimado(tiempoGlobal),
                        direccion: direccion,
                        direccion_no_verificada: true,
                        mensaje: yaSugerida || referencia
                            ? 'Costo de delivery aplicado. Continúa el pedido con normalidad; NO le digas al cliente que no encontraste su dirección.'
                            : 'Costo de delivery aplicado y el pedido CONTINÚA. NO le digas al cliente que no encontraste su dirección ni le exijas nada: solo pídele en una línea, junto con el siguiente paso del pedido, una referencia para que el repartidor llegue sin problemas, o que comparta su ubicación (clip 📎 → Ubicación). Si no responde eso, el pedido sigue igual.'
                    })];
            case 23:
                distanciaKm = resultadoDistancia.distanciaKm;
                costo = void 0;
                tiempoMin = tiempoGlobal;
                zonaNombre = void 0;
                if (!(modo === 'zonas')) return [3 /*break*/, 27];
                margenZonasKm = Number(parametros.zonas_margen_km) > 0 ? Number(parametros.zonas_margen_km) : 1;
                r = (0, delivery_zonas_1.resolverZona)(zonas, {
                    lat: Number(resultadoDistancia.lat),
                    lng: Number(resultadoDistancia.lng)
                }, margenZonasKm);
                if (!!r.cubierto) return [3 /*break*/, 26];
                if (!!tieneGPS) return [3 /*break*/, 25];
                costoEstimadoZona = Math.min.apply(Math, zonas.map(function (z) { return z.costo; }));
                return [4 /*yield*/, persistirDireccion({
                        direccion: direccionLegible,
                        referencia: referencia || '',
                        latitude: null, longitude: null,
                        ciudad: '', provincia: '', departamento: '', pais: '', codigo: '',
                        distancia_km: 0,
                        costo_delivery: Number(costoEstimadoZona.toFixed(2)),
                        verificada: false,
                        ubicacion_sugerida: true
                    })];
            case 24:
                _d.sent();
                return [2 /*return*/, res.status(200).json({
                        success: true,
                        disponible: true,
                        costo: Number(costoEstimadoZona.toFixed(2)),
                        distancia_km: 0,
                        tiempo_estimado: calcularTiempoEstimado(tiempoGlobal),
                        direccion: direccionLegible,
                        direccion_no_verificada: true,
                        mensaje: 'Costo de delivery aplicado y el pedido CONTINÚA. NO le digas al cliente que no encontraste su dirección: solo sugiérele en una línea, junto con el siguiente paso, que si puede comparta su ubicación (clip 📎 → Ubicación) para que el repartidor llegue más rápido.'
                    })];
            case 25: 
            // GPS real fuera de las zonas: rechazo legítimo, sin ofrecer recojo.
            return [2 /*return*/, res.status(200).json({
                    success: true,
                    disponible: false,
                    accion: 'Discúlpate con empatía. NO ofrezcas recojo en local ni otras alternativas salvo que el cliente las pida.',
                    mensaje: 'Lo sentimos, esa dirección está fuera de nuestras zonas de reparto 😔'
                })];
            case 26:
                costo = r.zona.costo;
                tiempoMin = Number(r.zona.tiempo_aprox_entrega || 0) || tiempoGlobal;
                zonaNombre = r.zona.nombre;
                return [3 /*break*/, 28];
            case 27:
                kmBase = Number(parametros.km_base || 2);
                costoAdicional = Number(parametros.km_adicional_costo || 0);
                costoBase = Number(parametros.km_base_costo || 0);
                costo = (0, delivery_zonas_1.costoVariable)(distanciaKm, kmBase, costoBase, costoAdicional);
                _d.label = 28;
            case 28: return [4 /*yield*/, persistirDireccion(__assign({ direccion: direccionLegible, referencia: referencia || '', latitude: resultadoDistancia.lat, longitude: resultadoDistancia.lng, ciudad: resultadoDistancia.ciudad || '', provincia: resultadoDistancia.provincia || '', departamento: resultadoDistancia.departamento || '', pais: resultadoDistancia.pais || '', codigo: resultadoDistancia.codigo || '', distancia_km: distanciaKm, costo_delivery: Number(costo.toFixed(2)), verificada: true }, (zonaNombre ? { zona: zonaNombre } : {})))];
            case 29:
                _d.sent();
                pedirReferencia = !tieneGPS && !referencia && !desdeGuardada;
                partesMensaje = __spreadArray(__spreadArray([], (zonaNombre ? ["Zona de reparto: ".concat(zonaNombre, ".")] : []), true), (pedirReferencia ? ['Mientras continúas con el pedido, pídele en una línea una referencia para que el repartidor llegue sin problemas, o que comparta su ubicación (clip 📎 → Ubicación). NO bloquees el pedido esperando esa respuesta.'] : []), true);
                res.status(200).json(__assign(__assign(__assign({ success: true, disponible: true, costo: Number(costo.toFixed(2)), distancia_km: distanciaKm, tiempo_estimado: calcularTiempoEstimado(tiempoMin) }, (zonaNombre ? { zona: zonaNombre } : {})), (partesMensaje.length ? { mensaje: partesMensaje.join(' ') } : {})), { 
                    // Dirección legible (reverse geocoding si vino GPS): el bot DEBE usarla
                    // como la dirección del pedido en vez de "GPS".
                    direccion: direccionLegible }));
                return [3 /*break*/, 31];
            case 30:
                error_6 = _d.sent();
                console.error('Error en calcular_delivery:', error_6);
                res.status(500).json({
                    success: false,
                    error: 'Error al calcular delivery'
                });
                return [3 /*break*/, 31];
            case 31: return [2 /*return*/];
        }
    });
}); });
router.get("/config/:idsede", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, sede, sedeConfig, tiposEntrega, metodosPago, idsAceptados_1, horariosDB, horaActual, diaActual, mapaDias_1, horarioAtencion_1, horarioPrincipal_1, diasArray, parametros, estaAbierto, nombreDiaActual, horaActualStr, horaAbre, horaCierra, generarMensajeHorario, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                idsede = req.params.idsede;
                return [4 /*yield*/, prisma.sede.findFirst({
                        where: {
                            idsede: Number(idsede)
                        },
                        select: {
                            nombre: true,
                            telefono: true,
                            direccion: true,
                            latitude: true,
                            longitude: true,
                            metodo_pago_aceptados_chatbot: true,
                            numero_billetera_chatbot: true,
                            link_carta: true
                        }
                    })];
            case 1:
                sede = _a.sent();
                if (!sede) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 2:
                sedeConfig = _a.sent();
                return [4 /*yield*/, prisma.tipo_consumo.findMany({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_consumo: true,
                            descripcion: true
                        }
                    })];
            case 3:
                tiposEntrega = _a.sent();
                return [4 /*yield*/, prisma.tipo_pago.findMany({
                        where: {
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_pago: true,
                            descripcion: true
                        }
                    })];
            case 4:
                metodosPago = _a.sent();
                idsAceptados_1 = String(sede.metodo_pago_aceptados_chatbot || '')
                    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (idsAceptados_1.length > 0) {
                    metodosPago = metodosPago.filter(function (mp) { return idsAceptados_1.includes(String(mp.idtipo_pago)); });
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"], ["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"])), idsede)];
            case 5:
                horariosDB = _a.sent();
                horaActual = new Date();
                diaActual = horaActual.getDay();
                mapaDias_1 = {
                    '1': 'domingo',
                    '2': 'lunes',
                    '3': 'martes',
                    '4': 'miercoles',
                    '5': 'jueves',
                    '6': 'viernes',
                    '7': 'sabado'
                };
                horarioAtencion_1 = {
                    lunes: { abre: "11:00", cierra: "22:00" },
                    martes: { abre: "11:00", cierra: "22:00" },
                    miercoles: { abre: "11:00", cierra: "22:00" },
                    jueves: { abre: "11:00", cierra: "22:00" },
                    viernes: { abre: "11:00", cierra: "23:00" },
                    sabado: { abre: "11:00", cierra: "23:00" },
                    domingo: { abre: "12:00", cierra: "21:00" }
                };
                if (horariosDB && horariosDB.length > 0) {
                    horarioPrincipal_1 = horariosDB[0];
                    diasArray = horarioPrincipal_1.numdia.split(',').filter(function (d) { return d; });
                    diasArray.forEach(function (numDia) {
                        var nombreDia = mapaDias_1[numDia];
                        if (nombreDia) {
                            horarioAtencion_1[nombreDia] = {
                                abre: horarioPrincipal_1.hora_inicio,
                                cierra: horarioPrincipal_1.hora_fin
                            };
                        }
                    });
                }
                parametros = (sedeConfig === null || sedeConfig === void 0 ? void 0 : sedeConfig.parametros) || {};
                estaAbierto = false;
                nombreDiaActual = mapaDias_1[diaActual === 0 ? '1' : (diaActual + 1).toString()];
                if (nombreDiaActual && horarioAtencion_1[nombreDiaActual]) {
                    horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                    horaAbre = horarioAtencion_1[nombreDiaActual].abre;
                    horaCierra = horarioAtencion_1[nombreDiaActual].cierra;
                    estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
                }
                generarMensajeHorario = function () {
                    var dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                    var horariosUnicos = {};
                    dias.forEach(function (dia) {
                        var horario = horarioAtencion_1[dia];
                        var key = "".concat(horario.abre, "-").concat(horario.cierra);
                        if (!horariosUnicos[key]) {
                            horariosUnicos[key] = [];
                        }
                        horariosUnicos[key].push(dia);
                    });
                    var mensajes = Object.entries(horariosUnicos).map(function (_a) {
                        var horario = _a[0], diasArray = _a[1];
                        var _b = horario.split('-'), abre = _b[0], cierra = _b[1];
                        var diasTexto = diasArray.length === 7 ? 'Todos los días' :
                            diasArray.map(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ');
                        return "".concat(diasTexto, ": ").concat(abre, " - ").concat(cierra);
                    });
                    return "Estamos cerrados. Nuestro horario de atenci\u00F3n: ".concat(mensajes.join('. '));
                };
                res.status(200).json({
                    success: true,
                    config: {
                        nombre_negocio: sede.nombre,
                        telefono_negocio: sede.telefono,
                        direccion: sede.direccion,
                        latitud: sede.latitude,
                        longitud: sede.longitude,
                        horario_atencion: horarioAtencion_1,
                        esta_abierto: estaAbierto,
                        hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        mensaje_cerrado: generarMensajeHorario(),
                        tipos_consumo: tiposEntrega.map(function (te) { return ({
                            id: te.idtipo_consumo.toString(),
                            nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
                        }); }),
                        delivery: armarDeliveryConfig(parametros),
                        metodos_pago: metodosPago.map(function (mp) { return ({
                            id: mp.idtipo_pago.toString(),
                            nombre: mp.descripcion,
                            activo: true
                        }); }),
                        mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
                        activo: true,
                        link_carta: sede.link_carta
                    }
                });
                return [3 /*break*/, 7];
            case 6:
                error_7 = _a.sent();
                console.error('Error en obtener_config_negocio:', error_7);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener configuracion'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
router.post("/resumen-pedido", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session_id, idsede, items, tipo_entrega, direccion, costo_delivery, cliente_nombre, hora_programada, itemsParaCocinar, datosEntrega, tipoEntregaMapeado, tipoLower, tipoEntregaObj, estructuraPedidoCocinada, tipoConsumo, secciones, subtotales, pedidoService, ticketFormateado, previewId, numeroResumen, direccionPreview, prevRow, direccionData, error_8, estructuraJson, imagenUrl, resumenRespuesta, numeroResumenRespuesta, configDelivery, sedeInfo, confPrint, ahoraLima, direccionTicket, descripcionCanal, horaEntrega, total, error_9, error_10, msg;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 15, , 16]);
                _a = req.body, session_id = _a.session_id, idsede = _a.idsede, items = _a.items, tipo_entrega = _a.tipo_entrega, direccion = _a.direccion, costo_delivery = _a.costo_delivery, cliente_nombre = _a.cliente_nombre, hora_programada = _a.hora_programada;
                if (!items || items.length === 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Items son requeridos'
                        })];
                }
                if (!idsede) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'idsede es requerido'
                        })];
                }
                itemsParaCocinar = items.map(function (item) { return ({
                    iditem: item.iditem,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    indicaciones: item.indicaciones || '',
                    observaciones: item.indicaciones || ''
                }); });
                datosEntrega = {
                    direccion: direccion || '',
                    costo_entrega: (tipo_entrega === null || tipo_entrega === void 0 ? void 0 : tipo_entrega.toLowerCase()) === 'delivery' ? (costo_delivery || 0) : 0
                };
                tipoEntregaMapeado = tipo_entrega;
                tipoLower = tipo_entrega === null || tipo_entrega === void 0 ? void 0 : tipo_entrega.toLowerCase();
                if (tipoLower === 'recojo' || tipoLower === 'recoger') {
                    tipoEntregaMapeado = 'PARA LLEVAR';
                }
                else if (tipoLower === 'local' || tipoLower === 'reserva' || tipoLower === 'mesa') {
                    // Pedido para consumir en el local = reserva
                    tipoEntregaMapeado = 'CONSUMIR EN EL LOCAL';
                }
                tipoEntregaObj = {
                    descripcion: tipoEntregaMapeado
                };
                return [4 /*yield*/, (0, cocinar_pedido_1.getEstructuraPedido)(itemsParaCocinar, tipoEntregaObj, datosEntrega, Number(idsede))];
            case 1:
                estructuraPedidoCocinada = _g.sent();
                tipoConsumo = (_c = (_b = estructuraPedidoCocinada.p_body) === null || _b === void 0 ? void 0 : _b.tipoconsumo) === null || _c === void 0 ? void 0 : _c[0];
                secciones = (tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.secciones) || [];
                subtotales = estructuraPedidoCocinada.p_subtotales || [];
                pedidoService = new pedido_services_1["default"]();
                ticketFormateado = pedidoService.getResumenPedidoShowCliente(secciones, tipoConsumo, subtotales);
                previewId = session_id;
                numeroResumen = 1;
                direccionPreview = null;
                _g.label = 2;
            case 2:
                _g.trys.push([2, 4, , 5]);
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT estado, JSON_EXTRACT(estructura, '$._resumen_num') AS num, direccion_cliente FROM pedido_preview WHERE id = ? LIMIT 1", previewId)];
            case 3:
                prevRow = _g.sent();
                numeroResumen = (((_d = prevRow === null || prevRow === void 0 ? void 0 : prevRow[0]) === null || _d === void 0 ? void 0 : _d.estado) === 'pending' && Number(prevRow[0].num) > 0)
                    ? Number(prevRow[0].num) + 1
                    : 1;
                // Parseo de direccion_cliente en su propio try: un JSON malformado
                // ahí no debe resetear el correlativo ya calculado arriba.
                try {
                    if ((_e = prevRow === null || prevRow === void 0 ? void 0 : prevRow[0]) === null || _e === void 0 ? void 0 : _e.direccion_cliente) {
                        direccionData = typeof prevRow[0].direccion_cliente === 'string'
                            ? JSON.parse(prevRow[0].direccion_cliente)
                            : prevRow[0].direccion_cliente;
                        direccionPreview = (direccionData === null || direccionData === void 0 ? void 0 : direccionData.direccion) || null;
                    }
                }
                catch (errorDireccion) {
                    console.error('resumen-pedido: fallo parseando direccion_cliente del preview:', errorDireccion.message);
                }
                return [3 /*break*/, 5];
            case 4:
                error_8 = _g.sent();
                console.error('resumen-pedido: fallo calculando correlativo _resumen_num, arranca en 1:', error_8.message);
                numeroResumen = 1;
                return [3 /*break*/, 5];
            case 5:
                // Clave aditiva top-level: los consumidores de esta estructura leen
                // claves específicas (p_body, p_subtotales, p_header), no iteran
                // sobre todas las keys, así que no les afecta.
                estructuraPedidoCocinada._resumen_num = numeroResumen;
                estructuraJson = JSON.stringify(estructuraPedidoCocinada);
                return [4 /*yield*/, prisma.$queryRawUnsafe("INSERT INTO pedido_preview (id, estructura, ticket_formateado, estado)\n             VALUES (?, ?, ?, ?)\n             ON DUPLICATE KEY UPDATE\n             estructura = VALUES(estructura),\n             ticket_formateado = VALUES(ticket_formateado),\n             estado = 'pending',\n             recordatorios = 0,\n             last_recordatorio_at = NULL,\n             created_at = CURRENT_TIMESTAMP", previewId, estructuraJson, ticketFormateado, 'pending')];
            case 6:
                _g.sent();
                imagenUrl = null;
                resumenRespuesta = ticketFormateado;
                numeroResumenRespuesta = null;
                _g.label = 7;
            case 7:
                _g.trys.push([7, 13, , 14]);
                if (!session_id) return [3 /*break*/, 12];
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: { idsede: Number(idsede), estado: '0' },
                        select: { parametros: true }
                    })];
            case 8:
                configDelivery = _g.sent();
                if (!((0, delivery_zonas_1.resolverResumenFormato)(configDelivery === null || configDelivery === void 0 ? void 0 : configDelivery.parametros) === 'imagen')) return [3 /*break*/, 12];
                return [4 /*yield*/, prisma.sede.findUnique({
                        where: { idsede: Number(idsede) },
                        select: { nombre: true, logo64: true }
                    })];
            case 9:
                sedeInfo = _g.sent();
                return [4 /*yield*/, prisma.$queryRawUnsafe('SELECT logo FROM conf_print WHERE idsede = ? LIMIT 1', Number(idsede))];
            case 10:
                confPrint = _g.sent();
                ahoraLima = new Date().toLocaleString('es-PE', {
                    timeZone: 'America/Lima',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                });
                direccionTicket = direccion || direccionPreview || undefined;
                descripcionCanal = String((tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.descripcion) || '').toLowerCase();
                horaEntrega = void 0;
                if (hora_programada) {
                    // Sinónimos de canal según la convención del repo
                    // (pedido.services.ts): llevar/recog/recoj y local/mesa/salon.
                    if (descripcionCanal.includes('llevar') || descripcionCanal.includes('recog') || descripcionCanal.includes('recoj')) {
                        horaEntrega = { etiqueta: 'Recojo', valor: hora_programada };
                    }
                    else if (descripcionCanal.includes('local') || descripcionCanal.includes('mesa') || descripcionCanal.includes('salon')) {
                        horaEntrega = { etiqueta: 'Reserva', valor: hora_programada };
                    }
                }
                return [4 /*yield*/, (0, ticket_image_service_1.generarYSubirTicket)(session_id, {
                        nombreSede: (sedeInfo === null || sedeInfo === void 0 ? void 0 : sedeInfo.nombre) || '',
                        canal: (tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.descripcion) || '',
                        secciones: secciones,
                        subtotales: subtotales,
                        logoArchivo: ((_f = confPrint === null || confPrint === void 0 ? void 0 : confPrint[0]) === null || _f === void 0 ? void 0 : _f.logo) || null,
                        logo64: (sedeInfo === null || sedeInfo === void 0 ? void 0 : sedeInfo.logo64) || null,
                        numeroResumen: String(numeroResumen),
                        hora: ahoraLima,
                        cliente: cliente_nombre || undefined,
                        direccion: direccionTicket,
                        horaEntrega: horaEntrega
                    })];
            case 11:
                imagenUrl = _g.sent();
                if (imagenUrl) {
                    total = subtotales.length
                        ? parseFloat(subtotales[subtotales.length - 1].importe).toFixed(2)
                        : '0.00';
                    numeroResumenRespuesta = String(numeroResumen);
                    resumenRespuesta = "Resumen #".concat(numeroResumen, " \u2014 Pedido *").concat((tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.descripcion) || '', "* \u2014 Total *S/ ").concat(total, "* \uD83E\uDDFE (detalle en el ticket adjunto)");
                }
                _g.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                error_9 = _g.sent();
                console.error('resumen-pedido: fallo modo imagen, usando texto:', error_9.message);
                imagenUrl = null;
                numeroResumenRespuesta = null;
                resumenRespuesta = ticketFormateado;
                return [3 /*break*/, 14];
            case 14:
                res.status(200).json(__assign({ success: true, resumen: resumenRespuesta }, (imagenUrl ? { imagen_url: imagenUrl, numero_resumen: numeroResumenRespuesta } : {})));
                return [3 /*break*/, 16];
            case 15:
                error_10 = _g.sent();
                console.error('Error en resumen-pedido:', error_10);
                msg = ((error_10 === null || error_10 === void 0 ? void 0 : error_10.message) || '').toLowerCase();
                if (msg.includes('canal de consumo no encontrado')) {
                    return [2 /*return*/, res.status(200).json({
                            success: false,
                            error: 'Esta sede no tiene disponible ese tipo de entrega por este medio. ¿Deseas recogerlo en el local?'
                        })];
                }
                res.status(500).json({
                    success: false,
                    error: 'Error al generar resumen del pedido'
                });
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); });
router.post("/pedido", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session_id, idorg, idsede, cliente_telefono, cliente_nombre, direccion, tipo_entrega, metodo_pago, notas, 
    // Reserva (consumo en el local): hora de llegada y cantidad de personas.
    reserva_hora, reserva_personas, 
    // Pedido programado (recojo/delivery a una hora): "13:00"
    hora_programada, idresumen, preview, estructuraPedidoCocinada_1, datosDeliveryGuardados, tipoConsumoEstructura, tipoEntregaFinal, descripcionTipoConsumo, telefonoSinCodigo, cliente, idcliente, nombreCliente, nuevoCliente, idclientePwaDireccion, direccionFinal, direccionExistente, nuevaDireccion, infoCliente, infoSede, usuarioBot, idusuarioBot, resultInsert, nuevoUsuario, sede, listImpresoras, tipoConsumo, isDelivery, isRecoger, isReserva, horaEvento, tiempoEntregaProgamado, hoyLima, arrDatosDelivery, direccionDelivery, referenciaDelivery, latitudeDelivery, longitudeDelivery, ciudadDelivery, provinciaDelivery, departamentoDelivery, paisDelivery, codigoDelivery, costoDeliveryCalculado, nombreTel, referenciaTexto, partes, p_header_1, jsonPrintService, arrPrint, dataPrint_1, dataUsuarioSend, pedidoEnviar, dataSocketQuery, payload, URL_RESTOBAR, urlBackend, response, resultado, idpedido, error_11;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                _p.trys.push([0, 21, , 22]);
                _a = req.body, session_id = _a.session_id, idorg = _a.idorg, idsede = _a.idsede, cliente_telefono = _a.cliente_telefono, cliente_nombre = _a.cliente_nombre, direccion = _a.direccion, tipo_entrega = _a.tipo_entrega, metodo_pago = _a.metodo_pago, notas = _a.notas, reserva_hora = _a.reserva_hora, reserva_personas = _a.reserva_personas, hora_programada = _a.hora_programada;
                idresumen = session_id;
                if (!idresumen) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'idresumen es requerido'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, estructura, estado, direccion_cliente, idpedido,\n                    TIMESTAMPDIFF(MINUTE, created_at, NOW()) AS min_desde_resumen\n             FROM pedido_preview WHERE id = ? LIMIT 1", idresumen)];
            case 1:
                preview = _p.sent();
                // Idempotencia: el bot a veces llama confirmar_pedido dos veces seguidas
                // (ej. el cliente manda un sticker justo después de confirmar). Si el
                // pedido ya se creó hace poco, respondemos el MISMO pedido en vez de 404
                // para que el bot no relate un falso error al cliente.
                if ((preview === null || preview === void 0 ? void 0 : preview.length) > 0 && preview[0].estado === 'confirmed'
                    && preview[0].idpedido && Number(preview[0].min_desde_resumen) <= 15) {
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            mensaje: 'El pedido ya había sido confirmado',
                            idpedido: preview[0].idpedido,
                            numero_pedido: preview[0].idpedido,
                            ya_confirmado: true
                        })];
                }
                if (!preview || preview.length === 0 || preview[0].estado !== 'pending') {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Resumen de pedido no encontrado o ya fue confirmado'
                        })];
                }
                estructuraPedidoCocinada_1 = preview[0].estructura;
                // _resumen_num es un contador interno (correlativo de resúmenes por
                // conversación, ver /resumen-pedido) — no debe filtrarse al pedido
                // confirmado que se reenvía completo al legacy (send-bot-pedido).
                delete estructuraPedidoCocinada_1._resumen_num;
                datosDeliveryGuardados = null;
                if (preview[0].direccion_cliente) {
                    try {
                        datosDeliveryGuardados = typeof preview[0].direccion_cliente === 'string'
                            ? JSON.parse(preview[0].direccion_cliente)
                            : preview[0].direccion_cliente;
                    }
                    catch (error) {
                        console.error('Error al parsear direccion_cliente:', error);
                    }
                }
                tipoConsumoEstructura = (_c = (_b = estructuraPedidoCocinada_1.p_body) === null || _b === void 0 ? void 0 : _b.tipoconsumo) === null || _c === void 0 ? void 0 : _c[0];
                tipoEntregaFinal = tipo_entrega;
                if (!tipoEntregaFinal && tipoConsumoEstructura) {
                    descripcionTipoConsumo = (_d = tipoConsumoEstructura.descripcion) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                    if (descripcionTipoConsumo === 'delivery') {
                        tipoEntregaFinal = 'delivery';
                    }
                    else if (descripcionTipoConsumo === 'para llevar') {
                        tipoEntregaFinal = 'recojo';
                    }
                    else if ((descripcionTipoConsumo === null || descripcionTipoConsumo === void 0 ? void 0 : descripcionTipoConsumo.includes('local')) || (descripcionTipoConsumo === null || descripcionTipoConsumo === void 0 ? void 0 : descripcionTipoConsumo.includes('mesa'))) {
                        tipoEntregaFinal = 'local';
                    }
                }
                telefonoSinCodigo = cliente_telefono.replace(/\D/g, '').replace(/^(51)?/, '');
                return [4 /*yield*/, prisma.$queryRaw(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres, c.telefono FROM cliente c\n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", "\n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres, c.telefono FROM cliente c\n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", "\n            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ", "\n            LIMIT 1"])), idsede, idorg, '%' + telefonoSinCodigo + '%')];
            case 2:
                cliente = _p.sent();
                idcliente = void 0;
                nombreCliente = void 0;
                if (!(!cliente || cliente.length === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.cliente.create({
                        data: {
                            idorg: Number(idorg),
                            nombres: (cliente_nombre || 'CLIENTE').toUpperCase(),
                            telefono: cliente_telefono,
                            direccion: direccion || '',
                            f_registro: new Date().toISOString().slice(0, 19).replace('T', ' '),
                            ruc: '',
                            pwa_id: '',
                            email: '',
                            estado: 0
                        }
                    })];
            case 3:
                nuevoCliente = _p.sent();
                idcliente = nuevoCliente.idcliente;
                nombreCliente = nuevoCliente.nombres;
                return [4 /*yield*/, prisma.cliente_sede.create({
                        data: {
                            idcliente: idcliente,
                            idsede: Number(idsede),
                            telefono: cliente_telefono
                        }
                    })];
            case 4:
                _p.sent();
                return [3 /*break*/, 7];
            case 5:
                idcliente = cliente[0].idcliente;
                nombreCliente = cliente[0].nombres;
                if (!(!nombreCliente || nombreCliente.trim() === '')) return [3 /*break*/, 7];
                nombreCliente = (cliente_nombre || 'CLIENTE').toUpperCase();
                return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE cliente SET nombres = ? WHERE idcliente = ?", nombreCliente, idcliente)];
            case 6:
                _p.sent();
                _p.label = 7;
            case 7:
                idclientePwaDireccion = null;
                direccionFinal = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.direccion) || direccion || '';
                if (!(direccionFinal && datosDeliveryGuardados)) return [3 /*break*/, 11];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n                SELECT idcliente_pwa_direccion FROM cliente_pwa_direccion\n                WHERE idcliente = ", " AND direccion = ", "\n                LIMIT 1"], ["\n                SELECT idcliente_pwa_direccion FROM cliente_pwa_direccion\n                WHERE idcliente = ", " AND direccion = ", "\n                LIMIT 1"])), idcliente, direccionFinal)];
            case 8:
                direccionExistente = _p.sent();
                if (!(direccionExistente && direccionExistente.length > 0)) return [3 /*break*/, 9];
                idclientePwaDireccion = direccionExistente[0].idcliente_pwa_direccion;
                return [3 /*break*/, 11];
            case 9: return [4 /*yield*/, prisma.$queryRawUnsafe("INSERT INTO cliente_pwa_direccion (idcliente, direccion, latitude, longitude, referencia) VALUES (?, ?, ?, ?, ?)", idcliente, direccionFinal, ((_e = datosDeliveryGuardados.latitude) === null || _e === void 0 ? void 0 : _e.toString()) || '', ((_f = datosDeliveryGuardados.longitude) === null || _f === void 0 ? void 0 : _f.toString()) || '', datosDeliveryGuardados.referencia || '')];
            case 10:
                nuevaDireccion = _p.sent();
                idclientePwaDireccion = nuevaDireccion.insertId;
                _p.label = 11;
            case 11:
                infoCliente = {
                    idcliente: idcliente,
                    nombres: nombreCliente,
                    telefono: cliente_telefono,
                    direccion: direccionFinal,
                    idcliente_pwa_direccion: idclientePwaDireccion
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_11 || (templateObject_11 = __makeTemplateObject(["\n            SELECT s.idsede, s.idorg, s.nombre, s.direccion, s.telefono\n            FROM sede s\n            WHERE s.idsede = ", " and estado=0\n            LIMIT 1"], ["\n            SELECT s.idsede, s.idorg, s.nombre, s.direccion, s.telefono\n            FROM sede s\n            WHERE s.idsede = ", " and estado=0\n            LIMIT 1"])), idsede)];
            case 12:
                infoSede = _p.sent();
                if (!infoSede || infoSede.length === 0) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n            SELECT idusuario FROM usuario WHERE usuario = 'bot' LIMIT 1"], ["\n            SELECT idusuario FROM usuario WHERE usuario = 'bot' LIMIT 1"])))];
            case 13:
                usuarioBot = _p.sent();
                idusuarioBot = void 0;
                if (!(!usuarioBot || usuarioBot.length === 0)) return [3 /*break*/, 16];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_13 || (templateObject_13 = __makeTemplateObject(["\n                INSERT INTO usuario (usuario, clave, nombre, estado, isbot) \n                VALUES ('bot', 'bot-user', 'Bot WhatsApp', 0, 1)"], ["\n                INSERT INTO usuario (usuario, clave, nombre, estado, isbot) \n                VALUES ('bot', 'bot-user', 'Bot WhatsApp', 0, 1)"])))];
            case 14:
                resultInsert = _p.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_14 || (templateObject_14 = __makeTemplateObject(["\n                SELECT idusuario FROM usuario WHERE sede = ", " AND isbot = '1' LIMIT 1"], ["\n                SELECT idusuario FROM usuario WHERE sede = ", " AND isbot = '1' LIMIT 1"])), idsede)];
            case 15:
                nuevoUsuario = _p.sent();
                idusuarioBot = nuevoUsuario[0].idusuario;
                return [3 /*break*/, 17];
            case 16:
                idusuarioBot = usuarioBot[0].idusuario;
                _p.label = 17;
            case 17:
                sede = {
                    idsede: infoSede[0].idsede,
                    idorg: infoSede[0].idorg,
                    idusuario: idusuarioBot,
                    sede: infoSede[0]
                };
                return [4 /*yield*/, prisma.$queryRaw(templateObject_15 || (templateObject_15 = __makeTemplateObject(["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\n        from conf_print cp \n            inner join impresora i using(idsede)\n        where cp.idsede = ", " and i.estado = 0"], ["select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font\n            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery\n            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda\t\t\n        from conf_print cp \n            inner join impresora i using(idsede)\n        where cp.idsede = ", " and i.estado = 0"
                        // Obtener tipo de consumo para determinar si es delivery
                    ])), idsede)];
            case 18:
                listImpresoras = _p.sent();
                tipoConsumo = (_h = (_g = estructuraPedidoCocinada_1.p_body) === null || _g === void 0 ? void 0 : _g.tipoconsumo) === null || _h === void 0 ? void 0 : _h[0];
                isDelivery = (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'delivery';
                isRecoger = (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'recojo' || (tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) === 'recoger';
                isReserva = ['local', 'reserva', 'mesa'].includes((tipoEntregaFinal === null || tipoEntregaFinal === void 0 ? void 0 : tipoEntregaFinal.toLowerCase()) || '');
                horaEvento = normalizarHora(reserva_hora || hora_programada);
                tiempoEntregaProgamado = [];
                if (horaEvento) {
                    hoyLima = new Date().toLocaleDateString('es-PE', {
                        timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                    tiempoEntregaProgamado = { modificado: 'true', date: "".concat(hoyLima, " ").concat(horaEvento, ":00") };
                }
                arrDatosDelivery = {};
                if (isDelivery) {
                    direccionDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.direccion) || infoCliente.direccion || "";
                    referenciaDelivery = [
                        (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.referencia) || "",
                        (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.verificada) === false ? "(DIRECCION NO VERIFICADA - confirmar con cliente)" : ""
                    ].filter(Boolean).join(" ");
                    latitudeDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.latitude) || "";
                    longitudeDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.longitude) || "";
                    ciudadDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.ciudad) || "";
                    provinciaDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.provincia) || "";
                    departamentoDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.departamento) || "";
                    paisDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.pais) || "";
                    codigoDelivery = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.codigo) || "";
                    costoDeliveryCalculado = (datosDeliveryGuardados === null || datosDeliveryGuardados === void 0 ? void 0 : datosDeliveryGuardados.costo_delivery) || 0;
                    arrDatosDelivery = {
                        idcliente: infoCliente.idcliente.toString(),
                        dni: "",
                        nombre: infoCliente.nombres.toUpperCase(),
                        f_nac: "",
                        direccion: direccionDelivery,
                        telefono: infoCliente.telefono || "",
                        paga_con: metodo_pago.nombre || notas || "",
                        dato_adicional: notas || "",
                        referencia: referenciaDelivery,
                        tipoComprobante: [],
                        importeTotal: ((_k = (_j = estructuraPedidoCocinada_1.p_subtotales) === null || _j === void 0 ? void 0 : _j.find(function (st) { var _a; return (_a = st.descripcion) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('total'); })) === null || _k === void 0 ? void 0 : _k.importe) || 0,
                        metodoPago: {
                            idtipo_pago: metodo_pago.id,
                            descripcion: metodo_pago.nombre ? metodo_pago.nombre : "OTRO",
                            img: "_tp_01.png",
                            importe: "",
                            checked: true,
                            visible: true
                        },
                        propina: [],
                        direccionEnvioSelected: {
                            idcliente: infoCliente.idcliente.toString(),
                            num_doc: "",
                            nombre: infoCliente.nombres.toUpperCase(),
                            direccion: direccionDelivery,
                            referencia: referenciaDelivery,
                            telefono: infoCliente.telefono || "",
                            paga_con: metodo_pago.nombre || notas || "",
                            f_nac: "",
                            ciudad: ciudadDelivery,
                            provincia: provinciaDelivery,
                            departamento: departamentoDelivery,
                            pais: paisDelivery,
                            codigo: codigoDelivery,
                            latitude: latitudeDelivery.toString(),
                            longitude: longitudeDelivery.toString(),
                            titulo: "Casa",
                            solicitaCubiertos: "0",
                            direccion_delivery_no_map: [{
                                    direccion: direccionDelivery,
                                    referencia: referenciaDelivery
                                }],
                            nombres: infoCliente.nombres.toUpperCase()
                        },
                        establecimiento: {
                            idsede: infoSede[0].idsede.toString(),
                            idorg: infoSede[0].idorg.toString(),
                            nombre: infoSede[0].nombre,
                            ciudad: "",
                            direccion: infoSede[0].direccion,
                            telefono: infoSede[0].telefono,
                            // eslogan: "",
                            // mesas: "",
                            // maximo_pedidos_x_hora: "",
                            // authorization_api_comprobante: "",
                            // id_api_comprobante: "2",
                            // facturacion_e_activo: "1",
                            // logo64: "",
                            // codigo_postal: "",
                            latitude: latitudeDelivery,
                            longitude: longitudeDelivery
                        },
                        subTotales: [],
                        pasoRecoger: false,
                        buscarRepartidor: true,
                        isFromComercio: 1,
                        costoTotalDelivery: costoDeliveryCalculado,
                        tiempoEntregaProgamado: tiempoEntregaProgamado,
                        delivery: 1,
                        solicitaCubiertos: "0",
                        nombres: infoCliente.nombres.toUpperCase()
                    };
                }
                else if (isRecoger) {
                    arrDatosDelivery = {
                        idcliente: infoCliente.idcliente.toString(),
                        nombre: infoCliente.nombres.toUpperCase(),
                        telefono: infoCliente.telefono || "",
                        establecimiento: {
                            idsede: infoSede[0].idsede.toString(),
                            idorg: infoSede[0].idorg.toString(),
                            nombre: infoSede[0].nombre,
                            direccion: infoSede[0].direccion,
                            telefono: infoSede[0].telefono
                        },
                        pasoRecoger: true,
                        solo_llevar: true,
                        buscarRepartidor: false,
                        isFromComercio: 1,
                        delivery: 0,
                        tiempoEntregaProgamado: tiempoEntregaProgamado,
                        nombres: infoCliente.nombres.toUpperCase()
                    };
                }
                else if (isReserva) {
                    // Reserva para consumir en el local: el procedure lee
                    // arrDatosDelivery.tiempoEntregaProgamado para fechar el pedido.
                    arrDatosDelivery = {
                        idcliente: infoCliente.idcliente.toString(),
                        nombre: infoCliente.nombres.toUpperCase(),
                        telefono: infoCliente.telefono || "",
                        pasoRecoger: false,
                        buscarRepartidor: false,
                        isFromComercio: 1,
                        delivery: 0,
                        tiempoEntregaProgamado: tiempoEntregaProgamado,
                        nombres: infoCliente.nombres.toUpperCase()
                    };
                }
                nombreTel = "".concat(infoCliente.nombres.toUpperCase(), " - ").concat(infoCliente.telefono || cliente_telefono);
                referenciaTexto = infoCliente.nombres.toUpperCase();
                if (isReserva) {
                    partes = ['RESERVA'];
                    if (horaEvento)
                        partes.push(horaEvento);
                    if (reserva_personas)
                        partes.push("".concat(reserva_personas, " PERSONAS"));
                    referenciaTexto = "".concat(partes.join(' '), " - ").concat(nombreTel);
                }
                else if (isRecoger) {
                    referenciaTexto = horaEvento
                        ? "CLIENTE RECOGE ".concat(horaEvento, " - ").concat(nombreTel)
                        : "CLIENTE RECOGE - ".concat(nombreTel);
                }
                else if (isDelivery && horaEvento) {
                    referenciaTexto = "ENTREGAR ".concat(horaEvento, " - ").concat(infoCliente.nombres.toUpperCase());
                }
                p_header_1 = __assign(__assign({}, estructuraPedidoCocinada_1.p_header), { idclie: infoCliente.idcliente.toString(), referencia: referenciaTexto, r: referenciaTexto, idcategoria: ((_l = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idcategoria) === null || _l === void 0 ? void 0 : _l.toString()) || "1", mesa: "", tipo_consumo: ((_m = tipoConsumo === null || tipoConsumo === void 0 ? void 0 : tipoConsumo.idtipo_consumo) === null || _m === void 0 ? void 0 : _m.toString()) || "4", subtotales_tachados: "", arrDatosDelivery: arrDatosDelivery, isComercioAppDeliveryMapa: isDelivery ? "1" : "0", delivery: isDelivery ? 1 : 0, 
                    // Consumo en el local = reserva (el procedure guarda pedido.reserva)
                    reservar: isReserva ? 1 : 0 });
                // Actualizar la estructura con el p_header completo
                estructuraPedidoCocinada_1.p_header = p_header_1;
                jsonPrintService = new json_print_services_1.JsonPrintService();
                arrPrint = jsonPrintService.enviarMiPedido(true, sede, estructuraPedidoCocinada_1.p_body, listImpresoras);
                dataPrint_1 = [];
                arrPrint.map(function (x) {
                    dataPrint_1.push({
                        Array_enca: p_header_1,
                        ArraySubTotales: estructuraPedidoCocinada_1.p_subtotales,
                        ArrayItem: x.arrBodyPrint,
                        Array_print: x.arrPrinters
                    });
                });
                dataUsuarioSend = {
                    idusuario: sede.idusuario,
                    idcliente: infoCliente.idcliente,
                    idorg: sede.idorg,
                    idsede: sede.idsede,
                    nombres: 'BOT',
                    cargo: 'BOT',
                    usuario: 'BOT'
                };
                pedidoEnviar = {
                    dataPedido: estructuraPedidoCocinada_1,
                    dataPrint: dataPrint_1,
                    dataUsuario: dataUsuarioSend,
                    isDeliveryAPP: isDelivery,
                    isClienteRecogeLocal: isRecoger,
                    dataDescuento: [],
                    listPrinters: arrPrint.listPrinters
                };
                dataSocketQuery = {
                    idorg: sede.idorg,
                    idsede: sede.idsede,
                    idusuario: sede.idusuario,
                    idcliente: infoCliente.idcliente,
                    iscliente: false,
                    isOutCarta: false,
                    isCashAtm: false,
                    isFromApp: 0,
                    isFromBot: 1
                };
                payload = {
                    query: dataSocketQuery,
                    dataSend: pedidoEnviar
                };
                URL_RESTOBAR = process.env.URL_RESTOBAR || 'http://localhost:3000';
                urlBackend = "".concat(URL_RESTOBAR, "/bot/send-bot-pedido");
                return [4 /*yield*/, axios_1["default"].post(urlBackend, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })];
            case 19:
                response = _p.sent();
                resultado = response.data;
                idpedido = resultado.idpedido || ((_o = resultado.data) === null || _o === void 0 ? void 0 : _o.idpedido);
                if (!idpedido) {
                    throw new Error('Backend no retornó idpedido');
                }
                return [4 /*yield*/, prisma.$queryRawUnsafe("UPDATE pedido_preview SET estado = 'confirmed', idpedido = ? WHERE id = ?", idpedido, idresumen)];
            case 20:
                _p.sent();
                res.status(200).json({
                    success: true,
                    mensaje: 'Pedido confirmado y guardado exitosamente',
                    idpedido: idpedido,
                    numero_pedido: idpedido
                });
                return [3 /*break*/, 22];
            case 21:
                error_11 = _p.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al crear pedido'
                });
                return [3 /*break*/, 22];
            case 22: return [2 /*return*/];
        }
    });
}); });
// consultar pedido por session_id
router.get('/info-pedido/:session_id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var session_id, pedidoPreview, pedido, infoPedido, pedidoSerializable, resultado, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                session_id = req.params.session_id;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_16 || (templateObject_16 = __makeTemplateObject(["\n            SELECT estado, idpedido\n            FROM pedido_preview\n            WHERE id = ", "\n            LIMIT 1"], ["\n            SELECT estado, idpedido\n            FROM pedido_preview\n            WHERE id = ", "\n            LIMIT 1"])), session_id)];
            case 1:
                pedidoPreview = _a.sent();
                if (!pedidoPreview || pedidoPreview.length === 0) {
                    // No es un error de sistema: el cliente simplemente no tiene un pedido
                    // en esta sesión. Respondemos 200 para que el bot lo relate al cliente
                    // (mismo patrón que "canal no disponible") y no se loguee como fallo.
                    return [2 /*return*/, res.status(200).json({
                            success: true,
                            data: { preview: null, pedido_info: null, mensaje: 'El cliente aún no tiene un pedido registrado en esta sesión.' }
                        })];
                }
                pedido = pedidoPreview[0];
                infoPedido = null;
                pedidoSerializable = {
                    estado: pedido.estado,
                    idpedido: pedido.idpedido ? Number(pedido.idpedido) : null
                };
                if (!(pedido.estado === 'confirmed' && pedido.idpedido)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_17 || (templateObject_17 = __makeTemplateObject(["\n                SELECT \n                    p.idpedido,\n                    p.fecha_hora, \n                    tc.descripcion as canal_consumo, \n                    COALESCE(r.nombre, 'sin asignar') as repartidor,\n                    TIMESTAMPDIFF(MINUTE, p.fecha_hora, NOW()) as tiempo_transcurrido_minutos\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                LEFT JOIN repartidor r USING(idrepartidor)\n                WHERE p.idpedido = ", "\n                LIMIT 1"], ["\n                SELECT \n                    p.idpedido,\n                    p.fecha_hora, \n                    tc.descripcion as canal_consumo, \n                    COALESCE(r.nombre, 'sin asignar') as repartidor,\n                    TIMESTAMPDIFF(MINUTE, p.fecha_hora, NOW()) as tiempo_transcurrido_minutos\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                LEFT JOIN repartidor r USING(idrepartidor)\n                WHERE p.idpedido = ", "\n                LIMIT 1"])), pedido.idpedido)];
            case 2:
                resultado = _a.sent();
                if (resultado && resultado.length > 0) {
                    infoPedido = {
                        idpedido: Number(resultado[0].idpedido),
                        fecha_hora: resultado[0].fecha_hora,
                        canal_consumo: resultado[0].canal_consumo,
                        repartidor: resultado[0].repartidor,
                        tiempo_transcurrido_minutos: Number(resultado[0].tiempo_transcurrido_minutos)
                    };
                }
                _a.label = 3;
            case 3:
                res.status(200).json({
                    success: true,
                    data: {
                        preview: pedidoSerializable,
                        pedido_info: infoPedido
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_12 = _a.sent();
                res.status(500).json({
                    success: false,
                    error: 'Error al consultar pedido'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/contexto/:idorg/:idsede/:telefono', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idorg, idsede, telefono, sede, categoria, sedeConfig, tiposEntrega, metodosPago, idsAceptados_2, horariosDB, horaActual, diaActual, mapaDias_2, horarioAtencion_2, horarioPrincipal_2, diasArray, parametros, estaAbierto, nombreDiaActual, horaActualStr, horaAbre, horaCierra, generarMensajeHorario, negocio, telefonoLimpio, clienteDB, cliente, idclienteDB, totalPedidos, direccionPwa, historialDB, historial, rpt, carta, productos_2, itemsVistos_2, referenciaDB, referencia_chatbot, error_13;
    var _b, _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _k.trys.push([0, 14, , 15]);
                _a = req.params, idorg = _a.idorg, idsede = _a.idsede, telefono = _a.telefono;
                return [4 /*yield*/, prisma.sede.findFirst({
                        where: {
                            idsede: Number(idsede)
                        },
                        select: {
                            nombre: true,
                            telefono: true,
                            direccion: true,
                            latitude: true,
                            longitude: true,
                            metodo_pago_aceptados_chatbot: true,
                            numero_billetera_chatbot: true
                        }
                    })];
            case 1:
                sede = _k.sent();
                if (!sede) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Sede no encontrada'
                        })];
                }
                return [4 /*yield*/, prisma.categoria.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            visible_cliente: '1'
                        },
                        select: {
                            url_carta: true
                        }
                    })];
            case 2:
                categoria = _k.sent();
                return [4 /*yield*/, prisma.sede_costo_delivery.findFirst({
                        where: {
                            idsede: Number(idsede),
                            estado: '0'
                        }
                    })];
            case 3:
                sedeConfig = _k.sent();
                return [4 /*yield*/, prisma.tipo_consumo.findMany({
                        where: {
                            idsede: Number(idsede),
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_consumo: true,
                            descripcion: true
                        }
                    })];
            case 4:
                tiposEntrega = _k.sent();
                return [4 /*yield*/, prisma.tipo_pago.findMany({
                        where: {
                            estado: 0,
                            habilitado_chatbot: '1'
                        },
                        select: {
                            idtipo_pago: true,
                            descripcion: true
                        }
                    })];
            case 5:
                metodosPago = _k.sent();
                idsAceptados_2 = String(sede.metodo_pago_aceptados_chatbot || '')
                    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (idsAceptados_2.length > 0) {
                    metodosPago = metodosPago.filter(function (mp) { return idsAceptados_2.includes(String(mp.idtipo_pago)); });
                }
                return [4 /*yield*/, prisma.$queryRaw(templateObject_18 || (templateObject_18 = __makeTemplateObject(["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"], ["\n            SELECT de as hora_inicio, a as hora_fin, numdia, desdia \n            FROM sede_horario_trabajo \n            WHERE idsede = ", " AND estado = 0\n            ORDER BY idsede_horario_trabajo"])), idsede)];
            case 6:
                horariosDB = _k.sent();
                horaActual = new Date();
                diaActual = horaActual.getDay();
                mapaDias_2 = {
                    '1': 'domingo',
                    '2': 'lunes',
                    '3': 'martes',
                    '4': 'miercoles',
                    '5': 'jueves',
                    '6': 'viernes',
                    '7': 'sabado'
                };
                horarioAtencion_2 = {
                    lunes: { abre: "11:00", cierra: "22:00" },
                    martes: { abre: "11:00", cierra: "22:00" },
                    miercoles: { abre: "11:00", cierra: "22:00" },
                    jueves: { abre: "11:00", cierra: "22:00" },
                    viernes: { abre: "11:00", cierra: "23:00" },
                    sabado: { abre: "11:00", cierra: "23:00" },
                    domingo: { abre: "12:00", cierra: "21:00" }
                };
                if (horariosDB && horariosDB.length > 0) {
                    horarioPrincipal_2 = horariosDB[0];
                    diasArray = horarioPrincipal_2.numdia.split(',').filter(function (d) { return d; });
                    diasArray.forEach(function (numDia) {
                        var nombreDia = mapaDias_2[numDia];
                        if (nombreDia) {
                            horarioAtencion_2[nombreDia] = {
                                abre: horarioPrincipal_2.hora_inicio,
                                cierra: horarioPrincipal_2.hora_fin
                            };
                        }
                    });
                }
                parametros = (sedeConfig === null || sedeConfig === void 0 ? void 0 : sedeConfig.parametros) || {};
                estaAbierto = false;
                nombreDiaActual = mapaDias_2[diaActual === 0 ? '1' : (diaActual + 1).toString()];
                if (nombreDiaActual && horarioAtencion_2[nombreDiaActual]) {
                    horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                    horaAbre = horarioAtencion_2[nombreDiaActual].abre;
                    horaCierra = horarioAtencion_2[nombreDiaActual].cierra;
                    estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
                }
                generarMensajeHorario = function () {
                    var dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                    return dias.map(function (dia) {
                        var horario = horarioAtencion_2[dia];
                        var diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
                        return "".concat(diaCapitalizado, ": ").concat(horario.abre, " - ").concat(horario.cierra);
                    }).join(', ');
                };
                negocio = {
                    nombre_negocio: sede.nombre,
                    telefono_negocio: sede.telefono,
                    direccion: sede.direccion,
                    latitud: sede.latitude,
                    longitud: sede.longitude,
                    horario_atencion: horarioAtencion_2,
                    horario: generarMensajeHorario(),
                    esta_abierto: estaAbierto,
                    hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    tipos_consumo: tiposEntrega.map(function (te) { return ({
                        id: te.idtipo_consumo.toString(),
                        nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
                    }); }),
                    delivery: armarDeliveryConfig(parametros),
                    metodos_pago: metodosPago.map(function (mp) { return ({
                        id: mp.idtipo_pago.toString(),
                        nombre: mp.descripcion,
                        activo: true
                    }); }),
                    // Número de Yape/Plin de la sede: el bot lo da cuando el cliente
                    // pregunta a dónde yapear/plinear.
                    numero_billetera: sede.numero_billetera_chatbot || null,
                    mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
                    activo: true,
                    link_carta: (categoria === null || categoria === void 0 ? void 0 : categoria.url_carta) ? "https://papaya-comercio-files.s3.us-east-2.amazonaws.com/files-bot/".concat(categoria === null || categoria === void 0 ? void 0 : categoria.url_carta) : null
                };
                telefonoLimpio = telefono.replace(/\s/g, '');
                return [4 /*yield*/, prisma.$queryRaw(templateObject_19 || (templateObject_19 = __makeTemplateObject(["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(c.telefono, ' ', '') LIKE ", "\n            LIMIT 1"], ["\n            SELECT c.idcliente, c.nombres, c.direccion, c.telefono \n            FROM cliente c \n            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente\n            WHERE cs.idsede = ", " AND c.idorg = ", " \n            AND REPLACE(c.telefono, ' ', '') LIKE ", "\n            LIMIT 1"])), idsede, idorg, '%' + telefonoLimpio + '%')];
            case 7:
                clienteDB = _k.sent();
                cliente = null;
                if (!(clienteDB && clienteDB.length > 0)) return [3 /*break*/, 11];
                idclienteDB = clienteDB[0].idcliente;
                return [4 /*yield*/, prisma.$queryRaw(templateObject_20 || (templateObject_20 = __makeTemplateObject(["\n                SELECT COUNT(*) as total FROM pedido\n                WHERE idcliente = ", "\n                AND idsede = ", "\n                AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"], ["\n                SELECT COUNT(*) as total FROM pedido\n                WHERE idcliente = ", "\n                AND idsede = ", "\n                AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"])), idclienteDB, idsede)];
            case 8:
                totalPedidos = _k.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_21 || (templateObject_21 = __makeTemplateObject(["\n                SELECT direccion, referencia, latitude, longitude FROM cliente_pwa_direccion\n                WHERE idcliente = ", "\n                ORDER BY idcliente_pwa_direccion DESC LIMIT 1"], ["\n                SELECT direccion, referencia, latitude, longitude FROM cliente_pwa_direccion\n                WHERE idcliente = ", "\n                ORDER BY idcliente_pwa_direccion DESC LIMIT 1"])), idclienteDB)];
            case 9:
                direccionPwa = _k.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_22 || (templateObject_22 = __makeTemplateObject(["\n                SELECT DATE_FORMAT(p.fecha_hora, '%d/%m/%Y') AS fecha,\n                       tc.descripcion AS canal,\n                       (SELECT GROUP_CONCAT(CONCAT(pd.cantidad,'x ',pd.descripcion) SEPARATOR ', ')\n                        FROM pedido_detalle pd WHERE pd.idpedido = p.idpedido) AS items,\n                       (SELECT GROUP_CONCAT(DISTINCT tp.descripcion SEPARATOR ', ')\n                        FROM registro_pago_detalle rpd\n                        INNER JOIN tipo_pago tp USING(idtipo_pago)\n                        WHERE rpd.idregistro_pago = p.idregistro_pago) AS pago\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                WHERE p.idcliente = ", " AND p.idsede = ", "\n                ORDER BY p.idpedido DESC LIMIT 5"], ["\n                SELECT DATE_FORMAT(p.fecha_hora, '%d/%m/%Y') AS fecha,\n                       tc.descripcion AS canal,\n                       (SELECT GROUP_CONCAT(CONCAT(pd.cantidad,'x ',pd.descripcion) SEPARATOR ', ')\n                        FROM pedido_detalle pd WHERE pd.idpedido = p.idpedido) AS items,\n                       (SELECT GROUP_CONCAT(DISTINCT tp.descripcion SEPARATOR ', ')\n                        FROM registro_pago_detalle rpd\n                        INNER JOIN tipo_pago tp USING(idtipo_pago)\n                        WHERE rpd.idregistro_pago = p.idregistro_pago) AS pago\n                FROM pedido p\n                INNER JOIN tipo_consumo tc USING(idtipo_consumo)\n                WHERE p.idcliente = ", " AND p.idsede = ", "\n                ORDER BY p.idpedido DESC LIMIT 5"])), idclienteDB, idsede)];
            case 10:
                historialDB = _k.sent();
                historial = (historialDB || [])
                    .filter(function (h) { return h.items; })
                    .map(function (h) { return ({
                    fecha: h.fecha,
                    canal: h.canal,
                    items: h.items,
                    pago: h.pago || null
                }); });
                cliente = {
                    id: Number(idclienteDB),
                    idcliente: Number(idclienteDB),
                    nombre: clienteDB[0].nombres,
                    telefono: clienteDB[0].telefono,
                    direccion: ((_b = direccionPwa[0]) === null || _b === void 0 ? void 0 : _b.direccion) || clienteDB[0].direccion,
                    referencia: ((_c = direccionPwa[0]) === null || _c === void 0 ? void 0 : _c.referencia) || null,
                    direccion_lat: ((_d = direccionPwa[0]) === null || _d === void 0 ? void 0 : _d.latitude) || null,
                    direccion_lon: ((_e = direccionPwa[0]) === null || _e === void 0 ? void 0 : _e.longitude) || null,
                    total_pedidos: Number(((_f = totalPedidos[0]) === null || _f === void 0 ? void 0 : _f.total) || 0),
                    ultimo_pedido: ((_g = historial[0]) === null || _g === void 0 ? void 0 : _g.fecha) || null,
                    historial: historial,
                    encontrado: true
                };
                _k.label = 11;
            case 11: return [4 /*yield*/, prisma.$queryRaw(templateObject_23 || (templateObject_23 = __makeTemplateObject(["call porcedure_pwa_pedido_carta(", ",", ",1)"], ["call porcedure_pwa_pedido_carta(", ",", ",1)"])), idorg, idsede)];
            case 12:
                rpt = _k.sent();
                carta = ((_h = rpt[0]) === null || _h === void 0 ? void 0 : _h.f0) || [];
                productos_2 = [];
                itemsVistos_2 = new Set();
                carta.forEach(function (categoria) {
                    var _a;
                    (_a = categoria.secciones) === null || _a === void 0 ? void 0 : _a.forEach(function (seccion) {
                        var _a;
                        (_a = seccion.items) === null || _a === void 0 ? void 0 : _a.forEach(function (item) {
                            var claveUnica = "".concat(item.iditem, "-").concat(item.des);
                            if (itemsVistos_2.has(claveUnica)) {
                                return;
                            }
                            itemsVistos_2.add(claveUnica);
                            var stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                            productos_2.push({
                                iditem: Number(item.iditem),
                                idseccion: Number(seccion.idseccion),
                                descripcion: item.des,
                                precio: Number(item.precio),
                                stock: stockNumerico
                            });
                        });
                    });
                });
                return [4 /*yield*/, prisma.$queryRaw(templateObject_24 || (templateObject_24 = __makeTemplateObject(["\n            SELECT referencia FROM chatbot_cliente_referencia\n            WHERE idsede = ", "\n              AND REPLACE(telefono, ' ', '') LIKE ", "\n            ORDER BY idchatbot_cliente_referencia DESC LIMIT 1"], ["\n            SELECT referencia FROM chatbot_cliente_referencia\n            WHERE idsede = ", "\n              AND REPLACE(telefono, ' ', '') LIKE ", "\n            ORDER BY idchatbot_cliente_referencia DESC LIMIT 1"])), idsede, '%' + telefonoLimpio + '%')];
            case 13:
                referenciaDB = _k.sent();
                referencia_chatbot = ((_j = referenciaDB === null || referenciaDB === void 0 ? void 0 : referenciaDB[0]) === null || _j === void 0 ? void 0 : _j.referencia) || '';
                res.status(200).json({
                    negocio: negocio,
                    cliente: cliente,
                    menu: productos_2,
                    referencia_chatbot: referencia_chatbot
                });
                return [3 /*break*/, 15];
            case 14:
                error_13 = _k.sent();
                // Log del error real: antes era mudo y un fallo aquí dejaba al bot
                // sin carta/menú sin pista alguna en los logs.
                console.error('Error en /chatbot/contexto:', error_13);
                res.status(500).json({
                    success: false,
                    error: 'Error al obtener contexto'
                });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24;
