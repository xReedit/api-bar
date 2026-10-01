import { PrismaClient } from '@prisma/client';
import {
    normalizeResponseDashClientes,
    normalizeResponseDashCompras,
    normalizeResponseDashUsuarios,
    normalizeResponseDashPuntoEquilibrio,
    normalizeResponseDashPromocionesCupones
} from '../dash.util';
import { limitarRangoFechasDashboard } from '../../utils/utils';
import { ErrorValidacion } from './errores';

const prisma = new PrismaClient();

/**
 * Modulos del dashboard que comparten la misma forma de consulta:
 * SET de variables de sesion + CALL al procedure + normalizador por tipo.
 *
 * Se escriben una vez y se parametrizan, en vez de copiar el mismo bloque cinco
 * veces. Cada controlador seguira teniendo su endpoint; esto es lo que ambos
 * (endpoint y herramienta del asistente) llaman por dentro.
 */

type Normalizador = (datos: any, tipo: string) => unknown;

interface Modulo {
    procedimiento: string;
    normalizador: Normalizador;
    tipos: readonly string[];
}

export const MODULOS = {
    clientes: {
        procedimiento: 'procedure_module_dash_clientes',
        normalizador: normalizeResponseDashClientes,
        tipos: ['resumen', 'listado', 'segmentacion', 'creditos_pendientes']
    },
    compras: {
        procedimiento: 'procedure_module_dash_compras',
        normalizador: normalizeResponseDashCompras,
        tipos: [
            'resumen',
            'listado',
            'listado_proveedores',
            'top_productos',
            'evolucion_diaria',
            'detalle_compra',
            'proveedores_activos'
        ]
    },
    usuarios: {
        procedimiento: 'procedure_module_dash_usuarios',
        normalizador: normalizeResponseDashUsuarios,
        tipos: [
            'resumen',
            'usuarios_caja',
            'usuarios_meseros',
            'distribucion_roles',
            'top_vendedores_caja',
            'top_meseros',
            'evolucion_diaria_caja',
            'evolucion_diaria_meseros',
            'comparativa_usuarios',
            'bajo_rendimiento',
            'listado_completo'
        ]
    },
    puntoEquilibrio: {
        procedimiento: 'module_dash_punto_equilibrio',
        normalizador: normalizeResponseDashPuntoEquilibrio,
        tipos: [
            'resumen',
            'evolucion_mensual',
            'resumen_categorias',
            'detalle_gastos_fijos',
            'detalle_gastos_variables',
            'ingresos_diarios'
        ]
    },
    promociones: {
        procedimiento: 'procedure_dash_promociones_cupones',
        normalizador: normalizeResponseDashPromocionesCupones,
        tipos: ['cupones', 'promociones', 'promociones_detalle', 'descuentos', 'all']
    }
} as const satisfies Record<string, Modulo>;

export type NombreModulo = keyof typeof MODULOS;

function exigirEnteroPositivo(valor: unknown, campo: string): number {
    const n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) throw new ErrorValidacion(`${campo} invalido`);
    return n;
}

function exigirFechaISO(valor: unknown, campo: string): string {
    const f = String(valor ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        throw new ErrorValidacion(`${campo} debe tener formato YYYY-MM-DD`);
    }
    return f;
}

export async function consultarModulo(
    modulo: NombreModulo,
    idsede: unknown,
    tipoConsulta: string,
    desde: string,
    hasta: string
): Promise<unknown> {
    const def = MODULOS[modulo];
    const sede = exigirEnteroPositivo(idsede, 'idsede');

    // Lista blanca: el tipo entra concatenado al SQL.
    if (!(def.tipos as readonly string[]).includes(tipoConsulta)) {
        throw new ErrorValidacion(`tipo_consulta invalido para ${modulo}: ${tipoConsulta}`);
    }

    const fechas = limitarRangoFechasDashboard(desde, hasta);
    const inicio = exigirFechaISO(fechas.fecha_inicio, 'desde');
    const fin = exigirFechaISO(fechas.fecha_fin, 'hasta');

    const resultados: any = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET @xidsede = ${sede}`);
        await tx.$executeRawUnsafe(`SET @tipo_consulta = '${tipoConsulta}'`);
        await tx.$executeRawUnsafe(`SET @fecha_inicio = '${inicio}'`);
        await tx.$executeRawUnsafe(`SET @fecha_fin = '${fin}'`);
        return tx.$queryRawUnsafe(
            `CALL ${def.procedimiento}(@xidsede, @tipo_consulta, @fecha_inicio, @fecha_fin)`
        );
    });

    return def.normalizador(resultados, tipoConsulta);
}
