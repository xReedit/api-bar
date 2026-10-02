"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.bloqueTablaGenerica = exports.bloqueTablaInventario = exports.bloqueTablaMargen = exports.bloqueDispersionMargen = exports.bloqueRadialMetas = exports.bloqueMapaHorario = exports.bloquePendiente = exports.bloqueMancuernaMetas = exports.bloqueComboVentas = exports.bloqueComparativaDias = exports.bloqueDonaCanales = exports.bloqueRankingUsuarios = exports.bloqueKpisAlertas = exports.bloqueKpisResumen = exports.bloqueTreemap = exports.bloqueMedidor = exports.bloqueRankingMetas = exports.bloqueClima = exports.bloqueTablaProductos = exports.bloqueBarrasLocales = exports.bloqueRankingLocales = exports.bloqueSerieDiaria = exports.bloqueKpis = void 0;
var agregados_1 = require("../dash/agregados");
/**
 * Constructores de bloques visuales.
 *
 * Los alturas y los recortes salen de aqui, no del frontend, porque dependen de
 * los datos: seis locales caben en barras, veinte no. El criterio de movil esta
 * en docs/PLAN_ASISTENTE_IA.md, 4 ter.
 */
var ALTO_MOVIL = 220;
var ALTO_ESCRITORIO = 360;
function bloqueKpis(id, titulo, kpis) {
    return { id: id, tipo: 'kpi', titulo: titulo, kpis: kpis };
}
exports.bloqueKpis = bloqueKpis;
var MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];
/**
 * Etiqueta del eje segun la granularidad de la clave.
 * "2026-08" -> "ago 2026";  "2026-08-15" -> "15/08"
 */
function etiquetaFecha(clave) {
    var _a;
    if (clave.length === 7) {
        var _b = clave.split('-'), ano = _b[0], mes_1 = _b[1];
        return "".concat((_a = MESES[Number(mes_1) - 1]) !== null && _a !== void 0 ? _a : mes_1, " ").concat(ano);
    }
    var _c = clave.split('-'), mes = _c[1], dia = _c[2];
    return "".concat(dia, "/").concat(mes);
}
/** Serie temporal: linea. Con muchos puntos, las etiquetas se apinan en movil. */
function bloqueSerieDiaria(id, titulo, serie, meta) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            // Area y no linea: el relleno da el volumen de un vistazo, y es como se
            // ve la misma serie en el dashboard.
            apex: 'area',
            categorias: serie.map(function (d) { return etiquetaFecha(d.fecha); }),
            series: [{ name: 'Ventas', data: serie.map(function (d) { return d.total; }) }],
            formatoValor: 'moneda',
            // La linea de meta convierte "vendi 1,200" en "me falto" o "la pase".
            referenciaY: meta,
            altoMovil: ALTO_MOVIL,
            altoEscritorio: ALTO_ESCRITORIO,
            leyenda: false
        }
    };
}
exports.bloqueSerieDiaria = bloqueSerieDiaria;
/**
 * Ranking de locales: barras horizontales. En movil solo entran unas pocas, asi
 * que se recorta y el frontend ofrece "ver todos".
 */
