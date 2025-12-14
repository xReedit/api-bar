"use strict";
/**
 * Test para la lógica de advertencia de cobranza
 * Ejecutar: npx ts-node src/tests/cobranza.test.ts
 */
// Simular la lógica de cálculo de días
function calcularAdvertencia(ultimaFechaPago, frecuencia, fechaActual) {
    // Validar fecha
    if (!ultimaFechaPago || ultimaFechaPago.getFullYear() < 2000) {
        return { mostrar: false, razon: 'Fecha inválida' };
    }
    var frecuenciaPago = frecuencia.toLowerCase();
    var fechaProximoPago = new Date(ultimaFechaPago);
    switch (frecuenciaPago) {
        case 'mensual':
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
            break;
        case 'semestral':
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 6);
            break;
        case 'anual':
            fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1);
            break;
        default:
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1);
    }
    // Normalizar fechas
    var hoy = new Date(fechaActual);
    hoy.setHours(0, 0, 0, 0);
    fechaProximoPago.setHours(0, 0, 0, 0);
    var diasRestantes = Math.ceil((fechaProximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    var resultado = {
        ultimaFechaPago: ultimaFechaPago.toISOString().split('T')[0],
        fechaProximoPago: fechaProximoPago.toISOString().split('T')[0],
        fechaActual: hoy.toISOString().split('T')[0],
        diasRestantes: diasRestantes,
        mostrar: false,
        mensaje: '',
        tiempo: 0
    };
    // CASO 1: Faltan 3 días o menos
    if (diasRestantes > 0 && diasRestantes <= 3) {
        resultado.mostrar = true;
        resultado.tiempo = 5;
        resultado.mensaje = "Su pago vence en ".concat(diasRestantes, " d\u00EDa").concat(diasRestantes > 1 ? 's' : '', ".");
        resultado.caso = 'PROXIMO_A_VENCER';
    }
    // CASO 2: Ya venció
    else if (diasRestantes <= 0) {
        var diasPasados = Math.abs(diasRestantes);
        resultado.mostrar = true;
        resultado.diasPasados = diasPasados;
        if (diasPasados >= 0 && diasPasados <= 10) {
            resultado.tiempo = 5 + (diasPasados * 3);
            resultado.mensaje = "Han pasado ".concat(diasPasados, " d\u00EDas desde el vencimiento.");
            resultado.caso = 'VENCIDO_LEVE';
        }
        else if (diasPasados > 10 && diasPasados <= 20) {
            resultado.tiempo = Math.min(5 + (diasPasados * 3), 60);
            resultado.mensaje = "Han pasado ".concat(diasPasados, " d\u00EDas. Advertencia de suspensi\u00F3n.");
            resultado.caso = 'VENCIDO_MODERADO';
        }
        else {
            resultado.tiempo = 1000;
            resultado.mensaje = 'Servicio suspendido por falta de pago.';
            resultado.caso = 'SUSPENDIDO';
        }
    }
    // CASO 3: Faltan más de 3 días
    else {
        resultado.caso = 'AL_DIA';
    }
    return resultado;
}
// ============== TESTS ==============
console.log('\n========================================');
console.log('   TEST DE ADVERTENCIA DE COBRANZA');
console.log('========================================\n');
var tests = [
    {
        nombre: '1. Pago al día (faltan 15 días)',
        ultimoPago: new Date('2025-11-15'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: false, caso: 'AL_DIA' }
    },
    {
        nombre: '2. Próximo a vencer (faltan 2 días)',
        ultimoPago: new Date('2025-11-01'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'PROXIMO_A_VENCER', diasRestantes: 2 }
    },
    {
        nombre: '3. Vence hoy (día 0)',
        ultimoPago: new Date('2025-10-30'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'VENCIDO_LEVE', diasPasados: 0 }
    },
    {
        nombre: '4. Vencido hace 5 días',
        ultimoPago: new Date('2025-10-25'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'VENCIDO_LEVE', diasPasados: 5 }
    },
    {
        nombre: '5. Vencido hace 15 días (advertencia suspensión)',
        ultimoPago: new Date('2025-10-15'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'VENCIDO_MODERADO', diasPasados: 15 }
    },
    {
        nombre: '6. Vencido hace 25 días (suspendido)',
        ultimoPago: new Date('2025-10-05'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'SUSPENDIDO', diasPasados: 25 }
    },
    {
        nombre: '7. Frecuencia semestral - al día',
        ultimoPago: new Date('2025-09-01'),
        frecuencia: 'SEMESTRAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: false, caso: 'AL_DIA' }
    },
    {
        nombre: '8. Frecuencia anual - al día',
        ultimoPago: new Date('2025-01-01'),
        frecuencia: 'ANUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: false, caso: 'AL_DIA' }
    },
    {
        nombre: '9. Fecha inválida (1969)',
        ultimoPago: new Date('1969-12-31'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: false, razon: 'Fecha inválida' }
    },
    {
        nombre: '10. Vencido hace 1 día',
        ultimoPago: new Date('2025-10-29'),
        frecuencia: 'MENSUAL',
        fechaActual: new Date('2025-11-30'),
        esperado: { mostrar: true, caso: 'VENCIDO_LEVE', diasPasados: 1, tiempo: 8 }
    }
];
var pasados = 0;
var fallidos = 0;
tests.forEach(function (test) {
    var resultado = calcularAdvertencia(test.ultimoPago, test.frecuencia, test.fechaActual);
    var exito = true;
    var errores = [];
    // Verificar campos esperados
    if (test.esperado.mostrar !== resultado.mostrar) {
        exito = false;
        errores.push("mostrar: esperado ".concat(test.esperado.mostrar, ", obtenido ").concat(resultado.mostrar));
    }
    if (test.esperado.caso && test.esperado.caso !== resultado.caso) {
        exito = false;
        errores.push("caso: esperado ".concat(test.esperado.caso, ", obtenido ").concat(resultado.caso));
    }
    if (test.esperado.diasRestantes !== undefined && test.esperado.diasRestantes !== resultado.diasRestantes) {
        exito = false;
        errores.push("diasRestantes: esperado ".concat(test.esperado.diasRestantes, ", obtenido ").concat(resultado.diasRestantes));
    }
    if (test.esperado.diasPasados !== undefined && test.esperado.diasPasados !== resultado.diasPasados) {
        exito = false;
        errores.push("diasPasados: esperado ".concat(test.esperado.diasPasados, ", obtenido ").concat(resultado.diasPasados));
    }
    if (test.esperado.tiempo !== undefined && test.esperado.tiempo !== resultado.tiempo) {
        exito = false;
        errores.push("tiempo: esperado ".concat(test.esperado.tiempo, ", obtenido ").concat(resultado.tiempo));
    }
    if (exito) {
        console.log("\u2705 ".concat(test.nombre));
        pasados++;
    }
    else {
        console.log("\u274C ".concat(test.nombre));
        errores.forEach(function (e) { return console.log("   \u2514\u2500 ".concat(e)); });
        console.log("   Resultado completo:", resultado);
        fallidos++;
    }
});
console.log('\n========================================');
console.log("   RESULTADOS: ".concat(pasados, " pasados, ").concat(fallidos, " fallidos"));
console.log('========================================\n');
// Test interactivo con fecha actual real
console.log('📅 TEST CON FECHA ACTUAL REAL:');
var testReal = calcularAdvertencia(new Date('2024-05-31'), // último pago de sede 13
'MENSUAL', new Date() // hoy
);
console.log('Último pago: 2024-05-31 (sede 13)');
console.log('Resultado:', testReal);
