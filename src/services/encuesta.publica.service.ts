// Encuesta publica: resolver el link, validar la respuesta del cliente y guardarla.
// Tablas del POS legacy (migraciones 031/032): enc_canal_sede, enc_publicacion, enc_encuesta,
// enc_pregunta, enc_respuesta, enc_respuesta_detalle. Solo $queryRaw parametrizado: estas tablas no
// estan en schema.prisma y no hace falta `prisma db pull`.
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type Tipo = 'csat' | 'nps' | 'ces' | 'opcion' | 'texto';
export type Canal = 'kiosko' | 'qr_local' | 'ticket' | 'whatsapp';

export interface Pregunta {
    id: number;
    orden: number;
    tipo: Tipo;
    texto: string;
    obligatorio: boolean;
    opciones: string[];
}

export interface Publicacion {
    idenc_publicacion: number;
    idenc_encuesta: number;
    idorg: number;
    idsede: number;
    canal: Canal;
    local: string;
    texto_inicio: string | null;
    texto_fin: string | null;
}

export interface Venta {
    idregistro_pago: number;
    idsede: number;
    fecha_hora: Date;
    idpedido: number | null;
    idusuario: number | null;
    nummesa: string | null;
    total: string | null;
}

/** Errores de negocio con codigo estable: la app muestra una pantalla por codigo. */
export class ErrorEncuesta extends Error {
    constructor(public status: number, public codigo: string, mensaje: string) {
        super(mensaje);
        // tsconfig no fija "target" (compila a ES5): sin esto `instanceof ErrorEncuesta` da false en ts-node/dist
        Object.setPrototypeOf(this, ErrorEncuesta.prototype);
    }
}

export const TOKEN_RE = /^[a-f0-9]{24}$/;
export const VENTA_DIAS = 15;
// QR fijo: respuestas por IP al dia en una misma publicacion. Generoso: en el local muchos celulares salen por el
// mismo wifi. No aplica a la tablet (una sola IP por diseno) ni a comprobante/WhatsApp (ya limitados por venta).
export const TOPE_DIARIO_QR = 30;
const RANGO: Record<'csat' | 'nps' | 'ces', [number, number]> = { csat: [1, 5], nps: [0, 10], ces: [1, 7] };
const TEXTO_MAX = 500;

// ---------- logica pura ----------

const opcionesDe = (valor: unknown): string[] => {
    // MySQL JSON llega ya parseado o como string segun el driver
    const v = typeof valor === 'string' ? (() => { try { return JSON.parse(valor); } catch { return []; } })() : valor;
    return Array.isArray(v) ? v.filter((o): o is string => typeof o === 'string') : [];
};

export const normalizarPreguntas = (filas: any[]): Pregunta[] =>
    filas.map((f) => ({
        id: Number(f.id),
        orden: Number(f.orden),
        tipo: f.tipo as Tipo,
        texto: String(f.texto),
        obligatorio: Number(f.obligatorio) === 1,
        opciones: f.tipo === 'opcion' ? opcionesDe(f.opciones) : [],
    }));

export interface RespuestaValida {
    pregunta: Pregunta;
    valor_num: number | null;
    valor_texto: string | null;
}

/**
 * Valida lo que envio el cliente contra las preguntas de la version que vio. Lanza ErrorEncuesta(422)
 * con un mensaje apto para mostrar. Un comentario vacio cuenta como "no respondido".
 */
export const validarRespuestas = (preguntas: Pregunta[], entrada: unknown): RespuestaValida[] => {
    const invalido = (m: string) => new ErrorEncuesta(422, 'DATOS_INVALIDOS', m);
    if (!Array.isArray(entrada) || entrada.length > preguntas.length) throw invalido('Respuestas con formato invalido.');

    const porId = new Map(preguntas.map((p) => [p.id, p]));
    const vistas = new Set<number>();
    const validas: RespuestaValida[] = [];

    for (const r of entrada) {
        if (!r || typeof r !== 'object') throw invalido('Respuestas con formato invalido.');
        const id = (r as any).id;
        const valor = (r as any).valor;
        const p = Number.isSafeInteger(id) ? porId.get(id) : undefined;
        if (!p) throw invalido('Una respuesta no corresponde a esta encuesta.');
        if (vistas.has(id)) throw invalido('Hay respuestas repetidas.');
        vistas.add(id);

        if (p.tipo === 'csat' || p.tipo === 'nps' || p.tipo === 'ces') {
            const [min, max] = RANGO[p.tipo];
            if (!Number.isInteger(valor) || valor < min || valor > max) throw invalido(`Valor fuera de rango en "${p.texto}".`);
            validas.push({ pregunta: p, valor_num: valor, valor_texto: null });
        } else if (p.tipo === 'opcion') {
            if (typeof valor !== 'string' || !p.opciones.includes(valor)) throw invalido(`Opcion no valida en "${p.texto}".`);
            validas.push({ pregunta: p, valor_num: null, valor_texto: valor });
        } else {
            if (typeof valor !== 'string') throw invalido(`Comentario invalido en "${p.texto}".`);
            const texto = valor.trim();
            if (texto.length > TEXTO_MAX) throw invalido(`El comentario supera los ${TEXTO_MAX} caracteres.`);
            if (texto) validas.push({ pregunta: p, valor_num: null, valor_texto: texto });
        }
    }

    const faltante = preguntas.find((p) => p.obligatorio && !validas.some((v) => v.pregunta.id === p.id));
    if (faltante) throw invalido(`Falta responder "${faltante.texto}".`);
    if (!validas.length) throw invalido('Responde al menos una pregunta.');
    return validas;
};

