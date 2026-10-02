import { Bloque, DiaClimaBloque, Kpi } from './tipos';
import { redondear } from '../dash/agregados';

/**
 * Constructores de bloques visuales.
 *
 * Los alturas y los recortes salen de aqui, no del frontend, porque dependen de
 * los datos: seis locales caben en barras, veinte no. El criterio de movil esta
 * en docs/PLAN_ASISTENTE_IA.md, 4 ter.
 */

const ALTO_MOVIL = 220;
const ALTO_ESCRITORIO = 360;

export function bloqueKpis(id: string, titulo: string, kpis: Kpi[]): Bloque {
    return { id, tipo: 'kpi', titulo, kpis };
}

const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

/**
 * Etiqueta del eje segun la granularidad de la clave.
 * "2026-08" -> "ago 2026";  "2026-08-15" -> "15/08"
 */
function etiquetaFecha(clave: string): string {
    if (clave.length === 7) {
        const [ano, mes] = clave.split('-');
        return `${MESES[Number(mes) - 1] ?? mes} ${ano}`;
    }
    const [, mes, dia] = clave.split('-');
    return `${dia}/${mes}`;
}

/** Serie temporal: linea. Con muchos puntos, las etiquetas se apinan en movil. */
export function bloqueSerieDiaria(
    id: string,
    titulo: string,
    serie: Array<{ fecha: string; total: number }>,
    meta?: { valor: number; etiqueta: string }
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            // Area y no linea: el relleno da el volumen de un vistazo, y es como se
            // ve la misma serie en el dashboard.
            apex: 'area',
            categorias: serie.map((d) => etiquetaFecha(d.fecha)),
            series: [{ name: 'Ventas', data: serie.map((d) => d.total) }],
            formatoValor: 'moneda',
            // La linea de meta convierte "vendi 1,200" en "me falto" o "la pase".
            referenciaY: meta,
            altoMovil: ALTO_MOVIL,
            altoEscritorio: ALTO_ESCRITORIO,
            leyenda: false
        }
    };
}

/**
 * Ranking de locales: barras horizontales. En movil solo entran unas pocas, asi
 * que se recorta y el frontend ofrece "ver todos".
 */
export function bloqueRankingLocales(
    id: string,
    titulo: string,
    locales: Array<{ nombre: string; total: number; participacion_pct: number; vs_anterior_pct: number | null }>
): Bloque {
    return {
        id,
        tipo: 'ranking',
        titulo,
        columnas: [
            { clave: 'nombre', titulo: 'Local' },
            { clave: 'total', titulo: 'Vendido', formato: 'moneda' },
            { clave: 'participacion_pct', titulo: '% del total', formato: 'porcentaje' },
            { clave: 'vs_anterior_pct', titulo: 'vs anterior', formato: 'porcentaje' }
        ],
        filas: locales.map((l) => ({
            nombre: l.nombre,
            total: l.total,
            participacion_pct: l.participacion_pct,
            vs_anterior_pct: l.vs_anterior_pct
        })),
        claveProporcion: 'total',
        filasVisiblesMovil: 5
    };
}

/** Mismo dato que el ranking, en barras, para cuando la comparacion es lo central. */
export function bloqueBarrasLocales(
    id: string,
    titulo: string,
    locales: Array<{ nombre: string; total: number }>
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'bar',
            categorias: locales.map((l) => l.nombre),
            series: [{ name: 'Vendido', data: locales.map((l) => l.total) }],
            formatoValor: 'moneda',
            altoMovil: Math.min(ALTO_MOVIL + locales.length * 18, 360),
            altoEscritorio: ALTO_ESCRITORIO,
            leyenda: false
        }
    };
}

/** Productos: tabla. Con mas de tres columnas, el frontend apila en tarjetas. */
export function bloqueTablaProductos(
    id: string,
    titulo: string,
    productos: Array<{ producto: string; seccion: string; cantidad: number; importe: number }>
): Bloque {
    return {
        id,
        tipo: 'tabla',
        titulo,
        columnas: [
            { clave: 'producto', titulo: 'Producto' },
            { clave: 'cantidad', titulo: 'Cantidad', formato: 'entero' },
            { clave: 'importe', titulo: 'Importe', formato: 'moneda' }
        ],
        filas: productos.map((p) => ({
            producto: p.producto,
            cantidad: p.cantidad,
            importe: p.importe
        })),
        claveProporcion: 'importe',
        filasVisiblesMovil: 8
    };
}

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

