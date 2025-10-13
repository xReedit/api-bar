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
        res.status(200).json({ message: 'Estás conectado al api dash PRODUCTO RECETA' });
        return [2 /*return*/];
    });
}); });
// obtener total pedidos
router.post("/get-productos-receta", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, params, ssql, rptExec, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, params = _a.params;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                ssql = "CALL procedure_module_dash_productos_receta(".concat(idsede, ")");
                return [4 /*yield*/, prisma.$queryRawUnsafe(ssql)];
            case 2:
                rptExec = _b.sent();
                rptExec = normalizeReceta(rptExec);
                rptExec = (0, dash_util_1.normalizeResponse)(rptExec);
                res.status(200).json(rptExec);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                res.status(500).json(error_1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post("/get-productos-bodega", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, idsede, idproducto_stock, params, ssql, productos, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, idsede = _a.idsede, idproducto_stock = _a.idproducto_stock, params = _a.params;
                //console.log('idproducto_stock', idproducto_stock);
                if (idproducto_stock === '') {
                    res.status(200).json([]);
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                ssql = " select p.idproducto, pds.idproducto_stock, p.idproducto_familia idseccion, p.precio, p.precio_unitario, p.precio_venta, pdf.descripcion nom_seccion, p.descripcion nom_producto, a.descripcion nom_almacen            \n            from producto p \n            inner join producto_familia pdf on p.idproducto_familia = pdf.idproducto_familia\n            inner join producto_stock pds on p.idproducto = pds.idproducto\n            inner join almacen a on a.idalmacen = pds.idalmacen \n            where pds.idproducto_stock in (".concat(idproducto_stock, ") and p.idsede = ").concat(idsede, " and p.estado = 0 and a.estado = 0 \n            order by p.descripcion");
                return [4 /*yield*/, prisma.$queryRawUnsafe(ssql)];
            case 2:
                productos = _b.sent();
                productos.forEach(function (element) {
                    element.cantidad = 0;
                    element.total = 0;
                    element.costo = 0;
                    element.rentabilidad = 0;
                });
                //console.log('productos', productos);
                res.status(200).json(productos);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                res.status(500).json(error_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
function normalizeReceta(data) {
    var rpt = [];
    data.forEach(function (element) {
        rpt.push({
            iditem: element.f0,
            descripcion: element.f1,
            precio: element.f2,
            costo: element.f3,
            rentabilidad: element.f4
        });
    });
    return rpt;
}
exports["default"] = router;
