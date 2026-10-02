import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    logger.error(err.stack);
    res.status(500).send('Ocurrio un error en la solicitud.');
}

export { errorHandler };
