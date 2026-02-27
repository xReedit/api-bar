import { config } from 'dotenv';
import { GeocodingService } from '../services/geocoding.service';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

async function testCalculoDistancia() {
    console.log('=== TEST: Cálculo de Distancia ===\n');
    
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        console.error('❌ ERROR: GOOGLE_MAPS_API_KEY no está configurada en el archivo .env');
        console.log('\nPor favor, asegúrate de que el archivo .env contenga:');
        console.log('GOOGLE_MAPS_API_KEY=tu_api_key_aqui\n');
        return;
    }
    
    console.log('✓ API Key de Google Maps configurada\n');

    const latSede = -6.0331525;
    const lngSede = -76.9747885;
    const kmLimite = 5;
    const ciudades = ['moyobamba'];

    const casos = [
        {
            nombre: 'Jr. Puno 150',
            direccion: 'Jr. Puno 150',
            esperado: 'Dentro del rango'
        },
        {
            nombre: 'Jr. Grau 750',
            direccion: 'Jr. Grau 750',
            esperado: 'Dentro del rango'
        },
        {
            nombre: 'Alonso de Alvarado 150',
            direccion: 'Alonso de Alvarado 150',
            esperado: 'Dentro del rango'
        },
        {
            nombre: 'Dirección en Lima (fuera de rango)',
            direccion: 'Av. Arequipa 1234, Lima',
            esperado: 'Fuera del rango'
        }
    ];

    for (const caso of casos) {
        console.log(`\n--- Probando: ${caso.nombre} ---`);
        console.log(`Dirección: ${caso.direccion}`);
        console.log(`Esperado: ${caso.esperado}`);
        
        try {
            const resultado = await GeocodingService.calcularDistanciaPorRango(
                caso.direccion,
                latSede,
                lngSede,
                kmLimite,
                ciudades
            );

            if (resultado.success) {
                console.log(`✓ Resultado: ÉXITO`);
                console.log(`  Distancia: ${resultado.distanciaKm} km`);
                console.log(`  Estado: Dentro del rango de ${kmLimite} km`);
            } else {
                console.log(`✗ Resultado: FALLO`);
                console.log(`  Error: ${resultado.error}`);
            }
        } catch (error: any) {
            console.log(`✗ Error inesperado: ${error.message}`);
        }
        
        console.log('---');
    }

    console.log('\n=== FIN DEL TEST ===');
}

testCalculoDistancia().catch(console.error);
