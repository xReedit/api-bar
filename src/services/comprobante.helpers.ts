// Mapea la estructura guardada de un pedido confirmado (pedido_preview.estructura)
// al formato que espera la emisión de CPE en backend-pedidos
// (/bot/generar-comprobante → /v3/service/facturacion-e).
//
// Regla clave: los subtotales "extra" (costo delivery, set descartables, etc.)
// se convierten en ITEMS del comprobante — si no, la suma de items no cuadra
// con el total y SUNAT/apifac rechaza el documento.

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
            const precioTotal = Number(it?.precio_total) || 0;
            if (cantidad <= 0 || precioTotal <= 0) continue;
            const punitario = Number(it?.precio_unitario) || Number(it?.precio) || (precioTotal / cantidad);
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