/** Tira de pronostico: un dia por tarjeta, para leer de un vistazo. */
export function bloqueClima(
    id: string,
    titulo: string,
    dias: Array<{ fecha: string; minima: number; maxima: number; prob_lluvia_pct: number; cielo: string }>
): Bloque {
    const items: DiaClimaBloque[] = dias.map((d) => {
        const fecha = new Date(d.fecha + 'T12:00:00Z');
        return {
            etiqueta: `${DIAS_SEMANA[fecha.getUTCDay()]} ${fecha.getUTCDate()}`,
            minima: d.minima,
            maxima: d.maxima,
            probLluvia: d.prob_lluvia_pct,
            cielo: d.cielo
        };
    });

    return { id, tipo: 'clima', titulo, dias: items };
}

/**
 * Avance de meta por local. La barra mide el porcentaje de meta alcanzado, no
 * la venta: dos locales con ventas muy distintas pueden ir igual de bien.
 */
export function bloqueRankingMetas(
    id: string,
    titulo: string,
    locales: Array<{
        nombre: string;
        vendido: number;
        meta: number;
        avancePct: number;
        proyeccionPct: number | null;
    }>
): Bloque {
    return {
        id,
        tipo: 'ranking',
        titulo,
        columnas: [
            { clave: 'nombre', titulo: 'Local' },
            { clave: 'avancePct', titulo: 'Avance', formato: 'porcentaje' },
            { clave: 'vendido', titulo: 'Vendido', formato: 'moneda' },
            { clave: 'meta', titulo: 'Meta', formato: 'moneda' },
            { clave: 'proyeccionPct', titulo: 'Proyeccion', formato: 'porcentaje' }
        ],
        filas: locales.map((l) => ({
            nombre: l.nombre,
            avancePct: l.avancePct,
            vendido: l.vendido,
            meta: l.meta,
            proyeccionPct: l.proyeccionPct
        })),
        claveProporcion: 'avancePct',
        filasVisiblesMovil: 5
    };
}

/** Margen por plato. La barra mide el food cost: cuanto mas larga, peor. */
/**
 * Medidor de media luna.
 *
 * Para una nota suelta (satisfaccion, NPS) un numero no dice si esta bien o mal.
 * El medidor trae la escala puesta: se ve donde cae sin saber que rango es bueno.
 */
export function bloqueMedidor(
    id: string,
    titulo: string,
    etiqueta: string,
    valor: number,
    min: number,
    max: number,
    sufijo = ''
): Bloque {
    const pct = max > min ? ((valor - min) / (max - min)) * 100 : 0;

    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'radialBar',
            categorias: [],
            series: [{ name: etiqueta, data: [Math.min(Math.max(pct, 0), 100)] }],
            etiquetas: [etiqueta],
            medidor: { min, max, sufijo },
            formatoValor: 'entero',
            altoMovil: 220,
            altoEscritorio: 260,
            leyenda: false
        }
    };
}

/**
 * Treemap: el area ES la participacion.
 *
 * Una lista ordenada dice el orden; el treemap dice el peso. Que una seccion
 * ocupe media tarjeta se entiende sin leer un solo numero.
 */
export function bloqueTreemap(
    id: string,
    titulo: string,
    items: Array<{ nombre: string; valor: number }>
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'treemap',
            categorias: [],
            series: [
                {
                    name: 'Participacion',
                    data: items
                        .filter((i) => i.valor > 0)
                        .map((i) => ({ x: i.nombre, y: redondear(i.valor) }))
                }
            ],
            formatoValor: 'moneda',
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: false
        }
    };
}

const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Dos periodos superpuestos, un trazo cada uno.
 *
 * Una comparativa dibujada como una sola linea continua no compara nada: se ve
 * la forma del tramo entero, pero no cual de los dos pedazos fue mejor. Aqui las
 * dos semanas arrancan en el mismo punto del eje, asi que la distancia vertical
 * entre los trazos ES la diferencia, dia contra dia.
 *
 * Se alinea por posicion y no por fecha a proposito: el periodo anterior tiene
 * el mismo largo, asi que la posicion 0 de uno y de otro caen en el mismo dia de
 * la semana. Comparar lunes con lunes es lo util en un restaurante.
 */
