import * as dashVentas from '../dash/ventas';
import * as dashProductos from '../dash/productos';
import {
    resumenVentas,
    ventasPorDia,
    variacionPct,
    redondear,
    rellenarDias,
    FilaVenta
} from '../dash/agregados';
import { ErrorValidacion } from '../dash/errores';
import { resolverSedes } from './sedes';
import { pronostico } from './clima';
import { avanceDeMeta, metaDeSede, AvanceMeta } from '../dash/metas';
import {
    alertasOperativas,
    detalleOperaciones,
    operacionesPorDia,
    TipoDetalle
} from '../dash/alertas';
import { ventasPorHorario, nombreDia } from '../dash/horarios';
import {
    ventasPorCanal,
    canalesEnElTiempo,
    granularidadPara,
    Granularidad
} from '../dash/canales';
import { costoPersonal } from '../dash/rrhh';
import { repartidoresDeSede, totalRepartidores } from '../dash/repartidores';
import { consultarModulo, MODULOS, NombreModulo } from '../dash/modulos';
import * as encuestasDash from '../encuesta.dash.service';
import { CATALOGO, definicionDe, listarReglas } from './reglas';
import { Bloque, ContextoAsistente, DefinicionHerramienta } from './tipos';
import {
    bloqueBarrasLocales,
    bloqueClima,
    bloqueKpis,
    bloqueRankingMetas,
    bloqueTablaGenerica,
    bloqueTablaInventario,
    bloqueDispersionMargen,
    bloqueDonaCanales,
    bloqueEvolucionCanales,
    bloqueKpisAlertas,
    bloqueKpisResumen,
    bloqueRankingUsuarios,
    bloqueComboVentas,
    bloqueComparativaDias,
    bloqueMancuernaMetas,
    bloqueMapaHorario,
    bloqueMedidor,
    bloquePendiente,
    bloqueTreemap,
    bloqueRadialMetas,
    bloqueTablaMargen,
    bloqueRankingLocales,
    bloqueSerieDiaria,
    bloqueTablaProductos
} from './bloques';

/**
 * Catalogo de herramientas del asistente.
 *
 * Tres invariantes, en orden de importancia:
 *
 *  1. El modelo NO elige la sede. Propone ids o "todas"; resolverSedes()
 *     intersecta contra el token y descarta lo ajeno.
 *  2. El modelo NO recibe filas crudas. Cada herramienta devuelve un agregado
 *     chico, con lista blanca de campos. Un mes de ventas son miles de lineas
 *     de pago: mandarlas al modelo son decenas de miles de tokens.
 *  3. El modelo NO calcula. Los totales, promedios y variaciones salen de aqui.
 */

export interface Herramienta {
    definicion: DefinicionHerramienta;
    ejecutar(args: Record<string, unknown>, ctx: ContextoAsistente): Promise<unknown>;
}

/** Esquema comun del selector de sedes. */
const PARAM_SEDES = {
    oneOf: [
        { type: 'array', items: { type: 'integer' }, description: 'ids de sede' },
        { type: 'string', enum: ['todas'] }
    ],
    description:
        'Sedes a consultar. Omitir para usar la que el usuario tiene en pantalla. ' +
        '"todas" para el conjunto completo del usuario.'
};

/** Tope de dias que puede pedir el modelo en una sola consulta. */
export const MAX_DIAS = 120;

const ES_ISO = /^\d{4}-\d{2}-\d{2}$/;

function diasEntre(desde: string, hasta: string): number {
    const a = new Date(desde + 'T00:00:00Z').getTime();
    const b = new Date(hasta + 'T00:00:00Z').getTime();
    return Math.round((b - a) / 86400000) + 1;
}

/**
 * Periodo efectivo de una herramienta.
 *
 * Por defecto el de la pantalla. El modelo puede pedir otro ("los ultimos 90
 * dias", "agosto"), pero acotado: un rango enorme son miles de filas por sede y
 * una respuesta que tarda mas de lo que nadie espera en un chat.
 */
function periodoDe(args: Record<string, unknown>, ctx: ContextoAsistente) {
    const desde = args.desde === undefined ? ctx.desde : String(args.desde);
    const hasta = args.hasta === undefined ? ctx.hasta : String(args.hasta);

    if (!ES_ISO.test(desde) || !ES_ISO.test(hasta)) {
        throw new ErrorValidacion('desde y hasta deben tener formato YYYY-MM-DD');
    }
    if (hasta < desde) {
        throw new ErrorValidacion('hasta no puede ser anterior a desde');
    }
    const dias = diasEntre(desde, hasta);
    if (dias > MAX_DIAS) {
        throw new ErrorValidacion(
            `El rango no puede pasar de ${MAX_DIAS} dias (pediste ${dias}). Acota las fechas.`
        );
    }
    return { desde, hasta, dias };
}

const PARAM_FECHAS = {
    desde: {
        type: 'string',
        description: `Inicio YYYY-MM-DD. Omitir para usar el de pantalla. Maximo ${MAX_DIAS} dias.`
    },
    hasta: { type: 'string', description: 'Fin YYYY-MM-DD. Omitir para usar el de pantalla.' }
};

/**
 * Como se dibuja el resultado lo decide el MODELO, no el servidor.
 *
 * El servidor solo declara que vistas admiten los datos de cada herramienta: no
 * tiene sentido ofrecer un mapa de calor a una lista de platos. Dentro de ese
 * conjunto elige quien entiende la pregunta, que es el modelo: "como van las
 * ventas" pide una serie, "que dia conviene la promo" pide el mapa, y preguntar
 * dos veces seguidas lo mismo no tiene por que verse igual.
 *
 * "auto" conserva la heuristica del servidor y es lo que pasa si no elige.
 */
function PARAM_GRAFICO(opciones: string[], ayuda: string) {
    return {
        type: 'string',
        enum: ['auto', ...opciones],
        description: `Como presentar los datos. ${ayuda} "auto" deja que lo decida el servidor.`
    };
}

/** Devuelve la vista pedida si existe; si no, la que toque por defecto. */
function elegirVista<T>(pedida: unknown, vistas: Record<string, () => T>, porDefecto: string): T {
    const clave = String(pedida ?? 'auto');
    const vista = vistas[clave] ?? vistas[porDefecto];
    return vista();
}

function rangoDe(periodo: { desde: string; hasta: string }) {
    return {
        periodo: 'rango',
        rango_start_date: periodo.desde,
        rango_end_date: periodo.hasta
    };
}

/** Periodo inmediatamente anterior, del mismo largo, para comparar. */
/** "2026-09-28" -> "28/09". Para nombrar cada serie en la leyenda. */
function etiquetaCorta(iso: string): string {
    const [, mes, dia] = iso.split('-');
    return `${dia}/${mes}`;
}

function rangoAnterior(periodo: { desde: string; hasta: string }) {
    const desde = new Date(periodo.desde + 'T00:00:00Z');
    const hasta = new Date(periodo.hasta + 'T00:00:00Z');
    const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86400000) + 1);

    const finAnterior = new Date(desde.getTime() - 86400000);
    const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * 86400000);

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return {
        periodo: 'rango',
        rango_start_date: iso(inicioAnterior),
        rango_end_date: iso(finAnterior)
    };
}

async function filasDeVentas(idsede: number, params: ReturnType<typeof rangoDe>) {
    return (await dashVentas.ventasTotal(idsede, params)) as unknown as FilaVenta[];
}

// ---------------------------------------------------------------- ventas_resumen

