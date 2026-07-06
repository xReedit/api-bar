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

// Config del chatbot por sede (número de billetera Yape/Plin, métodos marcados)
router.get('/chatbot-config/:idsede', async (req: any, res) => {
    const { idsede } = req.params;
    const rpt = await prisma.sede.findUnique({
        where: { idsede: Number(idsede) },
        select: {
            numero_billetera_chatbot: true,
            metodo_pago_aceptados_chatbot: true
        }
    });
    res.status(200).send(rpt || {});
});

router.post('/chatbot-config', async (req: any, res) => {
    const { idsede, numero_billetera_chatbot } = req.body;
    if (!idsede) {
        return res.status(400).send({ success: false, error: 'idsede es requerido' });
    }
    // solo dígitos, espacios, + y guiones; máx 30 (largo de la columna)
    const numero = String(numero_billetera_chatbot || '').trim().slice(0, 30);
    if (numero && !/^[\d\s+-]+$/.test(numero)) {
        return res.status(400).send({ success: false, error: 'Número de billetera inválido' });
    }
    await prisma.sede.update({
        where: { idsede: Number(idsede) },
        data: { numero_billetera_chatbot: numero || null }
    });
    res.status(200).send({ success: true });
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
