import { Request, Response } from 'express';
import * as express from "express";
import * as bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import * as userServices from '../services/usuario.service';
import { getErrorMessage } from '../utils/errors.util';
import { loginRestobar, loginRestobarBot, loginDashboard } from './usuario'


import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Freno a la enumeración: login-bot emite tokens a partir de ids numéricos
// pequeños (idusuario/idsede/idorg) y las claves se comparan sin hash, así que
// sin límite un atacante prueba combinaciones gratis. 15/min por IP alcanza
// de sobra para el uso legítimo (un login por sesión de panel).
const limiteLogin = rateLimit({
    windowMs: 60_000,
    limit: 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: 'Demasiados intentos. Espera un momento.' }),
});

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a login-restobar' })
});

// login user
router.post('/login', limiteLogin, async (req: any, res: any) => {
    const _data = req.body
    try {
        // verificar si existe usuario restobar        
        const idsede = _data.sede.idsede || _data.sede.idsede_restobar
        let userRestobar: any = await getUserRestobar(_data.user.idusuario_restobar, idsede)

        // if (userRestobar.length === 0) { //crea org, sede, usuario
        //     // const dataOrg = _data.org

        //     // crea org
        //     // const rptOrg: any = await createOrg(dataOrg);

        //     // // crea sede
        //     // const dataSede = { ..._data.sede, idorg: rptOrg.idorg, principal: '1' }
        //     // const rptSede = await createSede(dataSede);

        //     // //crea usuario
        //     // const dataUser = { ..._data.user, idorg: rptOrg.idorg, idsede: rptSede.idsede, cargo: '' }
        //     // userRestobar = await createUser(dataUser);



        //     // res.status(200).send(rptUsuario);    

        //     prisma.$disconnect();


        // } else { // login
        //     // res.status(200).send(userRestobar[0]);     
        //     userRestobar = userRestobar[0]
        //     prisma.$disconnect();
        // }

        userRestobar = userRestobar[0]
        prisma.$disconnect();

        // userRestobar.idsede_restobar = _data.sede.idsede_restobar
        //////console.log('0userRestobar', userRestobar);

        loginRestobar(req, res, userRestobar)

    } catch (error) {
        return res.status(500).send(getErrorMessage(error));
    }
})

// login user
router.post('/login-bot', limiteLogin, async (req: any, res: any) => {
    const _data = req.body
    try {
        // Verificar que el trío idusuario+idsede+idorg exista y sea coherente.
        // OJO: esto solo sube la barrera de adivinanza; el endpoint sigue emitiendo
        // token sin prueba criptográfica (el fix real es que restobar le pase a
        // Piter una credencial firmada — tarea aparte).
        let userRestobar: any = await getUserRestobar(_data.id, _data.idsede, _data.idorg)

        // si el usuario es correcto
        if (userRestobar.length !== 0) { //crea el usuario bot

            const _userBot = await getUserBot(_data.idsede)

            if (_userBot.length == 0) { // si no existe lo crea

                // const dataOrg = _data.org

                // nombre del bot sera un codigo alfanumero de 5 digitos seguido de bot
                const usuario_pass = Math.random().toString(36).substring(2, 7) + '-bot';


                //crea usuario boot            
                const dataUser = {
                    idsede: _data.idsede,
                    idorg: _data.idorg,
                    nombres: 'bot',
                    cargo: 'bot',
                    usuario: 'bot',
                    estado: 1, // eliminado para que no figure en el listado de usuarios
                    pass: usuario_pass,
                    isbot: '1',
                    acc: '',
                    per: '',
                    // last_notificacion_change_system: '2021-02-08',
                }

                userRestobar = await createUser(dataUser);
                prisma.$disconnect();
            } else {
                userRestobar = _userBot[0]
                prisma.$disconnect();
            }


        } else { // login             
            return res.status(500).send(getErrorMessage('usuario no existe'));
        }

        userRestobar.idsede = _data.idsede

        loginRestobarBot(req, res, userRestobar)

    } catch (error) {
        // Sin este catch, un throw en los await dejaba la request colgada
        // (rechazo de promesa sin manejar en express 4).
        console.error('login-bot:', error);
        return res.status(500).send(getErrorMessage(error));
    }
})

router.post('/login-dashboard', limiteLogin, async (req: any, res: any) => {
    const { usuario, pass, code } = req.body
    const user = {
        usuario, pass, code
    }
    return loginDashboard(req, res, user)
})

const getUserRestobar = async (idusuario: number, idsede: number, idorg?: number) => {
    return await prisma.usuario.findMany({
        where: {  AND: {
            idusuario: Number(idusuario),
            idsede: Number(idsede),
            // idorg opcional para no tocar el flujo de /login; login-bot SÍ lo exige
            // (una incógnita más que adivinar y coherencia del trío).
            ...(idorg !== undefined ? { idorg: Number(idorg) } : {})
        } }
    })
}

const getUserBot = async (idsede: number) => {
    return await prisma.usuario.findMany({
        where: {
            AND: {                
                idsede: Number(idsede),
                isbot: '1'
            }
        }
    })
}

// const createOrg = async (dataOrg: any) => {
//     const userOrg = await prisma.org.findMany({
//         where: { idorg: Number(dataOrg.idorg_restobar) }
//     })

//     if (userOrg.length === 0) { // sino existe crea
//         return await prisma.org.create({
//             data: dataOrg
//         });
//     } else {
//         return userOrg[0]
//     }
// }

// const createSede = async (dataSede: any) => {
//     const userSede = await prisma.sede.findMany({
//         where: { idsede_restobar: Number(dataSede.idsede_restobar) }
//     })

//     if (userSede.length === 0) { // sino existe crea
//         return await prisma.sede.create({
//             data: dataSede
//         });
//     } else {
//         return userSede[0]
//     }
// }


const createUser = async (dataUser: any) => {
    return await prisma.usuario.create({
        data: dataUser
    });

}



export default router;