function bloqueRankingLocales(id, titulo, locales) {
    return {
        id: id,
        tipo: 'ranking',
        titulo: titulo,
        columnas: [
            { clave: 'nombre', titulo: 'Local' },
            { clave: 'total', titulo: 'Vendido', formato: 'moneda' },
            { clave: 'participacion_pct', titulo: '% del total', formato: 'porcentaje' },
            { clave: 'vs_anterior_pct', titulo: 'vs anterior', formato: 'porcentaje' }
        ],
        filas: locales.map(function (l) { return ({
            nombre: l.nombre,
            total: l.total,
            participacion_pct: l.participacion_pct,
            vs_anterior_pct: l.vs_anterior_pct
        }); }),
        claveProporcion: 'total',
        filasVisiblesMovil: 5
    };
}
exports.bloqueRankingLocales = bloqueRankingLocales;
/** Mismo dato que el ranking, en barras, para cuando la comparacion es lo central. */
function bloqueBarrasLocales(id, titulo, locales) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'bar',
            categorias: locales.map(function (l) { return l.nombre; }),
            series: [{ name: 'Vendido', data: locales.map(function (l) { return l.total; }) }],
            formatoValor: 'moneda',
            altoMovil: Math.min(ALTO_MOVIL + locales.length * 18, 360),
            altoEscritorio: ALTO_ESCRITORIO,
            leyenda: false
        }
    };
}
exports.bloqueBarrasLocales = bloqueBarrasLocales;
/** Productos: tabla. Con mas de tres columnas, el frontend apila en tarjetas. */
function bloqueTablaProductos(id, titulo, productos) {
    return {
        id: id,
        tipo: 'tabla',
        titulo: titulo,
        columnas: [
            { clave: 'producto', titulo: 'Producto' },
            { clave: 'cantidad', titulo: 'Cantidad', formato: 'entero' },
            { clave: 'importe', titulo: 'Importe', formato: 'moneda' }
        ],
        filas: productos.map(function (p) { return ({
            producto: p.producto,
            cantidad: p.cantidad,
            importe: p.importe
        }); }),
        claveProporcion: 'importe',
        filasVisiblesMovil: 8
    };
}
exports.bloqueTablaProductos = bloqueTablaProductos;
var DIAS_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
/** Tira de pronostico: un dia por tarjeta, para leer de un vistazo. */
function bloqueClima(id, titulo, dias) {
    var items = dias.map(function (d) {
        var fecha = new Date(d.fecha + 'T12:00:00Z');
        return {
            etiqueta: "".concat(DIAS_SEMANA[fecha.getUTCDay()], " ").concat(fecha.getUTCDate()),
            minima: d.minima,
            maxima: d.maxima,
            probLluvia: d.prob_lluvia_pct,
            cielo: d.cielo
        };
    });
    return { id: id, tipo: 'clima', titulo: titulo, dias: items };
}
exports.bloqueClima = bloqueClima;
/**
 * Avance de meta por local. La barra mide el porcentaje de meta alcanzado, no
 * la venta: dos locales con ventas muy distintas pueden ir igual de bien.
 */
function bloqueRankingMetas(id, titulo, locales) {
    return {
        id: id,
        tipo: 'ranking',
        titulo: titulo,
        columnas: [
            { clave: 'nombre', titulo: 'Local' },
            { clave: 'avancePct', titulo: 'Avance', formato: 'porcentaje' },
            { clave: 'vendido', titulo: 'Vendido', formato: 'moneda' },
            { clave: 'meta', titulo: 'Meta', formato: 'moneda' },
            { clave: 'proyeccionPct', titulo: 'Proyeccion', formato: 'porcentaje' }
        ],
        filas: locales.map(function (l) { return ({
            nombre: l.nombre,
            avancePct: l.avancePct,
            vendido: l.vendido,
            meta: l.meta,
            proyeccionPct: l.proyeccionPct
        }); }),
        claveProporcion: 'avancePct',
        filasVisiblesMovil: 5
    };
}
exports.bloqueRankingMetas = bloqueRankingMetas;
/** Margen por plato. La barra mide el food cost: cuanto mas larga, peor. */
/**
 * Medidor de media luna.
 *
 * Para una nota suelta (satisfaccion, NPS) un numero no dice si esta bien o mal.
 * El medidor trae la escala puesta: se ve donde cae sin saber que rango es bueno.
 */
function bloqueMedidor(id, titulo, etiqueta, valor, min, max, sufijo) {
    if (sufijo === void 0) { sufijo = ''; }
    var pct = max > min ? ((valor - min) / (max - min)) * 100 : 0;
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'radialBar',
            categorias: [],
            series: [{ name: etiqueta, data: [Math.min(Math.max(pct, 0), 100)] }],
            etiquetas: [etiqueta],
            medidor: { min: min, max: max, sufijo: sufijo },
            formatoValor: 'entero',
            altoMovil: 220,
            altoEscritorio: 260,
            leyenda: false
        }
    };
}
exports.bloqueMedidor = bloqueMedidor;
/**
 * Treemap: el area ES la participacion.
 *
 * Una lista ordenada dice el orden; el treemap dice el peso. Que una seccion
 * ocupe media tarjeta se entiende sin leer un solo numero.
 */
