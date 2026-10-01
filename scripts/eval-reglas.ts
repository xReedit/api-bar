import { evaluarSede } from '../src/services/asistente/reglas';

/**
 * Comprobacion manual de las reglas de aviso, contra la base de verdad.
 *
 * Es lo que falla si la evaluacion se rompe: una fecha floja debe disparar y
 * una con ventas por encima del umbral no. No es un test automatico porque
 * depende de los datos de cada entorno.
 *
 *   npx ts-node scripts/eval-reglas.ts 13 2026-09-15 2026-09-18
 */
async function main() {
    const [sede, ...fechas] = process.argv.slice(2);
    if (!sede || fechas.length === 0) {
        console.log('Uso: npx ts-node scripts/eval-reglas.ts <idsede> <fecha> [fecha...]');
        process.exit(1);
    }

    for (const fecha of fechas) {
        const disparadas = await evaluarSede(Number(sede), fecha);
        console.log(
            `${fecha} -> ${disparadas.length} aviso(s)`,
            disparadas.map((d) => d.mensaje).join(' | ')
        );
    }
    process.exit(0);
}

main();
