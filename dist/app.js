"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var routes_1 = __importDefault(require("./routes"));
var process_1 = require("process");
var error_1 = require("./middleware/error");
var app = (0, express_1["default"])();
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
    return console.log('REST API server ready at: http://localhost:20223');
});
