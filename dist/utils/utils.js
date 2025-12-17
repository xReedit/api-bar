"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.limitarRangoFechasDashboard = exports.validarYCorregirRangoPeriodo = exports.fechaGuionASlash = void 0;
function fechaGuionASlash(fecha) {
    return fecha.replace(/-/g, '/');
}
exports.fechaGuionASlash = fechaGuionASlash;
/**
 * Valida y corrige el rango de fechas en los parámetros de período
 * Si el período es "rango" y supera los 4 meses, ajusta la fecha final
 * @param params - Objeto con periodo_params que contiene periodo, rango_start_date y rango_end_date
 * @returns Objeto params corregido si es necesario
 */
function validarYCorregirRangoPeriodo(params) {
    // Verificar si existe periodo_params y si el período es "rango"
    if (!params.periodo_params || params.periodo_params.periodo !== 'rango') {
        return params; // No es rango, retornar sin cambios
    }
    var _a = params.periodo_params, rango_start_date = _a.rango_start_date, rango_end_date = _a.rango_end_date;
    // Validar que existan ambas fechas
    if (!rango_start_date || !rango_end_date) {
        return params;
    }
    var fechaInicio = new Date(rango_start_date);
    var fechaFin = new Date(rango_end_date);
    // Validar que las fechas sean válidas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        console.warn('Fechas inválidas en el rango de período');
        return params;
    }
    // Calcular la diferencia en meses
    var diferenciaEnMeses = calcularDiferenciaEnMeses(fechaInicio, fechaFin);
    // Si supera los 4 meses, ajustar la fecha final
    if (diferenciaEnMeses > 4) {
        var nuevaFechaFin = new Date(fechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 4);
        // Formatear la fecha en formato YYYY-MM-DD
        var fechaFinCorregida = nuevaFechaFin.toISOString().split('T')[0];
        // Retornar params con la fecha corregida
        return __assign(__assign({}, params), { periodo_params: __assign(__assign({}, params.periodo_params), { rango_end_date: fechaFinCorregida }) });
    }
    return params; // El rango es válido, retornar sin cambios
}
exports.validarYCorregirRangoPeriodo = validarYCorregirRangoPeriodo;
/**
 * Calcula la diferencia en meses entre dos fechas
 * @param fechaInicio - Fecha de inicio
 * @param fechaFin - Fecha de fin
 * @returns Diferencia en meses (con decimales)
 */
function calcularDiferenciaEnMeses(fechaInicio, fechaFin) {
    var difAnios = fechaFin.getFullYear() - fechaInicio.getFullYear();
    var difMeses = fechaFin.getMonth() - fechaInicio.getMonth();
    var difDias = fechaFin.getDate() - fechaInicio.getDate();
    // Calcular meses totales considerando los días
    var mesesTotales = difAnios * 12 + difMeses;
    // Si hay días adicionales, agregar la fracción de mes
    if (difDias > 0) {
        mesesTotales += difDias / 30; // Aproximación de días a fracción de mes
    }
    return mesesTotales;
}
var MAX_MESES_DASHBOARD = 5;
/**
 * Limita el rango de fechas a máximo 5 meses para endpoints de dashboard.
 * Si fecha_fin es el mes actual o fecha de hoy, ajusta fecha_inicio hacia adelante.
 * Si no, ajusta fecha_fin hacia atrás.
 * @param fecha_inicio - Fecha inicio en formato 'YYYY-MM-DD'
 * @param fecha_fin - Fecha fin en formato 'YYYY-MM-DD'
 * @returns Objeto con fecha_inicio y fecha_fin ajustadas
 */
function limitarRangoFechasDashboard(fecha_inicio, fecha_fin) {
    if (!fecha_inicio || !fecha_fin) {
        return { fecha_inicio: fecha_inicio, fecha_fin: fecha_fin };
    }
    var fechaInicio = new Date(fecha_inicio + 'T00:00:00');
    var fechaFin = new Date(fecha_fin + 'T00:00:00');
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Validar que las fechas sean válidas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        return { fecha_inicio: fecha_inicio, fecha_fin: fecha_fin };
    }
    // Calcular diferencia en meses
    var diferenciaEnMeses = calcularDiferenciaEnMeses(fechaInicio, fechaFin);
    // Si no supera el máximo, retornar sin cambios
    if (diferenciaEnMeses <= MAX_MESES_DASHBOARD) {
        return { fecha_inicio: fecha_inicio, fecha_fin: fecha_fin };
    }
    // Verificar si fecha_fin es el mes actual o fecha de hoy
    var esFinMesActual = (fechaFin.getFullYear() === hoy.getFullYear() &&
        fechaFin.getMonth() === hoy.getMonth());
    var esFinHoy = fechaFin.getTime() >= hoy.getTime();
    if (esFinMesActual || esFinHoy) {
        // Ajustar fecha_inicio hacia adelante (mantener fecha_fin)
        var nuevaFechaInicio = new Date(fechaFin);
        nuevaFechaInicio.setMonth(nuevaFechaInicio.getMonth() - MAX_MESES_DASHBOARD);
        return {
            fecha_inicio: nuevaFechaInicio.toISOString().split('T')[0],
            fecha_fin: fecha_fin
        };
    }
    else {
        // Ajustar fecha_fin hacia atrás (mantener fecha_inicio)
        var nuevaFechaFin = new Date(fechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + MAX_MESES_DASHBOARD);
        return {
            fecha_inicio: fecha_inicio,
            fecha_fin: nuevaFechaFin.toISOString().split('T')[0]
        };
    }
}
exports.limitarRangoFechasDashboard = limitarRangoFechasDashboard;