const ventasResumen: Herramienta = {
    definicion: {
        nombre: 'ventas_resumen',
        descripcion:
            'Total vendido, numero de transacciones y ticket promedio del periodo en pantalla, ' +
            'con la variacion frente al periodo anterior del mismo largo.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);

        const actual: FilaVenta[] = [];
        const previo: FilaVenta[] = [];
        for (const idsede of sedes.ids) {
            actual.push(...(await filasDeVentas(idsede, rangoDe(periodo))));
            previo.push(...(await filasDeVentas(idsede, rangoAnterior(periodo))));
        }

        const hoy = resumenVentas(actual);
        const antes = resumenVentas(previo);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            total: hoy.total,
            transacciones: hoy.transacciones,
            ticket_promedio: hoy.promedio,
            anuladas: { total: hoy.totalAnuladas, cantidad: hoy.cantidadAnuladas },
            vs_anterior: {
                total_pct: variacionPct(hoy.total, antes.total),
                transacciones_pct: variacionPct(hoy.transacciones, antes.transacciones),
                total_anterior: antes.total
            },
            sedes_descartadas: sedes.descartadas,
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: [
                bloqueKpis('kpi_ventas', `Ventas ${sedes.nombres.join(', ')}`, [
                    {
                        etiqueta: 'Vendido',
                        valor: hoy.total,
                        delta: variacionPct(hoy.total, antes.total),
                        formato: 'moneda'
                    },
                    {
                        etiqueta: 'Transacciones',
                        valor: hoy.transacciones,
                        delta: variacionPct(hoy.transacciones, antes.transacciones),
                        formato: 'entero'
                    },
                    { etiqueta: 'Ticket promedio', valor: hoy.promedio, formato: 'moneda' }
                ])
            ] as Bloque[]
        };
    }
};

// --------------------------------------------------------------- ventas_por_dia

const MAX_PUNTOS = 60;

