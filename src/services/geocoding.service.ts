import axios from 'axios';

interface Coordenadas {
    lat: number;
    lng: number;
}

interface ResultadoGeocodificacion {
    success: boolean;
    coordenadas?: Coordenadas;
    error?: string;
}

interface ResultadoDistancia {
    success: boolean;
    lat?: number;
    lng?: number;
    distanciaKm?: number;
    ciudad?: string;
    provincia?: string;
    departamento?: string;
    pais?: string;
    codigo?: string;
    error?: string;
    // 'baja' = Google adivinó (typo, solo ubicó la ciudad, o vino del fallback
    // de Places): el bot debe confirmar la dirección con el cliente antes de usarla.
    confianza?: 'alta' | 'baja';
    direccionFormateada?: string;
    // true = la dirección SÍ se ubicó pero está fuera del km_limite (no debe
    // confundirse con "no encontrada": aquí no aplica el costo base de rescate).
    fueraDeCobertura?: boolean;
}

const getApiKey = () => process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * La línea recta (haversine) subestima la ruta real de reparto. Factor de
 * desvío urbano típico: ruta ≈ recta × 1.3, ajustable por env
 * DELIVERY_FACTOR_RUTA sin deploy. Techo conocido: si algún día se necesita
 * el km exacto, upgrade a Routes API/Mapbox con fallback a esto.
 */
export const estimarKmRuta = (kmRecta: number): number => {
    const factor = Number(process.env.DELIVERY_FACTOR_RUTA) || 1.3;
    return Math.round(kmRecta * factor * 100) / 100;
};

/**
 * Clasifica qué tan confiable es un resultado de la Geocoding API.
 * partial_match = Google no encontró exacto y devolvió lo más parecido;
 * locality/APPROXIMATE = solo ubicó la ciudad (típico con calles mal escritas).
 */
export const clasificarConfianza = (result: any): 'alta' | 'baja' => {
    if (result?.partial_match) return 'baja';
    const types: string[] = result?.types || [];
    if (types.includes('locality')) return 'baja';
    if (result?.geometry?.location_type === 'APPROXIMATE') return 'baja';
    return 'alta';
};

export class GeocodingService {
    
    static async obtenerCoordenadas(direccion: string, ciudad: string): Promise<ResultadoGeocodificacion> {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                return {
                    success: false,
                    error: 'API Key de Google Maps no configurada'
                };
            }

            const direccionCompleta = `${direccion}, ${ciudad}, Peru`;
            const url = `https://maps.googleapis.com/maps/api/geocode/json`;
            
            const response = await axios.get(url, {
                params: {
                    address: direccionCompleta,
                    key: apiKey
                }
            });

