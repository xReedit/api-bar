// Geometría pura del delivery por zonas (sin dependencias, sin I/O).
// Portado de restobar-2026 packages/shared/src/geo.ts.
//
// Convención: { lat, lng } en grados decimales. Los polígonos son anillos
// abiertos (el último punto se conecta con el primero implícito).
// Límite conocido: no soporta polígonos que crucen el antimeridiano (±180°);
// no aplica a Perú.
//
// Las zonas viven dentro del JSON sede_costo_delivery.parametros.zonas
// (sin DDL: el usuario MySQL de la app no tiene CREATE y prisma/ es por
// entorno). El ORDEN del array es la prioridad: en solape gana el índice menor.

export type LatLng = { lat: number; lng: number };

export type ZonaDelivery = {
    nombre: string;
    costo: number;
    tiempo_aprox_entrega?: number | null;
    tipo: 'poligono' | 'circulo';
    puntos?: LatLng[]; // poligono: anillo abierto, >= 3
    centro?: LatLng;   // circulo
    radio_km?: number; // circulo, > 0
};

export type ModoDelivery = 'fijo' | 'variable' | 'zonas';

const R_KM = 6371;

/** Distancia en km entre dos puntos (fórmula del haversine). */
export const haversineKm = (a: LatLng, b: LatLng): number => {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return 2 * R_KM * Math.asin(Math.sqrt(s));
};

/** Ray casting: ¿el punto está dentro del polígono? Mínimo 3 vértices. */
export const puntoEnPoligono = (p: LatLng, puntos: LatLng[]): boolean => {
    if (puntos.length < 3) return false;
    let dentro = false;
    for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
        const xi = puntos[i].lng;
        const yi = puntos[i].lat;
        const xj = puntos[j].lng;
        const yj = puntos[j].lat;
        const intersecta =
            yi > p.lat !== yj > p.lat &&
            p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
        if (intersecta) dentro = !dentro;
    }
    return dentro;
};

/** ¿El punto está dentro del círculo (centro + radio en km)? Borde inclusivo. */
export const puntoEnCirculo = (p: LatLng, centro: LatLng, radioKm: number): boolean =>
    haversineKm(p, centro) <= radioKm;

/** Despacha según el tipo de zona. */
export const puntoEnZona = (p: LatLng, z: ZonaDelivery): boolean =>
    z.tipo === 'poligono'
        ? puntoEnPoligono(p, z.puntos || [])
        : puntoEnCirculo(p, z.centro as LatLng, Number(z.radio_km));

const esLatLng = (v: any): v is LatLng =>
    v != null && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng));

const aLatLng = (v: any): LatLng => ({ lat: Number(v.lat), lng: Number(v.lng) });

/**
 * Sanea el array crudo del JSON de la BD: filtra zonas malformadas (polígono
 * con <3 puntos, círculo sin centro o radio <= 0, costo no numérico) y
 * coacciona strings numéricos ("4" → 4, herencia del panel que guarda strings).
 */
export const validarZonas = (raw: unknown): ZonaDelivery[] => {
    if (!Array.isArray(raw)) return [];
    const zonas: ZonaDelivery[] = [];
    for (const z of raw) {
        if (!z || typeof z !== 'object') continue;
        const costo = Number((z as any).costo);
        if (!Number.isFinite(costo) || costo < 0) continue;
        const tiempoRaw = Number((z as any).tiempo_aprox_entrega);
        const tiempo = Number.isFinite(tiempoRaw) && tiempoRaw > 0 ? tiempoRaw : null;
        const base = {
            nombre: String((z as any).nombre || 'Zona'),
            costo,
            tiempo_aprox_entrega: tiempo,
        };
        if ((z as any).tipo === 'poligono') {
            const puntos = Array.isArray((z as any).puntos)
                ? (z as any).puntos.filter(esLatLng).map(aLatLng)
                : [];
            if (puntos.length < 3) continue;
            zonas.push({ ...base, tipo: 'poligono', puntos });
        } else if ((z as any).tipo === 'circulo') {
            const radio = Number((z as any).radio_km);
            if (!esLatLng((z as any).centro) || !Number.isFinite(radio) || radio <= 0) continue;
            zonas.push({ ...base, tipo: 'circulo', centro: aLatLng((z as any).centro), radio_km: radio });
        }
    }
    return zonas;
};

export type ResultadoZona =
    | { cubierto: true; zona: ZonaDelivery; indice: number }
    | { cubierto: false };

/** Primera zona del array que contiene el punto (menor índice gana en solape). */
export const resolverZona = (zonas: ZonaDelivery[], p: LatLng): ResultadoZona => {
    for (let i = 0; i < zonas.length; i++) {
        if (puntoEnZona(p, zonas[i])) return { cubierto: true, zona: zonas[i], indice: i };
    }
    return { cubierto: false };
};

