import * as jwt from 'jsonwebtoken';
import { Secret, JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// La clave sale del env. El literal viejo queda SOLO como fallback de transición
// para no invalidar sesiones al deployar este cambio; rotar = setear JWT_SECRET
// con un valor nuevo y largo (invalida todos los tokens vigentes → re-login).
// Función y no const: si algún día se agrega dotenv tardío, igual lee el valor real.
const CLAVE_LEGACY = 'DalePlay182182';
let avisoClaveLegacy = false;
export const secretKey = (): Secret => {
    const s = process.env.JWT_SECRET;
    if (s && s.length >= 16) return s;
    if (!avisoClaveLegacy) {
        logger.warn('[auth] JWT_SECRET no configurada (o muy corta): usando clave legacy hardcodeada. Configurala y rotala en produccion.');
        avisoClaveLegacy = true;
    }
    return CLAVE_LEGACY;
};

export interface CustomRequest extends Request {
    token: string | JwtPayload;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, secretKey());
        (req as CustomRequest).token = decoded;

        next();
    } catch (err) {
        res.status(401).send('Autentificacion Incorrecta');
    }
};

// Autorización por sede (multi-tenant): un token válido de la sede A no debe
// poder operar sobre la sede B cambiando el :idsede de la URL. El JWT ya trae
// idsede desde el login (y el de dashboard además sedes[] para orgs multi-sede).
// Se usa SIEMPRE después de `auth` (necesita el token ya decodificado).
export const authSede = (req: Request, res: Response, next: NextFunction) => {
    const t: any = (req as CustomRequest).token;
    const pedida = Number(req.params.idsede);
    const propias = new Set<number>();
    if (Number.isFinite(Number(t?.idsede))) propias.add(Number(t.idsede));
    if (Array.isArray(t?.sedes)) {
        for (const s of t.sedes) {
            if (Number.isFinite(Number(s?.idsede))) propias.add(Number(s.idsede));
        }
    }
    if (Number.isFinite(pedida) && propias.has(pedida)) return next();
    res.status(403).json({ success: false, error: 'Sede no autorizada para este usuario' });
};

// Igual que authSede pero leyendo la sede del CUERPO, que es de donde la toman
// los controladores dash-*. Sin esto, un token valido de la sede A puede pedir
// los datos de la sede B cambiando un numero en el body: el `auth` de la ruta
// solo comprueba que el token exista, no que la sede sea suya.
//
// Si el cuerpo no trae idsede no se bloquea: hay endpoints que no lo usan. Lo
// que se impide es pedir una sede AJENA.
export const authSedeBody = (req: Request, res: Response, next: NextFunction) => {
    const bruto = (req.body ?? {}).idsede;
    if (bruto === undefined || bruto === null || bruto === '') return next();

    const pedida = Number(bruto);
    if (!Number.isFinite(pedida)) {
        return res.status(400).json({ success: false, error: 'idsede invalido' });
    }

    const t: any = (req as CustomRequest).token;
    const propias = new Set<number>();
    if (Number.isFinite(Number(t?.idsede))) propias.add(Number(t.idsede));
    if (Array.isArray(t?.sedes)) {
        for (const s of t.sedes) {
            if (Number.isFinite(Number(s?.idsede))) propias.add(Number(s.idsede));
        }
    }

    if (propias.has(pedida)) return next();
    res.status(403).json({ success: false, error: 'Sede no autorizada para este usuario' });
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
            logger.warn('CHATBOT_API_KEY no configurada: /chatbot/* queda SIN protección');
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

        const decoded = jwt.verify(token, secretKey());
        (req as CustomRequest).token = decoded;

        res.status(200).send('Ok');
    } catch (err) {
        res.status(401).send('Autentificacion Incorrecta');
    }
};
