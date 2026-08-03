"use strict";
// Ticket del resumen de pedido como SVG (lo rasteriza sharp en
// ticket.image.service). Layout de 2 columnas texto/precio: la alineación es
// del dibujo, no de la fuente, así que se ve idéntico en cualquier pantalla.
exports.__esModule = true;
exports.construirTicketSVG = void 0;
var W = 640;
var PAD = 36; // margen lateral
var LH = 34; // alto de línea items
var FS = 24; // font-size base
var esc = function (s) {
    return String(s !== null && s !== void 0 ? s : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};
// Parte una descripción larga en líneas de máximo n caracteres (por palabra).
var wrap = function (texto, n) {
    var palabras = String(texto).split(/\s+/);
    var lineas = [];
    var actual = '';
    for (var _i = 0, palabras_1 = palabras; _i < palabras_1.length; _i++) {
        var p = palabras_1[_i];
        if ((actual + ' ' + p).trim().length > n) {
            if (actual)
                lineas.push(actual.trim());
            actual = p;
        }
        else {
            actual = (actual + ' ' + p).trim();
        }
    }
    if (actual)
        lineas.push(actual.trim());
    return lineas.length ? lineas : [''];
};
var construirTicketSVG = function (d) {
    var partes = [];
    var y = 64; // margen superior (antes 40; +24 de aire antes del logo)
    // ── Header: logo + nombre + canal ────────────────────────────────────
    // Caja apaisada (240x96): los logos reales suelen ser rectangulares
    // (p.ej. 337x61) — con una caja cuadrada 96x96 y preserveAspectRatio
    // "meet" quedaban aplastados a ~96x17, ilegibles. Los logos cuadrados
    // siguen viéndose bien porque "meet" los centra sin recortar.
    if (d.logoDataUrl) {
        partes.push("<image x=\"".concat(W / 2 - 120, "\" y=\"").concat(y - 10, "\" width=\"240\" height=\"96\" href=\"").concat(esc(d.logoDataUrl), "\" preserveAspectRatio=\"xMidYMid meet\"/>"));
        y += 126; // antes 106; +20 de aire entre el logo y el nombre de la sede
    }
    partes.push("<text x=\"".concat(W / 2, "\" y=\"").concat(y, "\" text-anchor=\"middle\" font-size=\"30\" font-weight=\"bold\" fill=\"#1a1a1a\">").concat(esc(d.nombreSede), "</text>"));
    y += 44;
    // Badge ROJO fijo: este ticket es un RESUMEN, no un pedido confirmado
    // todavía (el dueño lo pidió explícito para que no se confunda con uno
    // oficial). El canal (delivery/para llevar/local) no se pierde: se
    // muestra debajo, en la línea "Entrega:" del bloque de datos.
    partes.push("<rect x=\"".concat(W / 2 - 180, "\" y=\"").concat(y - 26, "\" width=\"360\" height=\"38\" rx=\"19\" fill=\"#d32f2f\"/>"));
    partes.push("<text x=\"".concat(W / 2, "\" y=\"").concat(y, "\" text-anchor=\"middle\" font-size=\"").concat(FS, "\" font-weight=\"bold\" fill=\"#ffffff\">PEDIDO POR CONFIRMAR</text>"));
    y += 40;
    // Número de resumen: distingue versiones cuando el cliente pide modificar
    // el pedido y se regenera el ticket para la misma sesión.
    if (d.numeroResumen) {
        partes.push("<text x=\"".concat(W / 2, "\" y=\"").concat(y, "\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"bold\" fill=\"#666666\">Resumen #").concat(esc(d.numeroResumen), "</text>"));
        y += 30;
    }
    // Datos del pedido: cliente, dirección (con wrap si es larga) y/o hora de
    // recojo/reserva. Alineado a la izquierda, etiqueta en negrita + valor
    // normal en la misma línea. Solo se pintan las líneas cuyo dato venga.
    // xml:space="preserve" es necesario: sin él, el espacio final del tspan
    // ("Cliente: ") es whitespace de borde y se colapsa/recorta por las
    // reglas de XML por defecto, pegando la etiqueta al valor ("Cliente:Zare").
    var FS_DATOS = 22;
    var LH_DATOS = 28;
    // Canal (delivery/para llevar/local): ya no aparece en el badge (ahora
    // fijo "PEDIDO POR CONFIRMAR"), así que va como primera línea aquí —
    // por eso este bloque siempre pinta al menos una línea.
    partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS_DATOS, "\" fill=\"#1a1a1a\" xml:space=\"preserve\"><tspan font-weight=\"bold\">Entrega: </tspan>").concat(esc(d.canal.toUpperCase()), "</text>"));
    y += LH_DATOS;
    if (d.cliente) {
        partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS_DATOS, "\" fill=\"#1a1a1a\" xml:space=\"preserve\"><tspan font-weight=\"bold\">Cliente: </tspan>").concat(esc(d.cliente), "</text>"));
        y += LH_DATOS;
    }
    if (d.direccion) {
        wrap(d.direccion, 32).forEach(function (linea, i) {
            var etiqueta = i === 0 ? "<tspan font-weight=\"bold\">Direcci\u00F3n: </tspan>" : '';
            partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS_DATOS, "\" fill=\"#1a1a1a\" xml:space=\"preserve\">").concat(etiqueta).concat(esc(linea), "</text>"));
            y += LH_DATOS;
        });
    }
    if (d.horaEntrega) {
        partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS_DATOS, "\" fill=\"#1a1a1a\" xml:space=\"preserve\"><tspan font-weight=\"bold\">").concat(esc(d.horaEntrega.etiqueta), ": </tspan>").concat(esc(d.horaEntrega.valor), "</text>"));
        y += LH_DATOS;
    }
    y += 8; // pequeño gap antes de la línea punteada de items
    partes.push("<line x1=\"".concat(PAD, "\" y1=\"").concat(y, "\" x2=\"").concat(W - PAD, "\" y2=\"").concat(y, "\" stroke=\"#cccccc\" stroke-width=\"2\" stroke-dasharray=\"6 6\"/>"));
    y += 34;
    // ── Items por sección ────────────────────────────────────────────────
    for (var _i = 0, _a = d.secciones || []; _i < _a.length; _i++) {
        var seccion = _a[_i];
        partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS, "\" font-weight=\"bold\" fill=\"#0b7a3e\">").concat(esc(String(seccion.des || '').toUpperCase()), "</text>"));
        y += LH;
        var _loop_1 = function (item) {
            var nombre = "".concat(item.cantidad_seleccionada, " ").concat(item.des);
            var precio = parseFloat(item.precio_print).toFixed(2);
            var lineas = wrap(nombre, 30); // monoespaciada: caracteres más anchos, deja sitio a la columna precio
            lineas.forEach(function (linea, i) {
                partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(FS, "\" fill=\"#1a1a1a\">").concat(esc(linea), "</text>"));
                if (i === 0)
                    partes.push("<text x=\"".concat(W - PAD, "\" y=\"").concat(y, "\" text-anchor=\"end\" font-size=\"").concat(FS, "\" fill=\"#1a1a1a\">").concat(esc(precio), "</text>"));
                y += LH;
            });
            if (item.indicaciones) {
                partes.push("<text x=\"".concat(PAD + 20, "\" y=\"").concat(y, "\" font-size=\"").concat(FS - 4, "\" font-style=\"italic\" fill=\"#666666\">(").concat(esc(item.indicaciones), ")</text>"));
                y += LH - 4;
            }
        };
        for (var _b = 0, _c = seccion.items || []; _b < _c.length; _b++) {
            var item = _c[_b];
            _loop_1(item);
        }
        y += 8;
    }
    // ── Subtotales ───────────────────────────────────────────────────────
    partes.push("<line x1=\"".concat(PAD, "\" y1=\"").concat(y, "\" x2=\"").concat(W - PAD, "\" y2=\"").concat(y, "\" stroke=\"#cccccc\" stroke-width=\"2\" stroke-dasharray=\"6 6\"/>"));
    y += 38;
    var subtotales = d.subtotales || [];
    subtotales.forEach(function (st, i) {
        var esTotal = i === subtotales.length - 1;
        var fs = esTotal ? FS + 8 : FS;
        var peso = esTotal ? 'bold' : 'normal';
        if (esTotal) {
            partes.push("<rect x=\"".concat(PAD - 10, "\" y=\"").concat(y - fs + 4, "\" width=\"").concat(W - 2 * PAD + 20, "\" height=\"").concat(fs + 16, "\" rx=\"8\" fill=\"#eef7f0\"/>"));
        }
        partes.push("<text x=\"".concat(PAD, "\" y=\"").concat(y, "\" font-size=\"").concat(fs, "\" font-weight=\"").concat(peso, "\" fill=\"#1a1a1a\">").concat(esc(String(st.descripcion || '').toUpperCase()), "</text>"));
        partes.push("<text x=\"".concat(W - PAD, "\" y=\"").concat(y, "\" text-anchor=\"end\" font-size=\"").concat(fs, "\" font-weight=\"").concat(peso, "\" fill=\"#1a1a1a\">S/ ").concat(esc(parseFloat(st.importe).toFixed(2)), "</text>"));
        y += esTotal ? LH + 18 : LH;
    });
    // ── Pie: hora del resumen (si viene) + publicidad discreta ──────────
    y += 30;
    partes.push("<line x1=\"".concat(PAD, "\" y1=\"").concat(y, "\" x2=\"").concat(W - PAD, "\" y2=\"").concat(y, "\" stroke=\"#cccccc\" stroke-width=\"2\" stroke-dasharray=\"6 6\"/>"));
    y += 34;
    if (d.hora) {
        partes.push("<text x=\"".concat(W / 2, "\" y=\"").concat(y, "\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"bold\" fill=\"#999999\">").concat(esc(d.hora), "</text>"));
        y += 26;
    }
    partes.push("<text x=\"".concat(W / 2, "\" y=\"").concat(y, "\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"bold\" fill=\"#999999\">papaya.com.pe</text>"));
    y += 10;
    var height = y + 20;
    // Comillas simples dentro del valor del atributo: como el atributo usa
    // comillas dobles como delimitador, las simples no necesitan escaparse
    // (XML/SVG válido) — se usan para declarar los nombres de familia con
    // espacios, igual que en CSS.
    var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(W, "\" height=\"").concat(height, "\" font-family=\"'Courier New', 'DejaVu Sans Mono', monospace\">")
        + "<rect width=\"".concat(W, "\" height=\"").concat(height, "\" fill=\"#fffdf7\"/>")
        + partes.join('')
        + "</svg>";
    return { svg: svg, width: W, height: height };
};
exports.construirTicketSVG = construirTicketSVG;
