import { obtenerProveedor } from './proveedor';
import { construirPrompt } from './prompt';
import { DEFINICIONES, ejecutarHerramienta } from './herramientas';
import {
    Bloque,
    BloqueDisponible,
    ContextoAsistente,
    DefinicionHerramienta,
    MensajeChat,
    RespuestaChat,
    UsoTokens
} from './tipos';
import { ErrorValidacion, mensajeError } from '../dash/errores';

/**
 * Bucle de conversacion: pedir al modelo, ejecutar lo que pida, repetir.
 *
 * La respuesta final NO se parsea de texto: el modelo la entrega llamando a la
 * herramienta "responder", asi el formato lo garantiza el esquema y no la buena
 * voluntad del modelo. Si aun asi responde en texto plano, se usa como titular.
 */

const RESPONDER: DefinicionHerramienta = {
    nombre: 'responder',
    descripcion:
        'Entrega la respuesta final al usuario. Llamala siempre al terminar, despues de ' +
        'haber consultado las herramientas que necesites.',
    parametros: {
        type: 'object',
        properties: {
            titular: {
                type: 'string',
                description: 'Una frase con la conclusion, no con el dato.'
            },
            lectura: {
                type: 'string',
                description: 'Una o dos frases: que significa y que harias.'
            },
            seguimiento: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 3,
                description: 'Preguntas que el usuario podria querer hacer ahora.'
            },
            bloques: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 2,
                description:
                    'Ids de "bloques_disponibles" que quieres mostrar. Maximo DOS: elegir ' +
                    'es tu trabajo. Omitir si ninguno aporta.'
            },
            descarga: {
                type: 'boolean',
                description:
                    'true SOLO si el usuario pidio el dato para llevarselo: en Excel, ' +
                    'descargar, exportar, "pasame el reporte". Pone un boton de descarga ' +
                    'junto a los enlaces. No lo marques en una consulta normal.'
            }
        },
        required: ['titular', 'lectura', 'seguimiento'],
        additionalProperties: false
    }
};

/**
 * Que se esta haciendo, en lenguaje de negocio. El usuario no tiene que saber
 * que existe una herramienta llamada "locales_comparar".
 */
const EN_CURSO: Record<string, string> = {
    ventas_resumen: 'Revisando tus ventas',
    ventas_por_dia: 'Armando la evolucion dia a dia',
    locales_comparar: 'Comparando tus locales',
    productos_top: 'Mirando que se vende mas',
    metas_avance: 'Calculando el avance de meta',
    alertas_operativas: 'Buscando movimientos raros',
    clima: 'Consultando el clima',
    responder: 'Redactando la respuesta'
};

export function descripcionDePaso(nombre: string): string {
    return EN_CURSO[nombre] ?? 'Consultando datos';
}

function topeHerramientas(): number {
    const n = Number(process.env.IA_MAX_HERRAMIENTAS);
    return Number.isInteger(n) && n > 0 ? n : 4;
}

function sumarUso(a: UsoTokens | undefined, b: UsoTokens | undefined): UsoTokens | undefined {
    if (!a) return b;
    if (!b) return a;
    return {
        entrada: a.entrada + b.entrada,
        salida: a.salida + b.salida,
        cacheEscrito: (a.cacheEscrito ?? 0) + (b.cacheEscrito ?? 0),
        cacheLeido: (a.cacheLeido ?? 0) + (b.cacheLeido ?? 0)
    };
}

/**
 * Separa los bloques del resultado de una herramienta.
 *
 * El modelo recibe solo los metadatos (id, tipo, titulo): ni una serie, ni una
 * fila. Asi no puede inventar datos y, de paso, no se gastan miles de tokens en
 * mandarle numeros que ya tenemos.
 */
function separarBloques(resultado: unknown): { paraModelo: unknown; bloques: Bloque[] } {
    if (!resultado || typeof resultado !== 'object') {
        return { paraModelo: resultado, bloques: [] };
    }

    const { bloques, ...resto } = resultado as Record<string, unknown> & { bloques?: Bloque[] };
    if (!Array.isArray(bloques) || bloques.length === 0) {
        return { paraModelo: resto, bloques: [] };
    }

    const disponibles: BloqueDisponible[] = bloques.map((b) => ({
        id: b.id,
        tipo: b.tipo,
        titulo: b.titulo
    }));

    return { paraModelo: { ...resto, bloques_disponibles: disponibles }, bloques };
}

/**
 * Etiqueta segun el destino. Antes todos decian "Ver el detalle" y con dos
 * herramientas salian dos botones identicos, sin forma de saber a donde iba
 * cada uno.
 */
const DESTINOS: Record<string, string> = {
    '/ventas': 'Ver ventas',
    '/productos': 'Ver productos',
    '/locales': 'Ver locales',
    '/caja': 'Ver caja',
    '/encuestas': 'Ver encuestas',
    '/metas': 'Ver metas'
};

function etiquetaDeLink(href: string): string {
    const ruta = href.split('?')[0];
    return DESTINOS[ruta] ?? 'Ver el detalle';
}

