import { describe, expect, it } from 'vitest';
import { mapearEstructuraAComprobante, validarDocumento } from './comprobante.helpers';

// Estructura basada en pedidos REALES de pedido_preview (shape del procedure):
// caso Ofelia 04-08 (delivery + set descartables como filas de subtotal).
const estructuraDelivery = {
    p_body: {
        tipoconsumo: [{
            descripcion: 'DELIVERY',
            secciones: [
                {
                    des: 'ENTRADAS', items: [
                        { iditem: 100, des: 'SOPA DE ALBONDIGAS DE CARNE', cantidad_seleccionada: 1, precio_unitario: 0, precio: 0, precio_total: 0 }
                    ]
                },
                {
                    des: 'PLATOS DE FONDO', items: [
                        { iditem: 1579, des: 'CHICHARRON DE CHANCHO', cantidad_seleccionada: 1, precio_unitario: 15, precio: 15, precio_total: 15 },
                        { iditem: 1580, des: 'CAUSA DE FILETE', cantidad_seleccionada: 2, precio_unitario: 3, precio: 3, precio_total: 6 }
                    ]
                }
            ]
        }]
    },
    p_subtotales: [
        { descripcion: 'Sub Total', importe: '21.00' },
        { descripcion: 'Costo Delivery', importe: '5.78' },
        { descripcion: 'Set Descartables', importe: '1.00' },
        { descripcion: 'Total', importe: '27.78' }
    ]
};

// Caso real SAN CARLOS 12-08 (pedido 13530505): la "crema de ocopa" es
// cortesía de la regla de carta — precio_print 0 pero precio_total 8 (lista).
// Sumar precio_total daba 32 != 29 y backend-pedidos rebotaba la boleta.
const estructuraConCortesia = {
    p_body: {
        tipoconsumo: [{
            descripcion: 'DELIVERY',
            secciones: [
                {
                    des: 'ENTRADAS', items: [
                        { iditem: 200, des: 'CREMA DE OCOPA', cantidad_seleccionada: 1, precio_unitario: 8, precio: 8, precio_total: 8, precio_total_calc: 0, precio_print: 0 },
                        { iditem: 201, des: 'GELATINA', cantidad_seleccionada: 1, precio_unitario: 3, precio: 3, precio_total: 3, precio_total_calc: 3, precio_print: 3 }
                    ]
                },
                {
                    des: 'PLATOS DE FONDO', items: [
                        { iditem: 202, des: 'TRUCHA FRITA CON PATACONES', cantidad_seleccionada: 1, precio_unitario: 18, precio: 18, precio_total: 18, precio_total_calc: 18, precio_print: 18 }
                    ]
                },
                {
                    des: 'GASEOSAS', items: [
                        { iditem: 203, des: 'AGUA MINERAL SAN LUIS 750ML', cantidad_seleccionada: 1, precio_unitario: 3, precio: 3, precio_total: 3, precio_total_calc: 3, precio_print: 3 }
                    ]
                }
            ]
        }]
    },
    p_subtotales: [
        { descripcion: 'Sub Total', importe: '24.00' },
        { descripcion: 'Costo Delivery', importe: '4.00' },
        { descripcion: 'Set Descartables', importe: '1.00' },
        { descripcion: 'Total', importe: '29.00' }
    ]
};

describe('mapearEstructuraAComprobante', () => {
    it('un item de cortesía (regla de carta) no infla la suma: cuadra con el TOTAL', () => {
        const { items, subtotales } = mapearEstructuraAComprobante(estructuraConCortesia);
        const lista = items[0].items;
        expect(lista.find((i) => i.des.includes('OCOPA'))).toBeUndefined();
        const suma = lista.reduce((acc, i) => acc + i.precio_total, 0);
        expect(suma).toBeCloseTo(Number(subtotales[subtotales.length - 1].importe), 2);
    });

    it('una regla que rebaja (no anula) la línea ajusta también el unitario', () => {
        const rebajado = {
            p_body: { tipoconsumo: [{ secciones: [{ items: [
                { iditem: 300, des: 'COMBO', cantidad_seleccionada: 2, precio_unitario: 10, precio_total: 20, precio_print: 15 }
            ] }] }] },
            p_subtotales: [{ descripcion: 'Total', importe: '15.00' }]
        };
        expect(mapearEstructuraAComprobante(rebajado).items[0].items[0])
            .toEqual({ id: 300, des: 'COMBO', cantidad: 2, punitario: 7.5, precio_total: 15 });
    });

    it('aplana items de todas las secciones con {id, des, cantidad, punitario, precio_total}', () => {
        const { items } = mapearEstructuraAComprobante(estructuraDelivery);
        const lista = items[0].items;
        const chicharron = lista.find((i) => i.id === 1579);
        expect(chicharron).toEqual({ id: 1579, des: 'CHICHARRON DE CHANCHO', cantidad: 1, punitario: 15, precio_total: 15 });
        const causa = lista.find((i) => i.id === 1580);
        expect(causa).toEqual({ id: 1580, des: 'CAUSA DE FILETE', cantidad: 2, punitario: 3, precio_total: 6 });
    });

    it('items con precio 0 (sopa del menú) se omiten — SUNAT rechaza líneas en 0', () => {
        const { items } = mapearEstructuraAComprobante(estructuraDelivery);
        expect(items[0].items.find((i) => i.des.includes('SOPA'))).toBeUndefined();
    });

    it('delivery y descartables se vuelven ITEMS (si no, items no suman el total)', () => {
        const { items } = mapearEstructuraAComprobante(estructuraDelivery);
        const lista = items[0].items;
        expect(lista.find((i) => i.des === 'COSTO DELIVERY')).toEqual({ id: 0, des: 'COSTO DELIVERY', cantidad: 1, punitario: 5.78, precio_total: 5.78 });
        expect(lista.find((i) => i.des === 'SET DESCARTABLES')).toBeTruthy();
        const suma = lista.reduce((acc, i) => acc + i.precio_total, 0);
        expect(suma).toBeCloseTo(27.78, 2);
    });

    it('los subtotales se pasan tal cual (backend-pedidos normaliza etiquetas)', () => {
        const { subtotales } = mapearEstructuraAComprobante(estructuraDelivery);
        expect(subtotales[0]).toEqual({ descripcion: 'Sub Total', importe: '21.00' });
        expect(subtotales[subtotales.length - 1].descripcion).toBe('Total');
    });

    it('estructura vacía o malformada no revienta', () => {
        expect(mapearEstructuraAComprobante(null).items[0].items).toEqual([]);
        expect(mapearEstructuraAComprobante({}).subtotales).toEqual([]);
    });
});

describe('validarDocumento', () => {
    it('factura exige RUC de 11 (caso real de JULIO: 20615848124)', () => {
        expect(validarDocumento('factura', '20615848124').ok).toBe(true);
        expect(validarDocumento('factura', '12345678').ok).toBe(false);
    });
    it('boleta exige DNI de 8', () => {
        expect(validarDocumento('boleta', '45871236').ok).toBe(true);
        expect(validarDocumento('boleta', '20615848124').ok).toBe(false);
    });
    it('normaliza puntos y guiones del documento', () => {
        expect(validarDocumento('factura', '20-615848124').ok).toBe(true);
    });
    it('tipo inválido falla', () => {
        expect(validarDocumento('ticket', '45871236').ok).toBe(false);
    });
});
