// Carta del día con su stock, desde el MISMO procedure que usa el contexto del bot
// (porcedure_pwa_pedido_carta). La imagen tachada leía carta_lista.cantidad por su
// cuenta y no coincidía con el stock que el procedure calcula: el bot decía "se
// agotó" y la imagen salía sin tachar. Una sola fuente = imagen y bot de acuerdo.

export type ItemMenu = { iditem: number; descripcion: string; stock: number };

// 'ND' = sin control de stock (siempre disponible). Vacío/null/basura = 0.
export const stockNumerico = (cantidad: unknown): number =>
    cantidad === 'ND' ? 1000 : Number(cantidad) || 0;

// Aplana f0 (categorías → secciones → items) sin repetir items.
export const itemsDeCarta = (f0: any): ItemMenu[] => {
    const vistos = new Set<number>();
    const out: ItemMenu[] = [];
    for (const categoria of Array.isArray(f0) ? f0 : []) {
        for (const seccion of categoria?.secciones || []) {
            for (const item of seccion?.items || []) {
                const iditem = Number(item?.iditem);
                if (!Number.isFinite(iditem) || vistos.has(iditem)) continue;
                vistos.add(iditem);
                out.push({ iditem, descripcion: String(item?.des ?? ''), stock: stockNumerico(item?.cantidad) });
            }
        }
    }
    return out;
};

export const itemsDelMenu = async (prisma: any, idsede: number): Promise<ItemMenu[]> => {
    const sede = await prisma.sede.findUnique({ where: { idsede: Number(idsede) }, select: { idorg: true } });
    if (!sede?.idorg) return [];
    const rpt: any = await prisma.$queryRaw`call porcedure_pwa_pedido_carta(${sede.idorg},${Number(idsede)},1)`;
    return itemsDeCarta(rpt?.[0]?.f0);
};
