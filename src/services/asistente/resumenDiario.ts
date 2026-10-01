import { PrismaClient } from '@prisma/client';
import { obtenerProveedor } from './proveedor';
import { ejecutarHerramienta } from './herramientas';
import { ContextoAsistente, DefinicionHerramienta, MensajeChat } from './tipos';
import { sendPushToSede, shouldSendOncePerDay } from '../push.sender';
import { evaluarSede, marcarDisparada } from './reglas';

const prisma = new PrismaClient();

/**
 * Resumen diario que LLEGA SIN QUE PREGUNTES.
 *
 * Un chat solo sirve si te acuerdas de abrirlo. Un aviso que aparece en el
 * celular a la hora del cierre no depende de que nadie se acuerde, y es lo que
 * de verdad cambia la relacion del dueno con sus numeros.
 *
 * Reusa las mismas herramientas que el chat, asi que las cifras del push y las
 * del asistente son las mismas por construccion.
 */

const PROMPT = `Eres el gerente de un restaurante y escribes el resumen del dia para el dueno,
que lo va a leer como notificacion en el celular.

Entrega SIEMPRE el resultado llamando a la herramienta "resumen".

Reglas:
- Lo primero es lo que se sale de lo normal. Si todo fue normal, dilo en una linea y ya.
- Cifras redondeadas: "S/ 2,180", no "S/ 2178.43".
- Si hay algo que exige accion hoy, va en el titulo.
- Nada de "segun los datos" ni "analisis del dia". Hablas como una persona.

Ejemplos de buen cuerpo:
"Cerraste S/ 3,240 en 78 tickets, 12% arriba del martes. Dos cajas quedaron abiertas."
"Dia flojo: S/ 890, 40% bajo la meta. Nadie borro items ni hubo anulaciones raras."`;

interface ResumenGenerado {
    titulo: string;
    cuerpo: string;
}

/**
 * El formato se garantiza con el esquema, no con la buena voluntad del modelo.
 * Pidiendo dos lineas de texto plano a veces devolvia una sola y el cuerpo del
 * push quedaba vacio.
 */
const HERRAMIENTA_RESUMEN: DefinicionHerramienta = {
    nombre: 'resumen',
    descripcion: 'Entrega el resumen del dia. Llamala siempre.',
    parametros: {
        type: 'object',
        properties: {
            titulo: {
                type: 'string',
                description: 'Maximo 40 caracteres. Lo que exige atencion hoy.'
            },
            cuerpo: {
                type: 'string',
                description: 'Maximo 160 caracteres. Cifras redondeadas.'
            }
        },
        required: ['titulo', 'cuerpo'],
        additionalProperties: false
    }
};

async function contextoDeSede(idsede: number, fecha: string): Promise<ContextoAsistente | null> {
    const filas: any = await prisma.$queryRaw`
        SELECT idsede, idorg, nombre FROM sede WHERE idsede = ${idsede} LIMIT 1`;
    const sede = filas?.[0];
    if (!sede) return null;

    return {
        idusuario: 0,
        idorg: Number(sede.idorg) || 0,
        sedeActual: idsede,
        // Solo su propia sede: el resumen no cruza locales.
        sedesPermitidas: [{ idsede, nombre: String(sede.nombre ?? '') }],
        desde: fecha,
        hasta: fecha
    };
}

