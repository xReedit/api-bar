"use strict";
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
var _a;
exports.__esModule = true;
// ponytail: polyfill Web Crypto para Node < 19 (el AWS SDK v3 necesita globalThis.crypto.getRandomValues). Quitar cuando el server corra Node 20+.
var crypto_1 = require("crypto");
if (!globalThis.crypto)
    globalThis.crypto = crypto_1.webcrypto;
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var routes_1 = __importDefault(require("./routes"));
var process_1 = require("process");
var error_1 = require("./middleware/error");
var push_watcher_1 = require("./services/push.watcher");
var app = (0, express_1["default"])();
// IP real del cliente para el rate limit de /encuesta-publica. Se confia por DIRECCION y no por numero de saltos:
// a la API se llega por el VPS de la encuesta y directo por papaya.com.pe, con distinta cantidad de proxies, y un
// conteo fijo o se falsifica (X-Forwarded-For del cliente) o deja a todos con la misma IP (limite global).
// TRUST_PROXY_IPS = IPs de los proxies propios separadas por coma (el de papaya.com.pe si no es local y la IP
// publica del VPS de la encuesta). loopback siempre: proxy en la misma maquina y proxy de Vite en desarrollo.
app.set('trust proxy', __spreadArray(['loopback'], ((_a = process_1.env.TRUST_PROXY_IPS) !== null && _a !== void 0 ? _a : '').split(',').map(function (s) { return s.trim(); }).filter(Boolean), true));
app.use((0, cors_1["default"])());
app.use(express_1["default"].json());
app.use(error_1.errorHandler);
// Aumentar el límite de tamaño de la carga útil a 50mb
app.use(express_1["default"].json({ limit: '50mb' }));
app.use(express_1["default"].urlencoded({ limit: '50mb', extended: true }));
app.use('/api-restobar', routes_1["default"]);
var portConect = process_1.env.PORT || 20223;
app.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: ' + portConect });
});
app.listen(portConect, function () {
    // Arranca el watcher de push notifications (opt-in vía PUSH_WATCHER_ENABLED=true)
    (0, push_watcher_1.startPushWatcher)();
});
