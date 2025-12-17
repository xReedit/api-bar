import * as express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from 'dotenv';
import { normalizeResponse, normalizeResponseDashProductos } from "../../services/dash.util";
import { limitarRangoFechasDashboard } from "../../utils/utils";
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
        //console.log('ssql', ssql);        
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

    //console.log('idproducto_stock', idproducto_stock);
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
        
        //console.log('productos', productos);
        res.status(200).json(productos);
    } catch (error) {
        res.status(500).json(error);
    }

});

router.post("/get-dash-productos", async (req, res) => {
    const { idsede, params } = req.body;

    let productoResultados: any;

    const p_tipo_consulta = params.tipo_consulta;
    
    // Limitar rango de fechas a máximo 5 meses
    const fechasLimitadas = limitarRangoFechasDashboard(params.rango_start_date, params.rango_end_date);
    const p_fecha_inicio = fechasLimitadas.fecha_inicio;
    const p_fecha_fin = fechasLimitadas.fecha_fin;
    
    try {        
        productoResultados = await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET @xidsede = ${idsede}`);
            await tx.$executeRawUnsafe(`SET @tipo_consulta = '${p_tipo_consulta}'`);
            await tx.$executeRawUnsafe(`SET @fecha_inicio = '${p_fecha_inicio}'`);
            await tx.$executeRawUnsafe(`SET @fecha_fin = '${p_fecha_fin}'`);


            

            try {
                const result = await tx.$queryRawUnsafe(`CALL procedure_module_dash_productos(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`);
                return result;
            } catch (error) {
                throw error;
            }
        });

        const productoResultadosFormateados = normalizeResponseDashProductos(productoResultados, p_tipo_consulta);       
        res.status(200).json(productoResultadosFormateados);
    } catch (error) {
        res.status(500).json(error);
    }
});


router.post("/save-food-cost", async (req, res) => {
    const { items } = req.body;

    try {
        let inserted = 0;
        let updated = 0;

        for (const item of items) {
            const { idsede, iditem, plato, precio_venta, food_cost, porcentaje_food_cost, resumen, receta_sugerida } = item;

            const existingRecord: any = await prisma.$queryRawUnsafe(
                `SELECT id FROM platos_food_cost WHERE idsede = ${idsede} AND iditem = ${iditem} LIMIT 1`
            );

            if (existingRecord && existingRecord.length > 0) {
                await prisma.$executeRawUnsafe(
                    `UPDATE platos_food_cost SET 
                        plato = ?, 
                        precio_venta = ?, 
                        food_cost = ?, 
                        porcentaje_food_cost = ?, 
                        resumen = ?, 
                        receta_sugerida = ?,
                        updated_at = NOW()
                    WHERE idsede = ? AND iditem = ?`,
                    plato,
                    precio_venta,
                    food_cost,
                    porcentaje_food_cost,
                    resumen,
                    JSON.stringify(receta_sugerida),
                    idsede,
                    iditem
                );
                updated++;
            } else {
                await prisma.$executeRawUnsafe(
                    `INSERT INTO platos_food_cost (idsede, iditem, plato, precio_venta, food_cost, porcentaje_food_cost, resumen, receta_sugerida) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    idsede,
                    iditem,
                    plato,
                    precio_venta,
                    food_cost,
                    porcentaje_food_cost,
                    resumen,
                    JSON.stringify(receta_sugerida)
                );
                inserted++;
            }
        }

        res.status(200).json({
            message: 'Food costs guardados correctamente',
            inserted,
            updated,
            total: items.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el food cost', details: error });
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