/**
 * Decisión sobre una dirección de TEXTO geocodificada (no aplica a GPS, cuyas
 * coordenadas son reales). Filosofía: la dirección NUNCA detiene la venta —
 * jamás se pregunta "¿te refieres a...?" ni se rechaza por un geocode dudoso.
 *  - 'usar': hay punto de calle dentro de cobertura → cobrar por distancia/zona.
 *  - 'costo_base': no hay punto utilizable (no encontrado, solo-ciudad,
 *    plus code) o el punto cae fuera del límite (geocode probablemente
 *    erróneo, ej. calle homónima en otro distrito) → costo base y el pedido
 *    sigue; la referencia del cliente viaja al ticket del repartidor.
 */
export type DecisionDireccionTexto = 'usar' | 'costo_base';

export const decidirDireccionTexto = (
    resultado: { success?: boolean; distanciaKm?: number } | null | undefined,
    modo: ModoDelivery,
    kmLimite: number
): DecisionDireccionTexto => {
    if (resultado?.success && Number.isFinite(resultado.distanciaKm)) {
        if (modo === 'variable' && (resultado.distanciaKm as number) > kmLimite) return 'costo_base';
        return 'usar';
    }
    return 'costo_base';
};

/**
 * Costo de delivery en modo VARIABLE, siempre "cobrable" (sin S/ 5.78):
 * los km adicionales se cobran por km ENTERO — la fracción solo cuenta como
 * km extra si PASA de 0.5 (regla del dueño: 5.5 km con base 4 → 1 km extra;
 * 5.78 km → 2 km extra). Con tarifas enteras el resultado es siempre entero.
 */
export const costoVariable = (
    distanciaKm: number,
    kmBase: number,
    costoBase: number,
    costoKmAdicional: number
): number => {
    const exceso = Math.max(0, Number(distanciaKm) - Number(kmBase));
    const entero = Math.floor(exceso);
    const fraccion = exceso - entero;
    const kmExtras = fraccion > 0.5 ? entero + 1 : entero;
    return Number((Number(costoBase) + kmExtras * Number(costoKmAdicional)).toFixed(2));
};

/**
 * Modo de cobro de la sede. Si `parametros.modo` falta (configs anteriores a
 * este campo), se infiere con el MISMO criterio del panel Piter
 * (obtener_coordenadas_del_cliente === 'NO' → fijo, cualquier otra cosa →
 * variable). Antes el backend exigía === 'SI' para calcular variable, y las
 * sedes sin la clave cobraban fijo aunque el panel mostrara "Variable" (BUG A).
 */
export const resolverModo = (parametros: any): ModoDelivery => {
    const modo = parametros?.modo;
    if (modo === 'fijo' || modo === 'variable' || modo === 'zonas') return modo;
    return parametros?.obtener_coordenadas_del_cliente === 'NO' ? 'fijo' : 'variable';
};

/**
 * Descripción de tarifas para el bot (/config y /contexto — una sola fuente).
 * En modo zonas lista nombres y precios: el LLM explica mejor con datos
 * concretos que con "según tu zona".
 */
export const describirDelivery = (parametros: any): string => {
    const modo = resolverModo(parametros);
    if (modo === 'fijo') {
        const costo = Number(parametros?.costo_fijo || 0) || Number(parametros?.km_base_costo || 0);
        return `Costo fijo de delivery: S/${costo} a cualquier zona de la ciudad`;
    }
    if (modo === 'zonas') {
        const zonas = validarZonas(parametros?.zonas);
        if (zonas.length > 0) {
            const lista = zonas
                .map((z) => `${z.nombre} S/${z.costo}${z.tiempo_aprox_entrega ? ` (~${z.tiempo_aprox_entrega} min)` : ''}`)
                .join(', ');
            return `Delivery por zonas: ${lista}. Fuera de estas zonas no tenemos cobertura. El costo exacto se confirma al indicar la dirección o compartir la ubicación.`;
        }
        // Sin zonas válidas el cálculo cae a variable; describir eso.
    }
    return `Costo base S/${Number(parametros?.km_base_costo || 0)} hasta ${Number(parametros?.km_base || 0)} km, luego S/${Number(parametros?.km_adicional_costo || 0)} por km adicional`;
};

/**
 * Formato del resumen de pedido que el bot manda por WhatsApp.
 * 'imagen' = ticket PNG (files-bot/tickets/, sobreescrito por sesión);
 * 'texto' = comportamiento histórico. Vive en parametros (JSON sin DDL).
 */
export const resolverResumenFormato = (parametros: any): 'texto' | 'imagen' =>
    parametros?.resumen_formato === 'imagen' ? 'imagen' : 'texto';
