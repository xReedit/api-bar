export function fechaGuionASlash(fecha: string) {
    return fecha.replace(/-/g, '/');
}

/**
 * Valida y corrige el rango de fechas en los parámetros de período
 * Si el período es "rango" y supera los 4 meses, ajusta la fecha final
 * @param params - Objeto con periodo_params que contiene periodo, rango_start_date y rango_end_date
 * @returns Objeto params corregido si es necesario
 */
export function validarYCorregirRangoPeriodo(params: any): any {
    // Verificar si existe periodo_params y si el período es "rango"
    if (!params.periodo_params || params.periodo_params.periodo !== 'rango') {
        return params; // No es rango, retornar sin cambios
    }

    const { rango_start_date, rango_end_date } = params.periodo_params;

    // Validar que existan ambas fechas
    if (!rango_start_date || !rango_end_date) {
        return params;
    }

    const fechaInicio = new Date(rango_start_date);
    const fechaFin = new Date(rango_end_date);

    // Validar que las fechas sean válidas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        console.warn('Fechas inválidas en el rango de período');
        return params;
    }

    // Calcular la diferencia en meses
    const diferenciaEnMeses = calcularDiferenciaEnMeses(fechaInicio, fechaFin);

    // Si supera los 4 meses, ajustar la fecha final
    if (diferenciaEnMeses > 4) {
        const nuevaFechaFin = new Date(fechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 4);
        
        // Formatear la fecha en formato YYYY-MM-DD
        const fechaFinCorregida = nuevaFechaFin.toISOString().split('T')[0];
        
        console.log(`Rango ajustado: el período de ${diferenciaEnMeses} meses fue reducido a 4 meses`);
        console.log(`Fecha fin original: ${rango_end_date}, Fecha fin corregida: ${fechaFinCorregida}`);

        // Retornar params con la fecha corregida
        return {
            ...params,
            periodo_params: {
                ...params.periodo_params,
                rango_end_date: fechaFinCorregida
            }
        };
    }

    return params; // El rango es válido, retornar sin cambios
}

/**
 * Calcula la diferencia en meses entre dos fechas
 * @param fechaInicio - Fecha de inicio
 * @param fechaFin - Fecha de fin
 * @returns Diferencia en meses (con decimales)
 */
function calcularDiferenciaEnMeses(fechaInicio: Date, fechaFin: Date): number {
    const difAnios = fechaFin.getFullYear() - fechaInicio.getFullYear();
    const difMeses = fechaFin.getMonth() - fechaInicio.getMonth();
    const difDias = fechaFin.getDate() - fechaInicio.getDate();
    
    // Calcular meses totales considerando los días
    let mesesTotales = difAnios * 12 + difMeses;
    
    // Si hay días adicionales, agregar la fracción de mes
    if (difDias > 0) {
        mesesTotales += difDias / 30; // Aproximación de días a fracción de mes
    }
    
    return mesesTotales;
}