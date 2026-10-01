import axios from 'axios';
import {
    DefinicionHerramienta,
    MensajeChat,
    Proveedor,
    RespuestaProveedor,
    leerEsfuerzo
} from '../tipos';

/**
 * Proveedor OpenAI via HTTP (axios ya es dependencia; no hace falta el SDK).
 *
 * Todo lo especifico de OpenAI vive aqui: el mapeo de roles, el formato de
 * tool_calls y la forma de la respuesta. El resto del asistente no lo sabe.
 */

const URL = 'https://api.openai.com/v1/chat/completions';

const ROLES: Record<MensajeChat['rol'], string> = {
    sistema: 'system',
    usuario: 'user',
    asistente: 'assistant',
    herramienta: 'tool'
};

interface ToolCallOpenAI {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}

function aFormatoOpenAI(m: MensajeChat): Record<string, unknown> {
    const base: Record<string, unknown> = { role: ROLES[m.rol], content: m.contenido };

    if (m.rol === 'herramienta') {
        base.tool_call_id = m.idLlamada;
    }

    if (m.rol === 'asistente' && m.llamadas?.length) {
        base.tool_calls = m.llamadas.map((l) => ({
            id: l.id,
            type: 'function',
            function: { name: l.nombre, arguments: JSON.stringify(l.argumentos) }
        }));
        // OpenAI exige content null cuando hay tool_calls
        base.content = m.contenido || null;
    }

    return base;
}

/** Los argumentos llegan como string; si vienen rotos, objeto vacio y que falle la validacion. */
function parsearArgumentos(json: string): Record<string, unknown> {
    try {
        const v = JSON.parse(json || '{}');
        return v && typeof v === 'object' ? v : {};
    } catch {
        return {};
    }
}

export function crearProveedorOpenAI(): Proveedor {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY no configurada');
    }
    const modelo = process.env.IA_MODELO || 'gpt-4o-mini';

    return {
        nombre: 'openai',
        modelo,

        async chat(mensajes, herramientas, forzar): Promise<RespuestaProveedor> {
            const esfuerzo = leerEsfuerzo();

            const cuerpo: Record<string, unknown> = {
                model: modelo,
                messages: mensajes.map(aFormatoOpenAI)
            };

            if (esfuerzo === 'off') {
                cuerpo.temperature = 0.2;
            } else {
                // Solo lo aceptan los modelos de razonamiento; 'max' no existe en
                // OpenAI, se mapea a 'high'.
                cuerpo.reasoning_effort = esfuerzo === 'medio' ? 'medium' : 'high';
            }

            if (herramientas.length > 0) {
                cuerpo.tools = herramientas.map((h: DefinicionHerramienta) => ({
                    type: 'function',
                    function: {
                        name: h.nombre,
                        description: h.descripcion,
                        parameters: h.parametros
                    }
                }));
                cuerpo.tool_choice = forzar
                    ? { type: 'function', function: { name: forzar } }
                    : 'auto';
            }

            let data: any;
            try {
                ({ data } = await axios.post(URL, cuerpo, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }));
            } catch (err: any) {
                // Sin esto, el volcado de axios tapa el mensaje real de la API.
                const detalle = err?.response?.data?.error?.message ?? err?.message;
                throw new Error(`OpenAI (${err?.response?.status ?? 'sin estado'}): ${detalle}`);
            }

            const mensaje = data?.choices?.[0]?.message ?? {};
            const toolCalls: ToolCallOpenAI[] = mensaje.tool_calls ?? [];

            return {
                texto: mensaje.content ?? null,
                llamadas: toolCalls.map((t) => ({
                    id: t.id,
                    nombre: t.function.name,
                    argumentos: parsearArgumentos(t.function.arguments)
                })),
                uso: data?.usage
                    ? { entrada: data.usage.prompt_tokens, salida: data.usage.completion_tokens }
                    : undefined
            };
        }
    };
}
