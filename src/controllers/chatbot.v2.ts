import * as express from "express";
import { PrismaClient } from "@prisma/client";
import { GeocodingService } from "../services/geocoding.service";
import { getEstructuraPedido } from "../services/cocinar.pedido";
import PedidoServices from "../services/pedido.services";
import { JsonPrintService } from "../services/json.print.services";
import axios from "axios";

const prisma = new PrismaClient();
const router = express.Router();

// Función helper para calcular tiempo estimado con margen
const calcularTiempoEstimado = (tiempoAproxMinutos: number): string => {
    const margenMenos = 5;
    const margenMas = 10;
    const tiempoMin = Math.max(15, tiempoAproxMinutos - margenMenos);
    const tiempoMax = tiempoAproxMinutos + margenMas;
    return `${tiempoMin}-${tiempoMax} min`;
};

// Normaliza una hora dicha por el cliente ("1pm", "13:00", "7.30 pm") a "HH:MM".
// Devuelve null si no se reconoce.
const normalizarHora = (hora: any): string | null => {
    if (!hora) return null;
    const s = String(hora).trim().toLowerCase().replace(/\./g, ':').replace(/\s+/g, '');
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

router.get("/", async (req, res) => {
    res.status(200).json({ message: 'Chatbot V2 API - Endpoints disponibles' })
});

// Extrae el importe total del comprobante desde el resultado del SP. El SP
// devuelve un campo `datos` con el JSON del comprobante (formato SUNAT); se
// prueban las claves de total más comunes, y por si acaso columnas sueltas.
// Devuelve null si no encuentra un total confiable → verificación FAIL-CLOSED:
// sin total no se entrega el comprobante (nunca se expone uno sin verificar).
const extraerTotalComprobante = (row: any): number | null => {
    let datos = row?.datos;
    if (typeof datos === 'string') {
        try { datos = JSON.parse(datos); } catch { datos = null; }
    }
    const candidatos = [
        datos?.mtoImporteTotal, datos?.total, datos?.importe_total, datos?.mto_imp_venta,
        row?.f2, row?.total, row?.importe,
    ];
    for (const c of candidatos) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
};

// Consulta el comprobante electrónico (boleta/factura) de un consumo para el
// chatbot. Va bajo /chatbot/* → protegido con x-api-key. Se busca por documento
// (DNI/RUC) + fecha, y SOLO se entrega si el importe total coincide con el que
// declara el cliente: el importe es un dato que solo el titular conoce, así se
// evita que un tercero pida un comprobante ajeno.
router.get('/comprobante/:idsede/:documento/:fecha/:importe', async (req: any, res) => {
    try {
        const { idsede, documento, fecha, importe } = req.params;
        const importeDeclarado = Number(String(importe).replace(',', '.'));
        if (!documento || !fecha || !Number.isFinite(importeDeclarado) || importeDeclarado <= 0) {
            return res.status(400).json({ success: false, error: 'documento, fecha e importe son obligatorios' });
        }

        const _dataSend = {
            idsede: Number(idsede),
            dni: documento,
            serie: '',
            numero: '',
            fecha: fecha.replace(/-/g, '/'),
            isSearchByFecha: 1,
        };

        const rpt: any = await prisma.$queryRaw`call procedure_chatbot_getidexternal_comprobante(${JSON.stringify(_dataSend)})`;
        if (!rpt || rpt.length === 0) {
            return res.status(200).json({ success: false });
        }

        // Verificación de importe (fail-closed): entre los comprobantes de ese
        // documento+fecha, entregamos solo el que cuadra con el importe declarado.
        const match = rpt.find((row: any) => {
            const total = extraerTotalComprobante(row);
            return total != null && Math.abs(total - importeDeclarado) <= 0.05;
        });
        if (!match) {
            return res.status(200).json({ success: false });
        }

        return res.status(200).json({
            success: true,
            numero_comprobante: match.f1,
            external_id: match.f0,
        });
    } catch (error) {
        console.error('Error en /comprobante:', error);
        return res.status(500).json({ success: false, error: 'No se pudo consultar el comprobante' });
    } finally {
        prisma.$disconnect();
    }
});

router.get("/cliente/:idorg/:idsede/:telefono", async (req, res) => {
    try {
        const { idorg, idsede, telefono } = req.params;
        // Extraer solo los dígitos del teléfono sin código de país
        const telefonoSinCodigo = telefono.replace(/\D/g, '').replace(/^(51)?/, '');

        const cliente: any = await prisma.$queryRaw`
            SELECT c.idcliente, c.nombres, c.direccion, c.telefono 
            FROM cliente c 
            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente
            WHERE cs.idsede = ${idsede} AND c.idorg = ${idorg} 
            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ${'%' + telefonoSinCodigo + '%'}
            LIMIT 1`;

        if (!cliente || cliente.length === 0) {
            return res.status(200).json({
                success: true,
                encontrado: false,
                cliente: null,
                descripcion: 'Cliente no encontrado en la base de datos'
            });
        }

        const totalPedidos: any = await prisma.$queryRaw`
            SELECT COUNT(*) as total FROM pedido 
            WHERE idcliente = ${cliente[0].idcliente} 
            AND idsede = ${idsede}
            AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;

        const ultimoPedido: any = await prisma.$queryRaw`
            SELECT fecha, hora FROM pedido 
            WHERE idcliente = ${cliente[0].idcliente} 
            AND idsede = ${idsede}
            ORDER BY idpedido DESC LIMIT 1`;

        // direccion del cliente en cliente_pwa_direccion si es que tiene
        const direccionPwa: any = await prisma.$queryRaw`
            SELECT cpd.idcliente_pwa_direccion, cpd.direccion, cpd.referencia, cpd.latitude, cpd.longitude, cpd.ciudad, cpd.provincia
            FROM cliente_pwa_direccion cpd
            WHERE cpd.idcliente = ${cliente[0].idcliente}
            ORDER BY cpd.idcliente_pwa_direccion DESC
            LIMIT 1`;

    const direccionCliente = direccionPwa && direccionPwa.length > 0 
        ? {
            idcliente_pwa_direccion: direccionPwa[0].idcliente_pwa_direccion,
            direccion: direccionPwa[0].direccion,
            referencia: direccionPwa[0].referencia,
            latitude: direccionPwa[0].latitude,
            longitude: direccionPwa[0].longitude,
            ciudad: direccionPwa[0].ciudad,
            provincia: direccionPwa[0].provincia
        }
        : {
            idcliente_pwa_direccion: null,
            direccion: cliente[0].direccion || '',
            referencia: '',
            latitude: '',
            longitude: '',
            ciudad: '',
            provincia: ''
        };
        

        res.status(200).json({
            success: true,
            encontrado: true,
            cliente: {
                id: cliente[0].idcliente,
                nombre: cliente[0].nombres,
                telefono: cliente[0].telefono,
                direccion: direccionCliente,
                total_pedidos: totalPedidos[0]?.total || 0,
                ultimo_pedido: ultimoPedido[0]?.fecha || null
            }
        });

    } catch (error) {        
        res.status(500).json({
            success: false,
            error: 'Error al buscar cliente'
        });
    }
});

router.get("/menu/:idorg/:idsede", async (req, res) => {
    try {
        const { idorg, idsede } = req.params;

        const rpt: any = await prisma.$queryRaw`call porcedure_pwa_pedido_carta(${idorg},${idsede},1)`
        
        const carta = rpt[0]?.f0 || [];
        const menuPlano: any[] = [];

        const productos: any[] = [];
        const itemsVistos = new Set<string>();
        
        carta.forEach((categoria: any) => {
            categoria.secciones?.forEach((seccion: any) => {
                seccion.items?.forEach((item: any) => {
                    const claveUnica = `${item.iditem}-${item.des}`;
                    
                    if (itemsVistos.has(claveUnica)) {
                        return;
                    }
                    
                    itemsVistos.add(claveUnica);
                    
                    const stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                    
                    productos.push({
                        iditem: item.iditem,
                        idseccion: seccion.idseccion,
                        descripcion: item.des,
                        precio: Number(item.precio),
                        stock: stockNumerico
                    });
                });
            });
        });

        res.status(200).json({
            success: true,
            menu: productos
        });

    } catch (error) {
        console.error('Error en consultar_menu:', error);
        res.status(500).json({
            success: false,
            error: 'Error al consultar menu'
        });
    }
});

router.post("/calcular-delivery", async (req, res) => {
    try {
        const { idorg, idsede, direccion, referencia, session_id, lat, lon } = req.body;

        // Coordenadas GPS del cliente (si compartió su ubicación por WhatsApp).
        const latCliente = Number(lat);
        const lonCliente = Number(lon);
        const tieneGPS = Number.isFinite(latCliente) && Number.isFinite(lonCliente)
            && latCliente !== 0 && lonCliente !== 0;

        if (!direccion && !tieneGPS) {
            return res.status(400).json({
                success: false,
                error: 'Direccion es requerida'
            });
        }

        const sedeConfig: any = await prisma.sede_costo_delivery.findFirst({
            where: {
                idsede: Number(idsede),
                estado: '0'
            }
        });


        if (!sedeConfig) {
            return res.status(404).json({
                success: false,
                error: 'Configuracion de delivery no encontrada'
            });
        }

        const parametros = sedeConfig.parametros || {};
        const obtenerCoordenadas = parametros.obtener_coordenadas_del_cliente === 'SI';
        const costoBase = Number(parametros.km_base_costo || 0);

        if (!obtenerCoordenadas) {
            return res.status(200).json({
                success: true,
                disponible: true,
                costo: costoBase,
                distancia_km: 0,
                tiempo_estimado: calcularTiempoEstimado(10),
                mensaje: "Costo fijo de delivery"
            });
        }

        const sede: any = await prisma.sede.findUnique({
            where: { idsede: Number(idsede) },
            select: {
                latitude: true,
                longitude: true
            }
        });

        if (!sede || !sede.latitude || !sede.longitude) {
            return res.status(400).json({
                success: false,
                error: 'Coordenadas del comercio no configuradas'
            });
        }

        const distanciaMaxima = Number(parametros.km_limite || 10);

        let ciudades: string[] = [];
        if (sedeConfig.ciudades) {
            ciudades = sedeConfig.ciudades
                .split(',')                
                .filter((c: string) => c.length > 0);
        }

        // Con GPS del cliente: distancia directa (haversine) + reverse geocoding
        // para obtener una dirección legible (antes quedaba "GPS" como dirección).
        // Sin GPS: geocodificar el texto de la dirección como siempre.
        let resultadoDistancia: any;
        let direccionLegible = direccion;

        if (tieneGPS) {
            const distancia = GeocodingService.calcularDistanciaHaversine(
                Number(sede.latitude), Number(sede.longitude), latCliente, lonCliente
            );

            if (distancia > distanciaMaxima) {
                return res.status(200).json({
                    success: true,
                    disponible: false,
                    mensaje: `Dirección fuera del rango de cobertura (${distancia.toFixed(2)} km, máximo ${distanciaMaxima} km)`
                });
            }

            const rev = await GeocodingService.obtenerDireccion(latCliente, lonCliente);
            if (rev.success && rev.direccion) {
                direccionLegible = rev.direccion;
            } else if (!direccion || direccion.toUpperCase() === 'GPS') {
                direccionLegible = `Ubicación GPS (${latCliente.toFixed(5)}, ${lonCliente.toFixed(5)})`;
            }

            resultadoDistancia = {
                success: true,
                lat: latCliente,
                lng: lonCliente,
                distanciaKm: distancia,
                ciudad: rev.ciudad || '',
                provincia: rev.provincia || '',
                departamento: rev.departamento || '',
                pais: rev.pais || '',
                codigo: rev.codigo || ''
            };
        } else {
            resultadoDistancia = await GeocodingService.calcularDistanciaPorRango(
                direccion,
                Number(sede.latitude),
                Number(sede.longitude),
                distanciaMaxima,
                ciudades
            );
        }

        if (!resultadoDistancia.success || resultadoDistancia.distanciaKm === undefined) {
            return res.status(200).json({
                success: true,
                disponible: false,
                mensaje: resultadoDistancia.error || 'No se pudo calcular la distancia'
            });
        }

        const distanciaKm = resultadoDistancia.distanciaKm;

        const kmBase = Number(parametros.km_base || 2);
        const costoAdicional = Number(parametros.km_adicional_costo || 0);
        const costoFijo = Number(parametros.costo_fijo || 0);

        let costo = costoFijo > 0 ? costoFijo : costoBase;
        if (costoFijo === 0 && distanciaKm > kmBase) {
            costo += (distanciaKm - kmBase) * costoAdicional;
        }

        const tiempoAproxEntrega = Number(parametros.tiempo_aprox_entrega || 30);

        // guardar los datos de direccion en pedido_preview en la columna direccion_cliente        
        if (session_id) {
            const existingPreview = await prisma.pedido_preview.findFirst({
                where: { id: session_id }
            });

            const direccionData = {
                direccion: direccionLegible,
                referencia: referencia || '',
                latitude: resultadoDistancia.lat,
                longitude: resultadoDistancia.lng,
                ciudad: resultadoDistancia.ciudad || '',
                provincia: resultadoDistancia.provincia || '',
                departamento: resultadoDistancia.departamento || '',
                pais: resultadoDistancia.pais || '',
                codigo: resultadoDistancia.codigo || '',
                distancia_km: distanciaKm,
                costo_delivery: Number(costo.toFixed(2))
            };

            if (existingPreview) {
                await prisma.pedido_preview.update({
                    where: { id: session_id },
                    data: { direccion_cliente: direccionData }
                });
            } else {
                await prisma.pedido_preview.create({
                    data: {
                        id: session_id,
                        estructura: JSON.stringify({}),
                        ticket_formateado: '',
                        estado: 'pending',
                        direccion_cliente: direccionData
                    }
                });
            }
        }


        res.status(200).json({
            success: true,
            disponible: true,
            costo: Number(costo.toFixed(2)),
            distancia_km: distanciaKm,
            tiempo_estimado: calcularTiempoEstimado(tiempoAproxEntrega),
            // Dirección legible (reverse geocoding si vino GPS): el bot DEBE usarla
            // como la dirección del pedido en vez de "GPS".
            direccion: direccionLegible
        });

    } catch (error) {
        console.error('Error en calcular_delivery:', error);
        res.status(500).json({
            success: false,
            error: 'Error al calcular delivery'
        });
    }
});

router.get("/config/:idsede", async (req, res) => {
    try {
        const { idsede } = req.params;

        const sede = await prisma.sede.findFirst({
            where: {
                idsede: Number(idsede)
            },
            select: {
                nombre: true,
                telefono: true,
                direccion: true,
                latitude: true,
                longitude: true,
                metodo_pago_aceptados_chatbot: true,
                numero_billetera_chatbot: true,
                link_carta: true
            }
        });

        if (!sede) {
            return res.status(404).json({
                success: false,
                error: 'Sede no encontrada'
            });
        }

        const sedeConfig: any = await prisma.sede_costo_delivery.findFirst({
            where: {
                idsede: Number(idsede),
                estado: '0'
            }
        });

        const tiposEntrega = await prisma.tipo_consumo.findMany({
            where: {
                idsede: Number(idsede),
                estado: 0,
                habilitado_chatbot: '1'
            },
            select: {
                idtipo_consumo: true,
                descripcion: true
            }
        });


        let metodosPago = await prisma.tipo_pago.findMany({
            where: {
                estado: 0,
                habilitado_chatbot: '1'
            },
            select: {
                idtipo_pago: true,
                descripcion: true
            }
        });

        // Respetar los métodos marcados por la sede (ej. "5,1,7"). Si la sede no
        // configuró nada, se mantienen todos los habilitados globalmente.
        const idsAceptados = String(sede.metodo_pago_aceptados_chatbot || '')
            .split(',').map(s => s.trim()).filter(Boolean);
        if (idsAceptados.length > 0) {
            metodosPago = metodosPago.filter((mp: any) => idsAceptados.includes(String(mp.idtipo_pago)));
        }

        const horariosDB: any = await prisma.$queryRaw`
            SELECT de as hora_inicio, a as hora_fin, numdia, desdia 
            FROM sede_horario_trabajo 
            WHERE idsede = ${idsede} AND estado = 0
            ORDER BY idsede_horario_trabajo`;

        const horaActual = new Date();
        const diaActual = horaActual.getDay();
        
        const mapaDias: any = {
            '1': 'domingo',
            '2': 'lunes',
            '3': 'martes',
            '4': 'miercoles',
            '5': 'jueves',
            '6': 'viernes',
            '7': 'sabado'
        };

        let horarioAtencion: any = {
            lunes: { abre: "11:00", cierra: "22:00" },
            martes: { abre: "11:00", cierra: "22:00" },
            miercoles: { abre: "11:00", cierra: "22:00" },
            jueves: { abre: "11:00", cierra: "22:00" },
            viernes: { abre: "11:00", cierra: "23:00" },
            sabado: { abre: "11:00", cierra: "23:00" },
            domingo: { abre: "12:00", cierra: "21:00" }
        };

        if (horariosDB && horariosDB.length > 0) {
            const horarioPrincipal = horariosDB[0];
            const diasArray = horarioPrincipal.numdia.split(',').filter((d: string) => d);
            
            diasArray.forEach((numDia: string) => {
                const nombreDia = mapaDias[numDia];
                if (nombreDia) {
                    horarioAtencion[nombreDia] = {
                        abre: horarioPrincipal.hora_inicio,
                        cierra: horarioPrincipal.hora_fin
                    };
                }
            });
        }

        const parametros = sedeConfig?.parametros || {};
        
        let estaAbierto = false;
        const nombreDiaActual = mapaDias[diaActual === 0 ? '1' : (diaActual + 1).toString()];
        if (nombreDiaActual && horarioAtencion[nombreDiaActual]) {
            const horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
            const horaAbre = horarioAtencion[nombreDiaActual].abre;
            const horaCierra = horarioAtencion[nombreDiaActual].cierra;
            estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
        }

        const generarMensajeHorario = () => {
            const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            const horariosUnicos: any = {};
            
            dias.forEach(dia => {
                const horario = horarioAtencion[dia];
                const key = `${horario.abre}-${horario.cierra}`;
                if (!horariosUnicos[key]) {
                    horariosUnicos[key] = [];
                }
                horariosUnicos[key].push(dia);
            });
            
            const mensajes = Object.entries(horariosUnicos).map(([horario, diasArray]: [string, any]) => {
                const [abre, cierra] = horario.split('-');
                const diasTexto = diasArray.length === 7 ? 'Todos los días' : 
                    diasArray.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
                return `${diasTexto}: ${abre} - ${cierra}`;
            });
            
            return `Estamos cerrados. Nuestro horario de atención: ${mensajes.join('. ')}`;
        };

        res.status(200).json({
            success: true,
            config: {
                nombre_negocio: sede.nombre,
                telefono_negocio: sede.telefono,
                direccion: sede.direccion,
                latitud: sede.latitude,
                longitud: sede.longitude,
                horario_atencion: horarioAtencion,
                esta_abierto: estaAbierto,
                hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                mensaje_cerrado: generarMensajeHorario(),
                tipos_consumo: tiposEntrega.map((te: any) => ({
                    id: te.idtipo_consumo.toString(),
                    nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
                })),
                delivery: {
                    habilitado: true,
                    tipo: "distancia",
                    costo_base: Number(parametros.km_base_costo || 0),
                    costo_por_km: Number(parametros.km_adicional_costo || 0),
                    km_base: Number(parametros.km_base || 0),
                    distancia_maxima_km: Number(parametros.km_limite || 5),
                    calcular_advertencia: parametros.obtener_coordenadas_del_cliente,
                    tiempo_estimado_base: calcularTiempoEstimado(Number(parametros.tiempo_aprox_entrega || 30)),
                    descripcion: `Costo base S/${Number(parametros.km_base_costo || 0)} hasta ${Number(parametros.km_base || 0)} km, luego S/${Number(parametros.km_adicional_costo || 0)} por km adicional`
                },
                metodos_pago: metodosPago.map((mp: any) => ({
                    id: mp.idtipo_pago.toString(),
                    nombre: mp.descripcion,
                    activo: true
                })),
                mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
                activo: true,
                link_carta: sede.link_carta
            }
        });

    } catch (error) {
        console.error('Error en obtener_config_negocio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener configuracion'
        });
    }
});


router.post("/resumen-pedido", async (req, res) => {
    
    try {
        const { 
            session_id,
            idsede, 
            items, 
            tipo_entrega, 
            direccion, 
            costo_delivery
        } = req.body;

        


        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Items son requeridos'
            });
        }

        if (!idsede) {
            return res.status(400).json({
                success: false,
                error: 'idsede es requerido'
            });
        }

        const itemsParaCocinar = items.map((item: any) => ({
            iditem: item.iditem,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            indicaciones: item.indicaciones || '',
            observaciones: item.indicaciones || ''
        }));

        const datosEntrega = {
            direccion: direccion || '',
            costo_entrega: tipo_entrega?.toLowerCase() === 'delivery' ? (costo_delivery || 0) : 0
        };
        
        // Mapear tipo_entrega a los canales de consumo disponibles
        let tipoEntregaMapeado = tipo_entrega;
        const tipoLower = tipo_entrega?.toLowerCase();
        if (tipoLower === 'recojo' || tipoLower === 'recoger') {
            tipoEntregaMapeado = 'PARA LLEVAR';
        } else if (tipoLower === 'local' || tipoLower === 'reserva' || tipoLower === 'mesa') {
            // Pedido para consumir en el local = reserva
            tipoEntregaMapeado = 'CONSUMIR EN EL LOCAL';
        }
        
        const tipoEntregaObj = {
            descripcion: tipoEntregaMapeado
        };

        const estructuraPedidoCocinada = await getEstructuraPedido(
            itemsParaCocinar,
            tipoEntregaObj,
            datosEntrega,
            Number(idsede)
        );

        const tipoConsumo = estructuraPedidoCocinada.p_body?.tipoconsumo?.[0];
        const secciones = tipoConsumo?.secciones || [];
        const subtotales = estructuraPedidoCocinada.p_subtotales || [];

        const pedidoService = new PedidoServices();

        const ticketFormateado = pedidoService.getResumenPedidoShowCliente(
            secciones,
            tipoConsumo,
            subtotales
        );

        const previewId = session_id;
        const estructuraJson = JSON.stringify(estructuraPedidoCocinada);


        await prisma.$queryRawUnsafe(
            `INSERT INTO pedido_preview (id, estructura, ticket_formateado, estado)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             estructura = VALUES(estructura),
             ticket_formateado = VALUES(ticket_formateado),
             estado = 'pending',
             recordatorios = 0,
             last_recordatorio_at = NULL,
             created_at = CURRENT_TIMESTAMP`,
            previewId,
            estructuraJson,
            ticketFormateado,
            'pending'
        );
        

        res.status(200).json({
            success: true,            
            resumen: ticketFormateado            
        });

    } catch (error: any) {
        console.error('Error en resumen-pedido:', error);
        // Canal no disponible para esta sede (ej. delivery donde solo hay recojo):
        // respondemos 200 con success:false para que el bot lo relate al cliente
        // en vez de un "se cayo el sistema".
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('canal de consumo no encontrado')) {
            return res.status(200).json({
                success: false,
                error: 'Esta sede no tiene disponible ese tipo de entrega por este medio. ¿Deseas recogerlo en el local?'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Error al generar resumen del pedido'
        });
    }
})

router.post("/pedido", async (req, res) => {
    try {
        const {
            session_id,
            idorg,
            idsede,
            cliente_telefono,
            cliente_nombre,
            direccion,
            tipo_entrega,
            metodo_pago,
            notas,
            // Reserva (consumo en el local): hora de llegada y cantidad de personas.
            reserva_hora,
            reserva_personas,
            // Pedido programado (recojo/delivery a una hora): "13:00"
            hora_programada
        } = req.body;
        

        const idresumen = session_id;

        if (!idresumen) {
            return res.status(400).json({
                success: false,
                error: 'idresumen es requerido'
            });
        }


        const preview: any = await prisma.$queryRawUnsafe(
            `SELECT id, estructura, estado, direccion_cliente FROM pedido_preview WHERE id = ? AND estado = 'pending' LIMIT 1`,
            idresumen
        );

        if (!preview || preview.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resumen de pedido no encontrado o ya fue confirmado'
            });
        }
        
        const estructuraPedidoCocinada = preview[0].estructura;
        
        // Parsear datos de dirección guardados previamente
        let datosDeliveryGuardados = null;
        if (preview[0].direccion_cliente) {
            try {
                datosDeliveryGuardados = typeof preview[0].direccion_cliente === 'string' 
                    ? JSON.parse(preview[0].direccion_cliente) 
                    : preview[0].direccion_cliente;
            } catch (error) {
                console.error('Error al parsear direccion_cliente:', error);
            }
        }

        // Obtener tipo de entrega de la estructura si no viene en el request
        const tipoConsumoEstructura = estructuraPedidoCocinada.p_body?.tipoconsumo?.[0];
        let tipoEntregaFinal = tipo_entrega;
        
        if (!tipoEntregaFinal && tipoConsumoEstructura) {
            const descripcionTipoConsumo = tipoConsumoEstructura.descripcion?.toLowerCase();
            if (descripcionTipoConsumo === 'delivery') {
                tipoEntregaFinal = 'delivery';
            } else if (descripcionTipoConsumo === 'para llevar') {
                tipoEntregaFinal = 'recojo';
            } else if (descripcionTipoConsumo?.includes('local') || descripcionTipoConsumo?.includes('mesa')) {
                tipoEntregaFinal = 'local';
            }
        }

        // Extraer solo los dígitos del teléfono sin código de país
        const telefonoSinCodigo = cliente_telefono.replace(/\D/g, '').replace(/^(51)?/, '');

        let cliente: any = await prisma.$queryRaw`
            SELECT c.idcliente, c.nombres, c.telefono FROM cliente c
            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente
            WHERE cs.idsede = ${idsede} AND c.idorg = ${idorg}
            AND REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+51', '') LIKE ${'%' + telefonoSinCodigo + '%'}
            LIMIT 1`;

        let idcliente;
        let nombreCliente;
        
        if (!cliente || cliente.length === 0) {
            const nuevoCliente = await prisma.cliente.create({
                data: {
                    idorg: Number(idorg),
                    nombres: (cliente_nombre || 'CLIENTE').toUpperCase(),
                    telefono: cliente_telefono,
                    direccion: direccion || '',
                    f_registro: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    ruc: '',
                    pwa_id: '',
                    email: '',
                    estado: 0
                }
            });
            idcliente = nuevoCliente.idcliente;
            nombreCliente = nuevoCliente.nombres;

            await prisma.cliente_sede.create({
                data: {
                    idcliente: idcliente,
                    idsede: Number(idsede),
                    telefono: cliente_telefono
                }
            });
        } else {
            idcliente = cliente[0].idcliente;
            nombreCliente = cliente[0].nombres;
            
            // Si el nombre está vacío, actualizarlo
            if (!nombreCliente || nombreCliente.trim() === '') {
                nombreCliente = (cliente_nombre || 'CLIENTE').toUpperCase();
                await prisma.$queryRawUnsafe(
                    `UPDATE cliente SET nombres = ? WHERE idcliente = ?`,
                    nombreCliente,
                    idcliente
                );
            }
        }

        // Guardar dirección en cliente_pwa_direccion usando datos de pedido_preview
        let idclientePwaDireccion = null;
        const direccionFinal = datosDeliveryGuardados?.direccion || direccion || '';
        
        if (direccionFinal && datosDeliveryGuardados) {
            const direccionExistente: any = await prisma.$queryRaw`
                SELECT idcliente_pwa_direccion FROM cliente_pwa_direccion
                WHERE idcliente = ${idcliente} AND direccion = ${direccionFinal}
                LIMIT 1`;

            if (direccionExistente && direccionExistente.length > 0) {
                idclientePwaDireccion = direccionExistente[0].idcliente_pwa_direccion;
            } else {
                const nuevaDireccion: any = await prisma.$queryRawUnsafe(
                    `INSERT INTO cliente_pwa_direccion (idcliente, direccion, latitude, longitude, referencia) VALUES (?, ?, ?, ?, ?)`,
                    idcliente,
                    direccionFinal,
                    datosDeliveryGuardados.latitude?.toString() || '',
                    datosDeliveryGuardados.longitude?.toString() || '',
                    datosDeliveryGuardados.referencia || ''
                );
                idclientePwaDireccion = nuevaDireccion.insertId;
            }
        }

        const infoCliente = {
            idcliente: idcliente,
            nombres: nombreCliente,
            telefono: cliente_telefono,
            direccion: direccionFinal,
            idcliente_pwa_direccion: idclientePwaDireccion
        };

        const infoSede: any = await prisma.$queryRaw`
            SELECT s.idsede, s.idorg, s.nombre, s.direccion, s.telefono
            FROM sede s
            WHERE s.idsede = ${idsede} and estado=0
            LIMIT 1`;

        if (!infoSede || infoSede.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sede no encontrada'
            });
        }

        // Verificar si existe usuario "bot", si no existe crearlo
        let usuarioBot: any = await prisma.$queryRaw`
            SELECT idusuario FROM usuario WHERE usuario = 'bot' LIMIT 1`;

        let idusuarioBot: number;

        if (!usuarioBot || usuarioBot.length === 0) {
            // Crear usuario "bot"
            const resultInsert: any = await prisma.$queryRaw`
                INSERT INTO usuario (usuario, clave, nombre, estado, isbot) 
                VALUES ('bot', 'bot-user', 'Bot WhatsApp', 0, 1)`;
            
            // Obtener el ID del usuario recién creado
            const nuevoUsuario: any = await prisma.$queryRaw`
                SELECT idusuario FROM usuario WHERE sede = ${idsede} AND isbot = '1' LIMIT 1`;
            
            idusuarioBot = nuevoUsuario[0].idusuario;
        } else {
            idusuarioBot = usuarioBot[0].idusuario;
        }

        const sede = {
            idsede: infoSede[0].idsede,
            idorg: infoSede[0].idorg,
            idusuario: idusuarioBot,
            sede: infoSede[0]
        };

        const listImpresoras: any = await prisma.$queryRaw`select i.idimpresora, i.ip, i.descripcion, i.num_copias, i.papel_size, i.copia_local, i.var_margen_iz, i.var_size_font
            ,cp.isprint_all_short, cp.isprint_cpe_short, cp.isprint_copy_short, cp.isprint_all_delivery
            ,cp.pie_pagina_precuenta, cp.pie_pagina, cp.pie_pagina_comprobante, cp.isprint_subtotales_comanda, cp.var_size_font_tall_comanda		
        from conf_print cp 
            inner join impresora i using(idsede)
        where cp.idsede = ${idsede} and i.estado = 0`

        // Obtener tipo de consumo para determinar si es delivery
        const tipoConsumo = estructuraPedidoCocinada.p_body?.tipoconsumo?.[0];
        const isDelivery = tipoEntregaFinal?.toLowerCase() === 'delivery';
        const isRecoger = tipoEntregaFinal?.toLowerCase() === 'recojo' || tipoEntregaFinal?.toLowerCase() === 'recoger';
        const isReserva = ['local', 'reserva', 'mesa'].includes(tipoEntregaFinal?.toLowerCase() || '');

        // Hora programada (reserva o pedido para más tarde) → el procedure setea
        // fecha_hora del pedido y flag_pedido_programado=1 vía tiempoEntregaProgamado.
        const horaEvento = normalizarHora(reserva_hora || hora_programada);
        let tiempoEntregaProgamado: any = [];
        if (horaEvento) {
            const hoyLima = new Date().toLocaleDateString('es-PE', {
                timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric'
            });
            tiempoEntregaProgamado = { modificado: 'true', date: `${hoyLima} ${horaEvento}:00` };
        }

        // Construir arrDatosDelivery completo solo si es delivery usando datos guardados
        let arrDatosDelivery = {};
        
        if (isDelivery) {
            const direccionDelivery = datosDeliveryGuardados?.direccion || infoCliente.direccion || "";
            const referenciaDelivery = datosDeliveryGuardados?.referencia || "";
            const latitudeDelivery = datosDeliveryGuardados?.latitude || "";
            const longitudeDelivery = datosDeliveryGuardados?.longitude || "";
            const ciudadDelivery = datosDeliveryGuardados?.ciudad || "";
            const provinciaDelivery = datosDeliveryGuardados?.provincia || "";
            const departamentoDelivery = datosDeliveryGuardados?.departamento || "";
            const paisDelivery = datosDeliveryGuardados?.pais || "";
            const codigoDelivery = datosDeliveryGuardados?.codigo || "";
            const costoDeliveryCalculado = datosDeliveryGuardados?.costo_delivery || 0;

            arrDatosDelivery = {
            idcliente: infoCliente.idcliente.toString(),
            dni: "",
            nombre: infoCliente.nombres.toUpperCase(),
            f_nac: "",
            direccion: direccionDelivery,
            telefono: infoCliente.telefono || "",
            paga_con: metodo_pago.nombre || notas || "",
            dato_adicional: notas || "",
            referencia: referenciaDelivery,
            tipoComprobante: [],
            importeTotal: estructuraPedidoCocinada.p_subtotales?.find((st: any) => st.descripcion?.toLowerCase().includes('total'))?.importe || 0,
            metodoPago: {
                idtipo_pago: metodo_pago.id,
                descripcion: metodo_pago.nombre ? metodo_pago.nombre : "OTRO",
                img: "_tp_01.png",
                importe: "",
                checked: true,
                visible: true
            },
            propina: [],
            direccionEnvioSelected: {
                idcliente: infoCliente.idcliente.toString(),
                num_doc: "",
                nombre: infoCliente.nombres.toUpperCase(),
                direccion: direccionDelivery,
                referencia: referenciaDelivery,
                telefono: infoCliente.telefono || "",
                paga_con: metodo_pago.nombre || notas || "",
                f_nac: "",
                ciudad: ciudadDelivery,
                provincia: provinciaDelivery,
                departamento: departamentoDelivery,
                pais: paisDelivery,
                codigo: codigoDelivery,
                latitude: latitudeDelivery.toString(),
                longitude: longitudeDelivery.toString(),
                titulo: "Casa",
                solicitaCubiertos: "0",
                direccion_delivery_no_map: [{
                    direccion: direccionDelivery,
                    referencia: referenciaDelivery
                }],
                nombres: infoCliente.nombres.toUpperCase()
            },
            establecimiento: {
                idsede: infoSede[0].idsede.toString(),
                idorg: infoSede[0].idorg.toString(),
                nombre: infoSede[0].nombre,
                ciudad: "",
                direccion: infoSede[0].direccion,
                telefono: infoSede[0].telefono,
                // eslogan: "",
                // mesas: "",
                // maximo_pedidos_x_hora: "",
                // authorization_api_comprobante: "",
                // id_api_comprobante: "2",
                // facturacion_e_activo: "1",
                // logo64: "",
                // codigo_postal: "",
                latitude: latitudeDelivery,
                longitude: longitudeDelivery
            },
            subTotales: [],
            pasoRecoger: false,
            buscarRepartidor: true,
            isFromComercio: 1,
            costoTotalDelivery: costoDeliveryCalculado,
            tiempoEntregaProgamado: tiempoEntregaProgamado,
            delivery: 1,
            solicitaCubiertos: "0",
            nombres: infoCliente.nombres.toUpperCase()
            };
        } else if (isRecoger) {
            arrDatosDelivery = {
                idcliente: infoCliente.idcliente.toString(),
                nombre: infoCliente.nombres.toUpperCase(),
                telefono: infoCliente.telefono || "",
                establecimiento: {
                    idsede: infoSede[0].idsede.toString(),
                    idorg: infoSede[0].idorg.toString(),
                    nombre: infoSede[0].nombre,
                    direccion: infoSede[0].direccion,
                    telefono: infoSede[0].telefono
                },
                pasoRecoger: true,
                solo_llevar: true,
                buscarRepartidor: false,
                isFromComercio: 1,
                delivery: 0,
                tiempoEntregaProgamado: tiempoEntregaProgamado,
                nombres: infoCliente.nombres.toUpperCase()
            };
        } else if (isReserva) {
            // Reserva para consumir en el local: el procedure lee
            // arrDatosDelivery.tiempoEntregaProgamado para fechar el pedido.
            arrDatosDelivery = {
                idcliente: infoCliente.idcliente.toString(),
                nombre: infoCliente.nombres.toUpperCase(),
                telefono: infoCliente.telefono || "",
                pasoRecoger: false,
                buscarRepartidor: false,
                isFromComercio: 1,
                delivery: 0,
                tiempoEntregaProgamado: tiempoEntregaProgamado,
                nombres: infoCliente.nombres.toUpperCase()
            };
        }

        // Construir referencia según tipo de entrega
        const nombreTel = `${infoCliente.nombres.toUpperCase()} - ${infoCliente.telefono || cliente_telefono}`;
        let referenciaTexto = infoCliente.nombres.toUpperCase();
        if (isReserva) {
            const partes = ['RESERVA'];
            if (horaEvento) partes.push(horaEvento);
            if (reserva_personas) partes.push(`${reserva_personas} PERSONAS`);
            referenciaTexto = `${partes.join(' ')} - ${nombreTel}`;
        } else if (isRecoger) {
            referenciaTexto = horaEvento
                ? `CLIENTE RECOGE ${horaEvento} - ${nombreTel}`
                : `CLIENTE RECOGE - ${nombreTel}`;
        } else if (isDelivery && horaEvento) {
            referenciaTexto = `ENTREGAR ${horaEvento} - ${infoCliente.nombres.toUpperCase()}`;
        }

        // Actualizar p_header con todos los campos necesarios
        const p_header = {
            ...estructuraPedidoCocinada.p_header,
            idclie: infoCliente.idcliente.toString(),
            referencia: referenciaTexto,
            r: referenciaTexto,
            idcategoria: tipoConsumo?.idcategoria?.toString() || "1",
            mesa: "",
            tipo_consumo: tipoConsumo?.idtipo_consumo?.toString() || "4",
            subtotales_tachados: "",
            arrDatosDelivery: arrDatosDelivery,
            isComercioAppDeliveryMapa: isDelivery ? "1" : "0",
            delivery: isDelivery ? 1 : 0,
            // Consumo en el local = reserva (el procedure guarda pedido.reserva)
            reservar: isReserva ? 1 : 0
        };

        // Actualizar la estructura con el p_header completo
        estructuraPedidoCocinada.p_header = p_header;

        const jsonPrintService = new JsonPrintService();
        const arrPrint = jsonPrintService.enviarMiPedido(
            true,
            sede,
            estructuraPedidoCocinada.p_body,
            listImpresoras
        );

        const dataPrint: any = [];
        arrPrint.map((x: any) => {
            dataPrint.push({
                Array_enca: p_header,
                ArraySubTotales: estructuraPedidoCocinada.p_subtotales,
                ArrayItem: x.arrBodyPrint,
                Array_print: x.arrPrinters
            });
        });

        const dataUsuarioSend = {
            idusuario: sede.idusuario,
            idcliente: infoCliente.idcliente,
            idorg: sede.idorg,
            idsede: sede.idsede,
            nombres: 'BOT',
            cargo: 'BOT',
            usuario: 'BOT'
        };

        const pedidoEnviar = {
            dataPedido: estructuraPedidoCocinada,
            dataPrint: dataPrint,
            dataUsuario: dataUsuarioSend,
            isDeliveryAPP: isDelivery,
            isClienteRecogeLocal: isRecoger,
            dataDescuento: [],
            listPrinters: arrPrint.listPrinters
        };

        const dataSocketQuery = {
            idorg: sede.idorg,
            idsede: sede.idsede,
            idusuario: sede.idusuario,
            idcliente: infoCliente.idcliente,
            iscliente: false,
            isOutCarta: false,
            isCashAtm: false,
            isFromApp: 0,
            isFromBot: 1
        };

        const payload = {
            query: dataSocketQuery,
            dataSend: pedidoEnviar
        };

        const URL_RESTOBAR = process.env.URL_RESTOBAR || 'http://localhost:3000';
        const urlBackend = `${URL_RESTOBAR}/bot/send-bot-pedido`;

        const response = await axios.post(urlBackend, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const resultado = response.data;

        const idpedido = resultado.idpedido || resultado.data?.idpedido;

        if (!idpedido) {
            throw new Error('Backend no retornó idpedido');
        }

        await prisma.$queryRawUnsafe(
            `UPDATE pedido_preview SET estado = 'confirmed', idpedido = ? WHERE id = ?`,
            idpedido,
            idresumen
        );

        res.status(200).json({
            success: true,
            mensaje: 'Pedido confirmado y guardado exitosamente',
            idpedido: idpedido,
            numero_pedido: idpedido
        });

    } catch (error) {        
        res.status(500).json({
            success: false,
            error: 'Error al crear pedido'
        });
    }
});

// consultar pedido por session_id
router.get('/info-pedido/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        
        const pedidoPreview: any = await prisma.$queryRaw`
            SELECT estado, idpedido
            FROM pedido_preview
            WHERE id = ${session_id}
            LIMIT 1`;

        if (!pedidoPreview || pedidoPreview.length === 0) {
            // No es un error de sistema: el cliente simplemente no tiene un pedido
            // en esta sesión. Respondemos 200 para que el bot lo relate al cliente
            // (mismo patrón que "canal no disponible") y no se loguee como fallo.
            return res.status(200).json({
                success: true,
                data: { preview: null, pedido_info: null, mensaje: 'El cliente aún no tiene un pedido registrado en esta sesión.' }
            });
        }

        const pedido = pedidoPreview[0];
        let infoPedido = null;

        // Convertir BigInt a Number
        const pedidoSerializable = {
            estado: pedido.estado,
            idpedido: pedido.idpedido ? Number(pedido.idpedido) : null
        };

        // Si el pedido ya fue confirmado, consultar información adicional
        if (pedido.estado === 'confirmed' && pedido.idpedido) {
            const resultado: any = await prisma.$queryRaw`
                SELECT 
                    p.idpedido,
                    p.fecha_hora, 
                    tc.descripcion as canal_consumo, 
                    COALESCE(r.nombre, 'sin asignar') as repartidor,
                    TIMESTAMPDIFF(MINUTE, p.fecha_hora, NOW()) as tiempo_transcurrido_minutos
                FROM pedido p
                INNER JOIN tipo_consumo tc USING(idtipo_consumo)
                LEFT JOIN repartidor r USING(idrepartidor)
                WHERE p.idpedido = ${pedido.idpedido}
                LIMIT 1`;

            if (resultado && resultado.length > 0) {
                infoPedido = {
                    idpedido: Number(resultado[0].idpedido),
                    fecha_hora: resultado[0].fecha_hora,
                    canal_consumo: resultado[0].canal_consumo,
                    repartidor: resultado[0].repartidor,
                    tiempo_transcurrido_minutos: Number(resultado[0].tiempo_transcurrido_minutos)
                };
            }
        }

        res.status(200).json({
            success: true,
            data: {
                preview: pedidoSerializable,
                pedido_info: infoPedido
            }
        });

    } catch (error) {        
        res.status(500).json({
            success: false,
            error: 'Error al consultar pedido'
        });
    }
});

router.get('/contexto/:idorg/:idsede/:telefono', async (req, res) => {
    try {
        const { idorg, idsede, telefono } = req.params;

        const sede = await prisma.sede.findFirst({
            where: {
                idsede: Number(idsede)
            },
            select: {
                nombre: true,
                telefono: true,
                direccion: true,
                latitude: true,
                longitude: true,
                metodo_pago_aceptados_chatbot: true,
                numero_billetera_chatbot: true
            }
        });

        if (!sede) {
            return res.status(404).json({
                success: false,
                error: 'Sede no encontrada'
            });
        }

        const categoria = await prisma.categoria.findFirst({
            where: {
                idsede: Number(idsede),
                estado: 0,
                visible_cliente: '1'
            },
            select: {
                url_carta: true
            }
        });

        const sedeConfig: any = await prisma.sede_costo_delivery.findFirst({
            where: {
                idsede: Number(idsede),
                estado: '0'
            }
        });

        const tiposEntrega = await prisma.tipo_consumo.findMany({
            where: {
                idsede: Number(idsede),
                estado: 0,
                habilitado_chatbot: '1'
            },
            select: {
                idtipo_consumo: true,
                descripcion: true
            }
        });

        let metodosPago = await prisma.tipo_pago.findMany({
            where: {
                estado: 0,
                habilitado_chatbot: '1'
            },
            select: {
                idtipo_pago: true,
                descripcion: true
            }
        });

        // Respetar los métodos marcados por la sede (ej. "5,1,7"). Si la sede no
        // configuró nada, se mantienen todos los habilitados globalmente.
        const idsAceptados = String(sede.metodo_pago_aceptados_chatbot || '')
            .split(',').map(s => s.trim()).filter(Boolean);
        if (idsAceptados.length > 0) {
            metodosPago = metodosPago.filter((mp: any) => idsAceptados.includes(String(mp.idtipo_pago)));
        }

        const horariosDB: any = await prisma.$queryRaw`
            SELECT de as hora_inicio, a as hora_fin, numdia, desdia 
            FROM sede_horario_trabajo 
            WHERE idsede = ${idsede} AND estado = 0
            ORDER BY idsede_horario_trabajo`;

        const horaActual = new Date();
        const diaActual = horaActual.getDay();
        
        const mapaDias: any = {
            '1': 'domingo',
            '2': 'lunes',
            '3': 'martes',
            '4': 'miercoles',
            '5': 'jueves',
            '6': 'viernes',
            '7': 'sabado'
        };

        let horarioAtencion: any = {
            lunes: { abre: "11:00", cierra: "22:00" },
            martes: { abre: "11:00", cierra: "22:00" },
            miercoles: { abre: "11:00", cierra: "22:00" },
            jueves: { abre: "11:00", cierra: "22:00" },
            viernes: { abre: "11:00", cierra: "23:00" },
            sabado: { abre: "11:00", cierra: "23:00" },
            domingo: { abre: "12:00", cierra: "21:00" }
        };

        if (horariosDB && horariosDB.length > 0) {
            const horarioPrincipal = horariosDB[0];
            const diasArray = horarioPrincipal.numdia.split(',').filter((d: string) => d);
            
            diasArray.forEach((numDia: string) => {
                const nombreDia = mapaDias[numDia];
                if (nombreDia) {
                    horarioAtencion[nombreDia] = {
                        abre: horarioPrincipal.hora_inicio,
                        cierra: horarioPrincipal.hora_fin
                    };
                }
            });
        }

        const parametros = sedeConfig?.parametros || {};
        
        let estaAbierto = false;
        const nombreDiaActual = mapaDias[diaActual === 0 ? '1' : (diaActual + 1).toString()];
        if (nombreDiaActual && horarioAtencion[nombreDiaActual]) {
            const horaActualStr = horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
            const horaAbre = horarioAtencion[nombreDiaActual].abre;
            const horaCierra = horarioAtencion[nombreDiaActual].cierra;
            estaAbierto = horaActualStr >= horaAbre && horaActualStr <= horaCierra;
        }

        const generarMensajeHorario = () => {
            const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            return dias.map(dia => {
                const horario = horarioAtencion[dia];
                const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
                return `${diaCapitalizado}: ${horario.abre} - ${horario.cierra}`;
            }).join(', ');
        };

        const negocio = {
            nombre_negocio: sede.nombre,
            telefono_negocio: sede.telefono,
            direccion: sede.direccion,
            latitud: sede.latitude,
            longitud: sede.longitude,
            horario_atencion: horarioAtencion,            
            horario: generarMensajeHorario(),
            esta_abierto: estaAbierto,
            hora_actual: horaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            tipos_consumo: tiposEntrega.map((te: any) => ({
                id: te.idtipo_consumo.toString(),
                nombre: te.descripcion.toLowerCase() === 'para llevar' ? 'Recoger en Local' : te.descripcion
            })),
            delivery: {
                habilitado: true,
                tipo: "distancia",
                costo_base: Number(parametros.km_base_costo || 0),
                costo_por_km: Number(parametros.km_adicional_costo || 0),
                km_base: Number(parametros.km_base || 0),
                distancia_maxima_km: Number(parametros.km_limite || 5),
                calcular_advertencia: parametros.obtener_coordenadas_del_cliente,
                tiempo_estimado_base: calcularTiempoEstimado(Number(parametros.tiempo_aprox_entrega || 30)),
                descripcion: `Costo base S/${Number(parametros.km_base_costo || 0)} hasta ${Number(parametros.km_base || 0)} km, luego S/${Number(parametros.km_adicional_costo || 0)} por km adicional`
            },
            metodos_pago: metodosPago.map((mp: any) => ({
                id: mp.idtipo_pago.toString(),
                nombre: mp.descripcion,
                activo: true
            })),
            // Número de Yape/Plin de la sede: el bot lo da cuando el cliente
            // pregunta a dónde yapear/plinear.
            numero_billetera: sede.numero_billetera_chatbot || null,
            mensaje_bienvenida: "Bienvenido! En que puedo ayudarte?",
            activo: true,
            link_carta: categoria?.url_carta ? `https://papaya-comercio-files.s3.us-east-2.amazonaws.com/files-bot/${categoria?.url_carta}` : null
        };

        const telefonoLimpio = telefono.replace(/\s/g, '');
        const clienteDB: any = await prisma.$queryRaw`
            SELECT c.idcliente, c.nombres, c.direccion, c.telefono 
            FROM cliente c 
            INNER JOIN cliente_sede cs ON cs.idcliente = c.idcliente
            WHERE cs.idsede = ${idsede} AND c.idorg = ${idorg} 
            AND REPLACE(c.telefono, ' ', '') LIKE ${'%' + telefonoLimpio + '%'}
            LIMIT 1`;

        let cliente = null;
        if (clienteDB && clienteDB.length > 0) {
            const idclienteDB = clienteDB[0].idcliente;

            const totalPedidos: any = await prisma.$queryRaw`
                SELECT COUNT(*) as total FROM pedido
                WHERE idcliente = ${idclienteDB}
                AND idsede = ${idsede}
                AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;

            // Última dirección guardada con referencia (para ofrecerla en delivery).
            const direccionPwa: any = await prisma.$queryRaw`
                SELECT direccion, referencia FROM cliente_pwa_direccion
                WHERE idcliente = ${idclienteDB}
                ORDER BY idcliente_pwa_direccion DESC LIMIT 1`;

            // Historial reciente en la sede: qué pidió, por qué canal y cómo pagó.
            // El bot lo usa para saludar de forma personal y sugerir "lo de siempre".
            const historialDB: any = await prisma.$queryRaw`
                SELECT DATE_FORMAT(p.fecha_hora, '%d/%m/%Y') AS fecha,
                       tc.descripcion AS canal,
                       (SELECT GROUP_CONCAT(CONCAT(pd.cantidad,'x ',pd.descripcion) SEPARATOR ', ')
                        FROM pedido_detalle pd WHERE pd.idpedido = p.idpedido) AS items,
                       (SELECT GROUP_CONCAT(DISTINCT tp.descripcion SEPARATOR ', ')
                        FROM registro_pago_detalle rpd
                        INNER JOIN tipo_pago tp USING(idtipo_pago)
                        WHERE rpd.idregistro_pago = p.idregistro_pago) AS pago
                FROM pedido p
                INNER JOIN tipo_consumo tc USING(idtipo_consumo)
                WHERE p.idcliente = ${idclienteDB} AND p.idsede = ${idsede}
                ORDER BY p.idpedido DESC LIMIT 5`;

            const historial = (historialDB || [])
                .filter((h: any) => h.items)
                .map((h: any) => ({
                    fecha: h.fecha,
                    canal: h.canal,
                    items: h.items,
                    pago: h.pago || null
                }));

            cliente = {
                id: Number(idclienteDB),
                idcliente: Number(idclienteDB),
                nombre: clienteDB[0].nombres,
                telefono: clienteDB[0].telefono,
                direccion: direccionPwa[0]?.direccion || clienteDB[0].direccion,
                referencia: direccionPwa[0]?.referencia || null,
                total_pedidos: Number(totalPedidos[0]?.total || 0),
                ultimo_pedido: historial[0]?.fecha || null,
                historial: historial,
                encontrado: true
            };
        }

        const rpt: any = await prisma.$queryRaw`call porcedure_pwa_pedido_carta(${idorg},${idsede},1)`
        
        const carta = rpt[0]?.f0 || [];
        const productos: any[] = [];
        const itemsVistos = new Set<string>();
        
        carta.forEach((categoria: any) => {
            categoria.secciones?.forEach((seccion: any) => {
                seccion.items?.forEach((item: any) => {
                    const claveUnica = `${item.iditem}-${item.des}`;
                    
                    if (itemsVistos.has(claveUnica)) {
                        return;
                    }
                    
                    itemsVistos.add(claveUnica);
                    
                    const stockNumerico = item.cantidad === 'ND' ? 1000 : Number(item.cantidad) || 0;
                    
                    productos.push({
                        iditem: Number(item.iditem),
                        idseccion: Number(seccion.idseccion),
                        descripcion: item.des,
                        precio: Number(item.precio),
                        stock: stockNumerico
                    });
                });
            });
        });

        // Nota manual del cliente (regla fija que el dueño define en el panel Piter).
        // Match tolerante por teléfono, igual que el lookup de cliente de arriba.
        const referenciaDB: any = await prisma.$queryRaw`
            SELECT referencia FROM chatbot_cliente_referencia
            WHERE idsede = ${idsede}
              AND REPLACE(telefono, ' ', '') LIKE ${'%' + telefonoLimpio + '%'}
            ORDER BY idchatbot_cliente_referencia DESC LIMIT 1`;
        const referencia_chatbot = referenciaDB?.[0]?.referencia || '';

        res.status(200).json({
            negocio: negocio,
            cliente: cliente,
            menu: productos,
            referencia_chatbot: referencia_chatbot
        });

    } catch (error) {
        // Log del error real: antes era mudo y un fallo aquí dejaba al bot
        // sin carta/menú sin pista alguna en los logs.
        console.error('Error en /chatbot/contexto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener contexto'
        });
    }
});



export default router;
