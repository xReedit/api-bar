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
    distanciaKm?: number;
    error?: string;
}

const getApiKey = () => process.env.GOOGLE_MAPS_API_KEY || '';

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
                    console.log(`No se encontró dirección con ciudad "${ciudad}"`);
                    continue;
                }

                const location = response.data.results[0].geometry.location;
                const distanciaKm = this.calcularDistanciaHaversine(
                    latComercio,
                    lngComercio,
                    location.lat,
                    location.lng
                );

                console.log(`Encontrado con ciudad "${ciudad}": ${distanciaKm} km (línea recta)`);

                if (distanciaKm > kmLimite) {
                    return {
                        success: false,
                        error: `Dirección fuera del rango de cobertura (${distanciaKm.toFixed(2)} km, máximo ${kmLimite} km)`
                    };
                }

                return {
                    success: true,
                    distanciaKm: Math.round(distanciaKm * 100) / 100
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
