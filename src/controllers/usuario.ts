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