/** Recoge los `link` que devolvieron las herramientas, sin repetir destino. */
function extraerLinks(resultados: unknown[]): RespuestaChat['links'] {
    const porRuta = new Map<string, string>();

    for (const r of resultados) {
        const href = (r as { link?: unknown })?.link;
        if (typeof href !== 'string' || !href) continue;
        const ruta = href.split('?')[0];
        // Una entrada por seccion: dos consultas a ventas no son dos botones.
        if (!porRuta.has(ruta)) porRuta.set(ruta, href);
    }

    return Array.from(porRuta.values()).map((href) => ({
        label: etiquetaDeLink(href),
        href
    }));
}

export async function responder(
    mensajeUsuario: string,
    ctx: ContextoAsistente,
    historial: MensajeChat[] = [],
    /** Se llama al empezar cada herramienta, para el streaming de progreso. */
    alProgreso?: (paso: string) => void
): Promise<RespuestaChat> {
    const texto = String(mensajeUsuario ?? '').trim();
    if (!texto) {
        throw new ErrorValidacion('El mensaje no puede estar vacio');
    }

    const proveedor = obtenerProveedor();
    const herramientas = [...DEFINICIONES, RESPONDER];

    const mensajes: MensajeChat[] = [
        { rol: 'sistema', contenido: construirPrompt(ctx) },
        ...historial,
        { rol: 'usuario', contenido: texto }
    ];

    const resultados: unknown[] = [];
    const catalogoBloques = new Map<string, Bloque>();
    let uso: UsoTokens | undefined;

    let forzarRespuesta = false;

    for (let vuelta = 0; vuelta <= topeHerramientas(); vuelta++) {
        const respuesta = await proveedor.chat(
            mensajes,
            herramientas,
            forzarRespuesta ? 'responder' : undefined
        );
        uso = sumarUso(uso, respuesta.uso);

        const finales = respuesta.llamadas.filter((l) => l.nombre === 'responder');
        if (finales.length > 0) {
            const a = finales[0].argumentos as Record<string, unknown>;
            const pedidos = Array.isArray(a.bloques) ? a.bloques.map(String) : [];
            return {
                titular: String(a.titular ?? '').trim(),
                lectura: String(a.lectura ?? '').trim(),
                // Solo ids que existan de verdad, y como mucho dos.
                bloques: pedidos
                    .map((id) => catalogoBloques.get(id))
                    .filter((b): b is Bloque => Boolean(b))
                    .slice(0, 2),
                seguimiento: Array.isArray(a.seguimiento) ? a.seguimiento.map(String) : [],
                links: extraerLinks(resultados),
                descarga: a.descarga === true,
                uso
            };
        }

        // Respondio en texto plano en vez de llamar a "responder". Pasa: se le pide
        // otra vez obligandolo a usar la herramienta, para no perder la estructura
        // (titular, lectura, chips) por un desliz de formato.
        if (respuesta.llamadas.length === 0) {
            if (!forzarRespuesta) {
                forzarRespuesta = true;
                mensajes.push({ rol: 'asistente', contenido: respuesta.texto ?? '' });
                mensajes.push({
                    rol: 'usuario',
                    contenido: 'Entrega esa misma respuesta llamando a la herramienta "responder".'
                });
                continue;
            }
            return {
                titular: (respuesta.texto ?? '').trim() || 'No pude responder eso.',
                lectura: '',
                bloques: [],
                seguimiento: [],
                links: extraerLinks(resultados),
                uso
            };
        }

        // Guardamos lo que pidio el modelo antes de devolverle los resultados.
        mensajes.push({
            rol: 'asistente',
            contenido: respuesta.texto ?? '',
            llamadas: respuesta.llamadas
        });

        for (const llamada of respuesta.llamadas) {
            alProgreso?.(descripcionDePaso(llamada.nombre));

            let contenido: string;
            try {
                const resultado = await ejecutarHerramienta(llamada.nombre, llamada.argumentos, ctx);
                resultados.push(resultado);

                const { paraModelo, bloques } = separarBloques(resultado);
                for (const b of bloques) catalogoBloques.set(b.id, b);
                contenido = JSON.stringify(paraModelo);
            } catch (error) {
                // El modelo ve un mensaje saneado, nunca el error crudo: ahi viajan
                // nombres de tabla, SQL y stack (PLAN_ASISTENTE_IA.md, 6.1 punto 5).
                contenido = JSON.stringify({
                    error: mensajeError(error, `ejecutar ${llamada.nombre}`)
                });
            }

            mensajes.push({ rol: 'herramienta', contenido, idLlamada: llamada.id });
        }
    }

    // Se agoto el tope de vueltas sin respuesta final.
    return {
        titular: 'No pude cerrar la respuesta con los datos que consulte.',
        lectura: 'Prueba con una pregunta mas concreta, por ejemplo acotando el local o las fechas.',
        bloques: [],
        seguimiento: [],
        links: extraerLinks(resultados),
        uso
    };
}
