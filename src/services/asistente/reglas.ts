import { PrismaClient } from '@prisma/client';
import { ErrorValidacion } from '../dash/errores';
import { redondear, resumenVentas, FilaVenta } from '../dash/agregados';
import { avanceDeMeta, metaDeSede } from '../dash/metas';
import { alertasOperativas } from '../dash/alertas';
import * as dashVentas from '../dash/ventas';

const prisma = new PrismaClient();

/**
 * Reglas de alerta: "avisame si pasa esto".
 *
 * Es lo que convierte al asistente de consultor en vigilante. El usuario lo
 * dicta en lenguaje natural, el modelo lo traduce a (tipo, umbral) y el usuario
 * confirma con un boton: el modelo NUNCA escribe en la base.
 *
 * El catalogo es cerrado a proposito. Una condicion de texto libre obligaria a
 * generar consultas, que es exactamente lo que esta arquitectura evita.
 */

export interface DefinicionRegla {
    tipo: string;
    etiqueta: string;
    /** Como se lee el umbral, para construir la descripcion. */
    unidad: 'porcentaje' | 'soles' | 'cantidad';
    plantilla: (umbral: number) => string;
    /** Con que frecuencia tiene sentido evaluarla. */
    periodo: 'dia' | 'mes';
}

export const CATALOGO: DefinicionRegla[] = [
    {
        tipo: 'meta_bajo_pct',
        etiqueta: 'Avance de meta por debajo de un porcentaje',
        unidad: 'porcentaje',
        plantilla: (u) => `Avisarme si el avance de meta del mes baja del ${u}%`,
        periodo: 'mes'
    },
    {
        tipo: 'ventas_dia_bajo',
        etiqueta: 'Venta del dia por debajo de un monto',
        unidad: 'soles',
        plantilla: (u) => `Avisarme si la venta del dia no llega a S/ ${u}`,
        periodo: 'dia'
    },
    {
        tipo: 'items_borrados',
        etiqueta: 'Demasiados items borrados en un dia',
        unidad: 'cantidad',
        plantilla: (u) => `Avisarme si se borran mas de ${u} items en un dia`,
        periodo: 'dia'
    },
    {
        tipo: 'anulaciones_monto',
        etiqueta: 'Anulaciones por encima de un monto',
        unidad: 'soles',
        plantilla: (u) => `Avisarme si las ventas anuladas del dia pasan de S/ ${u}`,
        periodo: 'dia'
    },
    {
        tipo: 'egresos_caja_monto',
        etiqueta: 'Salidas de caja por encima de un monto',
        unidad: 'soles',
        plantilla: (u) => `Avisarme si las salidas de caja del dia pasan de S/ ${u}`,
        periodo: 'dia'
    },
    {
        tipo: 'descuentos_monto',
        etiqueta: 'Descuentos por encima de un monto',
        unidad: 'soles',
        plantilla: (u) => `Avisarme si los descuentos del dia pasan de S/ ${u}`,
        periodo: 'dia'
    }
];

export function definicionDe(tipo: string): DefinicionRegla {
    const d = CATALOGO.find((c) => c.tipo === tipo);
    if (!d) throw new ErrorValidacion(`Tipo de alerta desconocido: ${tipo}`);
    return d;
}

export interface Regla {
    id: number;
    idsede: number;
    tipo: string;
    umbral: number;
    descripcion: string;
    activa: boolean;
    ultimoDisparo: string | null;
}

function aRegla(f: any): Regla {
    return {
        id: Number(f.id),
        idsede: Number(f.idsede),
        tipo: String(f.tipo),
        umbral: Number(f.umbral),
        descripcion: String(f.descripcion),
        activa: Number(f.activa) === 1,
        ultimoDisparo: f.ultimo_disparo ? String(f.ultimo_disparo).slice(0, 10) : null
    };
}

export async function listarReglas(idsedes: number[]): Promise<Regla[]> {
    const ids = idsedes.filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return [];

    const filas: any = await prisma.$queryRawUnsafe(
        `SELECT id, idsede, tipo, umbral, descripcion, activa, ultimo_disparo
         FROM asistente_regla_alerta
         WHERE idsede IN (${ids.join(',')})
         ORDER BY activa DESC, id DESC`
    );
    return (filas ?? []).map(aRegla);
}

