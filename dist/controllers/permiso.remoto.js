"use strict";
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
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var format_1 = require("date-fns/format");
var parseISO_1 = require("date-fns/parseISO");
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api permiso remoto' });
        return [2 /*return*/];
    });
}); });
router.get("/permisos/:link", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var link, permiso, campos, deEsteAdmin, _a, pendientes, respondidas, registros, suya, formattedRegistros;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                link = req.params.link;
                return [4 /*yield*/, prisma.permiso_remoto.findFirst({
                        where: {
                            link: link.toString()
                        },
                        select: {
                            idpermiso_remoto: true,
                            idsede: true,
                            idusuario_admin: true
                        }
                    })];
            case 1:
                permiso = _b.sent();
                // si hay datos que continue sino que devuelva un mensaje
                if (!permiso) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'El link no existe' })];
                }
                campos = {
                    idpermiso_remoto: true,
                    fecha: true,
                    hora: true,
                    atendido: true,
                    data: true,
                    sede: {
                        select: {
                            idorg: true,
                            idsede: true
                        }
                    }
                };
                deEsteAdmin = {
                    idsede: permiso.idsede,
                    idusuario_admin: permiso.idusuario_admin,
                    estado: '0'
                };
                return [4 /*yield*/, Promise.all([
                        prisma.permiso_remoto.findMany({
                            take: 10,
                            orderBy: { idpermiso_remoto: 'desc' },
                            where: __assign(__assign({}, deEsteAdmin), { atendido: '0' }),
                            select: campos
                        }),
                        prisma.permiso_remoto.findMany({
                            take: 5,
                            orderBy: { idpermiso_remoto: 'desc' },
                            where: __assign(__assign({}, deEsteAdmin), { atendido: { not: '0' } }),
                            select: campos
                        })
                    ])];
            case 2:
                _a = _b.sent(), pendientes = _a[0], respondidas = _a[1];
                registros = __spreadArray(__spreadArray([], pendientes, true), respondidas, true);
                if (!!registros.some(function (r) { return r.idpermiso_remoto === permiso.idpermiso_remoto; })) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.permiso_remoto.findUnique({
                        where: { idpermiso_remoto: permiso.idpermiso_remoto },
                        select: campos
                    })];
            case 3:
                suya = _b.sent();
                if (suya) {
                    registros.push(suya);
                }
                _b.label = 4;
            case 4:
                formattedRegistros = registros.map(function (registro) {
                    // Asegurarse de que la fecha se maneje correctamente sin ajuste de zona horaria
                    var fechaISO = typeof registro.fecha === 'string' ? registro.fecha : registro.fecha.toISOString();
                    return __assign(__assign({}, registro), { fecha: (0, format_1.format)((0, parseISO_1.parseISO)(fechaISO), 'yyyy-MM-dd'), 
                        // Para que la pantalla pueda resaltar la que el admin vino a ver.
                        es_del_link: registro.idpermiso_remoto === permiso.idpermiso_remoto });
                });
                // devolver los resultados
                // res.status(200).json({ success: true, data: registros });
                res.status(200).json({ success: true, data: formattedRegistros });
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
router.put('/update/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, rpt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, prisma.permiso_remoto.updateMany({
                        data: { atendido: '1' },
                        where: {
                            idpermiso_remoto: Number(id)
                        }
                    })];
            case 1:
                rpt = _a.sent();
                res.status(200).json({ success: true });
                return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
