import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
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
        expect(svg).toContain('Delivery');
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

    it('incluye el numero de resumen (correlativo, no HHMMSS) y la hora cuando vienen', () => {
        const { svg } = construirTicketSVG({ ...datos, numeroResumen: '2', hora: '02/08/2026, 20:15:30' });
        expect(svg).toContain('Resumen #2');
        expect(svg).toContain('02/08/2026, 20:15:30');
    });

    it('sin numeroResumen no incluye "Resumen #"', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).not.toContain('Resumen #');
    });

    it('usa tipografia monoespaciada (estetica de ticket) con el atributo bien formado', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toContain(`font-family="'Courier New', 'DejaVu Sans Mono', monospace"`);
        // El atributo debe quedar bien formado: un solo par de comillas dobles
        // delimitando el valor, sin comillas dobles sueltas dentro que lo
        // rompan (las comillas simples de los nombres de familia no cuentan).
        const match = svg.match(/<svg[^>]*>/);
        expect(match).not.toBeNull();
        const aperturasComillasDobles = (match![0].match(/"/g) || []).length;
        expect(aperturasComillasDobles % 2).toBe(0);
    });

    it('"Resumen #" se pinta en negrita', () => {
        const { svg } = construirTicketSVG({ ...datos, numeroResumen: '2' });
        expect(svg).toMatch(/font-weight="bold"[^>]*>Resumen #2/);
    });

    it('incluye cliente, direccion (con wrap) y hora de entrega cuando vienen', () => {
        const { svg } = construirTicketSVG({
            ...datos,
            cliente: 'Zare',
            direccion: 'Jr. Reyes Guerra cdr. 7, restaurante San Carlos, Moyobamba',
            horaEntrega: { etiqueta: 'Recojo', valor: '13:00' }
        });
        expect(svg).toContain('Cliente: ');
        expect(svg).toContain('Zare');
        expect(svg).toContain('Dirección: ');
        expect(svg).toContain('Jr. Reyes Guerra');
        // La dirección larga se parte en más de una línea (wrap a 32 chars).
        expect((svg.match(/Dirección: /g) || []).length).toBe(1);
        expect(svg).toContain('Recojo: ');
        expect(svg).toContain('13:00');
    });

    it('sin cliente/direccion/horaEntrega no incluye esas etiquetas', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).not.toContain('Cliente:');
        expect(svg).not.toContain('Dirección:');
        expect(svg).not.toContain('Recojo:');
        expect(svg).not.toContain('Reserva:');
    });

    it('el badge es rojo "PEDIDO POR CONFIRMAR" (el resumen no es un pedido oficial)', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toContain('PEDIDO POR CONFIRMAR');
        expect(svg).toContain('#d32f2f');
    });

    it('el canal no se pierde: aparece como "Entrega: {canal}" en el bloque de datos', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toContain('Entrega: ');
        expect(svg).toContain('Delivery');
        expect(svg).not.toContain('>DELIVERY<');
    });
});

