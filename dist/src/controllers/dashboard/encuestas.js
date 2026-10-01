"use strict";
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
exports.rangoDe = exports.sedePermitida = exports.sesionDe = void 0;
// Dashboard: encuestas de satisfaccion (resultados, malas experiencias y su seguimiento).
// Contrato: plan/ENCUESTAS-DASHBOARD-PLAN.md del POS legacy.
//
// A diferencia de los demas dash-*, aqui TODA sede pedida se valida contra las sedes del token (JWT del login del
// dashboard: { id, idorg, sedes:[{idsede,nombre}] }): un usuario no puede leer ni atender encuestas de otro negocio
// cambiando el idsede del body.
var express = __importStar(require("express"));
var utils_1 = require("../../utils/utils");
var dash = __importStar(require("../../services/encuesta.dash.service"));
var router = express.Router();
var FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Datos del JWT. 403 si el token no trae org o sedes (tokens de otros logins). */
var sesionDe = function (req) {
    var t = req.token;
    var sedes = Array.isArray(t === null || t === void 0 ? void 0 : t.sedes)
        ? t.sedes.map(function (s) { var _a; return ({ idsede: Number(s.idsede), nombre: String((_a = s.nombre) !== null && _a !== void 0 ? _a : '') }); }).filter(function (s) { return Number.isSafeInteger(s.idsede) && s.idsede > 0; })
        : [];
    var idorg = Number(t === null || t === void 0 ? void 0 : t.idorg);
    var idusuario = Number(t === null || t === void 0 ? void 0 : t.id);
    if (!sedes.length || !Number.isSafeInteger(idorg) || idorg <= 0 || !Number.isSafeInteger(idusuario)) {
        throw new dash.ErrorDash(403, 'Tu sesión no tiene acceso a encuestas. Vuelve a iniciar sesión.');
    }
    return { idusuario: idusuario, idorg: idorg, sedes: sedes };
};
exports.sesionDe = sesionDe;
/** La sede pedida debe ser una de las del token. */
var sedePermitida = function (s, idsede) {
    var id = Number(idsede);
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new dash.ErrorDash(400, 'Parámetro inválido: idsede.');
    if (!s.sedes.some(function (x) { return x.idsede === id; }))
        throw new dash.ErrorDash(403, 'No tienes acceso a ese local.');
    return id;
};
exports.sedePermitida = sedePermitida;
var rangoDe = function (params) {
    var ini = typeof (params === null || params === void 0 ? void 0 : params.rango_start_date) === 'string' ? params.rango_start_date : '';
    var fin = typeof (params === null || params === void 0 ? void 0 : params.rango_end_date) === 'string' ? params.rango_end_date : '';
    if (!FECHA_RE.test(ini) || !FECHA_RE.test(fin) || ini > fin)
        throw new dash.ErrorDash(400, 'Rango de fechas inválido.');
    var l = (0, utils_1.limitarRangoFechasDashboard)(ini, fin);
    return { inicio: l.fecha_inicio, fin: l.fecha_fin };
};
exports.rangoDe = rangoDe;
var responder = function (res, fn, contexto) {
    return fn().then(function (datos) { return res.status(200).json(datos); }, function (e) {
        if (e instanceof dash.ErrorDash)
            return res.status(e.status).json({ error: e.message });
        console.error("[dash-encuestas] ".concat(contexto, ":"), e);
        return res.status(500).json({ error: 'No se pudieron cargar las encuestas.' });
    });
};
router.get('/', function (_req, res) { res.status(200).json({ message: 'Estás conectado al api dash ENCUESTAS' }); });
router.post('/tablero', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s;
    var _a, _b;
    return __generator(this, function (_c) {
        s = (0, exports.sesionDe)(req);
        return [2 /*return*/, dash.tablero((0, exports.sedePermitida)(s, (_a = req.body) === null || _a === void 0 ? void 0 : _a.idsede), (0, exports.rangoDe)((_b = req.body) === null || _b === void 0 ? void 0 : _b.params))];
    });
}); }, 'tablero'); });
router.post('/alertas', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, estado;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        s = (0, exports.sesionDe)(req);
        estado = ['pendientes', 'atendidas', 'todas'].includes((_a = req.body) === null || _a === void 0 ? void 0 : _a.estado) ? req.body.estado : 'pendientes';
        return [2 /*return*/, dash.alertas((0, exports.sedePermitida)(s, (_b = req.body) === null || _b === void 0 ? void 0 : _b.idsede), (0, exports.rangoDe)((_c = req.body) === null || _c === void 0 ? void 0 : _c.params), estado)];
    });
}); }, 'alertas'); });
router.post('/alertas/atender', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, id, nota, idsede;
    var _a;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                s = (0, exports.sesionDe)(req);
                id = Number((_b = req.body) === null || _b === void 0 ? void 0 : _b.id);
                nota = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.nota) === 'string' ? req.body.nota.trim() : '';
                if (!Number.isSafeInteger(id) || id <= 0)
                    throw new dash.ErrorDash(400, 'Parámetro inválido: id.');
                if (nota.length < 3 || nota.length > 500)
                    throw new dash.ErrorDash(400, 'La nota debe tener entre 3 y 500 caracteres.');
                return [4 /*yield*/, dash.sedeDeRespuesta(id)];
            case 1:
                idsede = _d.sent();
                // respuesta inexistente o de otro negocio: mismo 403, sin revelar cual de las dos
                if (idsede === null || !s.sedes.some(function (x) { return x.idsede === idsede; }))
                    throw new dash.ErrorDash(403, 'No tienes acceso a esa respuesta.');
                _a = { ok: true };
                return [4 /*yield*/, dash.atender(id, s.idusuario, nota)];
            case 2: return [2 /*return*/, (_a.atencion = _d.sent(), _a)];
        }
    });
}); }, 'atender'); });
router.post('/comentarios', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, filtro, pagina;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        s = (0, exports.sesionDe)(req);
        filtro = ['malos', 'buenos', 'todos'].includes((_a = req.body) === null || _a === void 0 ? void 0 : _a.filtro) ? req.body.filtro : 'todos';
        pagina = Math.max(1, Math.min(10000, Math.floor(Number((_b = req.body) === null || _b === void 0 ? void 0 : _b.pagina) || 1)));
        return [2 /*return*/, dash.comentarios((0, exports.sedePermitida)(s, (_c = req.body) === null || _c === void 0 ? void 0 : _c.idsede), (0, exports.rangoDe)((_d = req.body) === null || _d === void 0 ? void 0 : _d.params), filtro, pagina)];
    });
}); }, 'comentarios'); });
router.post('/locales', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, pedidas, unicas;
    var _a, _b;
    return __generator(this, function (_c) {
        s = (0, exports.sesionDe)(req);
        pedidas = Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.sedes) ? req.body.sedes.map(function (x) { return (0, exports.sedePermitida)(s, x); }) : s.sedes.map(function (x) { return x.idsede; });
        unicas = pedidas.filter(function (x, i, a) { return a.indexOf(x) === i; });
        if (unicas.length > 50)
            throw new dash.ErrorDash(400, 'Demasiados locales.');
        return [2 /*return*/, dash.locales(s.sedes.filter(function (x) { return unicas.includes(x.idsede); }), (0, exports.rangoDe)((_b = req.body) === null || _b === void 0 ? void 0 : _b.params))];
    });
}); }, 'locales'); });
router.post('/encuestas', function (req, res) { return responder(res, function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, idsede;
    var _a, _b;
    return __generator(this, function (_c) {
        s = (0, exports.sesionDe)(req);
        idsede = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.idsede) === undefined || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.idsede) === null ? null : (0, exports.sedePermitida)(s, req.body.idsede);
        return [2 /*return*/, dash.encuestas(s.idorg, s.sedes.map(function (x) { return x.idsede; }), idsede)];
    });
}); }, 'encuestas'); });
exports["default"] = router;
