import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { fechaGuionASlash } from "../utils/utils";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";

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
            idpermiso_remoto: true,
            idsede: true,
            idusuario_admin: true
        }
    });

    // si hay datos que continue sino que devuelva un mensaje
    if (!permiso) {
        return res.status(400).json({ success: false, message: 'El link no existe' });
    }

    const campos = {
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
    };

    const deEsteAdmin = {
        idsede: permiso.idsede,
        idusuario_admin: permiso.idusuario_admin,
        estado: '0'
    };

    // Las ya respondidas van tambien, pero pocas: el admin abre el link de
    // WhatsApp otra vez y si solo mandamos las pendientes ve una pantalla en
    // blanco, como si el link estuviera roto. Con cinco alcanza para que
    // reconozca la suya sin llenar la lista.
    const [pendientes, respondidas] = await Promise.all([
        prisma.permiso_remoto.findMany({
            take: 10,
            orderBy: { idpermiso_remoto: 'desc' },
            where: { ...deEsteAdmin, atendido: '0' },
            select: campos
        }),
        prisma.permiso_remoto.findMany({
            take: 5,
            orderBy: { idpermiso_remoto: 'desc' },
            where: { ...deEsteAdmin, atendido: { not: '0' } },
            select: campos
        })
    ]);

    const registros: any[] = [...pendientes, ...respondidas];

    // La solicitud de ESTE link siempre tiene que estar. Si ya se respondio y
    // quedo fuera de las ultimas cinco, igual se agrega: el admin entro por su
    // link y tiene que ver de que le estan hablando.
    if (!registros.some(r => r.idpermiso_remoto === permiso.idpermiso_remoto)) {
        const suya = await prisma.permiso_remoto.findUnique({
            where: { idpermiso_remoto: permiso.idpermiso_remoto },
            select: campos
        });
        if (suya) { registros.push(suya); }
    }


     // Formatear la fecha antes de devolver los resultados
    const formattedRegistros = registros.map(registro => {
        // Asegurarse de que la fecha se maneje correctamente sin ajuste de zona horaria
        const fechaISO = typeof registro.fecha === 'string' ? registro.fecha : registro.fecha.toISOString();
        return {
            ...registro,
            fecha: format(parseISO(fechaISO), 'yyyy-MM-dd'),
            // Para que la pantalla pueda resaltar la que el admin vino a ver.
            es_del_link: registro.idpermiso_remoto === permiso.idpermiso_remoto
        };
    });



    // devolver los resultados
    // res.status(200).json({ success: true, data: registros });
    res.status(200).json({ success: true, data: formattedRegistros });
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
