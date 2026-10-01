import { PrismaClient } from '@prisma/client';
import { redondear } from './agregados';

const prisma = new PrismaClient();

/**
 * Metas de venta por sede.
 *
 * `sede_meta` guarda diaria, mensual y anual. No todas las sedes tienen meta
 * cargada, y eso no es un error: hay locales que no trabajan con objetivos. Se
 * informa como "sin meta" en vez de inventar una.
 */

export interface MetaSede {
    diaria: number;
    mensual: number;
    anual: number;
}

function aNumero(v: unknown): number {
    const n = parseFloat(String(v ?? '0').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export async function metaDeSede(idsede: number): Promise<MetaSede | null> {
    const filas: any = await prisma.$queryRaw`
        SELECT diaria, mensual, anual FROM sede_meta
        WHERE idsede = ${idsede} AND estado = 0 LIMIT 1`;

    const m = filas?.[0];
    if (!m) return null;

    const meta = {
        diaria: aNumero(m.diaria),
        mensual: aNumero(m.mensual),
        anual: aNumero(m.anual)
    };
    // Una fila con todo en cero es lo mismo que no tener meta.
    return meta.diaria || meta.mensual || meta.anual ? meta : null;
}

export interface MetaDeSede extends MetaSede {
    idsede: number;
    nombre: string;
    /** false = la sede nunca tuvo meta cargada. */
    tieneMeta: boolean;
}

/** Metas de varias sedes, incluidas las que no tienen ninguna. */
export async function listarMetas(idsedes: number[]): Promise<MetaDeSede[]> {
    if (idsedes.length === 0) return [];

    const ids = idsedes.filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return [];

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT s.idsede, s.nombre, m.diaria, m.mensual, m.anual
         FROM sede s
         LEFT JOIN sede_meta m ON m.idsede = s.idsede AND m.estado = 0
         WHERE s.idsede IN (${ids.join(',')})
         ORDER BY s.nombre`
    );

    return filas.map((f: any) => ({
        idsede: Number(f.idsede),
        nombre: String(f.nombre ?? ''),
        diaria: aNumero(f.diaria),
        mensual: aNumero(f.mensual),
        anual: aNumero(f.anual),
        tieneMeta: f.diaria !== null || f.mensual !== null || f.anual !== null
    }));
}

/**
 * Crea o actualiza la meta de una sede.
 *
 * Quien llama DEBE haber comprobado que la sede es del usuario: aqui solo se
 * valida la forma de los datos, no el permiso.
 */
export async function guardarMeta(
    idsede: number,
    idorg: number,
    meta: { diaria: number; mensual: number; anual: number }
): Promise<MetaSede> {
    const valores = {
        diaria: Math.max(0, Number(meta.diaria) || 0),
        mensual: Math.max(0, Number(meta.mensual) || 0),
        anual: Math.max(0, Number(meta.anual) || 0)
    };

    const existentes: any = await prisma.$queryRaw`
        SELECT idsede_meta FROM sede_meta WHERE idsede = ${idsede} AND estado = 0 LIMIT 1`;

    const hoy = new Date().toISOString().slice(0, 10);

    if (existentes?.[0]) {
        await prisma.$executeRaw`
            UPDATE sede_meta
            SET diaria = ${String(valores.diaria)},
                mensual = ${String(valores.mensual)},
                anual = ${String(valores.anual)},
                fecha = ${hoy}
            WHERE idsede_meta = ${Number(existentes[0].idsede_meta)}`;
    } else {
        await prisma.$executeRaw`
            INSERT INTO sede_meta (idorg, idsede, diaria, mensual, anual, fecha, estado)
            VALUES (${idorg}, ${idsede}, ${String(valores.diaria)},
                    ${String(valores.mensual)}, ${String(valores.anual)}, ${hoy}, 0)`;
    }

    return valores;
}

function diasDelMes(ano: number, mes: number): number {
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function esMesCompleto(desde: string, hasta: string): boolean {
    const [a1, m1, d1] = desde.split('-').map(Number);
    const [a2, m2, d2] = hasta.split('-').map(Number);
    return a1 === a2 && m1 === m2 && d1 === 1 && d2 === diasDelMes(a1, m1);
}

function esAnoCompleto(desde: string, hasta: string): boolean {
    return desde.endsWith('-01-01') && hasta.endsWith('-12-31') && desde.slice(0, 4) === hasta.slice(0, 4);
}

function diasEntre(desde: string, hasta: string): number {
    const a = Date.parse(desde + 'T00:00:00Z');
    const b = Date.parse(hasta + 'T00:00:00Z');
    return Math.round((b - a) / 86400000) + 1;
}

export interface AvanceMeta {
    /** Meta que aplica al periodo consultado. */
    meta: number;
    /** De donde sale: la mensual, la anual, o diaria x dias. */
    origen: 'mensual' | 'anual' | 'diaria_por_dias';
    vendido: number;
    avancePct: number;
    faltante: number;
    /** Solo si el periodo esta en curso. */
    proyeccion: number | null;
    proyeccionPct: number | null;
    diasTranscurridos: number;
    diasTotales: number;
    enCurso: boolean;
}

/**
 * Avance contra la meta del periodo.
 *
 * La meta de un rango arbitrario sale de la diaria por los dias; solo si el
 * rango es exactamente un mes o un ano naturales se usan la mensual o la anual,
 * que el negocio puede haber fijado sin que cuadren con diaria x 30.
 *
 * La proyeccion es lineal sobre lo que va del periodo. Es una regla de tres, no
 * un modelo: sirve para "vas corto" o "vas holgado", no para decidir un credito.
 */
export function avanceDeMeta(
    meta: MetaSede,
    vendido: number,
    desde: string,
    hasta: string,
    hoyISO: string
): AvanceMeta {
    const diasTotales = Math.max(1, diasEntre(desde, hasta));

    let objetivo: number;
    let origen: AvanceMeta['origen'];
    if (esAnoCompleto(desde, hasta) && meta.anual) {
        objetivo = meta.anual;
        origen = 'anual';
    } else if (esMesCompleto(desde, hasta) && meta.mensual) {
        objetivo = meta.mensual;
        origen = 'mensual';
    } else {
        objetivo = meta.diaria * diasTotales;
        origen = 'diaria_por_dias';
    }

    const enCurso = hoyISO >= desde && hoyISO <= hasta;
    const diasTranscurridos = enCurso ? Math.max(1, diasEntre(desde, hoyISO)) : diasTotales;

    const proyeccion = enCurso ? redondear((vendido / diasTranscurridos) * diasTotales) : null;

    return {
        meta: redondear(objetivo),
        origen,
        vendido: redondear(vendido),
        avancePct: objetivo ? redondear((vendido / objetivo) * 100) : 0,
        faltante: redondear(Math.max(objetivo - vendido, 0)),
        proyeccion,
        proyeccionPct: proyeccion && objetivo ? redondear((proyeccion / objetivo) * 100) : null,
        diasTranscurridos,
        diasTotales,
        enCurso
    };
}
