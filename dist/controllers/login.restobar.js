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
var express = __importStar(require("express"));
var errors_util_1 = require("../utils/errors.util");
var usuario_1 = require("./usuario");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var router = express.Router();
router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a login-restobar' });
});
// login user
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _data, idsede, userRestobar, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _data = req.body;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                idsede = _data.sede.idsede || _data.sede.idsede_restobar;
                return [4 /*yield*/, getUserRestobar(_data.user.idusuario_restobar, idsede)
                    // if (userRestobar.length === 0) { //crea org, sede, usuario
                    //     // const dataOrg = _data.org
                    //     // crea org
                    //     // const rptOrg: any = await createOrg(dataOrg);
                    //     // // crea sede
                    //     // const dataSede = { ..._data.sede, idorg: rptOrg.idorg, principal: '1' }
                    //     // const rptSede = await createSede(dataSede);
                    //     // //crea usuario
                    //     // const dataUser = { ..._data.user, idorg: rptOrg.idorg, idsede: rptSede.idsede, cargo: '' }
                    //     // userRestobar = await createUser(dataUser);
                    //     // res.status(200).send(rptUsuario);    
                    //     prisma.$disconnect();
                    // } else { // login
                    //     // res.status(200).send(userRestobar[0]);     
                    //     userRestobar = userRestobar[0]
                    //     prisma.$disconnect();
                    // }
                ];
            case 2:
                userRestobar = _a.sent();
                // if (userRestobar.length === 0) { //crea org, sede, usuario
                //     // const dataOrg = _data.org
                //     // crea org
                //     // const rptOrg: any = await createOrg(dataOrg);
                //     // // crea sede
                //     // const dataSede = { ..._data.sede, idorg: rptOrg.idorg, principal: '1' }
                //     // const rptSede = await createSede(dataSede);
                //     // //crea usuario
                //     // const dataUser = { ..._data.user, idorg: rptOrg.idorg, idsede: rptSede.idsede, cargo: '' }
                //     // userRestobar = await createUser(dataUser);
                //     // res.status(200).send(rptUsuario);    
                //     prisma.$disconnect();
                // } else { // login
                //     // res.status(200).send(userRestobar[0]);     
                //     userRestobar = userRestobar[0]
                //     prisma.$disconnect();
                // }
                userRestobar = userRestobar[0];
                prisma.$disconnect();
                // userRestobar.idsede_restobar = _data.sede.idsede_restobar
                //////console.log('0userRestobar', userRestobar);
                (0, usuario_1.loginRestobar)(req, res, userRestobar);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                return [2 /*return*/, res.status(500).send((0, errors_util_1.getErrorMessage)(error_1))];
            case 4: return [2 /*return*/];
        }
    });
}); });
// login user
router.post('/login-bot', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _data, us, userRestobar, _userBot, usuario_pass, dataUser;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _data = req.body;
                us = _data;
                return [4 /*yield*/, getUserRestobar(_data.id, _data.idsede)
                    // si el usuario es correcto
                ];
            case 1:
                userRestobar = _a.sent();
                if (!(userRestobar.length !== 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, getUserBot(_data.idsede)];
            case 2:
                _userBot = _a.sent();
                if (!(_userBot.length == 0)) return [3 /*break*/, 4];
                usuario_pass = Math.random().toString(36).substring(2, 7) + '-bot';
                dataUser = {
                    idsede: _data.idsede,
                    idorg: _data.idorg,
                    nombres: 'bot',
                    cargo: 'bot',
                    usuario: 'bot',
                    estado: 1,
                    pass: usuario_pass,
                    isbot: '1',
                    acc: '',
                    per: ''
                };
                return [4 /*yield*/, createUser(dataUser)];
            case 3:
                userRestobar = _a.sent();
                prisma.$disconnect();
                return [3 /*break*/, 5];
            case 4:
                userRestobar = _userBot[0];
                prisma.$disconnect();
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6: // login             
            return [2 /*return*/, res.status(500).send((0, errors_util_1.getErrorMessage)('usuario no existe'))];
            case 7:
                userRestobar.idsede = _data.idsede;
                (0, usuario_1.loginRestobarBot)(req, res, userRestobar);
                return [2 /*return*/];
        }
    });
}); });
router.post('/login-dashboard', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, usuario, pass, code, user;
    return __generator(this, function (_b) {
        _a = req.body, usuario = _a.usuario, pass = _a.pass, code = _a.code;
        user = {
            usuario: usuario,
            pass: pass,
            code: code
        };
        return [2 /*return*/, (0, usuario_1.loginDashboard)(req, res, user)];
    });
}); });
var getUserRestobar = function (idusuario, idsede) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.usuario.findMany({
                    where: { AND: {
                            idusuario: Number(idusuario),
                            idsede: Number(idsede)
                        } }
                })];
            case 1: 
            ////console.log('=======', idusuario);
            return [2 /*return*/, _a.sent()];
        }
    });
}); };
var getUserBot = function (idsede) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.usuario.findMany({
                    where: {
                        AND: {
                            idsede: Number(idsede),
                            isbot: '1'
                        }
                    }
                })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
// const createOrg = async (dataOrg: any) => {
//     const userOrg = await prisma.org.findMany({
//         where: { idorg: Number(dataOrg.idorg_restobar) }
//     })
//     if (userOrg.length === 0) { // sino existe crea
//         return await prisma.org.create({
//             data: dataOrg
//         });
//     } else {
//         return userOrg[0]
//     }
// }
// const createSede = async (dataSede: any) => {
//     const userSede = await prisma.sede.findMany({
//         where: { idsede_restobar: Number(dataSede.idsede_restobar) }
//     })
//     if (userSede.length === 0) { // sino existe crea
//         return await prisma.sede.create({
//             data: dataSede
//         });
//     } else {
//         return userSede[0]
//     }
// }
var createUser = function (dataUser) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.usuario.create({
                    data: dataUser
                })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports["default"] = router;
