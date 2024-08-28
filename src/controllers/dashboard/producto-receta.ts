import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponse } from "../../services/dash.util";
dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api dash PRODUCTO RECETA' })
});

// obtener total pedidos
router.post("/get-productos-receta", async (req, res) => {
    const { idsede, params } = req.body;
    try {        
        const ssql = `CALL procedure_module_dash_productos_receta(${idsede})`;
        console.log('ssql', ssql);        
        let rptExec: any = await prisma.$queryRawUnsafe(ssql);
        rptExec = normalizeReceta(rptExec);
        rptExec = normalizeResponse(rptExec);       
        res.status(200).json(rptExec);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.post("/get-productos-bodega", async (req, res) => {
    const { idsede, idproducto_stock, params } = req.body;

    console.log('idproducto_stock', idproducto_stock);
    if (idproducto_stock === '')  {
        res.status(200).json([]);
    }

    try { 
        const ssql = ` select p.idproducto, pds.idproducto_stock, p.idproducto_familia idseccion, p.precio, p.precio_unitario, p.precio_venta, pdf.descripcion nom_seccion, p.descripcion nom_producto, a.descripcion nom_almacen            
            from producto p 
            inner join producto_familia pdf on p.idproducto_familia = pdf.idproducto_familia
            inner join producto_stock pds on p.idproducto = pds.idproducto
            inner join almacen a on a.idalmacen = pds.idalmacen 
            where pds.idproducto_stock in (${idproducto_stock}) and p.idsede = ${idsede} and p.estado = 0 and a.estado = 0 
            order by p.descripcion`;
        // const productos: any = await prisma.$queryRaw`
        //     select p.idproducto, pds.idproducto_stock, p.idproducto_familia idseccion, p.precio, p.precio_unitario, p.precio_venta, pdf.descripcion seccion, p.descripcion nom_producto from producto p 
        //     inner join producto_familia pdf on p.idproducto_familia = pdf.idproducto_familia
        //     inner join producto_stock pds on p.idproducto = pds.idproducto
        //     inner join almacen a on a.idalmacen = pds.idalmacen 
        //     where pds.idproducto_stock in (${idproducto_stock}) and p.idsede = ${idsede} and p.estado = 0 and a.estado = 0 
        //     order by p.descripcion`;

        let productos: any = await prisma.$queryRawUnsafe(ssql);

        productos.forEach((element: any) => {            
            element.cantidad = 0;
            element.total = 0;
            element.costo = 0;
            element.rentabilidad = 0;
        });
        
        console.log('productos', productos);
        res.status(200).json(productos);
    } catch (error) {
        res.status(500).json(error);
    }

});



function normalizeReceta(data: any) {
    let rpt: any = [];
    data.forEach((element: any) => {
        rpt.push({
            iditem: element.f0,
            descripcion: element.f1,
            precio: element.f2,
            costo: element.f3,
            rentabilidad: element.f4,
        });
    });

    return rpt;
}

export default router;