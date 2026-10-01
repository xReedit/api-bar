import { Proveedor } from './tipos';
import { crearProveedorOpenAI } from './proveedores/openai';
import { crearProveedorAnthropic } from './proveedores/anthropic';

/**
 * Selector de proveedor. Se elige con IA_PROVEEDOR y el modelo con IA_MODELO,
 * asi que cambiar de motor es una variable de entorno y un reinicio.
 *
 *   IA_PROVEEDOR=openai     IA_MODELO=gpt-4o-mini      OPENAI_API_KEY=...
 *   IA_PROVEEDOR=anthropic  IA_MODELO=claude-sonnet-5  ANTHROPIC_API_KEY=...
 */

let cache: Proveedor | null = null;

export function obtenerProveedor(): Proveedor {
    if (cache) return cache;

    const elegido = (process.env.IA_PROVEEDOR || 'openai').toLowerCase();

    switch (elegido) {
        case 'openai':
            cache = crearProveedorOpenAI();
            break;
        case 'anthropic':
        case 'claude':
            cache = crearProveedorAnthropic();
            break;
        default:
            throw new Error(`IA_PROVEEDOR desconocido: ${elegido}`);
    }

    return cache;
}

/** Para los tests: olvida el proveedor cacheado. */
export function reiniciarProveedor(): void {
    cache = null;
}