const ventasPorDiaHerramienta: Herramienta = {
    definicion: {
        nombre: 'ventas_por_dia',
        descripcion:
            'Serie temporal de ventas: total y transacciones por dia, semana o mes. ' +
            'Util para ver evolucion, crecimiento, dias fuertes y caidas.',
        parametros: {
            type: 'object',
            properties: {
                sedes: PARAM_SEDES,
                ...PARAM_FECHAS,
                grafico: PARAM_GRAFICO(
                    ['serie', 'combo', 'comparar'],
                    'serie = linea limpia, mejor para ver la tendencia de muchos dias. ' +
                        'combo = columnas de venta con la linea de tickets encima, para ' +
                        'distinguir mucha-gente-ticket-chico de poca-gente-ticket-grande. ' +
                        'comparar = DOS lineas superpuestas, este periodo contra el anterior ' +
                        'del mismo largo, alineadas por dia de la semana. Usala siempre que ' +
                        'pidan comparar con la semana, el mes o el periodo anterior.'
                ),
                agrupar_por: {
                    type: 'string',
                    enum: ['dia', 'semana', 'mes'],
                    description:
                        'Como agrupar la serie. Para periodos largos o si piden ' +
                        'crecimiento por mes, usar "mes".'
                }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const agrupar =
            args.agrupar_por === 'mes' || args.agrupar_por === 'semana'
                ? (args.agrupar_por as 'mes' | 'semana')
                : 'dia';

        const filas: FilaVenta[] = [];
        for (const idsede of sedes.ids) {
            filas.push(...(await filasDeVentas(idsede, rangoDe(periodo))));
        }

        const serie = ventasPorDia(filas, agrupar);
        const recortada = serie.slice(-MAX_PUNTOS);

        // Linea de meta del tramo que se esta dibujando: la diaria para dias, por
        // siete para semanas, la mensual para meses. Si varios locales, se suman:
        // la serie tambien viene sumada. Sin meta cargada no se dibuja nada.
        // Solo si se va a dibujar la comparativa: son otras tantas consultas.
        const comparar = args.grafico === 'comparar';
        let serieActualComp: typeof recortada = recortada;
        let serieAnterior: typeof recortada = [];

        if (comparar) {
            const antes = rangoAnterior(periodo);
            const filasAntes: FilaVenta[] = [];
            for (const idsede of sedes.ids) {
                filasAntes.push(...(await filasDeVentas(idsede, antes)));
            }
            const brutaAnterior = ventasPorDia(filasAntes, agrupar);

            if (agrupar === 'dia') {
                // Sin rellenar, un dia cerrado desplaza todo lo que viene detras y
                // la posicion i deja de ser el mismo dia de la semana en ambos.
                serieActualComp = rellenarDias(serie, periodo.desde, periodo.hasta);
                serieAnterior = rellenarDias(
                    brutaAnterior,
                    antes.rango_start_date,
                    antes.rango_end_date
                );
            } else {
                serieActualComp = recortada;
                serieAnterior = brutaAnterior.slice(-MAX_PUNTOS);
            }
        }

        // Si el eje ya no lleva fechas, el periodo de cada serie tiene que decirse
        // en la leyenda o no se sabe cual es cual.
        const etiquetasComparativa = comparar
            ? {
                  actual: `${etiquetaCorta(periodo.desde)} a ${etiquetaCorta(periodo.hasta)}`,
                  anterior: `${etiquetaCorta(rangoAnterior(periodo).rango_start_date)} a ${etiquetaCorta(rangoAnterior(periodo).rango_end_date)}`
              }
            : { actual: 'Este periodo', anterior: 'Periodo anterior' };

        const metas = await Promise.all(sedes.ids.map((id) => metaDeSede(id)));
        const diaria = metas.reduce((t, m) => t + (m?.diaria ?? 0), 0);
        const mensual = metas.reduce((t, m) => t + (m?.mensual ?? 0), 0);
        const valorMeta = agrupar === 'mes' ? mensual : agrupar === 'semana' ? diaria * 7 : diaria;
        const lineaMeta =
            valorMeta > 0
                ? {
                      valor: redondear(valorMeta),
                      etiqueta: `Meta ${agrupar === 'mes' ? 'mensual' : agrupar === 'semana' ? 'semanal' : 'diaria'}: S/ ${redondear(valorMeta)}`
                  }
                : undefined;
        const tituloSerie =
            agrupar === 'mes'
                ? 'Ventas por mes'
                : agrupar === 'semana'
                  ? 'Ventas por semana'
                  : 'Ventas por dia';

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            serie: recortada,
            recortada_a_ultimos: serie.length > MAX_PUNTOS ? MAX_PUNTOS : null,
            mejor_dia: recortada.reduce(
                (mx, d) => (!mx || d.total > mx.total ? d : mx),
                null as (typeof recortada)[number] | null
            ),
            peor_dia: recortada.reduce(
                (mn, d) => (!mn || d.total < mn.total ? d : mn),
                null as (typeof recortada)[number] | null
            ),
            meta_del_tramo: lineaMeta?.valor ?? null,
            dias_sobre_la_meta: lineaMeta
                ? recortada.filter((d) => d.total >= lineaMeta.valor).length
                : null,
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: [
                elegirVista(
                    args.grafico,
                    {
                        serie: () => bloqueSerieDiaria('serie_dia', tituloSerie, recortada, lineaMeta),
                        comparar: () =>
                            bloqueComparativaDias(
                                'comparativa_dias',
                                'Este periodo contra el anterior',
                                serieActualComp,
                                serieAnterior,
                                etiquetasComparativa.actual,
                                etiquetasComparativa.anterior,
                                lineaMeta,
                                agrupar
                            ),
                        combo: () =>
                            bloqueComboVentas('combo_dia', tituloSerie + ' y tickets', recortada, lineaMeta),
                        // Con muchos puntos las columnas se apelmazan y gana la serie limpia.
                        auto: () =>
                            recortada.length <= 14
                                ? bloqueComboVentas('combo_dia', tituloSerie + ' y tickets', recortada, lineaMeta)
                                : bloqueSerieDiaria('serie_dia', tituloSerie, recortada, lineaMeta)
                    },
                    'auto'
                )
            ] as Bloque[]
        };
    }
};

// --------------------------------------------------------------- locales_comparar

const localesComparar: Herramienta = {
    definicion: {
        nombre: 'locales_comparar',
        descripcion:
            'Compara los locales del usuario en el periodo: total vendido, transacciones y ' +
            'ticket promedio por local, ordenados de mayor a menor. Usar cuando pregunten ' +
            'por varios locales, cual va mejor, o comparativas entre sedes.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
                grafico: PARAM_GRAFICO(
                    ['barras', 'pendiente'],
                    'barras = cuanto vendio cada local en este periodo. pendiente = la ' +
                        'recta del periodo anterior a este, para ver quien sube y quien baja.'
                ),
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        // Se calcula con ventasTotal por sede, NO con procedure_dash_comparar_locales:
        // esa es otra definicion de "total vendido" y dos definiciones distintas es
        // como se llega a que dos pantallas no cuadren. Cuesta una consulta por sede.
        const sedes = resolverSedes(args.sedes ?? 'todas', ctx);
        const periodo = periodoDe(args, ctx);

        const filas = [];
        for (let i = 0; i < sedes.ids.length; i++) {
            const idsede = sedes.ids[i];
            const actual = resumenVentas(await filasDeVentas(idsede, rangoDe(periodo)));
            const antes = resumenVentas(await filasDeVentas(idsede, rangoAnterior(periodo)));

            filas.push({
                idsede,
                nombre: sedes.nombres[i],
                total: actual.total,
                total_anterior: antes.total,
                transacciones: actual.transacciones,
                ticket_promedio: actual.promedio,
                vs_anterior_pct: variacionPct(actual.total, antes.total)
            });
        }

        filas.sort((a, b) => b.total - a.total);
        const totalGeneral = redondear(filas.reduce((s, f) => s + f.total, 0));

        const locales = filas.map((f) => ({
            ...f,
            participacion_pct: totalGeneral ? redondear((f.total / totalGeneral) * 100) : 0
        }));

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            total_general: totalGeneral,
            locales,
            sedes_descartadas: sedes.descartadas,
            link: `/locales?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            // El ranking siempre: ahi estan las cifras. El segundo bloque es la
            // lectura, y esa la elige el modelo.
            bloques: [
                bloqueRankingLocales('ranking_locales', 'Locales del periodo', locales),
                elegirVista(
                    args.grafico,
                    {
                        barras: () => bloqueBarrasLocales('barras_locales', 'Vendido por local', locales),
                        pendiente: () => bloquePendiente(
                                'pendiente_locales',
                                'Periodo anterior contra este',
                                'Antes',
                                'Ahora',
                                locales.map((l) => ({
                                    nombre: l.nombre,
                                    antes: l.total_anterior,
                                    ahora: l.total
                                }))
                            ),
                        auto: () =>
                            locales.some((l) => l.total_anterior > 0)
                                ? bloquePendiente(
                                'pendiente_locales',
                                'Periodo anterior contra este',
                                'Antes',
                                'Ahora',
                                locales.map((l) => ({
                                    nombre: l.nombre,
                                    antes: l.total_anterior,
                                    ahora: l.total
                                }))
                            )
                                : bloqueBarrasLocales('barras_locales', 'Vendido por local', locales)
                    },
                    'auto'
                )
            ] as Bloque[]
        };
    }
};

// ---------------------------------------------------------------- productos_top

const MAX_PRODUCTOS = 15;

const productosTop: Herramienta = {
    definicion: {
        nombre: 'productos_top',
        descripcion:
            'Productos mas vendidos del periodo, de la carta o del almacen, ordenados por ' +
            'importe o por cantidad.',
        parametros: {
            type: 'object',
            properties: {
                grafico: PARAM_GRAFICO(
                    ['tabla', 'treemap', 'ambos'],
                    'tabla = el ranking con cantidades e importes. treemap = el area de ' +
                        'cada seccion de la carta, para ver que pesa mas sin leer numeros.'
                ),
                sedes: PARAM_SEDES,
                origen: {
                    type: 'string',
                    enum: ['carta', 'almacen'],
                    description: 'carta = platos; almacen = productos de bodega'
                },
                ordenar_por: { type: 'string', enum: ['importe', 'cantidad'] },
                limite: { type: 'integer', minimum: 1, maximum: MAX_PRODUCTOS }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const origen = args.origen === 'almacen' ? 'almacen' : 'carta';
        const ordenarPor: 'cantidad' | 'importe' =
            args.ordenar_por === 'cantidad' ? 'cantidad' : 'importe';
        const limite = Math.min(Number(args.limite) || 10, MAX_PRODUCTOS);

        const tipo =
            origen === 'almacen' ? 'top_ventas_cantidad_almacen' : 'top_ventas_cantidad_carta';

        const acumulado = new Map<
            string,
            { producto: string; seccion: string; cantidad: number; importe: number }
        >();

        for (const idsede of sedes.ids) {
            const filas = (await dashProductos.dashProductos(idsede, {
                tipo_consulta: tipo,
                rango_start_date: periodo.desde,
                rango_end_date: periodo.hasta
            })) as unknown as Array<Record<string, unknown>>;

            if (!Array.isArray(filas)) continue;

            for (const f of filas) {
                const producto = String(f.producto_nombre ?? 'SIN NOMBRE');
                const acc = acumulado.get(producto) ?? {
                    producto,
                    seccion: String(f.seccion_nombre ?? f.almacen_nombre ?? ''),
                    cantidad: 0,
                    importe: 0
                };
                acc.cantidad += Number(f.cantidad_vendida) || 0;
                acc.importe += Number(f.importe) || 0;
                acumulado.set(producto, acc);
            }
        }

        const lista = Array.from(acumulado.values())
            .map((p) => ({ ...p, cantidad: redondear(p.cantidad), importe: redondear(p.importe) }))
            .sort((a, b) =>
                ordenarPor === 'cantidad' ? b.cantidad - a.cantidad : b.importe - a.importe
            );

        const tituloTop = origen === 'almacen' ? 'Mas vendidos de almacen' : 'Platos mas vendidos';

        const secciones = new Map<string, number>();
        for (const p of lista) {
            const nombre = p.seccion || 'Sin seccion';
            secciones.set(nombre, (secciones.get(nombre) ?? 0) + p.importe);
        }
        const porSeccion = Array.from(secciones.entries())
            .map(([nombre, valor]) => ({ nombre, valor: redondear(valor) }))
            .sort((a, b) => b.valor - a.valor);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            origen,
            ordenado_por: ordenarPor,
            total_productos: lista.length,
            // venta BRUTA (precio de lista). El modulo Ventas muestra lo cobrado:
            // la diferencia son descuentos y ajustes al cobrar.
            importe_total_bruto: redondear(lista.reduce((s, p) => s + p.importe, 0)),
            top: lista.slice(0, limite),
            link: `/productos?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            por_seccion: porSeccion,
            bloques: elegirVista(
                args.grafico,
                {
                    tabla: () => [bloqueTablaProductos('tabla_productos', tituloTop, lista.slice(0, limite))],
                    treemap: () => [bloqueTreemap('treemap_secciones', 'Peso de cada seccion', porSeccion)],
                    // La tabla responde "cuales"; el treemap responde "cuanto pesa
                    // cada parte de la carta", que es otra pregunta.
                    ambos: () => [
                        bloqueTablaProductos('tabla_productos', tituloTop, lista.slice(0, limite)),
                        bloqueTreemap('treemap_secciones', 'Peso de cada seccion', porSeccion)
                    ],
                    auto: () => [
                        bloqueTablaProductos('tabla_productos', tituloTop, lista.slice(0, limite)),
                        ...(porSeccion.length >= 3
                            ? [bloqueTreemap('treemap_secciones', 'Peso de cada seccion', porSeccion)]
                            : [])
                    ]
                },
                'auto'
            ) as Bloque[]
        };
    }
};


// ------------------------------------------------------------------------ clima

const clima: Herramienta = {
    definicion: {
        nombre: 'clima',
        descripcion:
            'Pronostico del tiempo en la ciudad del local: temperaturas, lluvia y ' +
            'probabilidad de lluvia por dia. Util para planificar terrazas, eventos al ' +
            'aire libre, personal e insumos. Hasta 14 dias hacia adelante.',
        parametros: {
            type: 'object',
            properties: {
                sedes: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'Ids de sede. Omitir para la de pantalla.'
                },
                dias: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 14,
                    description: 'Cuantos dias hacia adelante. Por defecto 7.'
                }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const dias = Math.min(Math.max(Number(args.dias) || 7, 1), 14);

        const porSede = [];
        for (let i = 0; i < sedes.ids.length; i++) {
            const p = await pronostico(sedes.ids[i], dias);
            porSede.push({ sede: sedes.nombres[i], lugar: p.lugar, dias: p.dias });
        }

        return {
            fuente: 'Open-Meteo',
            locales: porSede,
            sedes_descartadas: sedes.descartadas,
            // Solo se grafica la primera sede: varias tiras de clima no se leen.
            bloques: porSede.length
                ? ([
                      bloqueClima(
                          'clima_dias',
                          `Pronostico ${porSede[0].lugar}`,
                          porSede[0].dias
                      )
                  ] as Bloque[])
                : []
        };
    }
};


