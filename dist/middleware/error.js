"use strict";
exports.__esModule = true;
exports.errorHandler = void 0;
var logger_1 = require("../utils/logger");
function errorHandler(err, req, res, next) {
    logger_1.logger.error(err.stack);
    res.status(500).send('Ocurrio un error en la solicitud.');
}
exports.errorHandler = errorHandler;
