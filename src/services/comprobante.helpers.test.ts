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

describe('mapearEstructuraAComprobante', () => {
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
