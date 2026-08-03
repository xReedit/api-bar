import { describe, expect, it } from 'vitest';
import {
    decidirDireccionTexto,
    describirDelivery,
    haversineKm,
    puntoEnCirculo,
    puntoEnPoligono,
    resolverModo,
    resolverResumenFormato,
    resolverZona,
    validarZonas,
    ZonaDelivery,
} from './delivery.zonas';
import { esSoloCiudad } from './geocoding.service';

// Casos construidos con los resultados REALES de Google para las
// conversaciones abandonadas del 03-08 (Silvia, César, Adelma, Jr. Iquitos):
// la dirección nunca debe detener la venta.
describe('decidirDireccionTexto (conversaciones reales 03-08)', () => {
    it('Silvia: "calle bomberos al lado de una iglesia" → Google dio solo "22001, Peru" (postal, ya descartado por el servicio) → costo base, sin preguntar', () => {
        expect(decidirDireccionTexto({ success: false }, 'variable', 10)).toBe('costo_base');
    });

    it('César: "Jr. Las Orquídeas 135" → Google dio plus code X2HH+7QF (descartado) → costo base, sin mostrar códigos raros', () => {
        expect(decidirDireccionTexto({ success: false }, 'variable', 10)).toBe('costo_base');
    });

    it('Adelma: "Puno 666" → match de calle a 1.79 km (partial, confianza baja) → USAR sin pedir confirmación', () => {
        expect(decidirDireccionTexto({ success: true, distanciaKm: 1.79 }, 'variable', 10)).toBe('usar');
    });

    it('Jr. Iquitos 148: homónima en Calzada a 13.55 km (geocode erróneo) → costo base, NUNCA rechazar la venta', () => {
        expect(decidirDireccionTexto({ success: true, distanciaKm: 13.55 }, 'variable', 10)).toBe('costo_base');
    });

    it('modo zonas: el punto se usa aunque esté lejos (la cobertura la deciden las zonas, no km_limite)', () => {
        expect(decidirDireccionTexto({ success: true, distanciaKm: 13.55 }, 'zonas', 999999)).toBe('usar');
    });

    it('resultado nulo o sin distancia → costo base', () => {
        expect(decidirDireccionTexto(null, 'variable', 10)).toBe('costo_base');
        expect(decidirDireccionTexto({ success: true }, 'variable', 10)).toBe('costo_base');
    });
});

describe('esSoloCiudad con los matches reales del 03-08', () => {
    it('el "22001, Peru" de Silvia (postal_code) no sirve como sugerencia', () => {
        expect(esSoloCiudad(['postal_code'])).toBe(true);
    });
    it('el "X2HH+7QF" de César (plus_code) no sirve como sugerencia', () => {
        expect(esSoloCiudad(['plus_code'])).toBe(true);
    });
    it('el "Puno 666" de Adelma (route) SÍ es una calle usable', () => {
        expect(esSoloCiudad(['route'])).toBe(false);
    });
});

// Cuadrado ~2km de lado alrededor de la plaza de Tarapoto (-6.4889, -76.3650).
const cuadrado = [
    { lat: -6.4989, lng: -76.3750 },
    { lat: -6.4989, lng: -76.3550 },
    { lat: -6.4789, lng: -76.3550 },
    { lat: -6.4789, lng: -76.3750 },
];

// Polígono cóncavo en forma de "L" (unidades pequeñas alrededor de 0 para razonar fácil).
const ele = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 3 },
    { lat: 1, lng: 3 },
    { lat: 1, lng: 1 },
    { lat: 3, lng: 1 },
    { lat: 3, lng: 0 },
];

describe('puntoEnPoligono', () => {
    it('dentro de polígono convexo', () => {
        expect(puntoEnPoligono({ lat: -6.4889, lng: -76.365 }, cuadrado)).toBe(true);
    });
    it('fuera de polígono convexo', () => {
        expect(puntoEnPoligono({ lat: -6.52, lng: -76.365 }, cuadrado)).toBe(false);
    });
    it('cóncavo: dentro del brazo, fuera de la muesca', () => {
        expect(puntoEnPoligono({ lat: 0.5, lng: 2.5 }, ele)).toBe(true); // brazo horizontal
        expect(puntoEnPoligono({ lat: 2.5, lng: 0.5 }, ele)).toBe(true); // brazo vertical
        expect(puntoEnPoligono({ lat: 2.5, lng: 2.5 }, ele)).toBe(false); // muesca de la L
    });
    it('menos de 3 puntos nunca contiene', () => {
        expect(puntoEnPoligono({ lat: 0, lng: 0 }, cuadrado.slice(0, 2))).toBe(false);
    });
});

describe('puntoEnCirculo / haversineKm', () => {
    const centro = { lat: -6.4889, lng: -76.365 };
    it('borde inclusivo', () => {
        const aTresKm = { lat: -6.4889 + 3 / 111.32, lng: -76.365 }; // ~3 km al norte
        const d = haversineKm(centro, aTresKm);
        expect(d).toBeGreaterThan(2.9);
        expect(d).toBeLessThan(3.1);
        expect(puntoEnCirculo(aTresKm, centro, d)).toBe(true); // exactamente en el borde
        expect(puntoEnCirculo(aTresKm, centro, d - 0.01)).toBe(false);
    });
});