// ------------------------------------------------------------------------ metas

const metasAvance: Herramienta = {
    definicion: {
        nombre: 'metas_avance',
        descripcion:
            'Avance contra la meta de venta del periodo y proyeccion de cierre. Usar ' +
            'cuando pregunten si van a llegar a la meta, cuanto falta, o como cerrara ' +
            'el mes. No todas las sedes tienen meta cargada.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
                grafico: PARAM_GRAFICO(
                    ['anillo', 'mancuerna', 'tabla'],
                    'anillo = el porcentaje grande, para un solo local. mancuerna = la ' +
                        'distancia en soles entre lo vendido y la meta. tabla = las cifras ' +
                        'completas con proyeccion.'
                ),
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

        const conMeta: Array<{ nombre: string } & AvanceMeta> = [];
        const sinMeta: string[] = [];

        for (let i = 0; i < sedes.ids.length; i++) {
            const idsede = sedes.ids[i];
            const meta = await metaDeSede(idsede);

            if (!meta) {
                sinMeta.push(sedes.nombres[i]);
                continue;
            }

            const vendido = resumenVentas(await filasDeVentas(idsede, rangoDe(periodo))).total;
            conMeta.push({ nombre: sedes.nombres[i], ...avanceDeMeta(meta, vendido, periodo.desde, periodo.hasta, hoyISO) });
        }

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            locales: conMeta,
            // Se informan, no se inventan: hay locales que no trabajan con objetivos.
            sin_meta_cargada: sinMeta,
            que_pierden_sin_meta: sinMeta.length
                ? [
                      'no hay porcentaje de avance ni proyeccion de cierre',
                      'no se pueden comparar locales de distinto tamano en igualdad',
                      'no reciben la alerta diaria de meta'
                  ]
                : [],
            nota_proyeccion:
                'La proyeccion es una regla de tres sobre lo que va del periodo: sirve ' +
                'para saber si vas corto o holgado, no es un pronostico fino.',
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: (conMeta.length
                ? elegirVista(
                      args.grafico,
                      {
                          anillo: () => [bloqueRadialMetas('meta_anillo', 'Avance de meta', conMeta)],
                          mancuerna: () => [
                              bloqueMancuernaMetas('meta_mancuerna', 'Cuanto falta para la meta', conMeta)
                          ],
                          tabla: () => [bloqueRankingMetas('metas', 'Avance de meta', conMeta)],
                          // Un local: el anillo. Pocos: la mancuerna. Muchos: la
                          // tabla, la unica que no se satura.
                          auto: () =>
                              conMeta.length === 1
                                  ? [bloqueRadialMetas('meta_anillo', 'Avance de meta', conMeta)]
                                  : conMeta.length <= 6
                                    ? [
                                          bloqueMancuernaMetas(
                                              'meta_mancuerna',
                                              'Cuanto falta para la meta',
                                              conMeta
                                          )
                                      ]
                                    : [bloqueRankingMetas('metas', 'Avance de meta', conMeta)]
                      },
                      'auto'
                  )
                : []) as Bloque[]
        };
    }
};


// ---------------------------------------------------------------------- alertas

const alertas: Herramienta = {
    definicion: {
        nombre: 'alertas_operativas',
        descripcion:
            'Senales de alerta del periodo: items borrados de pedidos, pedidos anulados, ' +
            'ventas anuladas, descuentos y salidas de caja, comparados con el periodo ' +
            'anterior y desglosados por usuario. Usar cuando pregunten si hay algo raro, ' +
            'por alertas, por robos o descuadres, o al hacer un repaso general del negocio.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const anterior = rangoAnterior(periodo);

        const datos = await alertasOperativas(
            sedes.ids,
            periodo.desde,
            periodo.hasta,
            anterior.rango_start_date,
            anterior.rango_end_date
        );

        const disparadas = datos.indicadores.filter((i) => i.anomalo).map((i) => i.clave);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            ventas_del_periodo: datos.ventasDelPeriodo,
            indicadores: datos.indicadores.map((i) => ({
                ...i,
                pct_sobre_ventas: i.pctSobreVentas
            })),
            anomalias: disparadas,
            quien_borra: datos.borradosPorUsuario,
            quien_anula: datos.anuladosPorUsuario,
            quien_saca_de_caja: datos.egresosPorUsuario,
            motivos_de_borrado: datos.motivosFrecuentes,
            como_leerlo:
                'Borrar items, anular pedidos y sacar dinero de caja son operaciones ' +
                'normales. Lo que importa es que se disparen frente al periodo anterior o ' +
                'que se concentren en una persona. Senala donde mirar; no acuses.',
            link: `/caja?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: [
                bloqueKpisAlertas('kpi_alertas', 'Senales del periodo', datos.indicadores),
                // El reparto por usuario solo cuando hay algo disparado: si todo
                // esta normal, senalar personas es ruido.
                ...(disparadas.length
                    ? [
                          bloqueRankingUsuarios(
                              'quien_borra',
                              'Quien borra items',
                              datos.borradosPorUsuario
                          )
                      ]
                    : [])
            ].filter(Boolean) as Bloque[]
        };
    }
};


// ------------------------------------------------------------------ rentabilidad

/** Debajo de esto la dispersion son cuatro puntos sueltos: mejor la tabla. */
const MIN_PLATOS_DISPERSION = 5;
const MAX_PLATOS_MARGEN = 15;

const rentabilidadPlatos: Herramienta = {
    definicion: {
        nombre: 'rentabilidad_platos',
        descripcion:
            'Margen y food cost por plato: precio de venta, costo, porcentaje de food ' +
            'cost y ganancia del periodo. Usar cuando pregunten por costos, margen, ' +
            'rentabilidad, que plato deja mas o cuales no son rentables.',
        parametros: {
            type: 'object',
            properties: {
                grafico: PARAM_GRAFICO(
                    ['tabla', 'dispersion'],
                    'tabla = margen, food cost y ganancia plato por plato. dispersion = ' +
                        'margen contra volumen con la linea del promedio, para decidir que ' +
                        'plato empujar.'
                ),
                sedes: PARAM_SEDES,
                ...PARAM_FECHAS,
                ordenar_por: {
                    type: 'string',
                    enum: ['ganancia', 'margen_pct', 'food_cost_pct'],
                    description:
                        'ganancia = plata que deja en total; margen_pct = eficiencia por ' +
                        'plato; food_cost_pct ordena de PEOR a mejor para hallar problemas.'
                },
                limite: { type: 'integer', minimum: 1, maximum: MAX_PLATOS_MARGEN }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const orden = String(args.ordenar_por ?? 'ganancia');
        const limite = Math.min(Number(args.limite) || 10, MAX_PLATOS_MARGEN);

        const acumulado = new Map<string, any>();

        for (const idsede of sedes.ids) {
            const filas = (await dashProductos.dashProductos(idsede, {
                tipo_consulta: 'rentabilidad',
                rango_start_date: periodo.desde,
                rango_end_date: periodo.hasta
            })) as unknown as Array<Record<string, unknown>>;

            if (!Array.isArray(filas)) continue;

            for (const f of filas) {
                const nombre = String(f.producto_nombre ?? 'SIN NOMBRE');
                const acc = acumulado.get(nombre) ?? {
                    plato: nombre,
                    seccion: String(f.seccion ?? ''),
                    precio: Number(f.precio_venta) || 0,
                    costo: Number(f.costo_producto) || 0,
                    cantidad: 0,
                    ingresos: 0
                };
                acc.cantidad += Number(f.cantidad_vendida) || 0;
                acc.ingresos += Number(f.total_ingresos) || 0;
                acumulado.set(nombre, acc);
            }
        }

        const lista = Array.from(acumulado.values())
            .map((p) => {
                const costoTotal = redondear(p.costo * p.cantidad);
                const ganancia = redondear(p.ingresos - costoTotal);
                return {
                    plato: p.plato,
                    seccion: p.seccion,
                    precio: redondear(p.precio),
                    costo: redondear(p.costo),
                    cantidad: redondear(p.cantidad),
                    ingresos: redondear(p.ingresos),
                    ganancia,
                    margen_pct: p.ingresos ? redondear((ganancia / p.ingresos) * 100) : null,
                    food_cost_pct: p.precio ? redondear((p.costo / p.precio) * 100) : null
                };
            })
            // Sin costo cargado no hay margen que calcular: se informan aparte.
            .filter((p) => p.costo > 0);

        const sinCosto = Array.from(acumulado.values())
            .filter((p) => !p.costo)
            .map((p) => p.plato);

        if (orden === 'food_cost_pct') {
            lista.sort((a, b) => (b.food_cost_pct ?? 0) - (a.food_cost_pct ?? 0));
        } else if (orden === 'margen_pct') {
            lista.sort((a, b) => (b.margen_pct ?? 0) - (a.margen_pct ?? 0));
        } else {
            lista.sort((a, b) => b.ganancia - a.ganancia);
        }

        const conVolumen = lista
            .slice(0, limite)
            .filter((p) => p.cantidad > 0 && p.margen_pct !== null);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            ordenado_por: orden,
            ganancia_total: redondear(lista.reduce((t, p) => t + p.ganancia, 0)),
            platos: lista.slice(0, limite),
            // Un plato sin costo cargado no es un plato sin costo: es un dato que falta.
            platos_sin_costo_cargado: sinCosto.slice(0, 10),
            como_leerlo:
                'El food cost es el costo de insumos sobre el precio de venta. En ' +
                'restaurantes se suele apuntar entre 25% y 35%: por encima, el plato ' +
                'deja poco; muy por debajo, puede estar caro para el mercado.',
            link: `/productos?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: (lista.length
                ? elegirVista(
                      args.grafico,
                      {
                          tabla: () => [
                              bloqueTablaMargen('tabla_margen', 'Margen por plato', lista.slice(0, limite))
                          ],
                          dispersion: () => [
                              bloqueDispersionMargen('dispersion_margen', 'Margen contra volumen', conVolumen)
                          ],
                          // Con cuatro puntos sueltos el cuadrante no dice nada.
                          auto: () =>
                              conVolumen.length >= MIN_PLATOS_DISPERSION
                                  ? [
                                        bloqueDispersionMargen(
                                            'dispersion_margen',
                                            'Margen contra volumen',
                                            conVolumen
                                        )
                                    ]
                                  : [
                                        bloqueTablaMargen(
                                            'tabla_margen',
                                            'Margen por plato',
                                            lista.slice(0, limite)
                                        )
                                    ]
                      },
                      'auto'
                  )
                : []) as Bloque[]
        };
    }
};