function bloqueTreemap(id, titulo, items) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'treemap',
            categorias: [],
            series: [
                {
                    name: 'Participacion',
                    data: items
                        .filter(function (i) { return i.valor > 0; })
                        .map(function (i) { return ({ x: i.nombre, y: (0, agregados_1.redondear)(i.valor) }); })
                }
            ],
            formatoValor: 'moneda',
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: false
        }
    };
}
exports.bloqueTreemap = bloqueTreemap;
/**
 * KPIs a partir de un resumen: un objeto, o una lista de una sola fila.
 *
 * Los modulos genericos devuelven dos formas distintas: una lista de filas
 * (compras por proveedor) o un resumen con totales (punto de equilibrio). La
 * tabla generica solo sabe dibujar la primera, asi que la mitad de los modulos
 * respondia sin un solo numero en pantalla. Esto cubre la otra mitad.
 */
function bloqueKpisResumen(id, titulo, datos) {
    var fila = Array.isArray(datos) && datos.length === 1
        ? datos[0]
        : !Array.isArray(datos) && datos && typeof datos === 'object'
            ? datos
            : null;
    if (!fila)
        return null;
    var kpis = Object.entries(fila)
        .filter(function (_a) {
        var v = _a[1];
        return typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(Number(v)));
    })
        .map(function (_a) {
        var clave = _a[0], v = _a[1];
        return ({
            etiqueta: clave.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }),
            valor: Number(v),
            // El nombre de la columna es lo unico que dice si son soles o unidades.
            formato: /total|monto|importe|venta|costo|gasto|precio|ingreso|utilidad/i.test(clave)
                ? 'moneda'
                : /pct|porcentaje|margen/i.test(clave)
                    ? 'porcentaje'
                    : 'entero'
        });
    })
        .slice(0, 6);
    return kpis.length ? { id: id, tipo: 'kpi', titulo: titulo, kpis: kpis } : null;
}
exports.bloqueKpisResumen = bloqueKpisResumen;
/**
 * Indicadores de alerta como KPIs, con su peso sobre la venta.
 *
 * Era el modulo que mas importa mirar y el unico que respondia sin un solo
 * numero en pantalla: "hay algo raro este mes" se contestaba en prosa. El delta
 * es la variacion contra el periodo anterior, que es lo que convierte una cifra
 * suelta en una senal.
 */
function bloqueKpisAlertas(id, titulo, indicadores) {
    var conDatos = indicadores.filter(function (i) { return i.monto > 0; });
    if (conDatos.length === 0)
        return null;
    return {
        id: id,
        tipo: 'kpi',
        titulo: titulo,
        kpis: conDatos.slice(0, 6).map(function (i) { return ({
            // La marca deja el ojo donde hay que mirar sin leer los seis.
            etiqueta: i.anomalo ? "".concat(i.etiqueta, " !") : i.etiqueta,
            valor: i.monto,
            delta: i.variacionPct,
            formato: 'moneda'
        }); })
    };
}
exports.bloqueKpisAlertas = bloqueKpisAlertas;
/** Quien borra, quien anula, quien saca de caja: ranking con barra de proporcion. */
function bloqueRankingUsuarios(id, titulo, usuarios) {
    if (usuarios.length === 0)
        return null;
    return {
        id: id,
        tipo: 'ranking',
        titulo: titulo,
        columnas: [
            { clave: 'usuario', titulo: 'Usuario' },
            { clave: 'monto', titulo: 'Monto', formato: 'moneda' },
            { clave: 'cantidad', titulo: 'Veces', formato: 'entero' }
        ],
        filas: usuarios.slice(0, 8).map(function (u) { return ({
            usuario: u.usuario,
            monto: u.monto,
            cantidad: u.cantidad
        }); }),
        claveProporcion: 'monto',
        filasVisiblesMovil: 5
    };
}
exports.bloqueRankingUsuarios = bloqueRankingUsuarios;
/**
 * Reparto por canal en dona.
 *
 * Tres o cuatro partes que suman el total: es el caso para el que sirve una
 * dona. Con mas categorias no se distinguen los sectores y gana una tabla.
 */
