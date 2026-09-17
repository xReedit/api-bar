// Encuestas en el dashboard: resultados, alertas de malas experiencias y seguimiento.
// Contrato: plan/ENCUESTAS-DASHBOARD-PLAN.md del POS legacy. Tablas enc_* (migraciones 031-034), solo $queryRaw
// parametrizado (no estan en schema.prisma). Las metricas por respuesta ya vienen precalculadas en enc_respuesta.
import { Prisma, PrismaClient } from '@prisma/client';
import { horaLima } from './encuesta.publica.service';

const prisma = new PrismaClient();

export type Canal = 'kiosko' | 'qr_local' | 'ticket' | 'whatsapp';
export interface Rango { inicio: string; fin: string }

/** Error con estado HTTP para el controller. */
export class ErrorDash extends Error {
    constructor(public status: number, mensaje: string) {
        super(mensaje);
        // tsconfig sin "target" (ES5): sin esto instanceof falla en ts-node/dist
        Object.setPrototypeOf(this, ErrorDash.prototype);
    }
}

// ---------- reglas de negocio (puras) ----------

/** Mala experiencia (decision del usuario): cualquier senal mala en la respuesta. */
export const UMBRAL = { csat: 2, nps: 6, ces: 3 } as const;

/** Misma regla en SQL. COALESCE: un NULL (pregunta no incluida) no cuenta como malo ni rompe el NOT. */
export const SQL_MALA = Prisma.sql`(COALESCE(r.csat_prom <= 2, 0) OR COALESCE(r.nps_valor <= 6, 0) OR COALESCE(r.ces_valor <= 3, 0))`;

export const esMala = (csat: number | null, nps: number | null, ces: number | null) =>
    (csat !== null && csat <= UMBRAL.csat) || (nps !== null && nps <= UMBRAL.nps) || (ces !== null && ces <= UMBRAL.ces);

export const motivosMala = (csat: number | null, nps: number | null, ces: number | null): string[] => {
    const m: string[] = [];
    if (csat !== null && csat <= UMBRAL.csat) m.push(`Satisfacción baja (${csat})`);
    if (nps !== null && nps <= UMBRAL.nps) m.push(`Detractor (NPS ${nps})`);
    if (ces !== null && ces <= UMBRAL.ces) m.push(`Difícil (CES ${ces})`);
    return m;
};

/** 0-100, mayor = peor: la peor de las tres escalas normalizada, +10 si hay mas de una senal mala. */
export const severidad = (csat: number | null, nps: number | null, ces: number | null): number => {
    const malos = [
        csat === null ? null : (5 - csat) / 4,
        nps === null ? null : (10 - nps) / 10,
        ces === null ? null : (7 - ces) / 6,
    ].filter((x): x is number => x !== null);
    if (!malos.length) return 0;
    const extra = motivosMala(csat, nps, ces).length > 1 ? 10 : 0;
    return Math.min(100, Math.round(Math.max(...malos) * 100) + extra);
};

export const calcularNps = (promotores: number, detractores: number, total: number): number | null =>
    total > 0 ? Math.round(((promotores - detractores) * 100) / total) : null;

export const tasa = (respuestas: number, ventas: number): number | null =>
    ventas > 0 ? Math.round((respuestas * 1000) / ventas) / 10 : null;

const num = (x: unknown): number => (x === null || x === undefined ? 0 : Number(x));
const numONull = (x: unknown): number | null => (x === null || x === undefined ? null : Math.round(Number(x) * 100) / 100);

/** Rango valido YYYY-MM-DD y rango anterior del mismo largo, justo antes. */
export const rangoAnterior = (r: Rango): Rango => {
    const ini = new Date(r.inicio + 'T00:00:00Z');
    const fin = new Date(r.fin + 'T00:00:00Z');
    const dias = Math.round((fin.getTime() - ini.getTime()) / 86_400_000) + 1;
    const finAnt = new Date(ini.getTime() - 86_400_000);
    const iniAnt = new Date(finAnt.getTime() - (dias - 1) * 86_400_000);
    const f = (d: Date) => d.toISOString().slice(0, 10);
    return { inicio: f(iniAnt), fin: f(finAnt) };
};

const ESCALA: Record<'csat' | 'nps' | 'ces', [number, number]> = { csat: [1, 5], nps: [0, 10], ces: [1, 7] };
export const puntaje100 = (tipo: 'csat' | 'nps' | 'ces', promedio: number) => {
    const [min, max] = ESCALA[tipo];
    return Math.round(((promedio - min) / (max - min)) * 100);
};