export function bloqueComparativaDias(
    id: string,
    titulo: string,
    actual: Array<{ fecha: string; total: number }>,
    anterior: Array<{ fecha: string; total: number }>,
    etiquetaActual: string,
    etiquetaAnterior: string,
    meta?: { valor: number; etiqueta: string },
    agrupar: 'dia' | 'semana' | 'mes' = 'dia'
): Bloque {
    const largo = Math.max(actual.length, anterior.length);

    // El eje tiene que ser lo que los dos periodos COMPARTEN, no las fechas de
    // uno de ellos: poner "Lun 28/09" sobre dos series de semanas distintas hace
    // creer que ambas son del 28.
    const categorias = Array.from({ length: largo }, (_, i) => {
        const dia = actual[i]?.fecha;
        if (!dia) return `${i + 1}`;
        const d = new Date(dia + 'T00:00:00Z');

        if (agrupar === 'mes') return MESES[d.getUTCMonth()];
        if (agrupar === 'semana') return `Sem ${i + 1}`;
        // Hasta una semana, el dia de la semana se lee solo. Mas alla se repetiria
        // cuatro veces, asi que manda el dia del mes, que es como se alinean.
        if (largo <= 7) return DIA_CORTO[d.getUTCDay()];
        return String(d.getUTCDate()).padStart(2, '0');
    });

    const serie = (filas: typeof actual) =>
        Array.from({ length: largo }, (_, i) => filas[i]?.total ?? 0);

    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            // Area, con el relleno a baja opacidad: da el volumen de cada periodo
            // sin tapar el cruce de los trazos, que es lo que hay que leer.
            apex: 'area',
            categorias,
            series: [
                { name: etiquetaActual, data: serie(actual) },
                { name: etiquetaAnterior, data: serie(anterior) }
            ],
            formatoValor: 'moneda',
            referenciaY: meta,
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: true
        }
    };
}

/**
 * Columnas de venta con la linea de tickets encima.
 *
 * Dos dias con la misma venta no son el mismo dia: uno pudo ser mucha gente con
 * ticket chico y el otro al reves. Esa lectura necesita las dos series juntas.
 */
export function bloqueComboVentas(
    id: string,
    titulo: string,
    dias: Array<{ fecha: string; total: number; transacciones: number }>,
    meta?: { valor: number; etiqueta: string }
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'line',
            categorias: dias.map((d) => etiquetaFecha(d.fecha)),
            series: [
                { name: 'Vendido', tipo: 'column', data: dias.map((d) => d.total) },
                { name: 'Tickets', tipo: 'line', data: dias.map((d) => d.transacciones) }
            ],
            referenciaY: meta,
            formatoValor: 'moneda',
            altoMovil: 240,
            altoEscritorio: 300,
            leyenda: true
        }
    };
}

/**
 * Mancuerna vendido/meta.
 *
 * Lo que importa de una meta no es el porcentaje, es cuanto falta. La distancia
 * entre los dos puntos ES lo que falta, en soles y a escala.
 */
export function bloqueMancuernaMetas(
    id: string,
    titulo: string,
    locales: Array<{ nombre: string; vendido: number; meta: number }>
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'rangeBar',
            categorias: [],
            series: [
                {
                    name: 'Vendido vs meta',
                    // El rango va de menor a mayor; si se pasaron de la meta, se
                    // invierte igual y la barra sigue midiendo la diferencia.
                    data: locales.map((l) => ({
                        x: l.nombre,
                        y: [
                            Math.min(l.vendido, l.meta),
                            Math.max(l.vendido, l.meta)
                        ] as [number, number]
                    }))
                }
            ],
            formatoValor: 'moneda',
            altoMovil: 60 + locales.length * 38,
            altoEscritorio: 80 + locales.length * 42,
            leyenda: false
        }
    };
}

/**
 * Pendiente entre dos periodos.
 *
 * Una tabla con "+12%" y "-8%" obliga a leer fila por fila. Aqui se ve de un
 * golpe quien sube y quien baja, y cuanto se cruzan entre si.
 */