function bloqueDonaCanales(id, titulo, canales) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'donut',
            categorias: canales.map(function (c) { return c.canal; }),
            etiquetas: canales.map(function (c) { return c.canal; }),
            series: [{ name: 'Vendido', data: canales.map(function (c) { return c.total; }) }],
            formatoValor: 'moneda',
            altoMovil: 260,
            altoEscritorio: 300,
            leyenda: true
        }
    };
}
exports.bloqueDonaCanales = bloqueDonaCanales;
var DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
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
function bloqueComparativaDias(id, titulo, actual, anterior, etiquetaActual, etiquetaAnterior, meta, agrupar) {
    if (agrupar === void 0) { agrupar = 'dia'; }
    var largo = Math.max(actual.length, anterior.length);
    // El eje tiene que ser lo que los dos periodos COMPARTEN, no las fechas de
    // uno de ellos: poner "Lun 28/09" sobre dos series de semanas distintas hace
    // creer que ambas son del 28.
    var categorias = Array.from({ length: largo }, function (_, i) {
        var _a;
        var dia = (_a = actual[i]) === null || _a === void 0 ? void 0 : _a.fecha;
        if (!dia)
            return "".concat(i + 1);
        var d = new Date(dia + 'T00:00:00Z');
        if (agrupar === 'mes')
            return MESES[d.getUTCMonth()];
        if (agrupar === 'semana')
            return "Sem ".concat(i + 1);
        // Hasta una semana, el dia de la semana se lee solo. Mas alla se repetiria
        // cuatro veces, asi que manda el dia del mes, que es como se alinean.
        if (largo <= 7)
            return DIA_CORTO[d.getUTCDay()];
        return String(d.getUTCDate()).padStart(2, '0');
    });
    var serie = function (filas) {
        return Array.from({ length: largo }, function (_, i) { var _a, _b; return (_b = (_a = filas[i]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0; });
    };
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            // Area, con el relleno a baja opacidad: da el volumen de cada periodo
            // sin tapar el cruce de los trazos, que es lo que hay que leer.
            apex: 'area',
            categorias: categorias,
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
exports.bloqueComparativaDias = bloqueComparativaDias;
/**
 * Columnas de venta con la linea de tickets encima.
 *
 * Dos dias con la misma venta no son el mismo dia: uno pudo ser mucha gente con
 * ticket chico y el otro al reves. Esa lectura necesita las dos series juntas.
 */
function bloqueComboVentas(id, titulo, dias, meta) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'line',
            categorias: dias.map(function (d) { return etiquetaFecha(d.fecha); }),
            series: [
                { name: 'Vendido', tipo: 'column', data: dias.map(function (d) { return d.total; }) },
                { name: 'Tickets', tipo: 'line', data: dias.map(function (d) { return d.transacciones; }) }
            ],
            referenciaY: meta,
            formatoValor: 'moneda',
            altoMovil: 240,
            altoEscritorio: 300,
            leyenda: true
        }
    };
}
exports.bloqueComboVentas = bloqueComboVentas;
/**
 * Mancuerna vendido/meta.
 *
 * Lo que importa de una meta no es el porcentaje, es cuanto falta. La distancia
 * entre los dos puntos ES lo que falta, en soles y a escala.
 */
function bloqueMancuernaMetas(id, titulo, locales) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'rangeBar',
            categorias: [],
            series: [
                {
                    name: 'Vendido vs meta',
                    // El rango va de menor a mayor; si se pasaron de la meta, se
                    // invierte igual y la barra sigue midiendo la diferencia.
                    data: locales.map(function (l) { return ({
                        x: l.nombre,
                        y: [
                            Math.min(l.vendido, l.meta),
                            Math.max(l.vendido, l.meta)
                        ]
                    }); })
                }
            ],
            formatoValor: 'moneda',
            altoMovil: 60 + locales.length * 38,
            altoEscritorio: 80 + locales.length * 42,
            leyenda: false
        }
    };
}
exports.bloqueMancuernaMetas = bloqueMancuernaMetas;
/**
 * Pendiente entre dos periodos.
 *
 * Una tabla con "+12%" y "-8%" obliga a leer fila por fila. Aqui se ve de un
 * golpe quien sube y quien baja, y cuanto se cruzan entre si.
 */