/** 1 = lunes ... 7 = domingo, desde DAYOFWEEK de MySQL (1 = domingo). */
export const diaSemanaLunes = (dayofweek: number) => ((dayofweek + 5) % 7) + 1;

// ---------- consultas ----------

const filtroRespuestas = (sedes: number[], r: Rango) =>
    Prisma.sql`r.idsede IN (${Prisma.join(sedes)}) AND r.fecha_local BETWEEN ${r.inicio} AND ${r.fin}`;

const kpis = async (idsede: number, r: Rango) => {
    const [k] = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS respuestas,
               SUM(r.nps_valor IS NOT NULL) AS con_nps,
               SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'pasivo') AS pasivos, SUM(r.nps_cat = 'detractor') AS detractores,
               AVG(r.csat_prom) AS csat_prom, SUM(r.csat_prom IS NOT NULL) AS con_csat, SUM(r.csat_prom >= 4) AS csat_ok,
               AVG(r.ces_valor) AS ces_prom,
               SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas,
               SUM(CASE WHEN ${SQL_MALA} AND g.idenc_respuesta IS NULL THEN 1 ELSE 0 END) AS malas_pendientes,
               SUM(r.tiene_comentario) AS comentarios
        FROM enc_respuesta r
        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta
        WHERE ${filtroRespuestas([idsede], r)}`;
    const ventas = await contarVentas([idsede], r);
    const respuestas = num(k?.respuestas);
    const conCsat = num(k?.con_csat);
    return {
        respuestas,
        ventas: ventas.get(idsede) ?? 0,
        tasa_respuesta: tasa(respuestas, ventas.get(idsede) ?? 0),
        nps: calcularNps(num(k?.promotores), num(k?.detractores), num(k?.con_nps)),
        promotores: num(k?.promotores), pasivos: num(k?.pasivos), detractores: num(k?.detractores),
        csat_prom: numONull(k?.csat_prom),
        csat_satisfechos_pct: conCsat ? Math.round((num(k?.csat_ok) * 1000) / conCsat) / 10 : null,
        ces_prom: numONull(k?.ces_prom),
        malas: num(k?.malas), malas_pendientes: num(k?.malas_pendientes), comentarios: num(k?.comentarios),
    };
};

/** Ventas validas (registro_pago estado 0) por sede en el rango. */
const contarVentas = async (sedes: number[], r: Rango): Promise<Map<number, number>> => {
    const filas = await prisma.$queryRaw<any[]>`
        SELECT idsede, COUNT(*) AS ventas FROM registro_pago
        WHERE idsede IN (${Prisma.join(sedes)}) AND estado = 0
          AND fecha_hora >= ${r.inicio + ' 00:00:00'} AND fecha_hora < DATE_ADD(${r.fin}, INTERVAL 1 DAY)
        GROUP BY idsede`;
    return new Map(filas.map((f) => [Number(f.idsede), num(f.ventas)]));
};

export const tablero = async (idsede: number, r: Rango) => {
    const anterior = rangoAnterior(r);
    const [activas] = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS n FROM enc_publicacion WHERE idsede = ${idsede} AND activa = 1`;

    const [k, kAnt, tendencia, canales, preguntas, opciones, distribucion, mozos, horas, ventas] = await Promise.all([
        kpis(idsede, r),
        kpis(idsede, anterior),
        prisma.$queryRaw<any[]>`
            SELECT DATE_FORMAT(r.fecha_local, '%Y-%m-%d') AS fecha, COUNT(*) AS respuestas,
                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,
                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas
            FROM enc_respuesta r WHERE ${filtroRespuestas([idsede], r)}
            GROUP BY r.fecha_local ORDER BY r.fecha_local`,
        prisma.$queryRaw<any[]>`
            SELECT r.canal, COUNT(*) AS respuestas, SUM(r.idregistro_pago IS NOT NULL) AS con_venta,
                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,
                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas
            FROM enc_respuesta r WHERE ${filtroRespuestas([idsede], r)}
            GROUP BY r.canal`,
        prisma.$queryRaw<any[]>`
            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS texto, d.tipo, COUNT(*) AS respuestas, AVG(d.valor_num) AS promedio,
                   SUM(CASE WHEN (d.tipo = 'csat' AND d.valor_num <= 2) OR (d.tipo = 'nps' AND d.valor_num <= 6) OR (d.tipo = 'ces' AND d.valor_num <= 3) THEN 1 ELSE 0 END) AS bajas
            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta
            WHERE ${filtroRespuestas([idsede], r)} AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL
            GROUP BY d.tipo, d.pregunta_texto`, // por texto: la misma pregunta en varias versiones de la encuesta suma junta
        prisma.$queryRaw<any[]>`
            SELECT MIN(d.idenc_pregunta) AS idenc_pregunta, d.pregunta_texto AS pregunta, d.valor_texto AS opcion, COUNT(*) AS cantidad
            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta
            WHERE ${filtroRespuestas([idsede], r)} AND d.tipo = 'opcion' AND d.valor_texto IS NOT NULL
            GROUP BY d.pregunta_texto, d.valor_texto ORDER BY d.pregunta_texto, cantidad DESC`,
        // cuantas veces se dio cada nota de cada escala: para el grafico de distribucion
        prisma.$queryRaw<any[]>`
            SELECT d.tipo, d.valor_num AS valor, COUNT(*) AS cantidad
            FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta
            WHERE ${filtroRespuestas([idsede], r)} AND d.tipo IN ('csat', 'nps', 'ces') AND d.valor_num IS NOT NULL
            GROUP BY d.tipo, d.valor_num ORDER BY d.tipo, d.valor_num`,
        prisma.$queryRaw<any[]>`
            SELECT r.idusuario_atendio AS idusuario, MAX(u.nombres) AS nombre, COUNT(*) AS respuestas,
                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,
                   AVG(r.csat_prom) AS csat_prom, SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas
            FROM enc_respuesta r LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio
            WHERE ${filtroRespuestas([idsede], r)} AND r.idusuario_atendio IS NOT NULL
            GROUP BY r.idusuario_atendio`,
        prisma.$queryRaw<any[]>`
            SELECT DAYOFWEEK(r.respondido_en) AS dow, HOUR(r.respondido_en) AS hora, COUNT(*) AS respuestas,
                   SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas
            FROM enc_respuesta r WHERE ${filtroRespuestas([idsede], r)}
            GROUP BY dow, hora`,
        contarVentas([idsede], r),
    ]);

    const totalVentas = ventas.get(idsede) ?? 0;
    return {
        hay_activas: num(activas?.n) > 0,
        rango: r,
        rango_anterior: anterior,
        kpis: k,
        kpis_anterior: kAnt,
        tendencia: tendencia.map((t) => ({
            fecha: String(t.fecha), respuestas: num(t.respuestas),
            nps: calcularNps(num(t.promotores), num(t.detractores), num(t.con_nps)),
            csat_prom: numONull(t.csat_prom), malas: num(t.malas),
        })),
        canales: canales.map((c) => ({
            canal: c.canal as Canal, respuestas: num(c.respuestas),
            nps: calcularNps(num(c.promotores), num(c.detractores), num(c.con_nps)),
            csat_prom: numONull(c.csat_prom), malas: num(c.malas),
            // solo comprobante y WhatsApp estan ligados a una venta; tablet y QR fijo no tienen denominador real
            tasa_respuesta: c.canal === 'ticket' || c.canal === 'whatsapp' ? tasa(num(c.con_venta), totalVentas) : null,
        })),
        preguntas: preguntas
            .map((p) => {
                const tipo = p.tipo as 'csat' | 'nps' | 'ces';
                const promedio = numONull(p.promedio) ?? 0;
                const respuestas = num(p.respuestas);
                return {
                    idenc_pregunta: Number(p.idenc_pregunta), texto: String(p.texto), tipo, respuestas, promedio,
                    escala_min: ESCALA[tipo][0], escala_max: ESCALA[tipo][1],
                    puntaje_100: puntaje100(tipo, promedio),
                    pct_bajo: respuestas ? Math.round((num(p.bajas) * 1000) / respuestas) / 10 : 0,
                };
            })
            .sort((a, b) => a.puntaje_100 - b.puntaje_100),
        distribucion: distribucion.map((d) => ({ tipo: d.tipo as 'csat' | 'nps' | 'ces', valor: Number(d.valor), cantidad: num(d.cantidad) })),
        // el front agrupa por idenc_pregunta: una sola id por texto, aunque cada opcion venga de otra version
        opciones: opciones.map((o) => ({
            idenc_pregunta: Math.min(...opciones.filter((x) => x.pregunta === o.pregunta).map((x) => Number(x.idenc_pregunta))), pregunta: String(o.pregunta), opcion: String(o.opcion), cantidad: num(o.cantidad),
        })),
        mozos: mozos
            .map((m) => ({
                idusuario: Number(m.idusuario), nombre: m.nombre ? String(m.nombre) : `Usuario ${m.idusuario}`,
                respuestas: num(m.respuestas),
                nps: calcularNps(num(m.promotores), num(m.detractores), num(m.con_nps)),
                csat_prom: numONull(m.csat_prom), malas: num(m.malas),
            }))
            .sort((a, b) => (a.csat_prom ?? 99) - (b.csat_prom ?? 99)),
        horas: horas.map((h) => ({ dia_semana: diaSemanaLunes(num(h.dow)), hora: num(h.hora), respuestas: num(h.respuestas), malas: num(h.malas) })),
    };
};

