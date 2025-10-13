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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var axios_1 = __importDefault(require("axios"));
var dotenv_1 = __importDefault(require("dotenv"));
var dash_util_1 = require("../../services/dash.util");
var utils_1 = require("../../utils/utils");
dotenv_1["default"].config();
var app = (0, express_1["default"])();
app.use(express_1["default"].json({ limit: '50mb' }));
app.use(express_1["default"].urlencoded({ limit: '50mb', extended: true }));
var prisma = new client_1.PrismaClient();
var router = express_1["default"].Router();
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: 'Estás conectado al api dash ventas' });
        return [2 /*return*/];
    });
}); });
// obtener el total de ventas
router.post("/total", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rpt, sqlExec, rptExec, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                //console.log('params originales:', params);
                // Validar y corregir el rango de período si es necesario
                params = (0, utils_1.validarYCorregirRangoPeriodo)(params);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                ssql = "CALL procedure_module_dash_ventas(".concat(idsede, ", ").concat(JSON.stringify(params), ")");
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["CALL procedure_module_dash_ventas(", ", ", ")"], ["CALL procedure_module_dash_ventas(", ", ", ")"])), idsede, JSON.stringify(params))];
            case 2:
                rpt = _b.sent();
                sqlExec = rpt[0].f0;
                return [4 /*yield*/, prisma.$queryRawUnsafe(sqlExec)];
            case 3:
                rptExec = _b.sent();
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                res.status(500).json(error_1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// get meta de venta diaria
router.post("/meta-venta", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var idsede, rpt, meta, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                idsede = req.body.idsede;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["select diaria from sede_meta where idsede = ", " and estado = '0'"], ["select diaria from sede_meta where idsede = ", " and estado = '0'"])), idsede)];
            case 2:
                rpt = _a.sent();
                meta = rpt[0] ? rpt[0].diaria : 0;
                res.status(200).json({
                    meta: meta
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                res.status(500).json(error_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// solicitar a api gpt el analisis de ventas
router.post("/analisis-ventas", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, message, nom_assistant, assistants, assistant, url, data, response, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, message = _a.message, nom_assistant = _a.nom_assistant;
                assistants = [
                    { id: 9, name: 'ventas', url: 'analisis-estadistico' },
                    { id: 10, name: 'productos', url: 'analisis-estadistico' }
                ];
                assistant = assistants.find(function (element) { return element.name === nom_assistant; });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                url = "".concat(process.env.URL_API_GPT, "/analisis-estadistico");
                data = {
                    message: message,
                    idassistant: assistant === null || assistant === void 0 ? void 0 : assistant.id
                };
                return [4 /*yield*/, axios_1["default"].post(url, data)];
            case 2:
                response = _b.sent();
                res.status(200).json(response.data);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                res.status(500).json(error_3);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;
var templateObject_1, templateObject_2;
