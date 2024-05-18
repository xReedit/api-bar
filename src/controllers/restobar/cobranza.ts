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
    const hoy = new Date();   
    const rptData = await prisma.sede_suscripcion.findMany({
        where: {
            idsede: parseInt(idsede),            
            estado: '0'
        }
    });
    let rpt = rptData[0];
    // console.log('rpt', rpt);
    
    if (rptData.length > 0) {
        const ultimaFechaPago = rpt.ultimo_pago;
        const frecuenciaPago = rpt.frecuencia.toLowerCase();
        let fechaProximoPago: any;

        if (frecuenciaPago === 'mensual') {
            fechaProximoPago = new Date(ultimaFechaPago);
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
        } else if (frecuenciaPago === 'semestral') {
            fechaProximoPago = new Date(ultimaFechaPago);
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 6);
        } else if (frecuenciaPago === 'anual') {
            fechaProximoPago = new Date(ultimaFechaPago);
            fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1);
        }

        const diasRestantes = Math.ceil((fechaProximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        console.log('diasRestantes', diasRestantes, fechaProximoPago, hoy);

        let mensaje = 'Le recordamos el pago del servicio.';
        if (diasRestantes <= 3 && diasRestantes > -1) {
            // Últimos 3 días antes del vencimiento           
            await prisma.sede_estado.updateMany({
                        where: {
                            idsede: parseInt(idsede),
                            is_advertencia: '0'
                        },
                        data: {                            
                            is_advertencia: '1'                       
                        }
                    });

            res.json({ mostrar: true, tiempo: 5, diasRestantes: diasRestantes, msj: mensaje  });
        } else if (diasRestantes <= 0) {
        // Días pasados desde el vencimiento
            const diasPasados = Math.abs(diasRestantes);
            let tiempoAdvertencia = 5 + (diasPasados * 5);
            
            if (diasPasados > 1 && diasPasados <= 10) {
                mensaje = `Hace ${diasPasados} días venció el pago del servicio. Pague a tiempo y evite cobros adicionales.`;

                // bloqueamos contador
                await prisma.sede_estado.updateMany({
                        where: {
                            idsede: parseInt(idsede)
                        },
                        data: {
                            is_bloqueo_contador: '1', 
                            is_advertencia: '1'                       
                        }
                    });
            }
            
            if (diasPasados > 10 && diasPasados <= 20) {
                mensaje = `Hace ${diasPasados} días venció el pago del servicio. En caso de que el retraso o impago supere los 20 (veinte) días, EL PROVEEDOR podrá suspender el servicio, hasta la confirmación del pago debido. Papaya.com.pe no será responsable de los perjuicios que eso le pueda ocasionar al CLIENTE, o a los clientes del CLIENTE.`;
            }

            if (diasPasados > 20) {
                mensaje = `Servicio suspendido por falta de pago. Regule el pago para reactivar el servicio.`;

                // verificamos si el servicio fue suspendido
                if ( rpt.activo === '0') {
                    await prisma.sede_suscripcion.update({
                        where: {
                            idsede_suscripcion: rpt.idsede_suscripcion
                        },
                        data: {
                            activo: '1', // no activo                        
                        }
                    });

                    // actualizamos el estado de la sede
                    await prisma.sede_estado.updateMany({
                        where: {
                            idsede: parseInt(idsede)
                        },
                        data: {
                            is_bloqueado: '1',                            
                            fecha_bloqueo: new Date()
                        }
                    })
                } 

                tiempoAdvertencia = 1000;
            }            

            res.json({ mostrar: true, tiempo: tiempoAdvertencia, diasRestantes: diasRestantes, diasPasados: diasPasados, msj: mensaje });
        } else {
                res.json({ mostrar: false });                        
        }                
        
    } else {
        res.json({ mostrar: false });
    }
});

export default router;