/** Quien llama debe haber comprobado que la sede es del usuario. */
export async function crearRegla(
    idorg: number,
    idsede: number,
    idusuario: number,
    tipo: string,
    umbral: number
): Promise<Regla> {
    const def = definicionDe(tipo);
    const valor = Number(umbral);
    if (!Number.isFinite(valor) || valor <= 0) {
        throw new ErrorValidacion('El umbral debe ser un numero mayor que cero');
    }
    if (def.unidad === 'porcentaje' && valor > 100) {
        throw new ErrorValidacion('Un porcentaje no puede pasar de 100');
    }

    const descripcion = def.plantilla(valor);
    const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await prisma.$executeRaw`
        INSERT INTO asistente_regla_alerta
            (idorg, idsede, idusuario, tipo, umbral, descripcion, activa, creado_en)
        VALUES (${idorg}, ${idsede}, ${idusuario}, ${tipo}, ${valor}, ${descripcion}, 1, ${ahora})`;

    const filas: any = await prisma.$queryRaw`
        SELECT id, idsede, tipo, umbral, descripcion, activa, ultimo_disparo
        FROM asistente_regla_alerta WHERE idsede = ${idsede} ORDER BY id DESC LIMIT 1`;
    return aRegla(filas[0]);
}

export async function borrarRegla(id: number, idsedes: number[]): Promise<boolean> {
    const ids = idsedes.filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return false;

    // El IN acota el borrado a las sedes del usuario: no se borra lo ajeno.
    const borradas: any = await prisma.$executeRawUnsafe(
        `DELETE FROM asistente_regla_alerta WHERE id = ${Number(id)} AND idsede IN (${ids.join(',')})`
    );
    return Number(borradas) > 0;
}

// =============================================================================
// Evaluacion
// =============================================================================

export interface ReglaDisparada {
    regla: Regla;
    valorActual: number;
    mensaje: string;
}

function rango(desde: string, hasta: string) {
    return { periodo: 'rango', rango_start_date: desde, rango_end_date: hasta };
}

function primerDiaDelMes(fecha: string): string {
    return `${fecha.slice(0, 7)}-01`;
}

/**
 * Evalua una regla y devuelve el disparo si corresponde.
 * Null significa "todo en orden", que es el caso normal y no se notifica.
 */
async function evaluar(regla: Regla, fecha: string): Promise<ReglaDisparada | null> {
    const def = definicionDe(regla.tipo);

    if (regla.tipo === 'meta_bajo_pct') {
        const meta = await metaDeSede(regla.idsede);
        if (!meta) return null;

        const desde = primerDiaDelMes(fecha);
        const filas = (await dashVentas.ventasTotal(
            regla.idsede,
            rango(desde, fecha)
        )) as unknown as FilaVenta[];

        const avance = avanceDeMeta(meta, resumenVentas(filas).total, desde, fecha, fecha);
        if (avance.avancePct >= regla.umbral) return null;

        return {
            regla,
            valorActual: avance.avancePct,
            mensaje: `Vas en ${avance.avancePct}% de la meta del mes (S/ ${avance.vendido} de S/ ${avance.meta}).`
        };
    }

    if (regla.tipo === 'ventas_dia_bajo') {
        const filas = (await dashVentas.ventasTotal(
            regla.idsede,
            rango(fecha, fecha)
        )) as unknown as FilaVenta[];
        const total = resumenVentas(filas).total;
        if (total >= regla.umbral) return null;

        return {
            regla,
            valorActual: total,
            mensaje: `La venta del dia fue S/ ${total}, por debajo de los S/ ${regla.umbral} que pediste vigilar.`
        };
    }

    // Los demas salen todos del mismo bloque de alertas operativas.
    const datos = await alertasOperativas([regla.idsede], fecha, fecha, fecha, fecha);
    const porTipo: Record<string, string> = {
        items_borrados: 'items_borrados',
        anulaciones_monto: 'ventas_anuladas',
        egresos_caja_monto: 'egresos_caja',
        descuentos_monto: 'descuentos'
    };

    const indicador = datos.indicadores.find((i) => i.clave === porTipo[regla.tipo]);
    if (!indicador) return null;

    const valor = def.unidad === 'cantidad' ? indicador.cantidad : indicador.monto;
    if (valor <= regla.umbral) return null;

    const comoTexto = def.unidad === 'cantidad' ? `${valor}` : `S/ ${redondear(valor)}`;
    return {
        regla,
        valorActual: valor,
        mensaje: `${indicador.etiqueta}: ${comoTexto} hoy, por encima del limite que pusiste.`
    };
}

/** Evalua todas las reglas activas de una sede para una fecha. */
export async function evaluarSede(idsede: number, fecha: string): Promise<ReglaDisparada[]> {
    const reglas = (await listarReglas([idsede])).filter(
        (r) => r.activa && r.ultimoDisparo !== fecha
    );

    const disparadas: ReglaDisparada[] = [];
    for (const regla of reglas) {
        try {
            const d = await evaluar(regla, fecha);
            if (d) disparadas.push(d);
        } catch (err) {
            console.error(`[reglas] regla ${regla.id}:`, err);
        }
    }
    return disparadas;
}

export async function marcarDisparada(id: number, fecha: string): Promise<void> {
    await prisma.$executeRaw`
        UPDATE asistente_regla_alerta SET ultimo_disparo = ${fecha} WHERE id = ${id}`;
}
