import axios from 'axios';
import {
    MensajeChat,
    PRESUPUESTO_RAZONAMIENTO,
    Proveedor,
    RespuestaProveedor,
    leerEsfuerzo
} from '../tipos';

/**
 * Proveedor Anthropic (Claude) via HTTP.
 *
 * Se escribe ahora, aunque el proveedor por defecto sea OpenAI, para que la
 * interfaz este probada contra dos formatos distintos desde el principio: una
 * abstraccion con una sola implementacion no es una abstraccion.
 *
 * Diferencias con OpenAI que absorbe este archivo:
 *  - el system prompt va aparte, no como un mensaje mas
 *  - los resultados de herramienta son bloques dentro de un mensaje de usuario
 */

const URL = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

interface BloqueContenido {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
}

export function crearProveedorAnthropic(): Proveedor {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY no configurada');
    }
    const modelo = process.env.IA_MODELO || 'claude-sonnet-5';

    return {
        nombre: 'anthropic',
        modelo,

        async chat(mensajes, herramientas, forzar): Promise<RespuestaProveedor> {
            // Claude recibe el system aparte, no dentro de messages.
            const system = mensajes
                .filter((m) => m.rol === 'sistema')
                .map((m) => m.contenido)
                .join('\n\n');

            const conversacion = mensajes
                .filter((m) => m.rol !== 'sistema')
                .map((m: MensajeChat) => {
                    if (m.rol === 'herramienta') {
                        return {
                            role: 'user',
                            content: [
                                {
                                    type: 'tool_result',
                                    tool_use_id: m.idLlamada,
                                    content: m.contenido
                                }
                            ]
                        };
                    }

                    if (m.rol === 'asistente' && m.llamadas?.length) {
                        const bloques: Record<string, unknown>[] = [];
                        if (m.contenido) bloques.push({ type: 'text', text: m.contenido });
                        for (const l of m.llamadas) {
                            bloques.push({
                                type: 'tool_use',
                                id: l.id,
                                name: l.nombre,
                                input: l.argumentos
                            });
                        }
                        return { role: 'assistant', content: bloques };
                    }

                    return {
                        role: m.rol === 'asistente' ? 'assistant' : 'user',
                        content: m.contenido
                    };
                });

            const esfuerzo = leerEsfuerzo();
            const presupuesto = PRESUPUESTO_RAZONAMIENTO[esfuerzo];

            const cuerpo: Record<string, unknown> = {
                model: modelo,
                max_tokens: 1500,
                messages: conversacion
            };

            // Sin `temperature`: los modelos actuales de Anthropic la rechazan por
            // obsoleta. El determinismo lo da el prompt, no el parametro.
            if (presupuesto > 0) {
                // Con thinking activo, max_tokens debe superar el presupuesto.
                cuerpo.thinking = { type: 'enabled', budget_tokens: presupuesto };
                cuerpo.max_tokens = presupuesto + 1500;
            }

            // El prompt de sistema y el catalogo de herramientas son identicos en
            // cada turno y en cada sede: cachearlos evita reenviar ~5k tokens por
            // consulta. El marcador va en el ULTIMO bloque, que cierra el tramo
            // cacheable.
            if (system) {
                cuerpo.system = [
                    { type: 'text', text: system, cache_control: { type: 'ephemeral' } }
                ];
            }
            if (herramientas.length > 0) {
                const tools = herramientas.map((h) => ({
                    name: h.nombre,
                    description: h.descripcion,
                    input_schema: h.parametros
                })) as Array<Record<string, unknown>>;
                tools[tools.length - 1].cache_control = { type: 'ephemeral' };
                cuerpo.tools = tools;
                if (forzar) cuerpo.tool_choice = { type: 'tool', name: forzar };
            }

            const cabeceras: Record<string, string> = {
                'x-api-key': apiKey,
                'anthropic-version': VERSION,
                'Content-Type': 'application/json'
            };
            // Las claves de organizacion (no asignadas a un workspace) exigen esta
            // cabecera. Las claves con workspace propio no la necesitan.
            const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
            if (workspace) cabeceras['anthropic-workspace-id'] = workspace;

            let data: any;
            try {
                ({ data } = await axios.post(URL, cuerpo, { headers: cabeceras, timeout: 60000 }));
            } catch (err: any) {
                // Sin esto, el volcado de axios tapa el mensaje real de la API.
                const detalle = err?.response?.data?.error?.message ?? err?.message;
                throw new Error(`Anthropic (${err?.response?.status ?? 'sin estado'}): ${detalle}`);
            }

            const bloques: BloqueContenido[] = data?.content ?? [];
            // Los bloques 'thinking' no son respuesta: se descartan.
            const textos = bloques.filter((b) => b.type === 'text').map((b) => b.text ?? '');
            const usos = bloques.filter((b) => b.type === 'tool_use');

            return {
                texto: textos.length ? textos.join('\n') : null,
                llamadas: usos.map((b) => ({
                    id: b.id as string,
                    nombre: b.name as string,
                    argumentos: b.input ?? {}
                })),
                uso: data?.usage
                    ? {
                          entrada: data.usage.input_tokens,
                          salida: data.usage.output_tokens,
                          cacheEscrito: data.usage.cache_creation_input_tokens ?? 0,
                          cacheLeido: data.usage.cache_read_input_tokens ?? 0
                      }
                    : undefined
            };
        }
    };
}