// ------------------------------------------------------------------ reparto

const reparto: Herramienta = {
    definicion: {
        nombre: 'reparto_domicilio',
        descripcion:
            'Los repartidores: cuantos hay, cuantas entregas hizo cada uno, como los ' +
            'califican los clientes y quien esta conectado. Usar para preguntas sobre ' +
            'repartidores, motorizados, quien reparte, o si el equipo de reparto alcanza. ' +
            'Para la PLATA del delivery es ventas_por_canal; esto es QUIEN la mueve.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);

        const lista = await repartidoresDeSede(sedes.ids, periodo.desde, periodo.hasta);
        const totales = await totalRepartidores();
        const entregas = lista.reduce((t, r) => t + r.entregas, 0);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            // Dados de alta en la plataforma, repartan o no en este periodo.
            registrados_en_la_plataforma: totales.registrados,
            conectados_ahora: totales.conectados,
            repartidores_con_entregas: lista.length,
            entregas_totales: entregas,
            repartidores: lista,
            sin_calificar: lista.filter((r) => r.calificaciones === 0).map((r) => r.nombre),
            como_leerlo:
                'La calificacion la ponen los clientes y es del 1 al 5. Un repartidor sin ' +
                'calificaciones no es malo: es que nadie lo califico.',
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: (lista.length
                ? [
                      bloqueRankingUsuarios(
                          'ranking_repartidores',
                          'Entregas por repartidor',
                          lista.map((r) => ({
                              usuario: r.nombre,
                              cantidad: r.entregas,
                              // El ranking dibuja la barra sobre "monto": aqui lo que
                              // se compara son entregas, no soles.
                              monto: r.entregas
                          }))
                      )
                  ]
                : []
            ).filter(Boolean) as Bloque[]
        };
    }
};

// ------------------------------------------------------------------------ rrhh

const planilla: Herramienta = {
    definicion: {
        nombre: 'personal_costo',
        descripcion:
            'Costo de personal del mes: planilla, asistencia y cuanto pesa sobre las ' +
            'ventas. Usar para preguntas sobre planilla, sueldos, cuanto cuesta el ' +
            'equipo, si sobra o falta gente, o recursos humanos.',
        parametros: {
            type: 'object',
            properties: {
                sedes: PARAM_SEDES,
                mes: {
                    type: 'string',
                    description: 'Mes de planilla en formato YYYY-MM. Omitir para el actual.'
                }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);

        const mes = /^\d{4}-\d{2}$/.test(String(args.mes ?? ''))
            ? String(args.mes)
            : periodo.hasta.slice(0, 7);

        // Una sede por vez: Recursos Humanos razona por sede y mes de planilla.
        const porSede = [];
        for (let i = 0; i < sedes.ids.length; i++) {
            const costo = await costoPersonal(sedes.ids[i], mes);
            porSede.push({ sede: sedes.nombres[i], disponible: costo !== null, costo: costo?.datos ?? null });
        }

        // El peso sobre la venta es lo que convierte un costo en un juicio.
        const desdeMes = `${mes}-01`;
        const hastaMes = new Date(
            Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)
        )
            .toISOString()
            .slice(0, 10);

        let ventasMes = 0;
        for (const idsede of sedes.ids) {
            ventasMes += resumenVentas(
                await filasDeVentas(idsede, rangoDe({ desde: desdeMes, hasta: hastaMes }))
            ).total;
        }

        const sinDatos = porSede.filter((p) => !p.disponible).map((p) => p.sede);

        return {
            mes,
            sedes: sedes.nombres,
            ventas_del_mes: redondear(ventasMes),
            costo_por_sede: porSede.filter((p) => p.disponible),
            // Recursos Humanos es otro servicio: puede no contestar, y eso se dice.
            sin_datos_de_rrhh: sinDatos,
            como_leerlo:
                'El costo sale del mismo motor con el que se arma la boleta, no de un ' +
                'calculo aparte: si aqui dice una cifra, la planilla dice la misma. En ' +
                'restaurantes el personal suele pesar entre 25% y 35% de la venta.',
            link: '/rrhh',
            bloques: [] as Bloque[]
        };
    }
};

// --------------------------------------------------------------------- canales