function bloquePendiente(id, titulo, etiquetaAntes, etiquetaAhora, items) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'line',
            categorias: [etiquetaAntes, etiquetaAhora],
            series: items.map(function (i) { return ({ name: i.nombre, data: [i.antes, i.ahora] }); }),
            formatoValor: 'moneda',
            altoMovil: 260,
            altoEscritorio: 300,
            leyenda: true
        }
    };
}
exports.bloquePendiente = bloquePendiente;
/**
 * Mapa de calor dia x hora.
 *
 * Una serie de tiempo contesta "cuanto vendi"; esto contesta "cuando", que es lo
 * que decide turnos y compras. En orden inverso porque ApexCharts dibuja la
 * primera serie abajo, y una semana se lee de lunes hacia abajo.
 */
function bloqueMapaHorario(id, titulo, mapa, nombreDia) {
    var horas = [];
    for (var h = mapa.horaMin; h <= mapa.horaMax; h++)
        horas.push(h);
    var porDia = new Map();
    for (var _i = 0, _a = mapa.celdas; _i < _a.length; _i++) {
        var c = _a[_i];
        porDia.set("".concat(c.dia, "-").concat(c.hora), c.total);
    }
    var series = [];
    var _loop_1 = function (dia) {
        series.push({
            name: nombreDia(dia).slice(0, 3),
            data: horas.map(function (h) {
                var _a;
                return ({
                    x: "".concat(String(h).padStart(2, '0'), "h"),
                    y: (_a = porDia.get("".concat(dia, "-").concat(h))) !== null && _a !== void 0 ? _a : 0
                });
            })
        });
    };
    for (var dia = 7; dia >= 1; dia--) {
        _loop_1(dia);
    }
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'heatmap',
            categorias: horas.map(function (h) { return "".concat(String(h).padStart(2, '0'), "h"); }),
            series: series,
            formatoValor: 'moneda',
            // Una fila por dia: con siete filas el alto crece poco en movil.
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: false
        }
    };
}
exports.bloqueMapaHorario = bloqueMapaHorario;
/**
 * Avance de meta en anillo.
 *
 * Con un solo local el ranking es una fila sola, que no dice nada de un vistazo.
 * El anillo se lee como un indicador de tablero: lleno o no lleno.
 */
