import { describe, expect, it } from 'vitest';
import PedidoServices, { esFilaCostoDelivery } from './pedido.services';

// Caso real (Bacs Burguer 07-08): su subtotal "TAPER DELIVERY" hacía match
// falso con includes('delivery') → la fila del costo de envío se renombraba
// y el cobro del taper se eliminaba del pedido.
describe('esFilaCostoDelivery', () => {
    it('filas que SÍ son el costo de envío', () => {
        expect(esFilaCostoDelivery('COSTO DELIVERY')).toBe(true);
        expect(esFilaCostoDelivery('Costo Delivery')).toBe(true);
        expect(esFilaCostoDelivery('Costo de entrega')).toBe(true);
        expect(esFilaCostoDelivery('DELIVERY')).toBe(true);
        expect(esFilaCostoDelivery('Envío a domicilio')).toBe(true);
        expect(esFilaCostoDelivery('ENVIO')).toBe(true);
        expect(esFilaCostoDelivery('Entrega')).toBe(true);
    });

    it('cobros aparte que solo CONTIENEN la palabra NO son el costo de envío', () => {
        expect(esFilaCostoDelivery('TAPER DELIVERY')).toBe(false);
        expect(esFilaCostoDelivery('Set Delivery')).toBe(false);
        expect(esFilaCostoDelivery('SET DESCARTABLES')).toBe(false);
        expect(esFilaCostoDelivery('CAJA DELIVERY')).toBe(false);
        expect(esFilaCostoDelivery('COMISION SERVICIO')).toBe(false);
    });

    it('entradas raras no revientan', () => {
        expect(esFilaCostoDelivery('')).toBe(false);
        expect(esFilaCostoDelivery(null)).toBe(false);
        expect(esFilaCostoDelivery(undefined)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// cocinarPedido: precio de los items + opciones (seleccionables)
// ─────────────────────────────────────────────────────────────────────────
// `setDescripcionCantidadItems` es privado; se prueba a través de
// `cocinarPedido`, que es el punto de entrada público y no necesita reglas
// (sin setRules, validarReglasCarta devuelve las secciones tal cual).
const seccionesBase = (): any[] => ([
    { idseccion: 1, des: 'pizzas', items: [{ iditem: 101, des: 'PIZZA AMERICANA', precio: '30.00', precio_unitario: 30 }] },
    { idseccion: 2, des: 'bebidas', items: [{ iditem: 202, des: 'INKA KOLA 1L', precio: '8.00', precio_unitario: 8 }] },
]);
const itemDe = (secciones: any[], iditem: number): any =>
    secciones.reduce((acc: any[], s: any) => acc.concat(s.items), []).find((i: any) => i.iditem === iditem);

describe('cocinarPedido / setDescripcionCantidadItems', () => {
    it('el iditem string del bot cuadra con el number de la carta (antes === estricto fallaba)', () => {
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: '101', descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '' },
            { iditem: '202', descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '' },
        ]);
        expect(itemDe(cocinado, 101).cantidad_seleccionada).toBe(2);
        expect(itemDe(cocinado, 101).precio_print).toBe(60);
        expect(itemDe(cocinado, 202).precio_print).toBe(8);
    });

    it('un item de la carta sin match en el bot NO deja sin precio a los demás (regresión del catch vacío)', () => {
        // Antes: el find devolvía undefined, `.cantidad` lanzaba, el catch{} vacío
        // se lo tragaba y el resto del pedido se guardaba sin precio, en silencio.
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 3, indicaciones: '' },
        ]);
        expect(itemDe(cocinado, 202).precio_print).toBe(24);
        expect(itemDe(cocinado, 202).cantidad_seleccionada).toBe(3);
        expect(itemDe(cocinado, 101).precio_print).toBeUndefined(); // no había pedido para él
    });

    it('un item del bot que no está en la carta se ignora sin romper el resto', () => {
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 999, descripcion: 'PLATO FANTASMA', cantidad: 1, indicaciones: '' },
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 1, indicaciones: '' },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '' },
        ]);
        expect(itemDe(cocinado, 101).precio_print).toBe(30);
        expect(itemDe(cocinado, 202).precio_print).toBe(8);
    });

    it('plato repetido en itemsFromBot: el item cocinado conserva cantidad y precio', () => {
        // El controlador agrupa las líneas repetidas del mismo plato (varias
        // combinaciones de opciones) en UNA entrada con la cantidad y el
        // sobreprecio ya sumados; acá se comprueba que esa entrada agrupada se
        // refleja completa y que una repetición residual (o con el id en otro
        // tipo) no deja el item en NaN ni tumba el precio de los demás.
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 3, indicaciones: '', sobreprecio_total: 6 },
            { iditem: '101', descripcion: 'PIZZA AMERICANA', cantidad: 1, indicaciones: '' },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '' },
        ]);
        expect(itemDe(cocinado, 101).cantidad_seleccionada).toBe(3);
        expect(itemDe(cocinado, 101).precio_print).toBe(96); // 30*3 + 6
        expect(itemDe(cocinado, 202).precio_print).toBe(8);
    });

    it('sobreprecio_total se refleja en precio_total, precio_total_calc y precio_print', () => {
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '', sobreprecio_total: 12 },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '' },
        ]);
        const pizza = itemDe(cocinado, 101);
        expect(pizza.precio_total).toBe(72);        // 30*2 + 12
        expect(pizza.precio_total_calc).toBe(72);
        expect(pizza.precio_print).toBe(72);
        expect(itemDe(cocinado, 202).precio_print).toBe(8); // el resto, sin extra
    });

    it('sobreprecio_total ausente o basura no ensucia el precio (carta plana intacta)', () => {
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '' },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '', sobreprecio_total: 'x' },
        ]);
        expect(itemDe(cocinado, 101).precio_print).toBe(60);
        expect(itemDe(cocinado, 202).precio_print).toBe(8);
    });

    it('subitems_view se copia al item cocinado; sin opciones la clave NI SIQUIERA existe', () => {
        const view = [{ id: '307', des: 'MEDIANA', precio: 12, cantidad_seleccionada: 2, subitems: [{ iditem_subitem: 307 }] }];
        const cocinado = new PedidoServices().cocinarPedido(seccionesBase(), [
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '', sobreprecio_total: 12, subitems_view: view },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '', subitems_view: [] },
        ]);
        expect(itemDe(cocinado, 101).subitems_view).toEqual(view);
        // Inercia: el item sin opciones queda EXACTAMENTE como hoy (sin la clave).
        expect('subitems_view' in itemDe(cocinado, 202)).toBe(false);
    });
});