/** Texto del resumen para una sede y fecha. Null si no hay nada que contar. */
export async function generarResumen(
    idsede: number,
    fecha: string
): Promise<ResumenGenerado | null> {
    const ctx = await contextoDeSede(idsede, fecha);
    if (!ctx) return null;

    // Las mismas herramientas del chat: un solo camino hacia la cifra.
    const [ventas, metas, alertas] = await Promise.all([
        ejecutarHerramienta('ventas_resumen', {}, ctx).catch(() => null),
        ejecutarHerramienta('metas_avance', {}, ctx).catch(() => null),
        ejecutarHerramienta('alertas_operativas', {}, ctx).catch(() => null)
    ]);

    const mensajes: MensajeChat[] = [
        { rol: 'sistema', contenido: PROMPT },
        {
            rol: 'usuario',
            contenido:
                `Local: ${ctx.sedesPermitidas[0].nombre}. Fecha: ${fecha}.\n\n` +
                `VENTAS:\n${JSON.stringify(ventas)}\n\n` +
                `METAS:\n${JSON.stringify(metas)}\n\n` +
                `ALERTAS:\n${JSON.stringify(alertas)}`
        }
    ];

    // Los datos ya estan: aqui el modelo solo redacta, con formato garantizado.
    const respuesta = await obtenerProveedor().chat(
        mensajes,
        [HERRAMIENTA_RESUMEN],
        'resumen'
    );

    const args = respuesta.llamadas.find((l) => l.nombre === 'resumen')?.argumentos;
    if (args) {
        const titulo = String(args.titulo ?? '').trim();
        const cuerpo = String(args.cuerpo ?? '').trim();
        if (titulo && cuerpo) {
            return { titulo: titulo.slice(0, 60), cuerpo: cuerpo.slice(0, 200) };
        }
    }

    // Respaldo: si aun asi contesto en texto, se parte en titulo y cuerpo.
    const texto = (respuesta.texto ?? '').trim();
    if (!texto) return null;
    const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    return {
        titulo: (lineas[0] ?? 'Resumen del dia').slice(0, 60),
        cuerpo: (lineas.slice(1).join(' ') || lineas[0] || '').slice(0, 200)
    };
}

/**
 * Avisos configurados por el usuario ("avisame si...").
 *
 * Van en un solo push aunque se disparen varios: dos notificaciones seguidas se
 * leen como spam y se desactivan. `marcarDisparada` evita repetir el mismo aviso
 * el mismo dia.
 */
async function enviarAvisos(idsede: number, fecha: string): Promise<number> {
    const disparadas = await evaluarSede(idsede, fecha);
    if (disparadas.length === 0) return 0;

    const titulo =
        disparadas.length === 1
            ? 'Aviso que pediste'
            : `${disparadas.length} avisos que pediste`;

    await sendPushToSede(idsede, {
        title: titulo,
        body: disparadas.map((d) => d.mensaje).join(' ').slice(0, 300),
        tag: `avisos-ia-${fecha}`,
        url: '/hoy'
    });

    for (const d of disparadas) {
        await marcarDisparada(d.regla.id, fecha);
    }
    return disparadas.length;
}

/**
 * Envia el resumen a todas las sedes activas. Pensado para un cron al cierre.
 * `shouldSendOncePerDay` evita duplicados si el cron se dispara dos veces.
 */
export async function enviarResumenDiario(fechaISO?: string): Promise<{
    enviados: number;
    omitidos: number;
    avisos: number;
}> {
    const fecha = fechaISO ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    // Sedes con ventas, mas las que tengan avisos activos: un dia sin una sola
    // venta es justo cuando mas importa avisar.
    const sedes: any = await prisma.$queryRaw`
        SELECT DISTINCT rp.idsede
        FROM registro_pago rp
        WHERE DATE(rp.fecha_hora) = ${fecha} AND rp.estado = 0
        UNION
        SELECT DISTINCT r.idsede FROM asistente_regla_alerta r WHERE r.activa = 1`;

    let enviados = 0;
    let omitidos = 0;
    let avisos = 0;

    for (const s of sedes ?? []) {
        const idsede = Number(s.idsede);
        try {
            avisos += await enviarAvisos(idsede, fecha);

            if (!(await shouldSendOncePerDay(idsede, 'resumen_ia', fecha))) {
                omitidos++;
                continue;
            }

            const resumen = await generarResumen(idsede, fecha);
            if (!resumen) {
                omitidos++;
                continue;
            }

            await sendPushToSede(idsede, {
                title: resumen.titulo,
                body: resumen.cuerpo,
                tag: `resumen-ia-${fecha}`,
                url: '/hoy'
            });
            enviados++;
        } catch (err) {
            console.error(`[resumen-ia] sede ${idsede}:`, err);
            omitidos++;
        }
    }

    return { enviados, omitidos, avisos };
}
