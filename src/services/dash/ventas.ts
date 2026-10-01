import { PrismaClient } from '@prisma/client';
import {
    normalizeResponseDash,
    normalizeResponseDashVentasTotal,
    normalizeResponseCompararLocales
} from '../dash.util';
import { limitarRangoFechasDashboard } from '../../utils/utils';
import { ErrorValidacion } from './errores';

const prisma = new PrismaClient();

/**
 * Logica de dashboard de ventas, extraida de los route handlers.
 *
 * Existe para que el endpoint HTTP y las herramientas del asistente IA llamen
 * exactamente al mismo codigo. Dos caminos distintos hacia la misma cifra es
 * como se llega a que Ventas y Productos no cuadren (ver sql/MIGRACIONES_PROD.md).
 */

export interface PeriodoParams {
    periodo: string;
    rango_start_date?: string;
    rango_end_date?: string;
    [clave: string]: unknown;
}

/**
 * Las consultas se arman concatenando (`$executeRawUnsafe`), asi que todo id que
 * entre aqui se valida como entero antes de tocar el SQL. Es la unica barrera:
 * el asistente IA recibe parametros propuestos por un modelo.
 */
function exigirEnteroPositivo(valor: unknown, campo: string): number {
    const n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) {
        throw new ErrorValidacion(`${campo} invalido`);
    }
    return n;
}

function exigirListaDeEnteros(valores: unknown, campo: string): number[] {
    if (!Array.isArray(valores) || valores.length === 0) {
        throw new ErrorValidacion(`${campo} debe ser un array con al menos un elemento`);
    }
    return valores.map((v, i) => exigirEnteroPositivo(v, `${campo}[${i}]`));
}

const PERIODOS_VALIDOS = ['hoy', 'dia', 'semana', 'mes', 'rango'] as const;

function exigirPeriodo(valor: unknown): string {
    const p = String(valor ?? 'dia');
    if (!PERIODOS_VALIDOS.includes(p as (typeof PERIODOS_VALIDOS)[number])) {
        throw new ErrorValidacion('periodo invalido');
    }
    return p;
}

/** Solo YYYY-MM-DD. Cualquier otra cosa no entra al SQL. */
function exigirFechaISO(valor: unknown, campo: string): string {
    const f = String(valor ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new ErrorValidacion(`${campo} debe tener formato YYYY-MM-DD`);
    }
    return f;
}

/**
 * El JSON de params viaja dentro de comillas simples en el SQL. Un apostrofo en
 * cualquier valor rompe la cadena y deja escribir SQL arbitrario, asi que se
 * escapan barra y comilla antes de concatenar.
 */
function jsonParaSql(params: unknown): string {
    return JSON.stringify(params)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

/** Total de ventas del periodo. Equivale a POST /dash-ventas/total */
export async function ventasTotal(idsede: unknown, params: PeriodoParams) {
    const sede = exigirEnteroPositivo(idsede, 'idsede');

    const ssql = `CALL procedure_module_dash_ventas(${sede}, '${jsonParaSql(params)}')`;
    const rpt: any = await prisma.$queryRawUnsafe(ssql);
    const sqlExec = rpt[0].f0;

    const rptExec: any = await prisma.$queryRawUnsafe(sqlExec);
    return normalizeResponseDashVentasTotal(rptExec);
}

/** Detalle de ventas del periodo. Equivale a POST /dash-ventas/ventas-detalle */
export async function ventasDetalle(idsede: unknown, params: PeriodoParams) {
    const sede = exigirEnteroPositivo(idsede, 'idsede');
    if (!params || !params.periodo) {
        throw new ErrorValidacion('Se requiere params.periodo');
    }

    // Las variables de sesion (@xidsede) viven en la conexion, por eso el SET y
    // el CALL van dentro de la misma transaccion.
    const ventas = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET @xidsede = ${sede}`);
        await tx.$executeRawUnsafe(`SET @periodo_params = '${jsonParaSql(params)}'`);
        return tx.$queryRawUnsafe(`CALL procedure_module_dash_pedidos_ventas(@xidsede, @periodo_params)`);
    });

    return normalizeResponseDash(ventas);
}

/** Meta de venta diaria de la sede. Equivale a POST /dash-ventas/meta-venta */
export async function metaVentaDiaria(idsede: unknown): Promise<number> {
    const sede = exigirEnteroPositivo(idsede, 'idsede');
    const rpt: any = await prisma.$queryRaw`select diaria from sede_meta where idsede = ${sede} and estado = '0'`;
    return rpt[0] ? rpt[0].diaria : 0;
}

/** Comparativa entre locales. Equivale a POST /dash-ventas/comparar-locales */
export async function compararLocales(sedes: unknown, params?: PeriodoParams) {
    const listaSedes = exigirListaDeEnteros(sedes, 'sedes');

    const tipoConsulta = exigirPeriodo(params?.periodo);
    const fechas = limitarRangoFechasDashboard(
        params?.rango_start_date || '',
        params?.rango_end_date || ''
    );
    const fechaInicio = exigirFechaISO(fechas.fecha_inicio, 'rango_start_date');
    const fechaFin = exigirFechaISO(fechas.fecha_fin, 'rango_end_date');

    const result: any = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET @sedes_json = '${JSON.stringify(listaSedes)}'`);
        await tx.$executeRawUnsafe(`SET @tipo_consulta = '${tipoConsulta}'`);
        await tx.$executeRawUnsafe(`SET @fecha_inicio = '${fechaInicio}'`);
        await tx.$executeRawUnsafe(`SET @fecha_fin = '${fechaFin}'`);
        return tx.$queryRawUnsafe(
            `CALL procedure_dash_comparar_locales(@sedes_json, @tipo_consulta, @fecha_inicio, @fecha_fin)`
        );
    });

    return normalizeResponseCompararLocales(result);
}
