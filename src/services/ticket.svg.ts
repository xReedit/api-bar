// Ticket del resumen de pedido como SVG (lo rasteriza sharp en
// ticket.image.service). Layout de 2 columnas texto/precio: la alineación es
// del dibujo, no de la fuente, así que se ve idéntico en cualquier pantalla.

export type DatosTicket = {
    nombreSede: string;
    canal: string;
    secciones: any[];
    subtotales: any[];
    logoDataUrl?: string | null;
};

const W = 640;
const PAD = 36;            // margen lateral
const LH = 34;             // alto de línea items
const FS = 24;             // font-size base

const esc = (s: any): string =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Parte una descripción larga en líneas de máximo n caracteres (por palabra).
const wrap = (texto: string, n: number): string[] => {
    const palabras = String(texto).split(/\s+/);
    const lineas: string[] = [];
    let actual = '';
    for (const p of palabras) {
        if ((actual + ' ' + p).trim().length > n) {
            if (actual) lineas.push(actual.trim());
            actual = p;
        } else {
            actual = (actual + ' ' + p).trim();
        }
    }
    if (actual) lineas.push(actual.trim());
    return lineas.length ? lineas : [''];
};

export const construirTicketSVG = (d: DatosTicket): { svg: string; width: number; height: number } => {
    const partes: string[] = [];
    let y = 40;

    // ── Header: logo + nombre + canal ────────────────────────────────────
    // Caja apaisada (240x96): los logos reales suelen ser rectangulares
    // (p.ej. 337x61) — con una caja cuadrada 96x96 y preserveAspectRatio
    // "meet" quedaban aplastados a ~96x17, ilegibles. Los logos cuadrados
    // siguen viéndose bien porque "meet" los centra sin recortar.
    if (d.logoDataUrl) {
        partes.push(`<image x="${W / 2 - 120}" y="${y - 10}" width="240" height="96" href="${esc(d.logoDataUrl)}" preserveAspectRatio="xMidYMid meet"/>`);
        y += 106;
    }
    partes.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="30" font-weight="bold" fill="#1a1a1a">${esc(d.nombreSede)}</text>`);
    y += 44;
    partes.push(`<rect x="${W / 2 - 110}" y="${y - 26}" width="220" height="38" rx="19" fill="#0b7a3e"/>`);
    partes.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="${FS}" font-weight="bold" fill="#ffffff">PEDIDO ${esc(d.canal.toUpperCase())}</text>`);
    y += 40;
    partes.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#cccccc" stroke-width="2" stroke-dasharray="6 6"/>`);
    y += 34;

    // ── Items por sección ────────────────────────────────────────────────
    for (const seccion of d.secciones || []) {
        partes.push(`<text x="${PAD}" y="${y}" font-size="${FS}" font-weight="bold" fill="#0b7a3e">${esc(String(seccion.des || '').toUpperCase())}</text>`);
        y += LH;
        for (const item of seccion.items || []) {
            const nombre = `${item.cantidad_seleccionada} ${item.des}`;
            const precio = parseFloat(item.precio_print).toFixed(2);
            const lineas = wrap(nombre, 34); // deja sitio a la columna precio
            lineas.forEach((linea, i) => {
                partes.push(`<text x="${PAD}" y="${y}" font-size="${FS}" fill="#1a1a1a">${esc(linea)}</text>`);
                if (i === 0) partes.push(`<text x="${W - PAD}" y="${y}" text-anchor="end" font-size="${FS}" fill="#1a1a1a">${esc(precio)}</text>`);
                y += LH;
            });
            if (item.indicaciones) {
                partes.push(`<text x="${PAD + 20}" y="${y}" font-size="${FS - 4}" font-style="italic" fill="#666666">(${esc(item.indicaciones)})</text>`);
                y += LH - 4;
            }
        }
        y += 8;
    }

    // ── Subtotales ───────────────────────────────────────────────────────
    partes.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#cccccc" stroke-width="2" stroke-dasharray="6 6"/>`);
    y += 38;
    const subtotales = d.subtotales || [];
    subtotales.forEach((st, i) => {
        const esTotal = i === subtotales.length - 1;
        const fs = esTotal ? FS + 8 : FS;
        const peso = esTotal ? 'bold' : 'normal';
        if (esTotal) {
            partes.push(`<rect x="${PAD - 10}" y="${y - fs + 4}" width="${W - 2 * PAD + 20}" height="${fs + 16}" rx="8" fill="#eef7f0"/>`);
        }
        partes.push(`<text x="${PAD}" y="${y}" font-size="${fs}" font-weight="${peso}" fill="#1a1a1a">${esc(String(st.descripcion || '').toUpperCase())}</text>`);
        partes.push(`<text x="${W - PAD}" y="${y}" text-anchor="end" font-size="${fs}" font-weight="${peso}" fill="#1a1a1a">S/ ${esc(parseFloat(st.importe).toFixed(2))}</text>`);
        y += esTotal ? LH + 18 : LH;
    });

    // ── Pie: publicidad discreta ────────────────────────────────────────
    y += 30;
    partes.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#cccccc" stroke-width="2" stroke-dasharray="6 6"/>`);
    y += 34;
    partes.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="20" fill="#999999">papaya.com.pe</text>`);

    y += 10;
    const height = y + 20;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" font-family="DejaVu Sans, Arial, sans-serif">`
        + `<rect width="${W}" height="${height}" fill="#fffdf7"/>`
        + partes.join('')
        + `</svg>`;
    return { svg, width: W, height };
};
