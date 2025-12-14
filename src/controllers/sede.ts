import * as express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a sedes' })
});


// create
router.post('/create', async (req: any, res) => {
    const _data = { ...req.body, idsede: req['token'].idsede }
    const rpt = await prisma.rrhh_rol.create({
        data: _data
    })

    // res.json(rpt)    
    res.status(200).send(rpt);
    prisma.$disconnect();
});

//by idOrg
router.get('/byIdorg/:id', async (req: any, res) => {
    const { id } = req.params
    const rpt = await prisma.sede.findMany({        
        where: { idorg: Number(id) },
        select: {
            idsede: true,
            nombre: true,
            ciudad: true,
            direccion: true,
            telefono: true            
        },
    })

    res.status(200).send(rpt);
    prisma.$disconnect();
})


export default router;