export function bloquePendiente(
    id: string,
    titulo: string,
    etiquetaAntes: string,
    etiquetaAhora: string,
    items: Array<{ nombre: string; antes: number; ahora: number }>
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'line',
            categorias: [etiquetaAntes, etiquetaAhora],
            series: items.map((i) => ({ name: i.nombre, data: [i.antes, i.ahora] })),
            formatoValor: 'moneda',
            altoMovil: 260,
            altoEscritorio: 300,
            leyenda: true
        }
    };
}

/**
 * Mapa de calor dia x hora.
 *
 * Una serie de tiempo contesta "cuanto vendi"; esto contesta "cuando", que es lo
 * que decide turnos y compras. En orden inverso porque ApexCharts dibuja la
 * primera serie abajo, y una semana se lee de lunes hacia abajo.
 */
export function bloqueMapaHorario(
    id: string,
    titulo: string,
    mapa: {
        celdas: Array<{ dia: number; hora: number; total: number }>;
        horaMin: number;
        horaMax: number;
    },
    nombreDia: (dia: number) => string
): Bloque {
    const horas: number[] = [];
    for (let h = mapa.horaMin; h <= mapa.horaMax; h++) horas.push(h);

    const porDia = new Map<string, number>();
    for (const c of mapa.celdas) porDia.set(`${c.dia}-${c.hora}`, c.total);

    const series = [];
    for (let dia = 7; dia >= 1; dia--) {
        series.push({
            name: nombreDia(dia).slice(0, 3),
            data: horas.map((h) => ({
                x: `${String(h).padStart(2, '0')}h`,
                y: porDia.get(`${dia}-${h}`) ?? 0
            }))
        });
    }

    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'heatmap',
            categorias: horas.map((h) => `${String(h).padStart(2, '0')}h`),
            series,
            formatoValor: 'moneda',
            // Una fila por dia: con siete filas el alto crece poco en movil.
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: false
        }
    };
}

/**
 * Avance de meta en anillo.
 *
 * Con un solo local el ranking es una fila sola, que no dice nada de un vistazo.
 * El anillo se lee como un indicador de tablero: lleno o no lleno.
 */
export function bloqueRadialMetas(
    id: string,
    titulo: string,
    locales: Array<{ nombre: string; avancePct: number }>
): Bloque {
    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'radialBar',
            categorias: [],
            // Pasado del 100% el anillo da la vuelta y confunde: se corta ahi.
            series: [{ name: 'Avance', data: locales.map((l) => Math.min(l.avancePct, 100)) }],
            etiquetas: locales.map((l) => l.nombre),
            formatoValor: 'entero',
            altoMovil: 240,
            altoEscritorio: 280,
            leyenda: locales.length > 1
        }
    };
}

/**
 * Margen contra volumen: el grafico que responde "que plato conviene empujar".
 *
 * Una lista ordenada por margen esconde que el plato mas rentable se vende tres
 * veces al mes. Aqui cada plato es un punto, y lo que importa es el cuadrante:
 * arriba a la derecha gana por los dos lados.
 *
 * Una serie por plato porque es la unica forma de que ApexCharts ponga el nombre
 * en la leyenda y en el tooltip; con una sola serie son puntos anonimos.
 */
export function bloqueDispersionMargen(
    id: string,
    titulo: string,
    platos: Array<{ plato: string; cantidad: number; margen_pct: number | null }>
): Bloque {
    const conDatos = platos.filter((p) => p.cantidad > 0 && p.margen_pct !== null);
    const promedio =
        conDatos.reduce((t, p) => t + (p.margen_pct ?? 0), 0) / (conDatos.length || 1);

    return {
        id,
        tipo: 'grafico',
        titulo,
        grafico: {
            apex: 'scatter',
            categorias: [],
            series: conDatos.map((p) => ({
                name: p.plato,
                data: [[p.cantidad, p.margen_pct ?? 0]] as Array<[number, number]>
            })),
            formatoValor: 'entero',
            tituloX: 'Unidades vendidas',
            tituloY: 'Margen %',
            referenciaY: {
                valor: Math.round(promedio * 10) / 10,
                etiqueta: `Margen promedio ${Math.round(promedio)}%`
            },
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: true
        }
    };
}

