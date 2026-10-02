import axios from 'axios';
import {
    DefinicionHerramienta,
    MensajeChat,
    Proveedor,
    RespuestaProveedor,
    leerEsfuerzo
} from '../tipos';

/**
 * Proveedor OpenAI por la API de Responses (axios ya es dependencia; no hace
 * falta el SDK).
 *
 * POR QUE /v1/responses Y NO /v1/chat/completions
 * Los modelos nuevos de razonamiento rechazan `reasoning_effort` junto con
 * herramientas en chat/completions: o renuncias al razonamiento o renuncias a
 * las herramientas, y este asistente no funciona sin herramientas. Responses
 * admite las dos cosas, que es la unica razon del cambio.
 *
 * QUE CAMBIA RESPECTO A chat/completions
 *  - `messages` pasa a ser `input`, una lista de ITEMS y no solo de mensajes.
 *  - Las herramientas van planas: {type, name, parameters}, sin anidar en
 *    `function`.
 *  - La llamada a herramienta vuelve como un item `function_call` dentro de
 *    `output`, y su resultado se devuelve como `function_call_output`, enlazado
 *    por `call_id` (no por `tool_call_id`).
 *  - El texto vive en items `message` con partes `output_text`.
 *
 * Todo eso se queda aqui dentro: el resto del asistente sigue hablando el
 * contrato neutro de `tipos.ts`.
 */

const URL = 'https://api.openai.com/v1/responses';

/** La escala neutra en los nombres de OpenAI. */
const ESFUERZO_OPENAI: Record<string, string> = {
    off: 'none',
    medio: 'medium',
    alto: 'high',
    max: 'max'
};

/** `developer` es el papel con el que Responses nombra las instrucciones de sistema. */
const ROLES: Record<Exclude<MensajeChat['rol'], 'herramienta'>, string> = {
    sistema: 'developer',
    usuario: 'user',
    asistente: 'assistant'
};

interface ItemSalida {
    type: string;
    name?: string;
    arguments?: string;
    call_id?: string;
    content?: Array<{ type: string; text?: string }>;
}

/**
 * Un mensaje del contrato neutro puede convertirse en VARIOS items: un turno
 * del asistente con dos llamadas a herramienta son dos items `function_call`
 * mas, si hablo, uno de texto.
 */
function aItems(m: MensajeChat): Array<Record<string, unknown>> {
    if (m.rol === 'herramienta') {
        return [
            {
                type: 'function_call_output',
                call_id: m.idLlamada,
                output: m.contenido
            }
        ];
    }

    const items: Array<Record<string, unknown>> = [];

    if (m.rol === 'asistente' && m.llamadas?.length) {
        if (m.contenido) {
            items.push({ role: 'assistant', content: m.contenido });
        }
        for (const l of m.llamadas) {
            items.push({
                type: 'function_call',
                call_id: l.id,
                name: l.nombre,
                arguments: JSON.stringify(l.argumentos)
            });
        }
        return items;
    }

    items.push({ role: ROLES[m.rol], content: m.contenido });
    return items;
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

/** El texto puede venir repartido en varias partes `output_text`. */
function textoDe(items: ItemSalida[]): string | null {
    const partes = items
        .filter((i) => i.type === 'message')
        .flatMap((i) => i.content ?? [])
        .filter((c) => c.type === 'output_text')
        .map((c) => c.text ?? '');

    const texto = partes.join('').trim();
    return texto.length ? texto : null;
}

export function crearProveedorOpenAI(): Proveedor {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY no configurada');
    }
    const modelo = process.env.IA_MODELO || 'gpt-4o-mini';

    // Los modelos clasicos no aceptan `reasoning`. Se deduce del nombre y, si la
    // API se queja, se corrige sola en el catch.
    let aceptaRazonamiento = /^(o\d|gpt-5)/i.test(modelo);
    let reintentado = false;

    return {
        nombre: 'openai',
        modelo,

        async chat(mensajes, herramientas, forzar): Promise<RespuestaProveedor> {
            const esfuerzo = leerEsfuerzo();
            reintentado = false;

            const cuerpo: Record<string, unknown> = {
                model: modelo,
                input: mensajes.flatMap(aItems),
                // Sin esto, Responses guarda el hilo en OpenAI. El asistente ya
                // maneja su propio historial y no hace falta dejar copia fuera.
                store: false
            };

            if (aceptaRazonamiento) {
                // La escala neutra cae una a una en la de OpenAI. 'none' y no
                // 'minimal': 'minimal' no lo admiten todos los modelos, 'none' si.
                // Con herramientas, esto SOLO funciona por Responses.
                cuerpo.reasoning = { effort: ESFUERZO_OPENAI[esfuerzo] };
            } else if (esfuerzo === 'off') {
                cuerpo.temperature = 0.2;
            }

            if (herramientas.length > 0) {
                // Planas, sin el envoltorio `function` de chat/completions.
                cuerpo.tools = herramientas.map((h: DefinicionHerramienta) => ({
                    type: 'function',
                    name: h.nombre,
                    description: h.descripcion,
                    parameters: h.parametros
                }));
                cuerpo.tool_choice = forzar ? { type: 'function', name: forzar } : 'auto';
            }

            let data: any;
            try {
                ({ data } = await axios.post(URL, cuerpo, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }));
            } catch (err: any) {
                // Sin esto, el volcado de axios tapa el mensaje real de la API.
                const detalle: string = err?.response?.data?.error?.message ?? err?.message ?? '';

                // La API dice que parametro sobra: se cambia de familia y se repite,
                // una sola vez, y se recuerda para el resto de la sesion.
                const esDeParametro =
                    err?.response?.status === 400 && /reasoning|temperature/i.test(detalle);

                if (esDeParametro && !reintentado) {
                    reintentado = true;
                    aceptaRazonamiento = !aceptaRazonamiento;
                    return this.chat(mensajes, herramientas, forzar);
                }

                throw new Error(`OpenAI (${err?.response?.status ?? 'sin estado'}): ${detalle}`);
            }

            const items: ItemSalida[] = data?.output ?? [];

            return {
                texto: textoDe(items),
                llamadas: items
                    .filter((i) => i.type === 'function_call')
                    .map((i) => ({
                        id: String(i.call_id),
                        nombre: String(i.name),
                        argumentos: parsearArgumentos(i.arguments ?? '{}')
                    })),
                uso: data?.usage
                    ? {
                          entrada: data.usage.input_tokens,
                          salida: data.usage.output_tokens,
                          // Responses informa el ahorro de cache aqui dentro.
                          cacheLeido: data.usage.input_tokens_details?.cached_tokens ?? 0
                      }
                    : undefined
            };
        }
    };
}