export interface Metricas {
    csat_prom: number | null;
    nps_valor: number | null;
    nps_cat: 'detractor' | 'pasivo' | 'promotor' | null;
    ces_valor: number | null;
    tiene_comentario: 0 | 1;
}

/** Metricas precalculadas de UNA respuesta (los reportes del POS leen estas columnas sin JOIN). */
export const calcularMetricas = (validas: RespuestaValida[]): Metricas => {
    const nums = (t: Tipo) => validas.filter((v) => v.pregunta.tipo === t).map((v) => v.valor_num as number);
    const csat = nums('csat');
    const nps = nums('nps')[0] ?? null;
    return {
        csat_prom: csat.length ? Math.round((csat.reduce((a, b) => a + b, 0) / csat.length) * 100) / 100 : null,
        nps_valor: nps,
        nps_cat: nps === null ? null : nps <= 6 ? 'detractor' : nps <= 8 ? 'pasivo' : 'promotor',
        ces_valor: nums('ces')[0] ?? null,
        tiene_comentario: validas.some((v) => v.pregunta.tipo === 'texto' && v.valor_texto) ? 1 : 0,
    };
};

/** Fecha y fecha-hora en America/Lima, como las guarda el POS. */
export const horaLima = (d = new Date()) => {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(d).map((p) => [p.type, p.value]),
    );
    const fecha = `${partes.year}-${partes.month}-${partes.day}`;
    return { fecha, fechaHora: `${fecha} ${partes.hour}:${partes.minute}:${partes.second}` };
};

// ---------- datos ----------

/** Publicacion activa del link. 404 si el token no existe; 410 si el canal ya no tiene encuesta. */
export const buscarPublicacion = async (token: string): Promise<Publicacion> => {
    const filas = await prisma.$queryRaw<any[]>`
        SELECT cs.idsede, cs.canal, s.nombre AS local,
               p.idenc_publicacion, p.idorg, e.idenc_encuesta, e.texto_inicio, e.texto_fin
        FROM enc_canal_sede cs
        JOIN sede s ON s.idsede = cs.idsede
        LEFT JOIN enc_publicacion p ON p.idsede = cs.idsede AND p.canal = cs.canal AND p.activa = 1
        LEFT JOIN enc_encuesta e ON e.idenc_encuesta = p.idenc_encuesta AND e.estado <> 'archivada'
        WHERE cs.token = ${token}
        LIMIT 1`;
    const f = filas[0];
    if (!f) throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
    if (!f.idenc_publicacion || !f.idenc_encuesta) {
        throw new ErrorEncuesta(410, 'SIN_ENCUESTA', 'Esta encuesta ya no esta disponible.');
    }
    return {
        idenc_publicacion: Number(f.idenc_publicacion),
        idenc_encuesta: Number(f.idenc_encuesta),
        idorg: Number(f.idorg),
        idsede: Number(f.idsede),
        canal: f.canal,
        local: String(f.local),
        texto_inicio: f.texto_inicio ?? null,
        texto_fin: f.texto_fin ?? null,
    };
};

export const buscarPreguntas = async (idencuesta: number): Promise<Pregunta[]> =>
    normalizarPreguntas(await prisma.$queryRaw<any[]>`
        SELECT idenc_pregunta AS id, orden, tipo, texto, obligatorio, opciones
        FROM enc_pregunta WHERE idenc_encuesta = ${idencuesta} ORDER BY orden`);

/**
 * Venta del link de comprobante: debe ser de la misma sede, de hace menos de VENTA_DIAS y sin responder.
 * La firma ya se valido antes; aqui solo reglas de negocio.
 */
