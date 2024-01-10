import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { fechaGuionASlash } from "../utils/utils";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api permiso remoto' })
});

router.get("/permisos/:link", async (req, res) => {
    const { link } = req.params;
    // obterner el idsede y el idusuario_admin de la tabla permiso_remoto
    
    const permiso: any = await prisma.permiso_remoto.findFirst({
        where: {
            link: link.toString()
        },
        select: {
            idsede: true,
            idusuario_admin: true
        }
    });

    // si hay datos que continue sino que devuelva un mensaje    
    if (!permiso) {
        return res.status(400).json({ success: false, message: 'El link no existe' });
    }

    
    // traer los ultimo 10 registros de la tabla permiso_remoto    
    const registros = await prisma.permiso_remoto.findMany({
        take: 10,
        orderBy: {
            idpermiso_remoto: 'desc'
        },
        where: {
            idsede: permiso.idsede,
            idusuario_admin: permiso.idusuario_admin,
            atendido: '0',
            estado: '0'            
        },
        select: {            
            idpermiso_remoto: true,            
            fecha: true,
            hora: true,
            atendido: true,
            data: true,
            sede: {
                select: {
                    idorg: true,
                    idsede: true
                }
            }
        }
    });


    // devolver los resultados
    res.status(200).json({ success: true, data: registros });
    prisma.$disconnect();
});

router.put('/update/:id', async (req: any, res) => {
    // actualizar el estado del permiso con atendido = 1 mediante el idpermiso_remoto
    const { id } = req.params    
    const rpt = await prisma.permiso_remoto.updateMany({
            data: {atendido: '1'},
            where: { 
                idpermiso_remoto: Number(id),                
            }            
        }
    )

    res.status(200).json({ success: true});

})

export default router;