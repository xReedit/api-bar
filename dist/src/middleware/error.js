"use strict";
exports.__esModule = true;
exports.errorHandler = void 0;
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Ocurrio un error en la solicitud.');
}
exports.errorHandler = errorHandler;