describe('resolverZona', () => {
    const zonas: ZonaDelivery[] = [
        { nombre: 'Centro', costo: 4, tipo: 'poligono', puntos: cuadrado },
        { nombre: 'Amplia', costo: 7, tipo: 'circulo', centro: { lat: -6.4889, lng: -76.365 }, radio_km: 5 },
    ];
    it('en solape gana el índice menor', () => {
        const r = resolverZona(zonas, { lat: -6.4889, lng: -76.365 }); // dentro de ambas
        expect(r.cubierto && r.zona.nombre).toBe('Centro');
    });
    it('solo la segunda contiene', () => {
        const r = resolverZona(zonas, { lat: -6.52, lng: -76.365 }); // fuera del cuadrado, dentro del círculo
        expect(r.cubierto && r.zona.nombre).toBe('Amplia');
    });
    it('fuera de todas → no cubierto', () => {
        expect(resolverZona(zonas, { lat: -7, lng: -77 }).cubierto).toBe(false);
    });
});

describe('validarZonas', () => {
    it('filtra malformadas y coacciona strings numéricos', () => {
        const raw = [
            { nombre: 'ok', costo: '4', tipo: 'poligono', puntos: cuadrado },
            { nombre: 'pocos puntos', costo: 5, tipo: 'poligono', puntos: cuadrado.slice(0, 2) },
            { nombre: 'sin costo', tipo: 'circulo', centro: { lat: 0, lng: 0 }, radio_km: 1 },
            { nombre: 'radio 0', costo: 3, tipo: 'circulo', centro: { lat: 0, lng: 0 }, radio_km: 0 },
            { nombre: 'ok circulo', costo: 6, tipo: 'circulo', centro: { lat: '-6.48', lng: '-76.36' }, radio_km: '2' },
            'basura',
            null,
        ];
        const zonas = validarZonas(raw);
        expect(zonas.map((z) => z.nombre)).toEqual(['ok', 'ok circulo']);
        expect(zonas[0].costo).toBe(4);
        expect(zonas[1].radio_km).toBe(2);
        expect(zonas[1].centro).toEqual({ lat: -6.48, lng: -76.36 });
    });
    it('no-array → vacío', () => {
        expect(validarZonas(undefined)).toEqual([]);
        expect(validarZonas({})).toEqual([]);
    });
});

describe('resolverModo (BUG A)', () => {
    it('modo explícito manda', () => {
        expect(resolverModo({ modo: 'zonas', obtener_coordenadas_del_cliente: 'NO' })).toBe('zonas');
        expect(resolverModo({ modo: 'fijo' })).toBe('fijo');
    });
    it("sin modo + 'NO' → fijo (criterio del panel)", () => {
        expect(resolverModo({ obtener_coordenadas_del_cliente: 'NO' })).toBe('fijo');
    });
    it("sin modo + 'SI' → variable", () => {
        expect(resolverModo({ obtener_coordenadas_del_cliente: 'SI' })).toBe('variable');
    });
    it('sin modo y sin clave → variable (el caso del BUG A)', () => {
        expect(resolverModo({})).toBe('variable');
        expect(resolverModo(null)).toBe('variable');
    });
});

describe('describirDelivery', () => {
    it('fijo usa costo_fijo con fallback a km_base_costo', () => {
        expect(describirDelivery({ modo: 'fijo', costo_fijo: 8, km_base_costo: 5 })).toContain('S/8');
        expect(describirDelivery({ modo: 'fijo', costo_fijo: 0, km_base_costo: 5 })).toContain('S/5');
    });
    it('zonas lista nombres y precios', () => {
        const d = describirDelivery({
            modo: 'zonas',
            zonas: [
                { nombre: 'Centro', costo: 4, tiempo_aprox_entrega: 25, tipo: 'poligono', puntos: cuadrado },
                { nombre: 'Periferia', costo: 7, tipo: 'circulo', centro: { lat: 0, lng: 0 }, radio_km: 3 },
            ],
        });
        expect(d).toContain('Centro S/4 (~25 min)');
        expect(d).toContain('Periferia S/7');
        expect(d).toContain('no tenemos cobertura');
    });
    it('zonas vacías cae a la descripción variable', () => {
        const d = describirDelivery({ modo: 'zonas', zonas: [], km_base_costo: 5, km_base: 2, km_adicional_costo: 1 });
        expect(d).toContain('Costo base S/5');
    });
});

describe('resolverResumenFormato', () => {
    it('default texto cuando falta el flag', () => {
        expect(resolverResumenFormato({})).toBe('texto');
        expect(resolverResumenFormato(null)).toBe('texto');
    });
    it('imagen solo cuando esta explicito', () => {
        expect(resolverResumenFormato({ resumen_formato: 'imagen' })).toBe('imagen');
        expect(resolverResumenFormato({ resumen_formato: 'otro' })).toBe('texto');
    });
});
