import * as express from 'express';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { CustomRequest } from '../../middleware/auth';
import { responder } from '../../services/asistente/conversacion';
import { enviarResumenDiario, generarResumen } from '../../services/asistente/resumenDiario';
import { ContextoAsistente, MensajeChat } from '../../services/asistente/tipos';
import { hoyEnLima } from '../../services/asistente/prompt';
import { ErrorValidacion, mensajeError } from '../../services/dash/errores';
import { borrarRegla, crearRegla, listarReglas } from '../../services/asistente/reglas';
dotenv.config();

const router = express.Router();

/**
 * Asistente IA del dashboard (docs/PLAN_ASISTENTE_IA.md).
 *
 * Montado detras de `auth`: el contexto de seguridad sale del token, nunca del
 * cuerpo de la peticion ni de lo que proponga el modelo.
 */

/** Cada turno cuesta tokens: sin tope, un bucle en el navegador vacia la cuenta. */
const limite = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas seguidas. Espera un momento.' }
});

interface TokenDashboard {
    id?: number;
    idorg?: number;
    idsede?: number;
    sedes?: Array<{ idsede: number; nombre: string }>;
}

function exigirFechaISO(valor: unknown, campo: string): string {
    const f = String(valor ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new ErrorValidacion(`${campo} debe tener formato YYYY-MM-DD`);
    }
    return f;
}

/**
 * El contexto se arma del token + la pantalla. `sedesPermitidas` es la frontera
 * de seguridad: si el token no trae sedes[], se cae a la sede del propio token.
 */
function construirContexto(req: express.Request, conRango = true): ContextoAsistente {
    const token = ((req as CustomRequest).token ?? {}) as TokenDashboard;
    const { idsede, desde, hasta } = req.body ?? {};

    const permitidas =
        Array.isArray(token.sedes) && token.sedes.length > 0
            ? token.sedes
            : token.idsede
              ? [{ idsede: Number(token.idsede), nombre: 'Mi local' }]
              : [];

    if (permitidas.length === 0) {
        throw new ErrorValidacion('El token no trae sedes asignadas');
    }

    const pedida = Number(idsede);
    const sedeActual = permitidas.some((s) => Number(s.idsede) === pedida)
        ? pedida
        : Number(permitidas[0].idsede);

    return {
        idusuario: Number(token.id) || 0,
        idorg: Number(token.idorg) || 0,
        sedeActual,
        sedesPermitidas: permitidas.map((s) => ({
            idsede: Number(s.idsede),
            nombre: String(s.nombre ?? `Sede ${s.idsede}`)
        })),
        desde: conRango ? exigirFechaISO(desde, 'desde') : hoyEnLima(),
        hasta: conRango ? exigirFechaISO(hasta, 'hasta') : hoyEnLima()
    };
}

/**
 * Historial de la conversacion.
 *
 * Se acota a proposito: el contexto se paga en cada turno, y mas alla de unos
 * pocos intercambios deja de aportar. Solo texto de usuario y asistente; las
 * llamadas a herramientas no se reenvian, que es donde esta el volumen.
 */
const MAX_TURNOS = 8;
const MAX_CARACTERES = 600;

function construirHistorial(bruto: unknown): MensajeChat[] {
    if (!Array.isArray(bruto)) return [];

    return bruto
        .slice(-MAX_TURNOS)
        .filter((t) => t && (t.rol === 'usuario' || t.rol === 'asistente'))
        .map((t) => ({
            rol: t.rol as 'usuario' | 'asistente',
            contenido: String(t.texto ?? '').slice(0, MAX_CARACTERES)
        }))
        .filter((t) => t.contenido.length > 0);
}

router.get('/', (_req, res) => {
    res.status(200).json({ message: 'Estas conectado al api dash asistente' });
});

router.post('/chat', limite, async (req, res) => {
    try {
        const contexto = construirContexto(req);
        const respuesta = await responder(
            req.body?.mensaje,
            contexto,
            construirHistorial(req.body?.historial)
        );
        res.status(200).json(respuesta);
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'responder la consulta') });
    }
});

