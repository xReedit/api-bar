// Encuesta de satisfaccion PUBLICA (sin login): la responde un cliente anonimo desde encuesta.papaya.com.pe.
// Contrato y modelo de amenazas: plan/ENCUESTAS-FASE2-PLAN.md del POS legacy.
//
// Defensas propias de este router (no afectan al resto de la API):
//  - token de 96 bits (enc_canal_sede) validado por forma ANTES de tocar la BD
//  - link de comprobante firmado con HMAC (?v=) y con vencimiento
//  - nonce firmado: sin GET previo no hay POST, minimo 3 s de llenado, atado a la version vista
//  - canales comprobante y WhatsApp SOLO con venta firmada (el token del ticket va impreso: es publico)
//  - rate limit por IP (IPv6 agrupada por /56) + tope diario por IP en QR fijo, campo trampa `sitio`,
//    validacion estricta por tipo de pregunta. El tamano del body lo limita el nginx de la app (16 KB).
//  - sin ENCUESTA_SECRET responde 503: nunca queda abierto sin firmas
// Sin restriccion CORS a proposito: la app entra por su propio proxy (mismo origen) y una API publica y
// anonima se puede llamar igual con curl; la proteccion real son las firmas, el rate limit y la validacion.
import express, { NextFunction, Request, Response } from 'express';
import { isIP } from 'net';
import rateLimit from 'express-rate-limit';
import { crearNonce, leerNonce, leerVenta, secretoEncuesta } from '../services/encuesta.firma';
import {
    buscarPreguntas,
    buscarPublicacion,
    ErrorEncuesta,
    guardarRespuesta,
    TOKEN_RE,
    validarRespuestas,
    validarVenta,
    Venta,
} from '../services/encuesta.publica.service';

const router = express.Router();
// En estos canales el token viaja impreso en cada comprobante: sin la firma de la venta cualquiera responderia sin limite
const CANALES_CON_VENTA = ['ticket', 'whatsapp'];
let avisoSinSecreto = false;

const error = (res: Response, status: number, codigo: string, mensaje: string) =>
    res.status(status).json({ ok: false, codigo, mensaje });

const limite = (max: number) =>
    rateLimit({
        windowMs: 60_000,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (_req, res) => error(res, 429, 'DEMASIADAS_SOLICITUDES', 'Demasiados intentos. Espera un momento.'),
    });

router.use((req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!secretoEncuesta()) {
        if (!avisoSinSecreto) console.error('[encuesta-publica] ENCUESTA_SECRET no configurado (minimo 32 caracteres): servicio deshabilitado');
        avisoSinSecreto = true;
        return error(res, 503, 'NO_DISPONIBLE', 'La encuesta no esta disponible en este momento.');
    }
    // en router.use aun no hay req.params: el token es el primer segmento de la ruta
    if (!TOKEN_RE.test(req.path.split('/')[1] ?? '')) {
        return error(res, 404, 'LINK_INVALIDO', 'Este enlace no es valido.');
    }
    next();
});

const responderError = (res: Response, e: unknown, contexto: string) => {
    if (e instanceof ErrorEncuesta) return error(res, e.status, e.codigo, e.message);
    console.error(`[encuesta-publica] ${contexto}:`, e);
    return error(res, 500, 'NO_DISPONIBLE', 'No se pudo procesar la encuesta. Intenta de nuevo.');
};

/** Venta del link de comprobante (?v=), o null si el link es de tablet / QR fijo. Lanza si es invalida. */
const ventaDelLink = async (secreto: string, token: string, v: unknown, idsede: number): Promise<Venta | null> => {
    if (v === undefined || v === '') return null;
    const idpago = leerVenta(secreto, token, v);
    if (!idpago) throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
    return validarVenta(idpago, idsede);
};

router.get('/:token', limite(60), async (req: Request, res: Response) => {
    const secreto = secretoEncuesta() as string;
    const token = req.params.token;
    try {
        const pub = await buscarPublicacion(token);
        const venta = await ventaDelLink(secreto, token, req.query.v, pub.idsede);
        if (!venta && CANALES_CON_VENTA.includes(pub.canal)) throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
        const preguntas = await buscarPreguntas(pub.idenc_encuesta);
        if (!preguntas.length) throw new ErrorEncuesta(410, 'SIN_ENCUESTA', 'Esta encuesta ya no esta disponible.');

        // solo lo que el cliente necesita: ni idorg/idsede ni datos de la venta
        res.status(200).json({
            ok: true,
            data: {
                local: pub.local,
                canal: pub.canal,
                texto_inicio: pub.texto_inicio,
                texto_fin: pub.texto_fin,
                preguntas: preguntas.map((p) => ({ id: p.id, tipo: p.tipo, texto: p.texto, obligatorio: p.obligatorio, opciones: p.opciones })),
                nonce: crearNonce(secreto, { p: pub.idenc_publicacion, e: pub.idenc_encuesta, v: venta?.idregistro_pago ?? 0, t: Date.now() }),
            },
        });
    } catch (e) {
        responderError(res, e, 'GET');
    }
});

router.post('/:token/respuestas', limite(20), async (req: Request, res: Response) => {
    const secreto = secretoEncuesta() as string;
    const token = req.params.token;
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // campo trampa: un humano nunca lo ve; se responde exito sin guardar para no darle pistas al bot
    if (typeof body.sitio === 'string' && body.sitio.trim() !== '') {
        return res.status(201).json({ ok: true, data: { texto_fin: null } });
    }

    const lectura = leerNonce(secreto, body.nonce);
    if (!lectura.ok) {
        const mensaje = lectura.motivo === 'vencido'
            ? 'La encuesta estuvo abierta mucho tiempo. Vuelve a empezar.'
            : 'No se pudo validar el envio. Vuelve a empezar.';
        return error(res, 400, 'NONCE_INVALIDO', mensaje);
    }
    const nonce = lectura.nonce;

    try {
        const pub = await buscarPublicacion(token);
        if (nonce.p !== pub.idenc_publicacion || nonce.e !== pub.idenc_encuesta) {
            throw new ErrorEncuesta(409, 'ENCUESTA_CAMBIO', 'La encuesta se actualizo. Vuelve a empezar.');
        }
        if (!nonce.v && CANALES_CON_VENTA.includes(pub.canal)) throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
        const venta = nonce.v ? await validarVenta(nonce.v, pub.idsede) : null;
        const preguntas = await buscarPreguntas(pub.idenc_encuesta);
        const validas = validarRespuestas(preguntas, body.respuestas);

        // solo una IP valida llega a la BD (y a los reportes del POS)
        await guardarRespuesta({ pub, validas, venta, ip: req.ip && isIP(req.ip) ? req.ip : null });
        res.status(201).json({ ok: true, data: { texto_fin: pub.texto_fin } });
    } catch (e) {
        responderError(res, e, 'POST');
    }
});

export default router;