            if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                return {
                    success: false,
                    error: 'No se pudo geocodificar la dirección'
                };
            }

            const location = response.data.results[0].geometry.location;
            
            return {
                success: true,
                coordenadas: {
                    lat: location.lat,
                    lng: location.lng
                }
            };

        } catch (error: any) {
            console.error('Error en geocodificación:', error);
            return {
                success: false,
                error: error.message || 'Error al obtener coordenadas'
            };
        }
    }

    // Reverse geocoding: coordenadas GPS -> dirección legible. Usado cuando el
    // cliente comparte su ubicación por WhatsApp (antes quedaba "GPS" como dirección).
    static async obtenerDireccion(lat: number, lng: number): Promise<{ success: boolean; direccion?: string; ciudad?: string; provincia?: string; departamento?: string; pais?: string; codigo?: string; error?: string }> {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                return { success: false, error: 'API Key de Google Maps no configurada' };
            }

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: { latlng: `${lat},${lng}`, key: apiKey, language: 'es' }
            });

            if (response.data.status !== 'OK' || !response.data.results?.length) {
                return { success: false, error: 'No se pudo obtener la dirección' };
            }

            const result = response.data.results[0];
            let ciudad = '', provincia = '', departamento = '', pais = '', codigo = '';
            result.address_components.forEach((component: any) => {
                if (component.types.includes('locality')) ciudad = component.long_name;
                if (component.types.includes('administrative_area_level_2')) provincia = component.long_name;
                if (component.types.includes('administrative_area_level_1')) departamento = component.long_name;
                if (component.types.includes('country')) pais = component.long_name;
                if (component.types.includes('postal_code')) codigo = component.long_name;
            });

            return {
                success: true,
                direccion: result.formatted_address,
                ciudad, provincia, departamento, pais, codigo
            };

        } catch (error: any) {
            console.error('Error en reverse geocoding:', error);
            return { success: false, error: error.message || 'Error al obtener dirección' };
        }
    }

    static calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;
        
        return Math.round(distancia * 100) / 100;
    }

    private static toRad(grados: number): number {
        return grados * (Math.PI / 180);
    }

    static async calcularDistanciaRuta(
        direccion: string,
        latComercio: number,
        lngComercio: number,
        kmLimite: number,
        ciudades?: string[]
    ): Promise<ResultadoDistancia> {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                return {
                    success: false,
                    error: 'API Key de Google Maps no configurada'
                };
            }

            const url = `https://maps.googleapis.com/maps/api/geocode/json`;
            const ciudadesABuscar = ciudades && ciudades.length > 0 ? ciudades : [''];

            for (const ciudad of ciudadesABuscar) {
                const direccionCompleta = ciudad 
                    ? `${direccion}, ${ciudad}, Peru` 
                    : `${direccion}, Peru`;

                console.log('Geocodificando:', direccionCompleta);
                
                const response = await axios.get(url, {
                    params: {
                        address: direccionCompleta,
                        key: apiKey,
                        region: 'pe'
                    }
                });

                if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                    // Distinguir "no existe" de errores de API (key, billing, etc.):
                    // antes REQUEST_DENIED se logueaba igual que dirección no hallada.
                    if (!['OK', 'ZERO_RESULTS'].includes(response.data.status)) {
                        console.error('Geocoding API:', response.data.status, response.data.error_message || '');
                    }
                    console.log(`No se encontró dirección con ciudad "${ciudad}"`);
                    continue;
                }

                const location = response.data.results[0].geometry.location;
                const addressComponents = response.data.results[0].address_components;
                
                // Extraer componentes de la dirección
                let ciudadExtraida = '';
                let provinciaExtraida = '';
                let departamentoExtraido = '';
                let paisExtraido = '';
                let codigoExtraido = '';
                
                addressComponents.forEach((component: any) => {
                    if (component.types.includes('locality')) {
                        ciudadExtraida = component.long_name;
                    }
                    if (component.types.includes('administrative_area_level_2')) {
                        provinciaExtraida = component.long_name;
                    }
                    if (component.types.includes('administrative_area_level_1')) {
                        departamentoExtraido = component.long_name;
                    }
                    if (component.types.includes('country')) {
                        paisExtraido = component.long_name;
                    }
                    if (component.types.includes('postal_code')) {
                        codigoExtraido = component.long_name;
                    }
                });
                
                // Ruta estimada: recta × factor de desvío urbano (el costo por
                // km y el km_limite se evalúan sobre km de ruta, no de recta).
                const distanciaKm = estimarKmRuta(this.calcularDistanciaHaversine(
                    latComercio,
                    lngComercio,
                    location.lat,
                    location.lng
                ));

                console.log(`Encontrado con ciudad "${ciudad}": ${distanciaKm} km (ruta estimada = recta × factor)`);

                const confianza = clasificarConfianza(response.data.results[0]);

                if (confianza === 'alta' && distanciaKm > kmLimite) {
                    return {
                        success: false,
                        fueraDeCobertura: true,
                        error: `Dirección fuera del rango de cobertura (${distanciaKm.toFixed(2)} km, máximo ${kmLimite} km)`
                    };
                }

                return {
                    success: true,
                    lat: location.lat,
                    lng: location.lng,
                    distanciaKm: Math.round(distanciaKm * 100) / 100,
                    ciudad: ciudadExtraida,
                    provincia: provinciaExtraida,
                    departamento: departamentoExtraido,
                    pais: paisExtraido,
                    codigo: codigoExtraido,
                    confianza,
                    direccionFormateada: response.data.results[0].formatted_address
                };
            }

            // Fallback tolerante a typos: Places Text Search (el buscador de
            // Google Maps) sesgado a la sede. Si encuentra algo, siempre vuelve
            // como confianza 'baja' para que el bot confirme con el cliente.
            const lugar = await this.buscarConPlaces(direccion, ciudadesABuscar[0] || '', latComercio, lngComercio);
            if (lugar.success && lugar.lat !== undefined && lugar.lng !== undefined) {
                const distanciaKm = estimarKmRuta(this.calcularDistanciaHaversine(latComercio, lngComercio, lugar.lat, lugar.lng));
                console.log(`Places fallback encontró "${lugar.direccion}": ${distanciaKm} km (ruta estimada)`);
                return {
                    success: true,
                    lat: lugar.lat,
                    lng: lugar.lng,
                    distanciaKm: Math.round(distanciaKm * 100) / 100,
                    confianza: 'baja',
                    direccionFormateada: lugar.direccion
                };
            }

            return {
                success: false,
                error: 'No se pudo encontrar la dirección en ninguna de las ciudades de cobertura'
            };

        } catch (error: any) {
            console.error('Error al geocodificar:', error);
            return {
                success: false,
                error: error.message || 'Error al calcular distancia'
            };
        }
    }

    static async calcularDistancia(
        direccionCliente: string,
        ciudadComercio: string,
        latComercio: number,
        lngComercio: number
    ): Promise<ResultadoDistancia> {
        try {
            const resultadoGeo = await this.obtenerCoordenadas(direccionCliente, ciudadComercio);
            
            if (!resultadoGeo.success || !resultadoGeo.coordenadas) {
                return {
                    success: false,
                    error: resultadoGeo.error || 'No se pudo obtener coordenadas'
                };
            }

            const distanciaKm = this.calcularDistanciaHaversine(
                latComercio,
                lngComercio,
                resultadoGeo.coordenadas.lat,
                resultadoGeo.coordenadas.lng
            );

            return {
                success: true,
                distanciaKm
            };

        } catch (error: any) {
            console.error('Error al calcular distancia:', error);
            return {
                success: false,
                error: error.message || 'Error al calcular distancia'
            };
        }
    }

    // Places Text Search: tolera direcciones mal escritas ("jr calao" → Jr.
    // Callao). Solo se usa como fallback cuando la Geocoding API no encontró.
    private static async buscarConPlaces(
        direccion: string,
        ciudad: string,
        lat: number,
        lng: number
    ): Promise<{ success: boolean; direccion?: string; lat?: number; lng?: number }> {
        try {
            const query = ciudad ? `${direccion}, ${ciudad}, Peru` : `${direccion}, Peru`;
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
                params: { query, location: `${lat},${lng}`, radius: 15000, region: 'pe', key: getApiKey() }
            });
            const r = response.data?.results?.[0];
            if (response.data?.status !== 'OK' || !r?.geometry?.location) {
                if (!['OK', 'ZERO_RESULTS'].includes(response.data?.status)) {
                    console.error('Places API:', response.data?.status, response.data?.error_message || '');
                }
                return { success: false };
            }
            return {
                success: true,
                direccion: r.formatted_address || r.name,
                lat: r.geometry.location.lat,
                lng: r.geometry.location.lng
            };
        } catch (error: any) {
            console.error('Error en Places fallback:', error.message);
            return { success: false };
        }
    }

    static async calcularDistanciaPorRango(
        direccionCliente: string,
        latComercio: number,
        lngComercio: number,
        kmLimite: number,
        ciudades?: string[]
    ): Promise<ResultadoDistancia> {
        return this.calcularDistanciaRuta(
            direccionCliente,
            latComercio,
            lngComercio,
            kmLimite,
            ciudades
        );
    }
}
