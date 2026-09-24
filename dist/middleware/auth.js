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
exports.authVerify = exports.apiKeyAuth = exports.authSede = exports.auth = exports.secretKey = void 0;
var jwt = __importStar(require("jsonwebtoken"));
// La clave sale del env. El literal viejo queda SOLO como fallback de transición
// para no invalidar sesiones al deployar este cambio; rotar = setear JWT_SECRET
// con un valor nuevo y largo (invalida todos los tokens vigentes → re-login).
// Función y no const: si algún día se agrega dotenv tardío, igual lee el valor real.
var CLAVE_LEGACY = 'DalePlay182182';
var avisoClaveLegacy = false;
var secretKey = function () {
    var s = process.env.JWT_SECRET;
    if (s && s.length >= 16)
        return s;
    if (!avisoClaveLegacy) {
        console.warn('[auth] JWT_SECRET no configurada (o muy corta): usando clave legacy hardcodeada. Configurala y rotala en produccion.');
        avisoClaveLegacy = true;
    }
    return CLAVE_LEGACY;
};
exports.secretKey = secretKey;
var auth = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded;
    var _a;
    return __generator(this, function (_b) {
        try {
            token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
            if (!token) {
                throw new Error();
            }
            decoded = jwt.verify(token, (0, exports.secretKey)());
            req.token = decoded;
            next();
        }
        catch (err) {
            res.status(401).send('Autentificacion Incorrecta');
        }
        return [2 /*return*/];
    });
}); };
exports.auth = auth;
// Autorización por sede (multi-tenant): un token válido de la sede A no debe
// poder operar sobre la sede B cambiando el :idsede de la URL. El JWT ya trae
// idsede desde el login (y el de dashboard además sedes[] para orgs multi-sede).
// Se usa SIEMPRE después de `auth` (necesita el token ya decodificado).
var authSede = function (req, res, next) {
    var t = req.token;
    var pedida = Number(req.params.idsede);
    var propias = new Set();
    if (Number.isFinite(Number(t === null || t === void 0 ? void 0 : t.idsede)))
        propias.add(Number(t.idsede));
    if (Array.isArray(t === null || t === void 0 ? void 0 : t.sedes)) {
        for (var _i = 0, _a = t.sedes; _i < _a.length; _i++) {
            var s = _a[_i];
            if (Number.isFinite(Number(s === null || s === void 0 ? void 0 : s.idsede)))
                propias.add(Number(s.idsede));
        }
    }
    if (Number.isFinite(pedida) && propias.has(pedida))
        return next();
    res.status(403).json({ success: false, error: 'Sede no autorizada para este usuario' });
};
exports.authSede = authSede;
// API key compartida para las rutas server-to-server del chatbot (/chatbot/*).
// El bot Go envía el header x-api-key; nadie más debe poder leer contexto de
// clientes ni crear pedidos. Si CHATBOT_API_KEY no está configurada, deja
// pasar con warning (rollout seguro: primero deployar código, luego exigir).
var warnedNoApiKey = false;
var apiKeyAuth = function (req, res, next) {
    var expected = process.env.CHATBOT_API_KEY;
    if (!expected) {
        if (!warnedNoApiKey) {
            console.warn('CHATBOT_API_KEY no configurada: /chatbot/* queda SIN protección');
            warnedNoApiKey = true;
        }
        return next();
    }
    if (req.header('x-api-key') === expected) {
        return next();
    }
    res.status(401).json({ success: false, error: 'No autorizado' });
};
exports.apiKeyAuth = apiKeyAuth;
var authVerify = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded;
    return __generator(this, function (_a) {
        try {
            token = req.body.token;
            if (!token) {
                throw new Error();
            }
            decoded = jwt.verify(token, (0, exports.secretKey)());
            req.token = decoded;
            res.status(200).send('Ok');
        }
        catch (err) {
            res.status(401).send('Autentificacion Incorrecta');
        }
        return [2 /*return*/];
    });
}); };
exports.authVerify = authVerify;
