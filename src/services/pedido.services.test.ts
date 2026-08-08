import { describe, expect, it } from 'vitest';
import { esFilaCostoDelivery } from './pedido.services';

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