export const alertas = async (idsede: number, r: Rango, estado: 'pendientes' | 'atendidas' | 'todas') => {
    const filtroEstado = estado === 'pendientes' ? Prisma.sql`AND g.idenc_respuesta IS NULL`
        : estado === 'atendidas' ? Prisma.sql`AND g.idenc_respuesta IS NOT NULL` : Prisma.empty;
    const filas = await prisma.$queryRaw<any[]>`
        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,
               s.nombre AS sede, e.nombre AS encuesta, r.csat_prom, r.nps_valor, r.ces_valor,
               r.nummesa, u.nombres AS mozo, r.total_pedido,
               g.nota, DATE_FORMAT(g.atendida_en, '%Y-%m-%d %H:%i:%s') AS atendida_en, ua.nombres AS atendida_por
        FROM enc_respuesta r
        JOIN sede s ON s.idsede = r.idsede
        JOIN enc_encuesta e ON e.idenc_encuesta = r.idenc_encuesta
        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio
        LEFT JOIN enc_alerta_gestion g ON g.idenc_respuesta = r.idenc_respuesta
        LEFT JOIN usuario ua ON ua.idusuario = g.idusuario
        WHERE ${filtroRespuestas([idsede], r)} AND ${SQL_MALA} ${filtroEstado}
        ORDER BY r.respondido_en DESC
        LIMIT 500`;
    if (!filas.length) return [];

    const ids = filas.map((f) => Number(f.id));
    const detalles = await prisma.$queryRaw<any[]>`
        SELECT idenc_respuesta, pregunta_texto, tipo, valor_num, valor_texto
        FROM enc_respuesta_detalle WHERE idenc_respuesta IN (${Prisma.join(ids)}) ORDER BY idenc_respuesta, orden`;
    const porRespuesta = new Map<number, any[]>();
    for (const d of detalles) {
        const k = Number(d.idenc_respuesta);
        if (!porRespuesta.has(k)) porRespuesta.set(k, []);
        porRespuesta.get(k)!.push(d);
    }

    return filas
        .map((f) => {
            const csat = numONull(f.csat_prom), nps = f.nps_valor === null ? null : num(f.nps_valor), ces = f.ces_valor === null ? null : num(f.ces_valor);
            const det = porRespuesta.get(Number(f.id)) ?? [];
            const comentario = det.find((d) => d.tipo === 'texto' && d.valor_texto)?.valor_texto ?? null;
            return {
                id: Number(f.id), respondido_en: String(f.respondido_en), canal: f.canal as Canal,
                sede: String(f.sede), encuesta: String(f.encuesta),
                csat_prom: csat, nps_valor: nps, ces_valor: ces,
                motivos: motivosMala(csat, nps, ces), severidad: severidad(csat, nps, ces),
                comentario, nummesa: f.nummesa ?? null, mozo: f.mozo ?? null,
                total_pedido: f.total_pedido === null ? null : Number(f.total_pedido),
                detalle: det.map((d) => ({ pregunta: String(d.pregunta_texto), tipo: String(d.tipo), valor_num: d.valor_num === null ? null : num(d.valor_num), valor_texto: d.valor_texto ?? null })),
                atencion: f.atendida_en ? { por: f.atendida_por ? String(f.atendida_por) : '', nota: String(f.nota), en: String(f.atendida_en) } : null,
            };
        })
        .sort((a, b) => b.severidad - a.severidad || (a.respondido_en < b.respondido_en ? 1 : -1))
        .slice(0, 200);
};

