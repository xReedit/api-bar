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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = __importStar(require("express"));
var usuario_1 = require("../controllers/usuario");
var auth_1 = require("../middleware/auth");
var rol_1 = __importDefault(require("../controllers/rol"));
var sede_1 = __importDefault(require("../controllers/sede"));
var colaborador_1 = __importDefault(require("../controllers/colaborador"));
var colaborador_contrato_1 = __importDefault(require("../controllers/colaborador.contrato"));
var chat_bot_1 = __importDefault(require("../controllers/chat.bot"));
var login_restobar_1 = __importDefault(require("../controllers/login.restobar"));
var permiso_remoto_1 = __importDefault(require("../controllers/permiso.remoto"));
var reimpresion_1 = __importDefault(require("../controllers/reimpresion"));
var app_repartidor_1 = __importDefault(require("../controllers/app.repartidor"));
var cobranza_1 = __importDefault(require("../controllers/restobar/cobranza"));
var ventas_1 = __importDefault(require("../controllers/dashboard/ventas"));
var iecaja_1 = __importDefault(require("../controllers/dashboard/iecaja"));
var pedidos_1 = __importDefault(require("../controllers/dashboard/pedidos"));
var router = express.Router();
router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: 20223' });
});
router.use('/login', usuario_1.login);
router.use('/login-bot', login_restobar_1["default"]);
router.use('/login-restobar', login_restobar_1["default"]);
router.use('/verify-login', auth_1.authVerify);
router.use('/rol', auth_1.auth, rol_1["default"]);
router.use('/sede', auth_1.auth, sede_1["default"]);
router.use('/colaborador', auth_1.auth, colaborador_1["default"]);
router.use('/colaborador-contrato', auth_1.auth, colaborador_contrato_1["default"]);
router.use('/chat-bot', chat_bot_1["default"]);
router.use('/permiso-remoto', permiso_remoto_1["default"]);
router.use('/reimpresion', reimpresion_1["default"]);
router.use('/app-repartidor', app_repartidor_1["default"]);
// restobar
router.use('/restobar/cobranza', cobranza_1["default"]);
// dashboardñ
router.use('/dash-ventas', ventas_1["default"]);
router.use('/dash-iecaja', iecaja_1["default"]);
router.use('/dash-pedidos', pedidos_1["default"]);
// router.use('/usuario', auth, usuario);
exports["default"] = router;
