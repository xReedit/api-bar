import { describe, it, expect, afterEach } from 'vitest';
import { clasificarConfianza, estimarKmRuta } from './geocoding.service';

describe('estimarKmRuta', () => {
    afterEach(() => {
        delete process.env.DELIVERY_FACTOR_RUTA;
    });

    it('aplica el factor de desvío urbano 1.3 por defecto', () => {
        expect(estimarKmRuta(10)).toBe(13);
        expect(estimarKmRuta(2.5)).toBe(3.25);
    });

    it('redondea a 2 decimales', () => {
        expect(estimarKmRuta(1.333)).toBe(1.73);
    });

    it('el factor es ajustable por env DELIVERY_FACTOR_RUTA', () => {
        process.env.DELIVERY_FACTOR_RUTA = '1.5';
        expect(estimarKmRuta(10)).toBe(15);
    });

    it('env inválida cae al factor por defecto', () => {
        process.env.DELIVERY_FACTOR_RUTA = 'abc';
        expect(estimarKmRuta(10)).toBe(13);
    });
});

describe('clasificarConfianza', () => {
    it('match exacto de calle con número es alta', () => {
        expect(clasificarConfianza({
            types: ['street_address'],
            geometry: { location_type: 'ROOFTOP' }
        })).toBe('alta');
    });

    it('match a nivel de calle (sin número) es alta', () => {
        expect(clasificarConfianza({
            types: ['route'],
            geometry: { location_type: 'GEOMETRIC_CENTER' }
        })).toBe('alta');
    });

    it('partial_match (typo: "jr calao") es baja', () => {
        expect(clasificarConfianza({
            partial_match: true,
            types: ['route'],
            geometry: { location_type: 'GEOMETRIC_CENTER' }
        })).toBe('baja');
    });

    it('solo encontró la ciudad (locality) es baja', () => {
        expect(clasificarConfianza({
            types: ['locality', 'political'],
            geometry: { location_type: 'APPROXIMATE' }
        })).toBe('baja');
    });

    it('location_type APPROXIMATE es baja', () => {
        expect(clasificarConfianza({
            types: ['postal_code'],
            geometry: { location_type: 'APPROXIMATE' }
        })).toBe('baja');
    });

    it('resultado vacío no revienta', () => {
        expect(clasificarConfianza({})).toBe('alta');
    });
});
