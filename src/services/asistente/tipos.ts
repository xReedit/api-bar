/**
 * Tipos del asistente IA.
 *
 * Deliberadamente neutrales: no copian el formato de OpenAI ni el de Anthropic.
 * Cada proveedor traduce a lo suyo en su propio archivo, asi que cambiar de
 * modelo no toca ni las herramientas ni el controlador.
 */

export type RolMensaje = 'sistema' | 'usuario' | 'asistente' | 'herramienta';

export interface LlamadaHerramienta {
    /** Id que asigna el proveedor; hay que devolverlo junto al resultado. */
    id: string;
    nombre: string;
    argumentos: Record<string, unknown>;
}

export interface MensajeChat {
    rol: RolMensaje;
    contenido: string;
    /** Solo en rol 'asistente': herramientas que pidio ejecutar. */
    llamadas?: LlamadaHerramienta[];
    /** Solo en rol 'herramienta': a que llamada responde. */
    idLlamada?: string;
}

export interface DefinicionHerramienta {
    nombre: string;
    descripcion: string;
    /** JSON Schema de los parametros. Cerrado: additionalProperties false. */
    parametros: Record<string, unknown>;
}

export interface UsoTokens {
    entrada: number;
    salida: number;
    /** Tokens guardados en cache en esta llamada (primera vez). */
    cacheEscrito?: number;
    /** Tokens servidos desde cache: estos son los que NO se pagan a precio lleno. */
    cacheLeido?: number;
}

export interface RespuestaProveedor {
    /** Texto final, o null si el modelo prefirio llamar herramientas. */
    texto: string | null;
    llamadas: LlamadaHerramienta[];
    uso?: UsoTokens;
}

/**
 * Esfuerzo de razonamiento. Cada proveedor lo traduce a lo suyo:
 * Anthropic a un presupuesto de tokens de thinking, OpenAI a reasoning_effort.
 *
 * Por defecto 'off': elegir una herramienta y redactar tres frases no necesita
 * razonamiento extendido, y en un chat la latencia se nota. Subirlo tiene
 * sentido para preguntas que encadenan varios pasos.
 */
export type EsfuerzoRazonamiento = 'off' | 'medio' | 'alto' | 'max';

/** Presupuesto de tokens de razonamiento por nivel (Anthropic). */
export const PRESUPUESTO_RAZONAMIENTO: Record<EsfuerzoRazonamiento, number> = {
    off: 0,
    medio: 2000,
    alto: 6000,
    max: 12000
};

export function leerEsfuerzo(): EsfuerzoRazonamiento {
    const v = (process.env.IA_ESFUERZO || 'off').toLowerCase();
    return v === 'medio' || v === 'alto' || v === 'max' ? v : 'off';
}

export interface Proveedor {
    readonly nombre: string;
    readonly modelo: string;
    chat(
        mensajes: MensajeChat[],
        herramientas: DefinicionHerramienta[],
        /** Obliga al modelo a llamar esta herramienta concreta. */
        forzar?: string
    ): Promise<RespuestaProveedor>;
}

/**
 * Contexto de la peticion. Sale del token y de la pantalla, NUNCA del modelo.
 * `sedesPermitidas` es la frontera de seguridad: toda herramienta intersecta
 * contra ella (ver docs/PLAN_ASISTENTE_IA.md, 6.1).
 */
export interface ContextoAsistente {
    idusuario: number;
    idorg: number;
    sedeActual: number;
    sedesPermitidas: Array<{ idsede: number; nombre: string }>;
    desde: string;
    hasta: string;
}

/**
 * Bloques visuales (docs/PLAN_ASISTENTE_IA.md, 4 ter).
 *
 * Los arma el SERVIDOR a partir del resultado de una herramienta. El modelo solo
 * elige cual mostrar, por id: nunca escribe los datos de una serie. Una barra
 * inventada es peor que una cifra inventada, porque a un grafico nadie lo audita.
 */
export type TipoBloque = 'kpi' | 'grafico' | 'tabla' | 'ranking' | 'clima' | 'acciones';

export interface Kpi {
    etiqueta: string;
    valor: number;
    /** Variacion porcentual frente al periodo anterior; null si no hay base. */
    delta?: number | null;
    formato: 'moneda' | 'entero' | 'porcentaje';
}

export interface EspecificacionGrafico {
    /** Tipo de ApexCharts que debe usar el frontend. */
    apex:
        | 'bar'
        | 'line'
        | 'area'
        | 'donut'
        | 'scatter'
        | 'heatmap'
        | 'radialBar'
        | 'treemap'
        | 'rangeBar';
    categorias: string[];
    /**
     * Segun el tipo: un valor por categoria, [x, y] en scatter, o {x, y} con
     * etiqueta propia en heatmap.
     */
    series: Array<{
        name: string;
        /** Solo en combinados: mezcla columnas y linea en el mismo grafico. */
        tipo?: 'column' | 'line';
        data:
            | number[]
            | Array<[number, number]>
            | Array<{ x: string; y: number }>
            | Array<{ x: string; y: [number, number] }>;
    }>;
    /** radialBar en modo medidor: media luna con escala propia. */
    medidor?: { min: number; max: number; sufijo?: string };
    /** radialBar: una serie de porcentajes necesita sus etiquetas aparte. */
    etiquetas?: string[];
    formatoValor: 'moneda' | 'entero';
    /** Solo scatter: que mide cada eje. */
    tituloX?: string;
    tituloY?: string;
    /** Solo scatter: linea horizontal de referencia (el promedio). */
    referenciaY?: { valor: number; etiqueta: string };
    /** El alto lo decide el servidor: en movil un grafico no es el mismo mas chico. */
    altoMovil: number;
    altoEscritorio: number;
    /** En movil la leyenda lateral no cabe. */
    leyenda: boolean;
}

export interface DiaClimaBloque {
    etiqueta: string;
    minima: number;
    maxima: number;
    probLluvia: number;
    cielo: string;
}

/**
 * Accion que el usuario puede ejecutar desde el chat.
 *
 * El modelo la PROPONE; la ejecuta el servidor cuando el usuario pulsa. El
 * modelo no tiene ninguna herramienta de escritura: si la tuviera, bastaria
 * con convencerlo por el chat para que modifique datos.
 */
export interface AccionBloque {
    etiqueta: string;
    operacion: 'crear_regla';
    datos: Record<string, unknown>;
}

export interface Bloque {
    acciones?: AccionBloque[];
    id: string;
    tipo: TipoBloque;
    titulo: string;
    kpis?: Kpi[];
    dias?: DiaClimaBloque[];
    grafico?: EspecificacionGrafico;
    /** tabla y ranking */
    columnas?: Array<{ clave: string; titulo: string; formato?: Kpi['formato'] }>;
    filas?: Array<Record<string, string | number | null>>;
    /** ranking: clave numerica con la que se dibuja la barra de proporcion. */
    claveProporcion?: string;
    /** En movil se muestran solo estas filas, con un "ver todos". */
    filasVisiblesMovil?: number;
}

/** Lo unico que el modelo llega a ver de un bloque: metadatos, no datos. */
export interface BloqueDisponible {
    id: string;
    tipo: TipoBloque;
    titulo: string;
}

/** Respuesta que recibe el dashboard (docs/PLAN_ASISTENTE_IA.md, 4 quater). */
export interface RespuestaChat {
    titular: string;
    lectura: string;
    bloques: Bloque[];
    seguimiento: string[];
    links: Array<{ label: string; href: string }>;
    /** El usuario pidio llevarse el dato: el panel ofrece la descarga abajo. */
    descarga?: boolean;
    uso?: UsoTokens;
}