/** Sede de una respuesta (para validar que el usuario puede atenderla). */
export const sedeDeRespuesta = async (id: number): Promise<number | null> => {
    const [f] = await prisma.$queryRaw<any[]>`SELECT idsede FROM enc_respuesta WHERE idenc_respuesta = ${id}`;
    return f ? Number(f.idsede) : null;
};

export const atender = async (id: number, idusuario: number, nota: string) => {
    const { fechaHora } = horaLima();
    try {
        await prisma.$executeRaw`
            INSERT INTO enc_alerta_gestion (idenc_respuesta, idusuario, nota, atendida_en) VALUES (${id}, ${idusuario}, ${nota}, ${fechaHora})`;
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && /Duplicate entry|PRIMARY/.test(e.message)) {
            throw new ErrorDash(409, 'Esta mala experiencia ya fue atendida.');
        }
        throw e;
    }
    const [u] = await prisma.$queryRaw<any[]>`SELECT nombres FROM usuario WHERE idusuario = ${idusuario}`;
    return { por: u?.nombres ? String(u.nombres) : '', nota, en: fechaHora };
};

export const POR_PAGINA = 10;

export const comentarios = async (idsede: number, r: Rango, filtro: 'malos' | 'buenos' | 'todos', pagina: number) => {
    const f = filtro === 'malos' ? Prisma.sql`AND ${SQL_MALA}`
        : filtro === 'buenos' ? Prisma.sql`AND NOT ${SQL_MALA} AND (COALESCE(r.csat_prom >= 4, 0) OR COALESCE(r.nps_valor >= 9, 0))`
        : Prisma.empty;
    const base = Prisma.sql`
        FROM enc_respuesta_detalle d JOIN enc_respuesta r ON r.idenc_respuesta = d.idenc_respuesta
        LEFT JOIN usuario u ON u.idusuario = r.idusuario_atendio
        WHERE ${filtroRespuestas([idsede], r)} AND d.tipo = 'texto' AND d.valor_texto IS NOT NULL AND d.valor_texto <> '' ${f}`;
    const [{ total }] = await prisma.$queryRaw<any[]>`SELECT COUNT(*) AS total ${base}`;
    const offset = (pagina - 1) * POR_PAGINA;
    const items = await prisma.$queryRaw<any[]>`
        SELECT r.idenc_respuesta AS id, DATE_FORMAT(r.respondido_en, '%Y-%m-%d %H:%i:%s') AS respondido_en, r.canal,
               d.pregunta_texto AS pregunta, d.valor_texto AS comentario, ${SQL_MALA} AS mala,
               r.csat_prom, r.nps_valor, r.nummesa, u.nombres AS mozo
        ${base}
        ORDER BY r.respondido_en DESC
        LIMIT ${POR_PAGINA} OFFSET ${offset}`;
    return {
        total: num(total), pagina, por_pagina: POR_PAGINA,
        items: items.map((i) => ({
            id: Number(i.id), respondido_en: String(i.respondido_en), canal: i.canal as Canal,
            pregunta: String(i.pregunta), comentario: String(i.comentario), mala: num(i.mala) === 1,
            csat_prom: numONull(i.csat_prom), nps_valor: i.nps_valor === null ? null : num(i.nps_valor),
            nummesa: i.nummesa ?? null, mozo: i.mozo ?? null,
        })),
    };
};

