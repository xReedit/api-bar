import * as jwt from 'jsonwebtoken';
import * as express from "express";
import * as bcrypt from 'bcryptjs';
import { SECRET_KEY } from '../middleware/auth';
import { PrismaClient } from "@prisma/client";


// const _SECRET_KEY = SECRET_KEY;
const prisma = new PrismaClient();
const router = express.Router();

export async function login(_usuario: any) {
    try {
        const usuario = <any>await prisma.usuario.findFirst({ where: { usuario: _usuario.usuario } });

        if (!usuario) {
            throw new Error("Usuario o Clave incorrectos");
        }

        // const isMatch = bcrypt.compareSync(_usuario.pass, usuario.pass);
        const isMatch = _usuario.pass === usuario.pass;

        if (isMatch) {
            const token = jwt.sign({ id: usuario.idusuario, usuario: usuario.usuario, idsede: usuario.idsede, idorg: usuario.idorg }, SECRET_KEY,
                {
                    expiresIn: "1d",
                })

            return { usuario: usuario, token: token };
        } else {
            throw new Error(`Usuario o Clave incorrectos`);
        }
    }
    catch (err) {
        throw err;
    }

}

export async function loginBot(_usuario: any) {
    try {
        const usuario = <any>await prisma.usuario.findFirst({ where: { usuario: _usuario.usuario } });

        if (!usuario) {
            throw new Error("Usuario o Clave incorrectos");
        }

        // const isMatch = bcrypt.compareSync(_usuario.pass, usuario.pass);
        // const isMatch = _usuario.pass === usuario.pass;
        const isMatch = usuario.isbot === '1';

        if (isMatch) {
            const token = jwt.sign({ id: usuario.idusuario, usuario: usuario.usuario, idsede: usuario.idsede, idorg: usuario.idorg }, SECRET_KEY,
                {
                    expiresIn: "10d",
                })

            return { usuario: usuario, token: token };
        } else {
            throw new Error(`Usuario o Clave incorrectos`);
        }
    }
    catch (err) {
        throw err;
    }

}


export async function loginDashboard(_usuario: any, fromRestobar: boolean = false) {
    try {
        const usuario = <any>await prisma.usuario.findFirst({ where: { usuario: _usuario.usuario } });

        if (!usuario) {
            throw new Error("Usuario o Clave incorrectos");
        }

        // Validar permiso A14 para acceder al dashboard
        const permisos = usuario.acc ? usuario.acc.split(',') : [];
        if (!permisos.includes('A14')) {
            throw new Error("No tiene permisos para acceder al dashboard");
        }

        if (fromRestobar) {
            return datosUser(usuario)
        }

        // const isMatch = bcrypt.compareSync(_usuario.pass, usuario.pass);
        const isMatch = _usuario.pass === usuario.pass;

        if (isMatch) {
            return datosUser(usuario)
        } else {
            throw new Error(`Usuario o Clave incorrectos`);
        }
    }
    catch (err) {
        throw err;
    }

}

async function datosUser(usuario: any) {
    try {

        const sedes = await prisma.sede.findMany({
            where: {
                idorg: usuario.idorg,
                estado: 0
            },
            select: {
                idsede: true,
                nombre: true
            },
            orderBy: {
                idsede: 'asc'
            }
        });

        // Si el usuario pertenece a la primera sede, mostrar todas; sino solo la suya
        const esPrimeraSede = sedes.length > 0 && sedes[0].idsede === usuario.idsede;
        const listSedes = esPrimeraSede
            ? sedes
            : sedes.filter(s => s.idsede === usuario.idsede);


        const token = jwt.sign({
            id: usuario.idusuario,
            usuario: usuario.usuario,
            idsede: usuario.idsede,
            idorg: usuario.idorg,
            sedes: listSedes
        }, SECRET_KEY,
            {
                expiresIn: "1d",
            })

        return { usuario: usuario, token: token, sedes: listSedes };
        
    } catch (error) {
        throw new Error(`Usuario o Clave incorrectos`);
    }
}


