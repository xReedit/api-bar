import { describe, it, expect } from 'vitest';
import { clasificarConfianza } from './geocoding.service';

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
