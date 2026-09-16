import { describe, it, expect } from 'vitest';
import { resolverCartaTachado, construirOverlaySVG, hashAgotados } from './carta.tachado.service';

describe('resolverCartaTachado', () => {
    it('default off para cualquier cosa rara', () => {
        expect(resolverCartaTachado(undefined)).toBe('off');
        expect(resolverCartaTachado({})).toBe('off');
        expect(resolverCartaTachado({ carta_tachado: 'imagen' })).toBe('off');
    });
    it('acepta manual y auto', () => {
        expect(resolverCartaTachado({ carta_tachado: 'manual' })).toBe('manual');
        expect(resolverCartaTachado({ carta_tachado: 'auto' })).toBe('auto');
    });
});

describe('construirOverlaySVG', () => {
    it('una linea roja centrada por caja, con margen horizontal', () => {
        const svg = construirOverlaySVG(1000, 2000, [{ x: 0.1, y: 0.5, w: 0.3, h: 0.02 }]);
        expect(svg).toContain('<svg');
        expect(svg).toContain('width="1000"');
        const m = svg.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/)!;
        expect(Number(m[1])).toBeLessThan(100);      // arranca antes de la caja
        expect(Number(m[3])).toBeGreaterThan(400);   // termina después
        expect(Number(m[2])).toBeCloseTo(1020, 0);   // y centrado: (0.5 + 0.01) * 2000
        expect(m[2]).toBe(m[4]);                     // horizontal
    });
    it('sin cajas, sin <line>', () => {
        expect(construirOverlaySVG(100, 100, [])).not.toContain('<line');
    });
});

describe('hashAgotados', () => {
    it('estable ante orden', () => {
        expect(hashAgotados(['b', 'a'])).toBe(hashAgotados(['a', 'b']));
    });
    it('cambia con el contenido', () => {
        expect(hashAgotados(['a'])).not.toBe(hashAgotados(['a', 'b']));
    });
    // el etag de la carta entra al hash: carta re-subida con los mismos agotados
    // debe dar key distinta, si no se sirve la imagen generada con la carta vieja
    it('distingue versiones de la carta con los mismos agotados', () => {
        expect(hashAgotados(['etag1', 'a'])).not.toBe(hashAgotados(['etag2', 'a']));
    });
});
