import { describe, it, expect } from 'vitest';
import { construirTicketSVG } from './ticket.svg';

const datos = {
    nombreSede: 'RESTO MAR & SELVA',
    canal: 'DELIVERY',
    secciones: [
        { des: 'platos criollos', items: [
            { cantidad_seleccionada: 1, des: 'arroz con pato', precio_print: '20.00', indicaciones: 'sin ají' }
        ]},
        { des: 'brasas & carnes', items: [
            { cantidad_seleccionada: 2, des: 'anticucho <especial>', precio_print: '10.00', indicaciones: '' }
        ]}
    ],
    subtotales: [
        { descripcion: 'sub total', importe: '36.44' },
        { descripcion: 'i.g.v.', importe: '6.56' },
        { descripcion: 'costo delivery', importe: '3.00' },
        { descripcion: 'total', importe: '43.00' }
    ]
};

describe('construirTicketSVG', () => {
    it('genera un SVG con canal, items y total', () => {
        const { svg, width, height } = construirTicketSVG(datos);
        expect(svg).toContain('<svg');
        expect(svg).toContain('DELIVERY');
        expect(svg).toContain('arroz con pato');
        expect(svg).toContain('43.00');
        expect(width).toBe(640);
        expect(height).toBeGreaterThan(300);
    });

    it('escapa XML en nombres con & y <> (no rompe el SVG)', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toContain('RESTO MAR &amp; SELVA');
        expect(svg).toContain('anticucho &lt;especial&gt;');
        expect(svg).not.toContain('<especial>');
    });

    it('la altura crece con más items', () => {
        const pocos = construirTicketSVG(datos).height;
        const muchos = construirTicketSVG({
            ...datos,
            secciones: [...datos.secciones, ...datos.secciones, ...datos.secciones]
        }).height;
        expect(muchos).toBeGreaterThan(pocos);
    });

    it('incluye el logo si viene data-url', () => {
        const { svg } = construirTicketSVG({ ...datos, logoDataUrl: 'data:image/png;base64,AAA' });
        expect(svg).toContain('<image');
    });

    it('sin logo no incluye <image>', () => {
        const { svg } = construirTicketSVG({ ...datos, logoDataUrl: null });
        expect(svg).not.toContain('<image');
    });

    it('incluye el pie de página con papaya.com.pe', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toContain('papaya.com.pe');
    });

    it('incluye el numero de resumen y la hora cuando vienen', () => {
        const { svg } = construirTicketSVG({ ...datos, numeroResumen: '123456', hora: '02/08/2026, 20:15:30' });
        expect(svg).toContain('Resumen #123456');
        expect(svg).toContain('02/08/2026, 20:15:30');
    });

    it('sin numeroResumen no incluye "Resumen #"', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).not.toContain('Resumen #');
    });
});
