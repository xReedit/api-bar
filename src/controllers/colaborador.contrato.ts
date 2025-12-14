import * as express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();


router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a colaborador contrato' })
});


// create
router.post('/create', async (req: any, res, next) => {
    const dataBody = req.body
    try {
        const _data = {
            idcolaborador: Number(dataBody.idcolaborador),
            idorg: Number(req['token'].idorg),
            fecha_empieza: dataBody.fecha_empieza,
            fecha_registro: new Date().toJSON().slice(0, 10)
        }

        const contrato = await prisma.colaborador_contrato.create({
            data: _data
        })

        // guarda detalle de contrato
        delete dataBody.fecha_empieza;
        delete dataBody.idcolaborador;

        // dataBody.idsede_trabajo = Number(dataBody.idsede_trabajo)
        dataBody.idrrhh_rol = Number(dataBody.idrrhh_rol)
        const _dataDetalle = { ...dataBody, idcolaborador_contrato: contrato.idcolaborador_contrato }

        const rpt = await prisma.colaborador_contrato_detalle.create({
            data: _dataDetalle
        })

        // res.json(rpt)    
        res.status(200).send(rpt);
    } catch (error) {
        console.error(error);
        return res.status(400).send({ success:false, error: 'Error al procesar la solicitud' });        
    }
    
    prisma.$disconnect();
});

router.get('/byIdColaborador/:id', async (req: any, res) => {
    const { id } = req.params
    const idorg = req['token'].idorg
    const rpt = await prisma.colaborador_contrato.findMany({
        where: {
            AND: [
                { idcolaborador: Number(id) },
                { idorg: Number(idorg) },
            ]
        }
    })

    res.status(200).send(rpt);
    prisma.$disconnect();
});


export default router;
