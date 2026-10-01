import { ContextoAsistente } from './tipos';
import { ErrorValidacion } from '../dash/errores';

/**
 * Resolucion de sedes: LA frontera de seguridad del asistente.
 *
 * El modelo puede pedir sedes por id o pedir "todas", pero lo que pida se
 * intersecta siempre contra las del token. Lo que no esta en el token no se
 * consulta ni se devuelve, sin importar como se formule la pregunta.
 */

export interface SedesResueltas {
    ids: number[];
    nombres: string[];
    /** Sedes que el modelo pidio y no le corresponden. Se informan, no se sirven. */
    descartadas: number[];
}

export function resolverSedes(
    pedidas: unknown,
    contexto: ContextoAsistente
): SedesResueltas {
    const permitidas = new Map(contexto.sedesPermitidas.map((s) => [s.idsede, s.nombre]));

    if (permitidas.size === 0) {
        throw new ErrorValidacion('El usuario no tiene sedes asignadas');
    }

    // Sin argumento: la sede de la pantalla, si el usuario la tiene.
    if (pedidas === undefined || pedidas === null) {
        const actual = permitidas.has(contexto.sedeActual)
            ? contexto.sedeActual
            : contexto.sedesPermitidas[0].idsede;
        return { ids: [actual], nombres: [permitidas.get(actual) as string], descartadas: [] };
    }

    if (pedidas === 'todas') {
        return {
            ids: Array.from(permitidas.keys()),
            nombres: Array.from(permitidas.values()),
            descartadas: []
        };
    }

    if (!Array.isArray(pedidas)) {
        throw new ErrorValidacion('sedes debe ser un array de ids o la palabra "todas"');
    }

    const ids: number[] = [];
    const nombres: string[] = [];
    const descartadas: number[] = [];

    for (const bruto of pedidas) {
        const id = Number(bruto);
        if (!Number.isInteger(id)) continue;
        if (permitidas.has(id)) {
            if (!ids.includes(id)) {
                ids.push(id);
                nombres.push(permitidas.get(id) as string);
            }
        } else {
            descartadas.push(id);
        }
    }

    if (ids.length === 0) {
        throw new ErrorValidacion('Ninguna de las sedes pedidas corresponde a este usuario');
    }

    return { ids, nombres, descartadas };
}

/** Catalogo que se inyecta en el prompt para que el modelo nombre las sedes. */
export function catalogoSedes(contexto: ContextoAsistente): string {
    return contexto.sedesPermitidas
        .map((s) => `- ${s.idsede}: ${s.nombre}${s.idsede === contexto.sedeActual ? ' (la que mira ahora)' : ''}`)
        .join('\n');
}
