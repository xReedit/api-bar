/**
 * Saneo de errores para las respuestas del dashboard y del asistente IA.
 *
 * Un error crudo de Prisma o MySQL lleva dentro el nombre de la tabla, el SQL y
 * a veces el stack. Eso no puede salir al cliente ni llegar al modelo: es la via
 * de fuga mas probable del asistente (ver docs/PLAN_ASISTENTE_IA.md, 6.1).
 */

/** Error de entrada: su mensaje SI se puede mostrar, lo causo quien llamo. */
export class ErrorValidacion extends Error {
    constructor(mensaje: string) {
        super(mensaje);
        this.name = 'ErrorValidacion';
        // Sin esto `instanceof` falla: tsconfig no fija target, asi que se emite
        // ES5, y ahi heredar de Error pierde la cadena de prototipos. El efecto
        // era que TODO error de validacion salia como generico con estado 500.
        Object.setPrototypeOf(this, ErrorValidacion.prototype);
    }
}

/**
 * Mensaje seguro para el cliente. Solo los errores de validacion conservan su
 * texto; cualquier otro se colapsa a un generico y se registra completo en el
 * servidor, donde si se puede leer.
 */
export function mensajeError(error: unknown, contexto = 'consultar los datos'): string {
    if (error instanceof ErrorValidacion) {
        return error.message;
    }
    console.error(`[dash] Error al ${contexto}:`, error);
    return `No se pudo ${contexto}. Intenta nuevamente.`;
}
