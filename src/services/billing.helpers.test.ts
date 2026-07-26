import { describe, expect, it } from 'vitest';
import {
    buildRecargaPayload,
    parseAuthorizationResponse,
    validarConfirmar,
    validarIniciar,
} from './billing.helpers';

describe('validarIniciar', () => {
    it('acepta idsede e idPack numéricos (number o string numérica)', () => {
        expect(validarIniciar({ idsede: 2, id_pack: 1 })).toEqual({ idsede: 2, idPack: 1 });
        expect(validarIniciar({ idsede: '2', id_pack: '1' })).toEqual({ idsede: 2, idPack: 1 });
    });
    it('rechaza faltantes, no numéricos o <= 0', () => {
        expect(validarIniciar({})).toBeNull();
        expect(validarIniciar({ idsede: 0, id_pack: 1 })).toBeNull();
        expect(validarIniciar({ idsede: 2, id_pack: 'abc' })).toBeNull();
        expect(validarIniciar(null)).toBeNull();
    });
});

describe('validarConfirmar', () => {
    it('acepta purchaseNumber numérico y transactionToken no vacío', () => {
        expect(validarConfirmar({ purchaseNumber: '7', transactionToken: 'tok' }))
            .toEqual({ purchaseNumber: 7, transactionToken: 'tok' });
    });
    it('rechaza token vacío o purchaseNumber inválido', () => {
        expect(validarConfirmar({ purchaseNumber: '7', transactionToken: '' })).toBeNull();
        expect(validarConfirmar({ purchaseNumber: 'x', transactionToken: 'tok' })).toBeNull();
        expect(validarConfirmar(undefined)).toBeNull();
    });
});

describe('parseAuthorizationResponse', () => {
    it('ACTION_CODE 000 en dataMap = aprobado, con TRANSACTION_ID', () => {
        const r = parseAuthorizationResponse({
            dataMap: { ACTION_CODE: '000', TRANSACTION_ID: '990000123', ACTION_DESCRIPTION: 'Aprobado' },
        });
        expect(r).toEqual({ ok: true, reconocido: true, actionCode: '000', transactionId: '990000123', descripcion: 'Aprobado' });
    });
    it('rechazo trae ok=false con código y descripción, reconocido=true', () => {
        const r = parseAuthorizationResponse({
            data: { ACTION_CODE: '180', ACTION_DESCRIPTION: 'Tarjeta inválida', TRANSACTION_ID: '990000124' },
        });
        expect(r.ok).toBe(false);
        expect(r.actionCode).toBe('180');
        expect(r.descripcion).toBe('Tarjeta inválida');
        expect(r.reconocido).toBe(true);
    });
    it('respuesta irreconocible = ok=false, reconocido=false, sin reventar', () => {
        const r = parseAuthorizationResponse('cualquier cosa');
        expect(r.ok).toBe(false);
        expect(r.actionCode).toBe('');
        expect(r.reconocido).toBe(false);
    });
    it('decline 180 (real, con ACTION_CODE) = reconocido=true, ok=false', () => {
        const r = parseAuthorizationResponse({
            dataMap: { ACTION_CODE: '180', ACTION_DESCRIPTION: 'Rechazada', TRANSACTION_ID: '990000125' },
        });
        expect(r.ok).toBe(false);
        expect(r.reconocido).toBe(true);
    });
});

describe('buildRecargaPayload', () => {
    it('arma el payload para chatbot-go con tx_id prefijado e idsede string', () => {
        expect(buildRecargaPayload({ idsede: 2, conversaciones: 100, monto: 59, niubizTx: '990000123' }))
            .toEqual({ tx_id: 'niubiz-990000123', idsede: '2', cantidad: 100, monto: 59 });
    });
});