export const validarVenta = async (idpago: number, idsede: number, ahora = new Date()): Promise<Venta> => {
    const filas = await prisma.$queryRaw<any[]>`
        SELECT rp.idregistro_pago, rp.idsede, rp.fecha_hora,
               p.idpedido, p.idusuario, p.nummesa, p.total,
               (SELECT COUNT(*) FROM enc_respuesta r WHERE r.idregistro_pago = rp.idregistro_pago) AS respondidas
        FROM registro_pago rp
        LEFT JOIN pedido p ON p.idpedido = (SELECT MIN(p2.idpedido) FROM pedido p2 WHERE p2.idregistro_pago = rp.idregistro_pago)
        WHERE rp.idregistro_pago = ${idpago}
        LIMIT 1`;
    const f = filas[0];
    // venta inexistente o de otra sede: mismo mensaje que un link falso, sin dar pistas
    if (!f || Number(f.idsede) !== idsede) throw new ErrorEncuesta(404, 'LINK_INVALIDO', 'Este enlace no es valido.');
    const fecha = new Date(f.fecha_hora);
    if (isNaN(fecha.getTime()) || ahora.getTime() - fecha.getTime() > VENTA_DIAS * 86_400_000) {
        throw new ErrorEncuesta(410, 'LINK_VENCIDO', 'Este enlace ya vencio.');
    }
    if (Number(f.respondidas) > 0) throw new ErrorEncuesta(409, 'YA_RESPONDIDA', 'Ya respondiste esta encuesta. ¡Gracias!');
    return {
        idregistro_pago: Number(f.idregistro_pago),
        idsede: Number(f.idsede),
        fecha_hora: fecha,
        idpedido: f.idpedido === null ? null : Number(f.idpedido),
        idusuario: f.idusuario === null ? null : Number(f.idusuario),
        nummesa: f.nummesa === null ? null : String(f.nummesa).trim(),
        total: f.total === null ? null : String(f.total),
    };
};

/**
 * Guarda la respuesta en una transaccion. Antes vuelve a leer, con bloqueo compartido, que la publicacion siga
 * activa y sirviendo la misma version que vio el cliente (si el admin versiono en el medio: 409).
 */
export const guardarRespuesta = async (datos: {
    pub: Publicacion;
    validas: RespuestaValida[];
    venta: Venta | null;
    ip: string | null;
}): Promise<void> => {
    const { pub, validas, venta, ip } = datos;
    const m = calcularMetricas(validas);
    const { fecha, fechaHora } = horaLima();
    const total = venta?.total !== null && venta?.total !== undefined && !isNaN(Number(venta.total)) ? Number(venta.total) : null;

    try {
        await prisma.$transaction(async (tx) => {
            const vigente = await tx.$queryRaw<any[]>`
                SELECT idenc_encuesta FROM enc_publicacion
                WHERE idenc_publicacion = ${pub.idenc_publicacion} AND activa = 1 LOCK IN SHARE MODE`;
            if (!vigente[0] || Number(vigente[0].idenc_encuesta) !== pub.idenc_encuesta) {
                throw new ErrorEncuesta(409, 'ENCUESTA_CAMBIO', 'La encuesta se actualizo. Vuelve a empezar.');
            }
            if (pub.canal === 'qr_local' && ip) {
                const hoy = await tx.$queryRaw<{ respuestas_hoy: bigint }[]>`
                    SELECT COUNT(*) AS respuestas_hoy FROM enc_respuesta
                    WHERE ip = ${ip} AND idenc_publicacion = ${pub.idenc_publicacion} AND respondido_en >= ${fecha + ' 00:00:00'}`;
                if (Number(hoy[0]?.respuestas_hoy ?? 0) >= TOPE_DIARIO_QR) {
                    throw new ErrorEncuesta(429, 'DEMASIADAS_SOLICITUDES', 'Ya recibimos muchas respuestas desde esta conexion hoy. ¡Gracias!');
                }
            }

            await tx.$executeRaw`
                INSERT INTO enc_respuesta (idenc_publicacion, idenc_encuesta, idorg, idsede, canal, respondido_en, fecha_local,
                    idregistro_pago, idpedido, idusuario_atendio, nummesa, total_pedido,
                    csat_prom, nps_valor, nps_cat, ces_valor, tiene_comentario, ip)
                VALUES (${pub.idenc_publicacion}, ${pub.idenc_encuesta}, ${pub.idorg}, ${pub.idsede}, ${pub.canal}, ${fechaHora}, ${fecha},
                    ${venta?.idregistro_pago ?? null}, ${venta?.idpedido ?? null}, ${venta?.idusuario ?? null},
                    ${venta?.nummesa ?? null}, ${total},
                    ${m.csat_prom}, ${m.nps_valor}, ${m.nps_cat}, ${m.ces_valor}, ${m.tiene_comentario}, ${ip})`;
            const id = await tx.$queryRaw<{ id: bigint }[]>`SELECT LAST_INSERT_ID() AS id`;
            const idrespuesta = id[0].id;

            for (const v of validas) {
                await tx.$executeRaw`
                    INSERT INTO enc_respuesta_detalle (idenc_respuesta, idenc_pregunta, pregunta_texto, tipo, orden, valor_num, valor_texto)
                    VALUES (${idrespuesta}, ${v.pregunta.id}, ${v.pregunta.texto}, ${v.pregunta.tipo}, ${v.pregunta.orden},
                        ${v.valor_num}, ${v.valor_texto})`;
            }
        });
    } catch (error) {
        // dos envios simultaneos de la misma venta: el indice unico gana la carrera
        if (error instanceof Prisma.PrismaClientKnownRequestError && /ux_resp_pago|Duplicate entry/.test(error.message)) {
            throw new ErrorEncuesta(409, 'YA_RESPONDIDA', 'Ya respondiste esta encuesta. ¡Gracias!');
        }
        throw error;
    }
};