export function bloqueTablaMargen(
    id: string,
    titulo: string,
    platos: Array<{
        plato: string;
        ganancia: number;
        margen_pct: number | null;
        food_cost_pct: number | null;
    }>
): Bloque {
    return {
        id,
        tipo: 'tabla',
        titulo,
        columnas: [
            { clave: 'plato', titulo: 'Plato' },
            { clave: 'ganancia', titulo: 'Ganancia', formato: 'moneda' },
            { clave: 'margen_pct', titulo: 'Margen', formato: 'porcentaje' },
            { clave: 'food_cost_pct', titulo: 'Food cost', formato: 'porcentaje' }
        ],
        filas: platos.map((p) => ({
            plato: p.plato,
            ganancia: p.ganancia,
            margen_pct: p.margen_pct,
            food_cost_pct: p.food_cost_pct
        })),
        // La barra marca el margen, que es por lo que viene ordenada la lista. Si
        // marcara la ganancia en soles, el primer plato (99% de margen) saldria
        // con media barra y parecia un error.
        claveProporcion: 'margen_pct',
        filasVisiblesMovil: 6
    };
}

/** Stock a reponer, lo mas urgente arriba. */
export function bloqueTablaInventario(
    id: string,
    titulo: string,
    productos: Array<{ producto: string; stock: number; minimo: number; valor: number; nivel: string }>
): Bloque {
    return {
        id,
        tipo: 'tabla',
        titulo,
        columnas: [
            { clave: 'producto', titulo: 'Producto' },
            { clave: 'stock', titulo: 'Stock', formato: 'entero' },
            { clave: 'minimo', titulo: 'Minimo', formato: 'entero' },
            { clave: 'nivel', titulo: 'Nivel' }
        ],
        filas: productos.map((p) => ({
            producto: p.producto,
            stock: p.stock,
            minimo: p.minimo,
            nivel: p.nivel
        })),
        filasVisiblesMovil: 6
    };
}

/** Claves que, por su nombre, son dinero o porcentaje. */
const CLAVES_MONEDA = /total|importe|monto|precio|costo|venta|gasto|ingreso|saldo|deuda/i;
const CLAVES_PCT = /pct|porcentaje|avance|tasa|margen/i;

function formatoDe(clave: string): Kpi['formato'] {
    if (CLAVES_PCT.test(clave)) return 'porcentaje';
    if (CLAVES_MONEDA.test(clave)) return 'moneda';
    return 'entero';
}

function titulizar(clave: string): string {
    const t = clave.replace(/_/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Tabla a partir de filas de forma desconocida.
 *
 * Los modulos genericos del dashboard devuelven docenas de formas distintas
 * (una por tipo de consulta). Escribir una especificacion de columnas para cada
 * una serian cuarenta especificaciones que envejecen mal; en vez de eso se
 * eligen la primera columna de texto como etiqueta y hasta tres numericas, y el
 * formato se deduce del nombre de la clave.
 *
 * Devuelve null si las filas no tienen forma de tabla: mejor sin bloque que con
 * un bloque sin sentido.
 */
export function bloqueTablaGenerica(
    id: string,
    titulo: string,
    filas: Array<Record<string, unknown>>,
    maximo = 10
): Bloque | null {
    if (!Array.isArray(filas) || filas.length === 0) return null;

    const primera = filas[0];
    if (!primera || typeof primera !== 'object') return null;

    const claves = Object.keys(primera).filter((k) => !/^id/i.test(k));
    const texto = claves.find((k) => typeof primera[k] === 'string');
    const numericas = claves
        .filter((k) => k !== texto && typeof primera[k] === 'number')
        .slice(0, 3);

    if (!texto || numericas.length === 0) return null;

    return {
        id,
        tipo: 'tabla',
        titulo,
        columnas: [
            { clave: texto, titulo: titulizar(texto) },
            ...numericas.map((k) => ({ clave: k, titulo: titulizar(k), formato: formatoDe(k) }))
        ],
        filas: filas.slice(0, maximo).map((f) => {
            const fila: Record<string, string | number | null> = {
                [texto]: String(f[texto] ?? '')
            };
            for (const k of numericas) fila[k] = Number(f[k]) || 0;
            return fila;
        }),
        claveProporcion: numericas[0],
        filasVisiblesMovil: 6
    };
}
