import { PrismaClient } from '@prisma/client';
import { normalizeResponseDashProductos } from '../dash.util';
import { limitarRangoFechasDashboard } from '../../utils/utils';
import { ErrorValidacion } from './errores';

const prisma = new PrismaClient();

/**
 * Logica de dashboard de productos, extraida del route handler.
 * Mismo motivo que services/dash/ventas.ts: un solo camino hacia la cifra.
 */

/** Ramas que acepta procedure_module_dash_productos. */
const TIPOS_CONSULTA = [
    'resumen',
    'top_ventas_cantidad_carta',
    'top_ventas_cantidad_almacen',
    'productos_almacen_in_subitems',
    'list_nombre_producto_subitems',
    'top_ventas_porciones',
    'porciones_in_subitems',
    'list_nombre_porciones_subitems',
    'top_ventas_ingresos',
    'productos_baja_rotacion',
    'inventario_alertas',
    'inventario_alertas_porciones',
    'rentabilidad'
] as const;

export type TipoConsultaProductos = (typeof TIPOS_CONSULTA)[number];

export interface ParamsProductos {
    tipo_consulta: string;
    rango_start_date?: string;
    rango_end_date?: string;
}

function exigirEnteroPositivo(valor: unknown, campo: string): number {
    const n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) {
        throw new ErrorValidacion(`${campo} invalido`);
    }
    return n;
}

function exigirTipoConsulta(valor: unknown): string {
    const t = String(valor ?? '');
    if (!TIPOS_CONSULTA.includes(t as TipoConsultaProductos)) {
        throw new ErrorValidacion('tipo_consulta invalido');
    }
    return t;
}

function exigirFechaISO(valor: unknown, campo: string): string {
    const f = String(valor ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new ErrorValidacion(`${campo} debe tener formato YYYY-MM-DD`);
    }
    return f;
}

/** Equivale a POST /dash-producto-receta/get-dash-productos */
export async function dashProductos(idsede: unknown, params: ParamsProductos) {
    const sede = exigirEnteroPositivo(idsede, 'idsede');
    const tipoConsulta = exigirTipoConsulta(params?.tipo_consulta);

    const fechas = limitarRangoFechasDashboard(
        params?.rango_start_date as string,
        params?.rango_end_date as string
    );
    const fechaInicio = exigirFechaISO(fechas.fecha_inicio, 'rango_start_date');
    const fechaFin = exigirFechaISO(fechas.fecha_fin, 'rango_end_date');

    // Las variables de sesion viven en la conexion: SET y CALL en la misma transaccion.
    const resultados: any = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET @xidsede = ${sede}`);
        await tx.$executeRawUnsafe(`SET @tipo_consulta = '${tipoConsulta}'`);
        await tx.$executeRawUnsafe(`SET @fecha_inicio = '${fechaInicio}'`);
        await tx.$executeRawUnsafe(`SET @fecha_fin = '${fechaFin}'`);
        return tx.$queryRawUnsafe(
            `CALL procedure_module_dash_productos(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`
        );
    });

    return normalizeResponseDashProductos(resultados, tipoConsulta);
}