function bloqueRadialMetas(id, titulo, locales) {
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'radialBar',
            categorias: [],
            // Pasado del 100% el anillo da la vuelta y confunde: se corta ahi.
            series: [{ name: 'Avance', data: locales.map(function (l) { return Math.min(l.avancePct, 100); }) }],
            etiquetas: locales.map(function (l) { return l.nombre; }),
            formatoValor: 'entero',
            altoMovil: 240,
            altoEscritorio: 280,
            leyenda: locales.length > 1
        }
    };
}
exports.bloqueRadialMetas = bloqueRadialMetas;
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
function bloqueDispersionMargen(id, titulo, platos) {
    var conDatos = platos.filter(function (p) { return p.cantidad > 0 && p.margen_pct !== null; });
    var promedio = conDatos.reduce(function (t, p) { var _a; return t + ((_a = p.margen_pct) !== null && _a !== void 0 ? _a : 0); }, 0) / (conDatos.length || 1);
    return {
        id: id,
        tipo: 'grafico',
        titulo: titulo,
        grafico: {
            apex: 'scatter',
            categorias: [],
            series: conDatos.map(function (p) {
                var _a;
                return ({
                    name: p.plato,
                    data: [[p.cantidad, (_a = p.margen_pct) !== null && _a !== void 0 ? _a : 0]]
                });
            }),
            formatoValor: 'entero',
            tituloX: 'Unidades vendidas',
            tituloY: 'Margen %',
            referenciaY: {
                valor: Math.round(promedio * 10) / 10,
                etiqueta: "Margen promedio ".concat(Math.round(promedio), "%")
            },
            altoMovil: 260,
            altoEscritorio: 320,
            leyenda: true
        }
    };
}
exports.bloqueDispersionMargen = bloqueDispersionMargen;
function bloqueTablaMargen(id, titulo, platos) {
    return {
        id: id,
        tipo: 'tabla',
        titulo: titulo,
        columnas: [
            { clave: 'plato', titulo: 'Plato' },
            { clave: 'ganancia', titulo: 'Ganancia', formato: 'moneda' },
            { clave: 'margen_pct', titulo: 'Margen', formato: 'porcentaje' },
            { clave: 'food_cost_pct', titulo: 'Food cost', formato: 'porcentaje' }
        ],
        filas: platos.map(function (p) { return ({
            plato: p.plato,
            ganancia: p.ganancia,
            margen_pct: p.margen_pct,
            food_cost_pct: p.food_cost_pct
        }); }),
        // La barra marca el margen, que es por lo que viene ordenada la lista. Si
        // marcara la ganancia en soles, el primer plato (99% de margen) saldria
        // con media barra y parecia un error.
        claveProporcion: 'margen_pct',
        filasVisiblesMovil: 6
    };
}
exports.bloqueTablaMargen = bloqueTablaMargen;
/** Stock a reponer, lo mas urgente arriba. */
function bloqueTablaInventario(id, titulo, productos) {
    return {
        id: id,
        tipo: 'tabla',
        titulo: titulo,
        columnas: [
            { clave: 'producto', titulo: 'Producto' },
            { clave: 'stock', titulo: 'Stock', formato: 'entero' },
            { clave: 'minimo', titulo: 'Minimo', formato: 'entero' },
            { clave: 'nivel', titulo: 'Nivel' }
        ],
        filas: productos.map(function (p) { return ({
            producto: p.producto,
            stock: p.stock,
            minimo: p.minimo,
            nivel: p.nivel
        }); }),
        filasVisiblesMovil: 6
    };
}
exports.bloqueTablaInventario = bloqueTablaInventario;
/** Claves que, por su nombre, son dinero o porcentaje. */
var CLAVES_MONEDA = /total|importe|monto|precio|costo|venta|gasto|ingreso|saldo|deuda/i;
var CLAVES_PCT = /pct|porcentaje|avance|tasa|margen/i;
function formatoDe(clave) {
    if (CLAVES_PCT.test(clave))
        return 'porcentaje';
    if (CLAVES_MONEDA.test(clave))
        return 'moneda';
    return 'entero';
}
function titulizar(clave) {
    var t = clave.replace(/_/g, ' ').trim();
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
function bloqueTablaGenerica(id, titulo, filas, maximo) {
    if (maximo === void 0) { maximo = 10; }
    if (!Array.isArray(filas) || filas.length === 0)
        return null;
    var primera = filas[0];
    if (!primera || typeof primera !== 'object')
        return null;
    var claves = Object.keys(primera).filter(function (k) { return !/^id/i.test(k); });
    var texto = claves.find(function (k) { return typeof primera[k] === 'string'; });
    var numericas = claves
        .filter(function (k) { return k !== texto && typeof primera[k] === 'number'; })
        .slice(0, 3);
    if (!texto || numericas.length === 0)
        return null;
    return {
        id: id,
        tipo: 'tabla',
        titulo: titulo,
        columnas: __spreadArray([
            { clave: texto, titulo: titulizar(texto) }
        ], numericas.map(function (k) { return ({ clave: k, titulo: titulizar(k), formato: formatoDe(k) }); }), true),
        filas: filas.slice(0, maximo).map(function (f) {
            var _a;
            var _b;
            var fila = (_a = {},
                _a[texto] = String((_b = f[texto]) !== null && _b !== void 0 ? _b : ''),
                _a);
            for (var _i = 0, numericas_1 = numericas; _i < numericas_1.length; _i++) {
                var k = numericas_1[_i];
                fila[k] = Number(f[k]) || 0;
            }
            return fila;
        }),
        claveProporcion: numericas[0],
        filasVisiblesMovil: 6
    };
}
exports.bloqueTablaGenerica = bloqueTablaGenerica;
