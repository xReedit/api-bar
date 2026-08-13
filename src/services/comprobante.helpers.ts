// Mapea la estructura guardada de un pedido confirmado (pedido_preview.estructura)
// al formato que espera la emisión de CPE en backend-pedidos
// (/bot/generar-comprobante → /v3/service/facturacion-e).
//
// Regla clave: los subtotales "extra" (costo delivery, set descartables, etc.)
// se convierten en ITEMS del comprobante — si no, la suma de items no cuadra
// con el total y SUNAT/apifac rechaza el documento.
//
// Regla clave 2: el importe de cada línea es `precio_print`, NO `precio_total`.
// Las reglas de carta (combos, plato de cortesía) rebajan el precio en
// `precio_print`/`precio_total_calc` y dejan `precio_total` con el precio de
// lista. El "Sub Total" del ticket se calcula con precio_print, así que leer
// precio_total inflaba la suma y el cuadre de backend-pedidos rebotaba con
// "el detalle del pedido no cuadra con el total" (caso real 12-08: entrada de
// cortesía en 0.00 dentro de un pedido de S/ 29.00).

export type ItemComprobante = {
    id: number;
    des: string;
    cantidad: number;
    punitario: number;
    precio_total: number;
};

export type SubtotalComprobante = { descripcion: string; importe: string };

const esFilaEstandar = (descripcion: string): boolean => {
    const d = String(descripcion || '').trim();
    return /^sub\s*\.?\s*total/i.test(d)
        || /^i\.?\s*g\.?\s*v/i.test(d)
        || /^total$/i.test(d.replace(/[.\s]+$/g, ''));
};

export const mapearEstructuraAComprobante = (estructura: any): {
    items: Array<{ items: ItemComprobante[] }>;
    subtotales: SubtotalComprobante[];
} => {
    const secciones = estructura?.p_body?.tipoconsumo?.[0]?.secciones || [];
    const items: ItemComprobante[] = [];

    for (const seccion of secciones) {
        for (const it of seccion?.items || []) {
            const cantidad = Number(it?.cantidad_seleccionada) || 0;
            // Orden de preferencia = el mismo que usa el ticket y el Sub Total.
            const cobrado = [it?.precio_print, it?.precio_total_calc, it?.precio_total]
                .map(Number).find((n) => Number.isFinite(n));
            const precioTotal = Number(cobrado) || 0;
            if (cantidad <= 0 || precioTotal <= 0) continue;
            // Unitario de lista solo si cuadra con lo cobrado (evita perder
            // centavos al dividir); si la regla rebajó la línea, se deriva.
            const deLista = Number(it?.precio_unitario) || Number(it?.precio) || 0;
            const punitario = Math.abs(deLista * cantidad - precioTotal) < 0.01
                ? deLista
                : precioTotal / cantidad;
            items.push({
                id: Number(it?.iditem) || 0,
                des: String(it?.des || it?.descripcion || 'CONSUMO'),
                cantidad,
                punitario: Number(punitario.toFixed(2)),
                precio_total: Number(precioTotal.toFixed(2))
            });
        }
    }

    const subtotales: SubtotalComprobante[] = (estructura?.p_subtotales || []).map((s: any) => ({
        descripcion: String(s?.descripcion || ''),
        importe: String(s?.importe ?? '0')
    }));

    // Filas extra (delivery, descartables...) → items del CPE.
    for (const fila of subtotales) {
        if (esFilaEstandar(fila.descripcion)) continue;
        const importe = Number(fila.importe) || 0;
        if (importe <= 0) continue;
        items.push({
            id: 0,
            des: fila.descripcion.toUpperCase(),
            cantidad: 1,
            punitario: Number(importe.toFixed(2)),
            precio_total: Number(importe.toFixed(2))
        });
    }

    return { items: [{ items }], subtotales };
};

/** Valida el documento según el tipo de comprobante. */
export const validarDocumento = (tipo: string, numDoc: string): { ok: boolean; error?: string } => {
    const doc = String(numDoc || '').replace(/\D/g, '');
    if (tipo === 'factura') {
        return doc.length === 11 ? { ok: true } : { ok: false, error: 'para factura necesito un RUC de 11 dígitos' };
    }
    if (tipo === 'boleta') {
        return doc.length === 8 ? { ok: true } : { ok: false, error: 'para boleta necesito un DNI de 8 dígitos' };
    }
    return { ok: false, error: 'tipo de comprobante inválido (boleta o factura)' };
};