const canales: Herramienta = {
    definicion: {
        nombre: 'ventas_por_canal',
        descripcion:
            'Ventas repartidas por canal: salon (consumir en el local), para llevar y ' +
            'delivery, con su ticket promedio y como vienen contra el periodo anterior. ' +
            'Usar cuando pregunten por delivery, por salon, por reparto, por como va un ' +
            'canal, o de donde viene la venta.',
        parametros: {
            type: 'object',
            properties: {
                sedes: PARAM_SEDES,
                ...PARAM_FECHAS,
                canal: {
                    type: 'string',
                    description:
                        'Para seguir UN canal dia a dia. Tal como viene en el reparto: ' +
                        '"DELIVERY", "PARA LLEVAR", "CONSUMIR EN EL LOCAL". Omitir para ' +
                        'ver todos.'
                },
                agrupar_por: {
                    type: 'string',
                    enum: ['dia', 'semana', 'mes'],
                    description:
                        'Cada cuanto se agrupa la evolucion. Omitir para que lo elija el ' +
                        'servidor segun el largo del rango: cinco meses en barras diarias ' +
                        'son 150 columnas y un eje ilegible.'
                },
                grafico: PARAM_GRAFICO(
                    ['dona', 'barras', 'evolucion'],
                    'dona = cuanto pesa cada canal ahora. barras = comparar sus montos. ' +
                        'evolucion = como viene cada canal EN EL TIEMPO, una linea por canal. ' +
                        'Si piden comparar canales por meses, o si uno crece o cae, es evolucion.'
                )
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);

        const actual = await ventasPorCanal(sedes.ids, periodo.desde, periodo.hasta);
        const antes = await ventasPorCanal(
            sedes.ids,
            rangoAnterior(periodo).rango_start_date,
            rangoAnterior(periodo).rango_end_date
        );

        const total = actual.reduce((t, c) => t + c.total, 0);
        const anterior = new Map(antes.map((c) => [c.canal, c]));

        const canalesConPeso = actual.map((c) => ({
            ...c,
            participacion_pct: total ? redondear((c.total / total) * 100) : 0,
            vs_anterior_pct: variacionPct(c.total, anterior.get(c.canal)?.total ?? 0)
        }));

        const pedido = String(args.canal ?? '').toUpperCase();

        // La granularidad la decide el largo del rango salvo que la impongan: es
        // lo que evita que cinco meses salgan como 150 barras diarias.
        const agrupar: Granularidad = ['dia', 'semana', 'mes'].includes(String(args.agrupar_por))
            ? (String(args.agrupar_por) as Granularidad)
            : granularidadPara(periodo.desde, periodo.hasta);

        const enElTiempo = await canalesEnElTiempo(
            sedes.ids,
            periodo.desde,
            periodo.hasta,
            agrupar,
            pedido || undefined
        );

        // Una serie por canal sobre el mismo eje de periodos.
        const periodos = Array.from(new Set(enElTiempo.map((p) => p.periodo))).sort();
        const nombresCanal = Array.from(new Set(enElTiempo.map((p) => p.canal)));
        const porClave = new Map(enElTiempo.map((p) => [`${p.periodo}|${p.canal}`, p.total]));

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            total_general: redondear(total),
            canales: canalesConPeso,
            agrupado_por: agrupar,
            evolucion: periodos.map((per) => ({
                periodo: per,
                ...Object.fromEntries(nombresCanal.map((c) => [c, porClave.get(`${per}|${c}`) ?? 0]))
            })),
            como_leerlo:
                'El canal sale de como se marco la venta en el POS (tipo de consumo). ' +
                'Si un canal aparece en cero puede ser que no se este marcando, no que ' +
                'no exista.',
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: (canalesConPeso.length
                ? elegirVista(
                      args.grafico,
                      {
                          dona: () => [bloqueDonaCanales('dona_canales', 'Reparto por canal', canalesConPeso)],
                          barras: () => [
                              bloqueTablaGenerica(
                                  'tabla_canales',
                                  'Ventas por canal',
                                  canalesConPeso.map((c) => ({
                                      canal: c.canal,
                                      total: c.total,
                                      ventas: c.ventas,
                                      ticket: c.ticketPromedio
                                  }))
                              )
                          ],
                          evolucion: () =>
                              periodos.length > 1
                                  ? [
                                        bloqueEvolucionCanales(
                                            'evolucion_canales',
                                            pedido
                                                ? `${pedido} por ${agrupar}`
                                                : `Canales por ${agrupar}`,
                                            periodos,
                                            nombresCanal,
                                            porClave
                                        )
                                    ]
                                  : [bloqueDonaCanales('dona_canales', 'Reparto por canal', canalesConPeso)],
                          // La dona responde "cuanto pesa cada canal", que es la
                          // pregunta de un periodo corto. En cuanto el rango abarca
                          // varios periodos, lo que se quiere saber es si suben o
                          // bajan, y eso una dona no lo puede mostrar.
                          auto: () =>
                              periodos.length > 2
                                  ? [
                                        bloqueEvolucionCanales(
                                            'evolucion_canales',
                                            `Canales por ${agrupar}`,
                                            periodos,
                                            nombresCanal,
                                            porClave
                                        )
                                    ]
                                  : [
                                        bloqueDonaCanales(
                                            'dona_canales',
                                            'Reparto por canal',
                                            canalesConPeso
                                        )
                                    ]
                      },
                      'auto'
                  )
                : []
            ).filter(Boolean) as Bloque[]
        };
    }
};

// -------------------------------------------------------------------- horarios

const horarios: Herramienta = {
    definicion: {
        nombre: 'ventas_por_horario',
        descripcion:
            'Reparto de las ventas por dia de la semana y por hora: cuando entra la ' +
            'plata. Usar cuando pregunten que dia o que hora se vende mas, por horas ' +
            'punta o muertas, cuanto personal poner en un turno, o a que hora conviene ' +
            'una promocion.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const mapa = await ventasPorHorario(sedes.ids, periodo.desde, periodo.hasta);

        // Los totales por dia y por hora dicen en texto lo que el mapa dice en color:
        // el modelo necesita las cifras, el usuario necesita verlas repartidas.
        const porDia = new Map<number, number>();
        const porHora = new Map<number, number>();
        for (const c of mapa.celdas) {
            porDia.set(c.dia, redondear((porDia.get(c.dia) ?? 0) + c.total));
            porHora.set(c.hora, redondear((porHora.get(c.hora) ?? 0) + c.total));
        }

        const ordenado = (m: Map<number, number>) =>
            Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            total_por_dia: ordenado(porDia).map(([dia, total]) => ({ dia: nombreDia(dia), total })),
            total_por_hora: ordenado(porHora)
                .slice(0, 6)
                .map(([hora, total]) => ({ hora: `${hora}:00`, total })),
            franja_pico: mapa.pico
                ? {
                      dia: nombreDia(mapa.pico.dia),
                      hora: `${mapa.pico.hora}:00`,
                      total: mapa.pico.total
                  }
                : null,
            horario_detectado:
                mapa.celdas.length > 0 ? `${mapa.horaMin}:00 a ${mapa.horaMax}:59` : null,
            como_leerlo:
                'El horario sale de las ventas reales, no de un horario configurado. Una ' +
                'hora sin ventas puede ser que estuviera cerrado o que no entrara nadie.',
            link: `/ventas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: mapa.celdas.length
                ? ([
                      bloqueMapaHorario('mapa_horario', 'Cuando entra la plata', mapa, nombreDia)
                  ] as Bloque[])
                : []
        };
    }
};

// -------------------------------------------------------------------- inventario

const inventario: Herramienta = {
    definicion: {
        nombre: 'inventario_alertas',
        descripcion:
            'Productos con stock critico, bajo o agotado, con su valor. Usar cuando ' +
            'pregunten por inventario, stock, que falta, que hay que reponer o que ' +
            'comprar.',
        parametros: {
            type: 'object',
            properties: { sedes: PARAM_SEDES, ...PARAM_FECHAS },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);

        const productos: any[] = [];
        for (const idsede of sedes.ids) {
            const filas = (await dashProductos.dashProductos(idsede, {
                tipo_consulta: 'inventario_alertas',
                rango_start_date: periodo.desde,
                rango_end_date: periodo.hasta
            })) as unknown as Array<Record<string, unknown>>;

            if (!Array.isArray(filas)) continue;

            for (const f of filas) {
                productos.push({
                    producto: String(f.producto_nombre ?? ''),
                    familia: String(f.producto_familia ?? ''),
                    stock: Number(f.stock_actual) || 0,
                    minimo: Number(f.stock_minimo) || 0,
                    valor: redondear(Number(f.valor_stock) || 0),
                    nivel: String(f.nivel_alerta ?? ''),
                    prioridad: Number(f.prioridad) || 0
                });
            }
        }

        productos.sort((a, b) => a.prioridad - b.prioridad || a.stock - b.stock);
        const agotados = productos.filter((p) => p.stock <= 0);

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            total_alertas: productos.length,
            agotados: agotados.length,
            valor_en_riesgo: redondear(productos.reduce((t, p) => t + p.valor, 0)),
            productos: productos.slice(0, 15),
            link: `/productos?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: productos.length
                ? ([
                      bloqueTablaInventario('tabla_stock', 'Stock por reponer', productos.slice(0, 15))
                  ] as Bloque[])
                : []
        };
    }
};