describe('legibilidad: minusculas y capitalizacion (pedido del dueño 04-08)', () => {
    it('platos de BD en MAYUSCULAS salen en minusculas', () => {
        const { svg } = construirTicketSVG({
            ...datos,
            secciones: [{ des: 'PLATOS', items: [{ cantidad_seleccionada: 1, des: 'ESTOFADO DE GALLINA', precio_print: '18.00', indicaciones: '' }] }]
        });
        expect(svg).toContain('1 estofado de gallina');
        expect(svg).not.toContain('ESTOFADO');
    });

    it('cliente y canal en Capitalizado ("SEÑORA ROSALINDA" → "Señora Rosalinda")', () => {
        const { svg } = construirTicketSVG({ ...datos, canal: 'PARA LLEVAR', cliente: 'SEÑORA ROSALINDA' });
        expect(svg).toContain('Para Llevar');
        expect(svg).toContain('Señora Rosalinda');
        expect(svg).not.toContain('ROSALINDA');
    });

    it('papaya.com.pe va mas notoria que la hora (23px, #555555)', () => {
        const { svg } = construirTicketSVG(datos);
        expect(svg).toMatch(/font-size="23" font-weight="bold" fill="#555555">papaya\.com\.pe/);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Opciones / seleccionables (subitems_view)
// ─────────────────────────────────────────────────────────────────────────
describe('opciones del plato (subitems_view)', () => {
    const conOpciones = {
        ...datos,
        secciones: [
            {
                des: 'pizzas', items: [{
                    cantidad_seleccionada: 2, des: 'PIZZA AMERICANA', precio_print: '72.00', indicaciones: '',
                    subitems_view: [
                        { des: 'MEDIANA', precio: 12, cantidad_seleccionada: 2 },
                        { des: 'SIN CEBOLLA', precio: 0, cantidad_seleccionada: 2 },
                    ],
                }]
            }
        ],
    };

    it('pinta una línea "+ Nx opcion" por cada elemento de subitems_view', () => {
        const { svg } = construirTicketSVG(conOpciones);
        expect(svg).toContain('+ 2x mediana');
        expect(svg).toContain('+ 2x sin cebolla');
    });

    it('las opciones van más sangradas, más chicas y más claras que el plato', () => {
        const { svg } = construirTicketSVG(conOpciones);
        expect(svg).toMatch(/<text x="64" y="\d+" font-size="19" fill="#777777">\+ 2x mediana<\/text>/);
    });

    it('escapa XML en la descripción de la opción', () => {
        const { svg } = construirTicketSVG({
            ...datos,
            secciones: [{ des: 'pizzas', items: [{ cantidad_seleccionada: 1, des: 'pizza', precio_print: '30.00', indicaciones: '', subitems_view: [{ des: 'JAMON & QUESO', precio: 0, cantidad_seleccionada: 1 }] }] }],
        });
        expect(svg).toContain('+ 1x jamon &amp; queso');
        expect(svg).not.toContain('+ 1x jamon & queso');
    });

    it('la altura crece con las opciones (el SVG es acumulativo)', () => {
        const sin = construirTicketSVG({ ...conOpciones, secciones: [{ ...conOpciones.secciones[0], items: [{ ...conOpciones.secciones[0].items[0], subitems_view: [] }] }] }).height;
        const con = construirTicketSVG(conOpciones).height;
        expect(con).toBeGreaterThan(sin);
        expect(con - sin).toBe(2 * (34 - 6)); // 2 opciones × (LH - 6)
    });

    it('una opción larga se parte en varias líneas (no se sale del ticket) y la altura crece', () => {
        // 57 chars: cabe en MAX_DES (60) de subitems.pedido.ts y no entra en el
        // ancho útil de la línea sangrada (~47 chars a font-size 19).
        const desLargo = 'MEDIANA, EXTRA QUESO, SIN CEBOLLA | bien cocido, poco sal';
        const largo = {
            ...datos,
            secciones: [{ des: 'pizzas', items: [{
                cantidad_seleccionada: 1, des: 'pizza', precio_print: '30.00', indicaciones: '',
                subitems_view: [{ des: desLargo, precio: 0, cantidad_seleccionada: 1 }],
            }] }],
        };
        const corto = {
            ...largo,
            secciones: [{ ...largo.secciones[0], items: [{ ...largo.secciones[0].items[0],
                subitems_view: [{ des: 'MEDIANA', precio: 0, cantidad_seleccionada: 1 }] }] }],
        };

        const { svg, height } = construirTicketSVG(largo);
        const lineas = svg.match(/<text x="64" y="\d+" font-size="19" fill="#777777">[^<]*<\/text>/g) || [];
        expect(lineas.length).toBeGreaterThan(1);
        // Ninguna línea pintada supera el ancho útil de la sangría.
        for (const l of lineas) {
            const texto = l.replace(/<[^>]*>/g, '');
            expect(texto.length).toBeLessThanOrEqual(47);
        }
        // Y el texto completo sigue estando (repartido entre las líneas).
        expect(lineas.map((l) => l.replace(/<[^>]*>/g, '')).join(' '))
            .toBe(`+ 1x ${desLargo.toLowerCase()}`);
        // La altura acompaña: una línea extra = LH - 6.
        expect(height - construirTicketSVG(corto).height).toBe((lineas.length - 1) * (34 - 6));
    });

    it('carta plana (sin subitems_view): el SVG es byte-idéntico al de antes del cambio', () => {
        // Huella tomada ANTES de tocar ticket.svg.ts. Si esto falla, lo nuevo dejó
        // de ser inerte para las cartas planas, que hoy funcionan perfecto.
        const { svg, height } = construirTicketSVG(datos);
        expect(height).toBe(686);
        expect(createHash('sha256').update(svg).digest('hex'))
            .toBe('77453a3c5cd316c61054e49a6bb4917c503e4f3946df23dc272d0d729a4b9947');
    });
});
