import * as jwt from 'jsonwebtoken';
import { Secret, JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const SECRET_KEY: Secret = 'DalePlay182182';

export interface CustomRequest extends Request {
    token: string | JwtPayload;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        (req as CustomRequest).token = decoded;

        next();
    } catch (err) {
        res.status(401).send('Autentificacion Incorrecta');
    }
};

// API key compartida para las rutas server-to-server del chatbot (/chatbot/*).
// El bot Go envía el header x-api-key; nadie más debe poder leer contexto de
// clientes ni crear pedidos. Si CHATBOT_API_KEY no está configurada, deja
// pasar con warning (rollout seguro: primero deployar código, luego exigir).
let warnedNoApiKey = false;
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.CHATBOT_API_KEY;
    if (!expected) {
        if (!warnedNoApiKey) {
            console.warn('CHATBOT_API_KEY no configurada: /chatbot/* queda SIN protección');
            warnedNoApiKey = true;
        }
        return next();
    }
    if (req.header('x-api-key') === expected) {
        return next();
    }
    res.status(401).json({ success: false, error: 'No autorizado' });
};

export const authVerify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.body.token;

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        (req as CustomRequest).token = decoded;

        res.status(200).send('Ok');
    } catch (err) {
        res.status(401).send('Autentificacion Incorrecta');
    }
};
