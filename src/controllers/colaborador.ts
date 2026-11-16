import * as express from "express";
import prisma from '../utils/prisma';

const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a colaborador' })
});


// create
router.post('/create', async (req: any, res) => {
    const _data = { ...req.body, idsede: req['token'].idsede, idorg: req['token'].idorg }
    const rpt = await prisma.colaborador.create({
        data: _data
    })

    // res.json(rpt)        
    res.status(200).send(rpt);
});

router.put('/update/:id', async (req: any, res) => {
    const { id } = req.params
    const idorg = req['token'].idorg
    const _data = { ...req.body, idsede: req['token'].idsede, idorg: req['token'].idorg }
    const rpt = await prisma.colaborador.updateMany({
            data: _data,
            where: { 
                AND: [
                    {idcolaborador: Number(id)},
                    { idorg: Number(idorg)},
                ]
            }
            
        }
    )
    
    res.status(200).send(rpt);
});

router.get('/byId/:id', async (req: any, res) => {
    const { id } = req.params
    const idorg = req['token'].idorg
    const rpt = await prisma.colaborador.findMany({
        where: { 
            AND: [
                { idcolaborador: Number(id) },
                { idorg: Number(idorg) },
            ]
        }                
    })

    res.status(200).send(rpt);
});


router.get('/byIdorg/:id', async (req: any, res) => {
    const { id } = req.params
    const rpt = await prisma.colaborador.findMany({        
        where: { idorg: Number(id) },        
        select: {
            idcolaborador: true,
            nombres: true,
            apellidos: true,
            ciudad: true,
            sede: {
                select: {
                    nombre: true,
                    ciudad: true,
                }
            },
        },        
    })

    res.status(200).send(rpt);
});








export default router;