// --------------------------------------------------- modulos genericos del dash

/**
 * Herramientas que exponen el resto del dashboard. Comparten implementacion:
 * el modelo elige el "tipo" y el servidor valida contra la lista blanca del
 * modulo, resuelve sedes y acota el periodo.
 *
 * El resultado se devuelve recortado: estos procedures pueden traer listados
 * largos y el modelo no necesita cada fila para responder.
 */
const MAX_FILAS_MODULO = 20;

function titulizarTipo(tipo: string): string {
    const t = tipo.replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function herramientaDeModulo(
    modulo: NombreModulo,
    nombre: string,
    descripcion: string,
    enlace: string,
    descripcionCorta: string
): Herramienta {
    const tipos = MODULOS[modulo].tipos as readonly string[];

    return {
        definicion: {
            nombre,
            descripcion,
            parametros: {
                type: 'object',
                properties: {
                    sedes: PARAM_SEDES,
                    ...PARAM_FECHAS,
                    tipo: {
                        type: 'string',
                        enum: [...tipos],
                        description: 'Que vista del modulo consultar.'
                    }
                },
                required: ['tipo'],
                additionalProperties: false
            }
        },

        async ejecutar(args, ctx) {
            const sedes = resolverSedes(args.sedes, ctx);
            const periodo = periodoDe(args, ctx);
            const tipo = String(args.tipo ?? tipos[0]);

            const porSede = [];
            for (let i = 0; i < sedes.ids.length; i++) {
                const datos = await consultarModulo(
                    modulo,
                    sedes.ids[i],
                    tipo,
                    periodo.desde,
                    periodo.hasta
                );
                porSede.push({
                    sede: sedes.nombres[i],
                    datos: Array.isArray(datos) ? datos.slice(0, MAX_FILAS_MODULO) : datos,
                    filas_totales: Array.isArray(datos) ? datos.length : undefined
                });
            }

            // Se grafica el primer local: varias tablas apiladas no se leen.
            const primeras = porSede[0]?.datos;
            const titulo = `${descripcionCorta} · ${titulizarTipo(tipo)}`;

            // Tabla si son varias filas; KPIs si es un resumen. Sin el respaldo,
            // preguntas como "cuanto gaste en compras" o "cuanto vendo para no
            // perder" se contestaban sin un solo numero en pantalla.
            const bloque =
                (Array.isArray(primeras) && primeras.length > 1
                    ? bloqueTablaGenerica(
                          `tabla_${nombre}`,
                          titulo,
                          primeras as Array<Record<string, unknown>>
                      )
                    : null) ?? bloqueKpisResumen(`kpi_${nombre}`, titulo, primeras);

            return {
                periodo: { desde: periodo.desde, hasta: periodo.hasta },
                tipo,
                locales: porSede,
                sedes_descartadas: sedes.descartadas,
                link: `${enlace}?desde=${periodo.desde}&hasta=${periodo.hasta}`,
                bloques: bloque ? ([bloque] as Bloque[]) : []
            };
        }
    };
}

const clientes = herramientaDeModulo(
    'clientes',
    'clientes_analisis',
    'Clientes del local: resumen, listado, segmentacion por frecuencia y gasto, y ' +
        'creditos pendientes. Usar para preguntas sobre clientes, recurrencia, cuanto ' +
        'gastan o quien debe.',
    '/clientes',
    'Clientes'
);

const compras = herramientaDeModulo(
    'compras',
    'compras_gastos',
    'Compras y gastos a proveedores: resumen, listado, proveedores, productos mas ' +
        'comprados y evolucion. Usar para preguntas sobre gastos, compras, proveedores ' +
        'o en que se va la plata.',
    '/compras',
    'Compras'
);

const usuariosDash = herramientaDeModulo(
    'usuarios',
    'personal_rendimiento',
    'Rendimiento del personal: cajeros, meseros, top vendedores, bajo rendimiento y ' +
        'comparativa entre usuarios. Usar para preguntas sobre quien vende mas, como va ' +
        'el equipo o quien rinde poco.',
    '/usuarios',
    'Personal'
);

const puntoEquilibrio = herramientaDeModulo(
    'puntoEquilibrio',
    'punto_equilibrio',
    'Punto de equilibrio: gastos fijos, gastos variables, resumen por categorias y ' +
        'evolucion mensual. Usar para preguntas sobre gastos fijos, costos del local, ' +
        'cuanto hay que vender para no perder, o rentabilidad general.',
    '/punto-equilibrio',
    'Punto de equilibrio'
);

const promociones = herramientaDeModulo(
    'promociones',
    'promociones_cupones',
    'Promociones, cupones y descuentos aplicados: cuantos se usaron y cuanto costaron. ' +
        'Usar para preguntas sobre promociones, cupones o descuentos.',
    '/promociones',
    'Promociones'
);


// --------------------------------------------------------------------- encuestas

const encuestas: Herramienta = {
    definicion: {
        nombre: 'encuestas_opinion',
        descripcion:
            'Que opinan los clientes: NPS, satisfaccion, respuestas por canal y malas ' +
            'experiencias pendientes de atender. Usar para preguntas sobre encuestas, ' +
            'opinion de clientes, quejas, NPS o satisfaccion.',
        parametros: {
            type: 'object',
            properties: {
                sedes: PARAM_SEDES,
                ...PARAM_FECHAS,
                incluir_malas: {
                    type: 'boolean',
                    description: 'Trae tambien las malas experiencias pendientes de atender.'
                }
            },
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const rango = { inicio: periodo.desde, fin: periodo.hasta };

        const porSede = [];
        for (let i = 0; i < sedes.ids.length; i++) {
            const tablero: any = await encuestasDash.tablero(sedes.ids[i], rango as any);

            const malas =
                args.incluir_malas === true
                    ? ((await encuestasDash.alertas(sedes.ids[i], rango as any, 'pendientes')) as any[])
                    : [];

            porSede.push({
                sede: sedes.nombres[i],
                kpis: tablero?.kpis ?? null,
                canales: tablero?.canales ?? [],
                // El tablero ya traia todo esto y se estaba descartando aqui: por
                // eso no sabia decir que mozo tiene mejor nota, ni a que hora se
                // queja mas la gente, ni como se reparten las notas.
                mozos: tablero?.mozos ?? [],
                distribucion_notas: tablero?.distribucion ?? [],
                por_hora: tablero?.horas ?? [],
                preguntas: tablero?.preguntas ?? [],
                hay_encuestas_activas: tablero?.hay_activas ?? false,
                // Solo lo necesario para hablar de ellas: nada de datos del cliente.
                malas_pendientes: malas.slice(0, 8).map((a: any) => ({
                    id: a.id,
                    fecha: a.respondido_en,
                    motivos: a.motivos,
                    comentario: a.comentario,
                    mesa: a.nummesa,
                    mozo: a.mozo
                }))
            });
        }

        // KPIs del primer local y, si hay varios canales, su reparto.
        const k = porSede[0]?.kpis as Record<string, unknown> | null;
        const bloques: Bloque[] = [];

        if (k) {
            const csat = Number(k.csat_prom) || 0;

            bloques.push(
                bloqueKpis('kpi_encuestas', `Opinion ${porSede[0].sede}`, [
                    { etiqueta: 'NPS', valor: Number(k.nps) || 0, formato: 'entero' },
                    // La satisfaccion sale aqui solo si no hay medidor: repetida en
                    // los dos sitios, el modelo elegia el KPI y el medidor no salia
                    // nunca.
                    ...(csat > 0
                        ? []
                        : [
                              {
                                  etiqueta: 'Satisfaccion',
                                  valor: csat,
                                  formato: 'entero' as const
                              }
                          ]),
                    {
                        etiqueta: 'Respuestas',
                        valor: Number(k.respuestas) || 0,
                        formato: 'entero'
                    },
                    {
                        etiqueta: 'Malas sin atender',
                        valor: Number(k.malas_pendientes) || 0,
                        formato: 'entero'
                    }
                ])
            );

            // La satisfaccion es una nota del 1 al 5: suelta no dice si 3.8 esta
            // bien. El medidor trae la escala puesta.
            if (csat > 0) {
                bloques.push(
                    bloqueMedidor('medidor_csat', 'Satisfaccion del cliente', 'Nota media', csat, 1, 5)
                );
            }
        }

        const canales = porSede[0]?.canales as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(canales) && canales.length > 1) {
            const tabla = bloqueTablaGenerica('tabla_canales', 'Por canal', canales);
            if (tabla) bloques.push(tabla);
        }

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            locales: porSede,
            sedes_descartadas: sedes.descartadas,
            link: `/encuestas?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques
        };
    }
};


// ------------------------------------------------------- detalle de operaciones

const operacionesDetalle: Herramienta = {
    definicion: {
        nombre: 'operaciones_detalle',
        descripcion:
            'Detalle linea por linea de pedidos anulados, ventas anuladas, items ' +
            'borrados o salidas de caja: cual fue, cuando, quien y por que motivo. ' +
            'Usar cuando pidan ver el detalle de algo que salio en las alertas, o ' +
            'preguntan "cuales fueron".',
        parametros: {
            type: 'object',
            properties: {
                sedes: PARAM_SEDES,
                ...PARAM_FECHAS,
                tipo: {
                    type: 'string',
                    enum: ['pedidos_anulados', 'ventas_anuladas', 'items_borrados', 'egresos_caja'],
                    description: 'Que operaciones detallar.'
                },
                grafico: PARAM_GRAFICO(
                    ['lista', 'por_dia'],
                    'lista = cada operacion con su monto, para ver cuales fueron. ' +
                        'por_dia = columnas con el monto de cada dia, para ver CUANDO se ' +
                        'concentra. Si preguntan por dias, fechas o cuando pasa, es por_dia.'
                ),
                limite: { type: 'integer', minimum: 1, maximum: 30 }
            },
            required: ['tipo'],
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);
        const periodo = periodoDe(args, ctx);
        const tipo = String(args.tipo) as TipoDetalle;

        const operaciones = await detalleOperaciones(
            tipo,
            sedes.ids,
            periodo.desde,
            periodo.hasta,
            Number(args.limite) || 15
        );

        const total = operaciones.reduce((t, o) => t + o.monto, 0);

        // Agrupado aparte y no sobre `operaciones`: esa lista viene cortada en 30
        // filas, asi que repartirla por dia daria un reparto falso.
        const porDia = await operacionesPorDia(tipo, sedes.ids, periodo.desde, periodo.hasta);
        const diaPeor = porDia.reduce(
            (mx, d) => (!mx || d.monto > mx.monto ? d : mx),
            null as (typeof porDia)[number] | null
        );

        return {
            periodo: { desde: periodo.desde, hasta: periodo.hasta },
            sedes: sedes.nombres,
            tipo,
            cantidad: operaciones.length,
            monto_total: redondear(total),
            operaciones,
            sin_motivo: operaciones.filter((o) => !o.motivo).length,
            // El reparto por dia va SIEMPRE en la respuesta aunque no se dibuje:
            // es lo que permite contestar "que dias se borra mas" sin contar a ojo
            // una lista truncada.
            por_dia: porDia,
            dia_con_mas_monto: diaPeor,
            link: `/caja?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            bloques: (operaciones.length
                ? elegirVista(
                      args.grafico,
                      {
                          lista: () => [
                              bloqueTablaGenerica(
                                  'tabla_operaciones',
                                  titulizarTipo(tipo),
                                  operaciones.map((o) => ({
                                      referencia: o.referencia,
                                      monto: o.monto
                                  }))
                              )
                          ],
                          por_dia: () => [
                              bloqueComboVentas(
                                  'operaciones_por_dia',
                                  `${titulizarTipo(tipo)} por dia`,
                                  porDia.map((d) => ({
                                      fecha: d.fecha,
                                      total: d.monto,
                                      transacciones: d.cantidad
                                  }))
                              )
                          ],
                          auto: () => [
                              bloqueTablaGenerica(
                                  'tabla_operaciones',
                                  titulizarTipo(tipo),
                                  operaciones.map((o) => ({
                                      referencia: o.referencia,
                                      monto: o.monto
                                  }))
                              )
                          ]
                      },
                      'auto'
                  )
                : []
            ).filter(Boolean) as Bloque[]
        };
    }
};