/**
 * Misma consulta, pero avisando por el camino.
 *
 * La espera no la causa el modelo escribiendo, la causan las consultas a la base
 * (una por sede, y varias por turno). Por eso se emite QUE se esta haciendo en
 * vez de las letras de la respuesta: es mas informativo y mucho mas simple.
 *
 * SSE y no WebSocket porque el flujo es de ida: servidor -> navegador.
 */
router.post('/chat-stream', limite, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Sin esto nginx acumula el buffer y los eventos llegan todos al final.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const enviar = (evento: string, datos: unknown) => {
        res.write(`event: ${evento}\n`);
        res.write(`data: ${JSON.stringify(datos)}\n\n`);
    };

    try {
        const contexto = construirContexto(req);
        const respuesta = await responder(
            req.body?.mensaje,
            contexto,
            construirHistorial(req.body?.historial),
            (paso) => enviar('paso', { texto: paso })
        );
        enviar('fin', respuesta);
    } catch (error) {
        enviar('error', { error: mensajeError(error, 'responder la consulta') });
    } finally {
        res.end();
    }
});

/**
 * Resumen del dia en texto, sin enviar nada. Para que el usuario lo vea en
 * pantalla y para probar el cron sin gastar notificaciones.
 */
router.post('/resumen-diario/previsualizar', limite, async (req, res) => {
    try {
        const contexto = construirContexto(req);
        const resumen = await generarResumen(contexto.sedeActual, contexto.hasta);
        if (!resumen) {
            return res.status(200).json({ vacio: true });
        }
        res.status(200).json(resumen);
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'generar el resumen') });
    }
});

/**
 * Dispara el envio a todas las sedes con ventas del dia. Pensado para un cron
 * al cierre; `shouldSendOncePerDay` evita duplicados si se llama dos veces.
 *
 * Va detras del mismo `auth` que el resto: un cron externo necesita un token del
 * dashboard. Si mas adelante se automatiza desde el servidor, conviene moverlo a
 * una ruta con x-api-key como /chatbot/*.
 */
router.post('/resumen-diario/enviar', async (req, res) => {
    try {
        const fecha = req.body?.fecha;
        if (fecha !== undefined) exigirFechaISO(fecha, 'fecha');
        res.status(200).json(await enviarResumenDiario(fecha));
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'enviar los resumenes') });
    }
});

/**
 * Reglas de aviso: "avisame si algun local baja del 70% de su meta".
 *
 * El asistente las propone como un bloque de acciones; se crean aqui, y solo
 * cuando el usuario pulsa. El modelo no escribe en la base.
 */
router.post('/avisos', async (req, res) => {
    try {
        const ctx = construirContexto(req, false);
        res.status(200).json(await listarReglas(ctx.sedesPermitidas.map((s) => s.idsede)));
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'listar los avisos') });
    }
});

router.post('/avisos/crear', async (req, res) => {
    try {
        const ctx = construirContexto(req, false);
        const idsede = Number(req.body?.idsede);

        if (!ctx.sedesPermitidas.some((s) => s.idsede === idsede)) {
            throw new ErrorValidacion('Sede no autorizada para este usuario');
        }

        res.status(200).json(
            await crearRegla(
                ctx.idorg,
                idsede,
                ctx.idusuario,
                String(req.body?.tipo ?? ''),
                Number(req.body?.umbral)
            )
        );
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'crear el aviso') });
    }
});

router.post('/avisos/borrar', async (req, res) => {
    try {
        const ctx = construirContexto(req, false);
        const borrado = await borrarRegla(
            Number(req.body?.id),
            ctx.sedesPermitidas.map((s) => s.idsede)
        );
        res.status(200).json({ borrado });
    } catch (error) {
        const estado = error instanceof ErrorValidacion ? 400 : 500;
        res.status(estado).json({ error: mensajeError(error, 'borrar el aviso') });
    }
});

export default router;
