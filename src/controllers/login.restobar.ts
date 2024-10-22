import { Request, Response } from 'express';
import * as express from "express";
import * as bcrypt from 'bcryptjs';
import * as userServices from '../services/usuario.service';
import { getErrorMessage } from '../utils/errors.util';
import { loginRestobar, loginRestobarBot } from './usuario'


import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a login-restobar' })
});

// login user
router.post('/login', async (req: any, res: any) => {
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
        console.log('0userRestobar', userRestobar);

        loginRestobar(req, res, userRestobar)

    } catch (error) {
        console.error(error);
        return res.status(500).send(getErrorMessage(error));
    }
})

// login user
router.post('/login-bot', async (req: any, res: any) => {
    const _data = req.body
    console.log('_data', _data);    
    const us = _data;
    console.log('us', us);
    console.log('usuario', us.idsede);
    // try {
        // verificar si existe usuario restobar
    let userRestobar: any = await getUserRestobar(_data.id, _data.idsede)

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

    // } catch (error) {
    //     console.error(error);
    //     return res.status(500).send(getErrorMessage(error));
    // }
})

const getUserRestobar = async (idusuario: number, idsede: number) => {
    console.log('=======', idusuario);
    return await prisma.usuario.findMany({
        where: {  AND: {
            idusuario: Number(idusuario),
            idsede: Number(idsede)
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