describe('getResumenPedidoShowCliente con opciones', () => {
    const subtotales = [
        { descripcion: 'Sub Total', importe: '68.00' },
        { descripcion: 'Total', importe: '68.00' },
    ];
    const cocinarYResumir = (itemsFromBot: any[]): string => {
        const svc = new PedidoServices();
        const cocinado = svc.cocinarPedido(seccionesBase(), itemsFromBot);
        return svc.getResumenPedidoShowCliente(cocinado, { descripcion: 'DELIVERY' }, subtotales);
    };

    it('lista una línea sangrada por opción, con importe solo si cuesta', () => {
        const resumen = cocinarYResumir([
            {
                iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '', sobreprecio_total: 12,
                subitems_view: [
                    { des: 'MEDIANA', precio: 12, cantidad_seleccionada: 2 },
                    { des: 'SIN CEBOLLA', precio: 0, cantidad_seleccionada: 2 },
                ],
            },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: '' },
        ]);
        expect(resumen).toContain('+ 2x mediana');
        expect(resumen).toMatch(/\+ 2x mediana[.\s]*12\.00/);
        expect(resumen).toContain('+ 2x sin cebolla');
        // La opción gratis no imprime importe: la fila queda sin número.
        expect(resumen).not.toMatch(/\+ 2x sin cebolla[.\s]*\d/);
    });

    it('sin subitems_view la salida es byte-idéntica a la de antes del cambio', () => {
        // Snapshot capturado ANTES de tocar el resumen: si esto falla, lo nuevo
        // dejó de ser inerte para las cartas planas (que hoy funcionan perfecto).
        const resumen = cocinarYResumir([
            { iditem: 101, descripcion: 'PIZZA AMERICANA', cantidad: 2, indicaciones: '' },
            { iditem: 202, descripcion: 'INKA KOLA 1L', cantidad: 1, indicaciones: 'bien helada' },
        ]);
        expect(resumen).toBe(
            'Pedido *DELIVERY*\n' +
            'El importe total es *68.00*\n' +
            '\n' +
            '*pizzas*                                           .\n' +
            '2 pizza americana.....................60.00\n' +
            '*bebidas*                                         .\n' +
            '1 inka kola 1l........................... 8.00\n' +
            '     (bien helada)...................     \n' +
            '\n' +
            'sub total.....................................68.00\n' +
            'total.............................................68.00\n'
        );
    });
});
