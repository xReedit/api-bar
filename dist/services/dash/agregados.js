"use strict";
/**
 * Agregaciones de ventas: la definicion unica de "cuanto se vendio".
 *
 * Portado de src/lib/services/ventas.helper.ts del dashboard, que hasta ahora
 * era el unico lugar donde vivia esta cuenta (la hacia el navegador). El
 * asistente IA necesita la misma cifra desde el servidor, y dos implementaciones
 * distintas de la misma cuenta es exactamente como se llega a que dos pantallas
 * no cuadren.
 *
 * DEUDA: el dashboard deberia consumir esto en vez de recalcularlo. Mientras
 * tanto, cualquier cambio aqui hay que replicarlo alla.
 *
 * OJO con la semantica heredada: cada fila es una LINEA DE PAGO
 * (registro_pago_detalle), no una venta. Una venta pagada mitad efectivo mitad
 * tarjeta cuenta como dos. Se mantiene asi para coincidir con lo que muestra
 * hoy el dashboard.
 */
exports.__esModule = true;
exports.redondear = exports.variacionPct = exports.rellenarDias = exports.ventasPorDia = exports.resumenVentas = void 0;
function aNumero(v) {
    var n = typeof v === 'number' ? v : parseFloat(String(v !== null && v !== void 0 ? v : '0'));
    return Number.isFinite(n) ? n : 0;
}
function resumenVentas(filas) {
    var activas = filas.filter(function (v) { return Number(v.anulado) === 0; });
    var anuladas = filas.filter(function (v) { return Number(v.anulado) === 1; });
    var importes = activas.map(function (v) { return aNumero(v.importe); });
    var total = importes.reduce(function (s, x) { return s + x; }, 0);
    return {
        total: redondear(total),
        totalAnuladas: redondear(anuladas.reduce(function (s, v) { return s + aNumero(v.importe); }, 0)),
        transacciones: activas.length,
        cantidadAnuladas: anuladas.length,
        promedio: activas.length > 0 ? redondear(total / activas.length) : 0,
        ventaMayor: importes.length > 0 ? redondear(Math.max.apply(Math, importes)) : 0,
        ventaMenor: importes.length > 0 ? redondear(Math.min.apply(Math, importes)) : 0
    };
}
exports.resumenVentas = resumenVentas;
/** Clave de agrupacion a partir de una fecha ISO. */
function claveDe(fecha, agrupar) {
    if (agrupar === 'mes')
        return fecha.slice(0, 7); // YYYY-MM
    if (agrupar === 'semana') {
        var d = new Date(fecha + 'T00:00:00Z');
        // Lunes de esa semana; agrupar por dia natural despista con periodos largos.
        var dia = (d.getUTCDay() + 6) % 7;
        d.setUTCDate(d.getUTCDate() - dia);
        return d.toISOString().slice(0, 10);
    }
    return fecha;
}
/** Serie temporal, ordenada. Solo ventas no anuladas. */
function ventasPorDia(filas, agrupar) {
    var _a, _b;
    if (agrupar === void 0) { agrupar = 'dia'; }
    var acumulado = new Map();
    for (var _i = 0, filas_1 = filas; _i < filas_1.length; _i++) {
        var v = filas_1[_i];
        if (Number(v.anulado) !== 0)
            continue;
        var fecha = String((_a = v.fecha) !== null && _a !== void 0 ? _a : '').slice(0, 10);
        if (!fecha)
            continue;
        var clave = claveDe(fecha, agrupar);
        var acc = (_b = acumulado.get(clave)) !== null && _b !== void 0 ? _b : { total: 0, transacciones: 0 };
        acc.total += aNumero(v.importe);
        acc.transacciones += 1;
        acumulado.set(clave, acc);
    }
    return Array.from(acumulado.entries())
        .map(function (_a) {
        var fecha = _a[0], v = _a[1];
        return ({ fecha: fecha, total: redondear(v.total), transacciones: v.transacciones });
    })
        .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
}
exports.ventasPorDia = ventasPorDia;
/**
 * Rellena con ceros los dias sin venta de un rango.
 *
 * `ventasPorDia` solo devuelve los dias que facturaron, que es lo correcto para
 * una serie suelta. Pero para superponer dos periodos hace falta que la posicion
 * i signifique lo mismo en los dos: si un lunes cerro y desaparece de la lista,
 * todo lo que viene detras se corre y se acaba comparando jueves con martes.
 *
 * Un dia cerrado vendio cero, no "no existe".
 */
function rellenarDias(serie, desde, hasta) {
    var _a;
    var porFecha = new Map(serie.map(function (d) { return [d.fecha, d]; }));
    var salida = [];
    var fin = new Date(hasta + 'T00:00:00Z').getTime();
    for (var t = new Date(desde + 'T00:00:00Z').getTime(); t <= fin; t += 86400000) {
        var fecha = new Date(t).toISOString().slice(0, 10);
        salida.push((_a = porFecha.get(fecha)) !== null && _a !== void 0 ? _a : { fecha: fecha, total: 0, transacciones: 0 });
    }
    return salida;
}
exports.rellenarDias = rellenarDias;
/** Variacion porcentual, null cuando no hay base con la que comparar. */
function variacionPct(actual, anterior) {
    if (!anterior)
        return null;
    return redondear(((actual - anterior) / anterior) * 100);
}
exports.variacionPct = variacionPct;
function redondear(n) {
    return Math.round(n * 100) / 100;
}
exports.redondear = redondear;
