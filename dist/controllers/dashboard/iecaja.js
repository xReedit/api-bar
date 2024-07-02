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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var client_1 = require("@prisma/client");
var dotenv_1 = __importDefault(require("dotenv"));
var dash_util_1 = require("../../services/dash.util");
dotenv_1["default"].config();
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api dash ie caja' });
        return [2 /*return*/];
    });
}); });
// obtener el total ingresos y salidas de caja
router.post("/get-iecaja", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rpt, sqlExec, rptExec, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                ssql = "CALL procedure_module_dash_caja(".concat(idsede, ", ").concat(JSON.stringify(params), ")");
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["CALL procedure_module_dash_caja(", ", ", ")"], ["CALL procedure_module_dash_caja(", ", ", ")"])), idsede, JSON.stringify(params))];
            case 2:
                rpt = _b.sent();
                sqlExec = rpt[0].f0;
                return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
            case 3:
                rptExec = _b.sent();
                // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                res.status(500).json(error_1);
                return [3 /*break*/, 5];
            case 5:
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// obtener el total de otros ingreoss
router.post("/get-otros-ingresos", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rpt, sqlExec, rptExec, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                ssql = "CALL procedure_module_dash_otros_ingresos(".concat(idsede, ", ").concat(JSON.stringify(params), ")");
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CALL procedure_module_dash_otros_ingresos(", ", ", ")"], ["CALL procedure_module_dash_otros_ingresos(", ", ", ")"])), idsede, JSON.stringify(params))];
            case 2:
                rpt = _b.sent();
                sqlExec = rpt[0].f0;
                return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
            case 3:
                rptExec = _b.sent();
                // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _b.sent();
                res.status(500).json(error_2);
                return [3 /*break*/, 5];
            case 5:
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// obtener pedidos borrados
router.post("/get-pedidos-borrados", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rpt, sqlExec, rptExec, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                ssql = "CALL procedure_module_dash_pedidos_borrados(".concat(idsede, ", ").concat(JSON.stringify(params), ")");
                return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["CALL procedure_module_dash_pedidos_borrados(", ", ", ")"], ["CALL procedure_module_dash_pedidos_borrados(", ", ", ")"])), idsede, JSON.stringify(params))];
            case 2:
                rpt = _b.sent();
                sqlExec = rpt[0].f0;
                return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
            case 3:
                rptExec = _b.sent();
                // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                res.status(500).json(error_3);
                return [3 /*break*/, 5];
            case 5:
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
// obtener pedidos faltana cobrar
router.post("/get-pedidos-sin-corbrar", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rpt, sqlExec, rptExec, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                ssql = "CALL procedure_module_dash_pedidos_sin_cobrar(".concat(idsede, ", ").concat(JSON.stringify(params), ")");
                return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["CALL procedure_module_dash_pedidos_sin_cobrar(", ", ", ")"], ["CALL procedure_module_dash_pedidos_sin_cobrar(", ", ", ")"])), idsede, JSON.stringify(params))];
            case 2:
                rpt = _b.sent();
                sqlExec = rpt[0].f0;
                return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
            case 3:
                rptExec = _b.sent();
                // Supongamos que 'rptExec' es el resultado de tu consulta a la base de datos
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 5];
            case 4:
                error_4 = _b.sent();
                res.status(500).json(error_4);
                return [3 /*break*/, 5];
            case 5:
                prisma.$disconnect();
                return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
