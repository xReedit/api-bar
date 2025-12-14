import { Request, Response } from 'express';
import * as express from "express";
import * as bcrypt from 'bcryptjs';
import * as userServices from '../services/usuario.service';
import { getErrorMessage } from '../utils/errors.util';


import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();


// login user
export const login = async (req: Request, res: Response) => {    
    try {
        const foundUser = await userServices.login(req.body);
        delete foundUser.usuario['pass'];
        res.status(200).send(foundUser);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
}

export const loginRestobar = async (req: Request, res: Response, user: any) => {
    try {
        const foundUser = await userServices.login(user);
        delete foundUser.usuario['pass'];
        res.status(200).send(foundUser);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
}

export const loginRestobarBot = async (req: Request, res: Response, user: any) => {
    try {
        const foundUser = await userServices.loginBot(user);
        delete foundUser.usuario['pass'];
        res.status(200).send(foundUser);
    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
}

// login para dashboard
export const loginDashboard = async (req: Request, res: Response, user: any) => {
    try {
        // Verificar si viene desde restobar (código base64: ZnJvbS1yZXN0b2Jhci0wMDE= = from-restobar-001)
        const fromRestobar = user?.code ? user.code === 'ZnJvbS1yZXN0b2Jhci0wMDE=' : false;
        
        const foundUser = await userServices.loginDashboard(user, fromRestobar);
        delete foundUser.usuario['pass'];
        res.status(200).send(foundUser);
    } catch (error: any) {
        const mensaje = error?.message || 'Error desconocido';
        // 401 para errores de autenticación/autorización
        return res.status(401).json({ 
            success: false, 
            message: mensaje 
        });
    }
}