export const locales = async (sedes: { idsede: number; nombre: string }[], r: Rango) => {
    const ids = sedes.map((s) => s.idsede);
    const [filas, ventas] = await Promise.all([
        prisma.$queryRaw<any[]>`
            SELECT r.idsede, COUNT(*) AS respuestas,
                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,
                   AVG(r.csat_prom) AS csat_prom, AVG(r.ces_valor) AS ces_prom, SUM(CASE WHEN ${SQL_MALA} THEN 1 ELSE 0 END) AS malas
            FROM enc_respuesta r WHERE ${filtroRespuestas(ids, r)}
            GROUP BY r.idsede`,
        contarVentas(ids, r),
    ]);
    const porSede = new Map(filas.map((f) => [Number(f.idsede), f]));
    return sedes.map((s) => {
        const f = porSede.get(s.idsede);
        const respuestas = num(f?.respuestas);
        const v = ventas.get(s.idsede) ?? 0;
        return {
            idsede: s.idsede, nombre: s.nombre, respuestas, ventas: v, tasa_respuesta: tasa(respuestas, v),
            nps: calcularNps(num(f?.promotores), num(f?.detractores), num(f?.con_nps)),
            csat_prom: numONull(f?.csat_prom), ces_prom: numONull(f?.ces_prom), malas: num(f?.malas),
            pct_malas: respuestas ? Math.round((num(f?.malas) * 1000) / respuestas) / 10 : null,
        };
    });
};

