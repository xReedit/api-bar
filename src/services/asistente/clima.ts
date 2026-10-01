import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { ErrorValidacion } from '../dash/errores';

const prisma = new PrismaClient();

/**
 * Clima por sede.
 *
 * Es negocio disfrazado: la lluvia explica una caida y un feriado soleado explica
 * un pico. Un local con terraza planifica personal e insumos con esto.
 *
 * Open-Meteo: gratuito y sin API key, una credencial menos que gestionar.
 * La ubicacion sale de la sede en el servidor; el modelo no propone coordenadas.
 */

const URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast';
const URL_GEO = 'https://geocoding-api.open-meteo.com/v1/search';

/** Codigos WMO a algo que entienda una persona. */
const CIELO: Record<number, string> = {
    0: 'despejado',
    1: 'mayormente despejado',
    2: 'parcialmente nublado',
    3: 'nublado',
    45: 'niebla',
    48: 'niebla con escarcha',
    51: 'llovizna ligera',
    53: 'llovizna',
    55: 'llovizna intensa',
    61: 'lluvia ligera',
    63: 'lluvia',
    65: 'lluvia fuerte',
    80: 'chubascos ligeros',
    81: 'chubascos',
    82: 'chubascos fuertes',
    95: 'tormenta',
    96: 'tormenta con granizo',
    99: 'tormenta fuerte con granizo'
};

interface Ubicacion {
    latitud: number;
    longitud: number;
    etiqueta: string;
}

/** Geocodificaciones ya resueltas; la ciudad de una sede no cambia. */
const cacheGeo = new Map<string, Ubicacion | null>();

async function geocodificar(ciudad: string): Promise<Ubicacion | null> {
    const clave = ciudad.trim().toLowerCase();
    if (cacheGeo.has(clave)) return cacheGeo.get(clave) ?? null;

    try {
        const { data } = await axios.get(URL_GEO, {
            params: { name: ciudad, count: 1, language: 'es', country: 'PE' },
            timeout: 8000
        });
        const r = data?.results?.[0];
        const ubicacion = r
            ? { latitud: Number(r.latitude), longitud: Number(r.longitude), etiqueta: String(r.name) }
            : null;
        cacheGeo.set(clave, ubicacion);
        return ubicacion;
    } catch {
        cacheGeo.set(clave, null);
        return null;
    }
}

/** Coordenadas de la sede: de la tabla si las tiene, si no por su ciudad. */
export async function ubicacionDeSede(idsede: number): Promise<Ubicacion> {
    const filas: any = await prisma.$queryRaw`
        SELECT nombre, ciudad, latitude, longitude FROM sede WHERE idsede = ${idsede} LIMIT 1`;
    const sede = filas?.[0];
    if (!sede) throw new ErrorValidacion('Sede no encontrada');

    const lat = sede.latitude !== null ? Number(sede.latitude) : NaN;
    const lon = sede.longitude !== null ? Number(sede.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
        return { latitud: lat, longitud: lon, etiqueta: String(sede.ciudad ?? sede.nombre) };
    }

    const porCiudad = sede.ciudad ? await geocodificar(String(sede.ciudad)) : null;
    if (!porCiudad) {
        throw new ErrorValidacion(
            `No tengo la ubicacion de ${sede.nombre}. Falta cargar sus coordenadas o su ciudad.`
        );
    }
    return porCiudad;
}

export interface DiaClima {
    fecha: string;
    minima: number;
    maxima: number;
    lluvia_mm: number;
    prob_lluvia_pct: number;
    cielo: string;
}

/** Pronostico diario. Open-Meteo cubre hasta 16 dias hacia adelante. */
export async function pronostico(idsede: number, dias: number): Promise<{
    lugar: string;
    dias: DiaClima[];
}> {
    const ubicacion = await ubicacionDeSede(idsede);
    const acotado = Math.min(Math.max(dias, 1), 14);

    const { data } = await axios.get(URL_PRONOSTICO, {
        params: {
            latitude: ubicacion.latitud,
            longitude: ubicacion.longitud,
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
            timezone: 'America/Lima',
            forecast_days: acotado
        },
        timeout: 10000
    });

    const d = data?.daily;
    if (!d?.time) throw new Error('El servicio de clima no devolvio datos');

    return {
        lugar: ubicacion.etiqueta,
        dias: d.time.map((fecha: string, i: number) => ({
            fecha,
            minima: Math.round(d.temperature_2m_min[i]),
            maxima: Math.round(d.temperature_2m_max[i]),
            lluvia_mm: Number(d.precipitation_sum[i] ?? 0),
            prob_lluvia_pct: Number(d.precipitation_probability_max[i] ?? 0),
            cielo: CIELO[d.weather_code[i]] ?? 'variable'
        }))
    };
}
