import * as express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Estás conectado al api restobar cobranza' })
});

// verificar advertencia de pago del servicio

router.get("/advertencia/:idsede", async (req, res) => {
    const { idsede } = req.params;
    
    try {
        const rptData = await prisma.sede_suscripcion.findMany({
            where: {
                idsede: parseInt(idsede),            
                estado: '0'
            }
        });

        // Si no hay suscripción, no mostrar advertencia
        if (rptData.length === 0) {
            return res.json({ mostrar: false });
        }

        const rpt = rptData[0];
        const ultimaFechaPago = rpt.ultimo_pago;

        // Validar fecha de último pago (evitar fechas inválidas como 1969-12-31)
        if (!ultimaFechaPago || new Date(ultimaFechaPago).getFullYear() < 2000) {
            return res.json({ mostrar: false });
        }

        const frecuenciaPago = rpt.frecuencia.toLowerCase();
        
        // Calcular fecha de próximo pago basado en último pago + frecuencia
        const fechaProximoPago = new Date(ultimaFechaPago);
        
        switch (frecuenciaPago) {
            case 'mensual':
                fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
                break;
            case 'semestral':
                fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 6);
                break;
            case 'anual':
                fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1);
                break;
            default:
                // Si no hay frecuencia válida, asumir mensual
                fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
        }

        // Normalizar fechas a medianoche para comparación precisa
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaProximoPago.setHours(0, 0, 0, 0);
        
        // diasRestantes: positivo = faltan días, negativo = días vencidos
        const diasRestantes = Math.ceil((fechaProximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        


        let mensaje = 'Le recordamos el pago del servicio.';

        // CASO 1: Faltan 3 días o menos para vencer (pero aún no vence)
        if (diasRestantes > 0 && diasRestantes <= 3) {
            await prisma.sede_estado.updateMany({
                where: {
                    idsede: parseInt(idsede),
                    is_advertencia: '0'
                },
                data: {                            
                    is_advertencia: '1'                       
                }
            });

            mensaje = `Su pago vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}. Le recordamos realizar el pago a tiempo.`;
            return res.json({ mostrar: true, tiempo: 5, diasRestantes, msj: mensaje });
        }
        
        // CASO 2: Ya venció (diasRestantes <= 0)
        if (diasRestantes <= 0) {
            const diasPasados = Math.abs(diasRestantes);
            let tiempoAdvertencia = 5 + (diasPasados * 3); // Aumenta el tiempo según días vencidos
            
            // 1-10 días vencidos: Recordatorio amable
            if (diasPasados >= 1 && diasPasados <= 10) {
                mensaje = `Estimado cliente, han pasado ${diasPasados} día${diasPasados > 1 ? 's' : ''} desde la fecha de vencimiento de su pago. Le recordamos amablemente que realice su pago para evitar interrupciones en el servicio.`;

                await prisma.sede_estado.updateMany({
                    where: { idsede: parseInt(idsede) },
                    data: {
                        is_bloqueo_contador: '1', 
                        is_advertencia: '1'                       
                    }
                });
            }
            
            // 11-20 días vencidos: Advertencia de suspensión
            if (diasPasados > 10 && diasPasados <= 20) {
                mensaje = `Estimado cliente, han pasado ${diasPasados} días desde el vencimiento de su pago. Si el retraso supera los 20 días, el servicio será suspendido. Papaya.com.pe no se hará responsable de los inconvenientes que esto pueda causar.`;
                tiempoAdvertencia = Math.min(tiempoAdvertencia, 60); // Máximo 60 segundos
            }

            // Más de 20 días: Suspensión
            if (diasPasados > 20) {
                mensaje = `Estimado cliente, su servicio ha sido suspendido debido a la falta de pago. Regularice su pago para reactivar el servicio.`;

                // Suspender servicio si aún está activo
                if (rpt.activo === '0') {
                    await prisma.sede_suscripcion.update({
                        where: { idsede_suscripcion: rpt.idsede_suscripcion },
                        data: { activo: '1' } // 1 = no activo/suspendido
                    });

                    await prisma.sede_estado.updateMany({
                        where: { idsede: parseInt(idsede) },
                        data: {
                            is_bloqueado: '1',                            
                            fecha_bloqueo: new Date()
                        }
                    });
                } 

                tiempoAdvertencia = 1000; // No se puede omitir fácilmente
            }            

            return res.json({ 
                mostrar: true, 
                tiempo: tiempoAdvertencia, 
                diasRestantes, 
                diasPasados, 
                msj: mensaje 
            });
        }
        
        // CASO 3: Faltan más de 3 días, todo bien
        return res.json({ mostrar: false });
        
    } catch (error) {
        console.error('Error en advertencia cobranza:', error);
        return res.json({ mostrar: false });
    }
});

export default router;
