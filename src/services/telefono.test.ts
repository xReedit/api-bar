import { describe, it, expect } from 'vitest';
import { normalizarTelefono, variantesTelefono } from './telefono';

describe('normalizarTelefono', () => {
    it('9 dígitos peruanos ⇒ antepone 51', () => {
        expect(normalizarTelefono('906828331')).toBe('51906828331');
    });

    it('limpia espacios, + y guiones', () => {
        expect(normalizarTelefono('+51 906-828 331')).toBe('51906828331');
    });

    it('ya normalizado queda igual', () => {
        expect(normalizarTelefono('51906828331')).toBe('51906828331');
    });

    it('otros largos (extranjero, LID de WhatsApp) solo se limpian, no se inventa prefijo', () => {
        expect(normalizarTelefono('123456789012345')).toBe('123456789012345');
    });

    it('quita el sufijo de dispositivo de WhatsApp (":0") y el dominio del JID', () => {
        expect(normalizarTelefono('51988938939:0')).toBe('51988938939');
        expect(normalizarTelefono('51988938939:12@s.whatsapp.net')).toBe('51988938939');
    });

    it('sin dígitos ⇒ cadena vacía', () => {
        expect(normalizarTelefono('  -- ')).toBe('');
    });
});

describe('variantesTelefono', () => {
    it('número peruano ⇒ forma normalizada + forma legacy de 9 dígitos', () => {
        expect(variantesTelefono('906828331')).toEqual(['51906828331', '906828331']);
        expect(variantesTelefono('51906828331')).toEqual(['51906828331', '906828331']);
    });

    it('otros largos ⇒ solo la forma limpia', () => {
        expect(variantesTelefono('123456789012345')).toEqual(['123456789012345']);
    });
});