export const encuestas = async (idorg: number, sedes: number[], idsede: number | null) => {
    const sedesStats = idsede ? [idsede] : sedes;
    const [lista, stats, pubs, raicesVivas] = await Promise.all([
        prisma.$queryRaw<any[]>`
            SELECT e.idenc_encuesta AS id, e.idenc_raiz AS id_raiz, e.version, e.nombre, e.estado,
                   DATE_FORMAT(e.creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en,
                   (SELECT COUNT(*) FROM enc_pregunta p WHERE p.idenc_encuesta = e.idenc_encuesta) AS preguntas
            FROM enc_encuesta e WHERE e.idorg = ${idorg} ORDER BY e.creado_en DESC`,
        prisma.$queryRaw<any[]>`
            SELECT r.idenc_encuesta, COUNT(*) AS respuestas,
                   SUM(r.nps_valor IS NOT NULL) AS con_nps, SUM(r.nps_cat = 'promotor') AS promotores, SUM(r.nps_cat = 'detractor') AS detractores,
                   AVG(r.csat_prom) AS csat_prom, DATE_FORMAT(MAX(r.respondido_en), '%Y-%m-%d %H:%i:%s') AS ultima
            FROM enc_respuesta r WHERE r.idorg = ${idorg} AND r.idsede IN (${Prisma.join(sedesStats)})
            GROUP BY r.idenc_encuesta`,
        prisma.$queryRaw<any[]>`
            SELECT p.idenc_encuesta, p.canal, s.nombre AS sede
            FROM enc_publicacion p JOIN sede s ON s.idsede = p.idsede
            WHERE p.idorg = ${idorg} AND p.activa = 1 AND p.idsede IN (${Prisma.join(sedes)})
            ORDER BY p.canal, s.nombre`,
        prisma.$queryRaw<any[]>`
            SELECT DISTINCT idenc_raiz FROM enc_encuesta WHERE idorg = ${idorg} AND estado <> 'archivada'`,
    ]);
    const statsPor = new Map(stats.map((s) => [Number(s.idenc_encuesta), s]));
    const pubsPor = new Map<number, { canal: Canal; sede: string }[]>();
    for (const p of pubs) {
        const k = Number(p.idenc_encuesta);
        if (!pubsPor.has(k)) pubsPor.set(k, []);
        pubsPor.get(k)!.push({ canal: p.canal as Canal, sede: String(p.sede) });
    }
    const vivas = new Set(raicesVivas.map((x) => Number(x.idenc_raiz)));

    const activas: any[] = [], historial: any[] = [], archivadas: any[] = [];
    const ultimaArchivadaPorRaiz = new Set<number>();
    for (const e of lista) {
        const id = Number(e.id), raiz = Number(e.id_raiz);
        const s = statsPor.get(id);
        const item = {
            id, id_raiz: raiz, version: num(e.version), nombre: String(e.nombre), estado: e.estado,
            creado_en: String(e.creado_en), preguntas: num(e.preguntas), respuestas: num(s?.respuestas),
            nps: calcularNps(num(s?.promotores), num(s?.detractores), num(s?.con_nps)),
            csat_prom: numONull(s?.csat_prom), ultima_respuesta: s?.ultima ? String(s.ultima) : null,
            publicaciones: pubsPor.get(id) ?? [],
        };
        if (e.estado !== 'archivada') activas.push(item);
        else if (vivas.has(raiz)) { if (item.respuestas > 0) historial.push(item); }
        // raiz sin versiones vivas: solo se muestra su version mas reciente (lista viene por creado_en desc)
        else if (!ultimaArchivadaPorRaiz.has(raiz)) { ultimaArchivadaPorRaiz.add(raiz); archivadas.push(item); }
    }
    return { activas, historial, archivadas };
};
