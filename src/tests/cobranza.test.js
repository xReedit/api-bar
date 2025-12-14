/**
 * Test para la lógica de advertencia de cobranza
 * Ejecutar: node src/tests/cobranza.test.js
 */

function calcularAdvertencia(ultimaFechaPago, frecuencia, fechaActual) {
    if (!ultimaFechaPago || ultimaFechaPago.getFullYear() < 2000) {
        return { mostrar: false, razon: 'Fecha inválida' };
    }

    const frecuenciaPago = frecuencia.toLowerCase();
    const fechaProximoPago = new Date(ultimaFechaPago);

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

    const hoy = new Date(fechaActual);
    hoy.setHours(0, 0, 0, 0);
    fechaProximoPago.setHours(0, 0, 0, 0);

    const diasRestantes = Math.ceil((fechaProximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    let resultado = {
        ultimaFechaPago: ultimaFechaPago.toISOString().split('T')[0],
        fechaProximoPago: fechaProximoPago.toISOString().split('T')[0],
        fechaActual: hoy.toISOString().split('T')[0],
        diasRestantes,
        mostrar: false,
        mensaje: '',
        tiempo: 0
    };

    if (diasRestantes > 0 && diasRestantes <= 3) {
        resultado.mostrar = true;
        resultado.tiempo = 5;
        resultado.mensaje = `Su pago vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}.`;
        resultado.caso = 'PROXIMO_A_VENCER';
    } else if (diasRestantes <= 0) {
        const diasPasados = Math.abs(diasRestantes);
        resultado.mostrar = true;
        resultado.diasPasados = diasPasados;

        if (diasPasados >= 0 && diasPasados <= 10) {
            resultado.tiempo = 5 + (diasPasados * 3);
            resultado.caso = 'VENCIDO_LEVE';
        } else if (diasPasados > 10 && diasPasados <= 20) {
            resultado.tiempo = Math.min(5 + (diasPasados * 3), 60);
            resultado.caso = 'VENCIDO_MODERADO';
        } else {
            resultado.tiempo = 1000;
            resultado.caso = 'SUSPENDIDO';
        }
    } else {
        resultado.caso = 'AL_DIA';
    }

    return resultado;
}

console.log('\n========================================');
console.log('   TEST DE ADVERTENCIA DE COBRANZA');
console.log('========================================\n');

const tests = [
    { nombre: '1. Al día (faltan 15 días)', ultimoPago: new Date('2025-11-15'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: false, caso: 'AL_DIA' } },
    { nombre: '2. Próximo a vencer (2 días)', ultimoPago: new Date('2025-11-01'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: true, caso: 'PROXIMO_A_VENCER' } },
    { nombre: '3. Vence hoy', ultimoPago: new Date('2025-10-30'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: true, caso: 'VENCIDO_LEVE' } },
    { nombre: '4. Vencido 5 días', ultimoPago: new Date('2025-10-25'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: true, caso: 'VENCIDO_LEVE' } },
    { nombre: '5. Vencido 15 días', ultimoPago: new Date('2025-10-15'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: true, caso: 'VENCIDO_MODERADO' } },
    { nombre: '6. Suspendido (25 días)', ultimoPago: new Date('2025-10-05'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: true, caso: 'SUSPENDIDO' } },
    { nombre: '7. Fecha inválida', ultimoPago: new Date('1969-12-31'), frecuencia: 'MENSUAL', fechaActual: new Date('2025-11-30'), esperado: { mostrar: false } },
];

let pasados = 0, fallidos = 0;

tests.forEach(test => {
    const r = calcularAdvertencia(test.ultimoPago, test.frecuencia, test.fechaActual);
    const ok = r.mostrar === test.esperado.mostrar && (!test.esperado.caso || r.caso === test.esperado.caso);
    
    if (ok) {
        console.log(`✅ ${test.nombre}`);
        pasados++;
    } else {
        console.log(`❌ ${test.nombre} - esperado: ${test.esperado.caso}, obtenido: ${r.caso}`);
        fallidos++;
    }
});

console.log(`\n✅ ${pasados} pasados | ❌ ${fallidos} fallidos\n`);

// Test con datos reales de sede 13
console.log('📅 TEST SEDE 13 (último pago: 2024-05-31):');
console.log(calcularAdvertencia(new Date('2024-05-31'), 'MENSUAL', new Date()));