// ----------------------------------------------------------------- avisos

/**
 * Lo unico del catalogo que toca una tabla propia, y aun asi no escribe: con
 * "proponer" devuelve un bloque de acciones para que el usuario confirme. Si el
 * modelo pudiera crear reglas, bastaria convencerlo por el chat.
 */
const avisos: Herramienta = {
    definicion: {
        nombre: 'avisos_configurar',
        descripcion:
            'Alertas permanentes del tipo "avisame si...". Con accion "listar" ' +
            'devuelve las que ya existen; con "proponer" prepara una nueva para que ' +
            'el usuario la confirme con un boton. Usar cuando pidan que les avises ' +
            'de algo, que vigiles algo, o pregunten que avisos tienen activos.',
        parametros: {
            type: 'object',
            properties: {
                accion: { type: 'string', enum: ['listar', 'proponer'] },
                sedes: PARAM_SEDES,
                tipo: {
                    type: 'string',
                    enum: CATALOGO.map((c) => c.tipo),
                    description: 'Solo para proponer. Que se vigila.'
                },
                umbral: {
                    type: 'number',
                    description:
                        'Solo para proponer. Porcentaje, soles o cantidad segun el tipo.'
                }
            },
            required: ['accion'],
            additionalProperties: false
        }
    },

    async ejecutar(args, ctx) {
        const sedes = resolverSedes(args.sedes, ctx);

        const tipos = CATALOGO.map((c) => ({
            tipo: c.tipo,
            descripcion: c.etiqueta,
            unidad: c.unidad
        }));

        if (args.accion === 'listar') {
            const reglas = await listarReglas(sedes.ids);
            return {
                sedes: sedes.nombres,
                cantidad: reglas.length,
                reglas,
                tipos_disponibles: tipos
            };
        }

        const def = definicionDe(String(args.tipo ?? ''));
        const umbral = Number(args.umbral);
        if (!Number.isFinite(umbral) || umbral <= 0) {
            throw new ErrorValidacion('El umbral debe ser un numero mayor que cero');
        }

        const idsede = sedes.ids[0];
        const descripcion = def.plantilla(umbral);

        return {
            propuesta: { idsede, sede: sedes.nombres[0], tipo: def.tipo, umbral, descripcion },
            instruccion_para_ti:
                'Di en una frase que vas a vigilar y que debe pulsar el boton para ' +
                'activarlo. No digas que ya quedo activo, porque todavia no lo esta.',
            bloques: [
                {
                    id: 'accion_aviso',
                    tipo: 'acciones',
                    titulo: descripcion,
                    acciones: [
                        {
                            etiqueta: 'Activar aviso',
                            operacion: 'crear_regla',
                            datos: { idsede, tipo: def.tipo, umbral }
                        }
                    ]
                }
            ] as Bloque[]
        };
    }
};

// ------------------------------------------------------------------- catalogo

export const HERRAMIENTAS: Herramienta[] = [
    ventasResumen,
    ventasPorDiaHerramienta,
    horarios,
    canales,
    planilla,
    reparto,
    localesComparar,
    productosTop,
    metasAvance,
    rentabilidadPlatos,
    inventario,
    alertas,
    operacionesDetalle,
    clientes,
    compras,
    usuariosDash,
    puntoEquilibrio,
    promociones,
    encuestas,
    avisos,
    clima
];

export const DEFINICIONES: DefinicionHerramienta[] = HERRAMIENTAS.map((h) => h.definicion);

export async function ejecutarHerramienta(
    nombre: string,
    args: Record<string, unknown>,
    ctx: ContextoAsistente
): Promise<unknown> {
    const h = HERRAMIENTAS.find((x) => x.definicion.nombre === nombre);
    if (!h) {
        throw new ErrorValidacion(`Herramienta desconocida: ${nombre}`);
    }
    return h.ejecutar(args, ctx);
}
