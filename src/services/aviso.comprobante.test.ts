import { describe, it, expect, vi } from 'vitest';
import { numeroDeSesion, mensajeAvisoComprobante, avisarComprobante } from './aviso.comprobante';

describe('numeroDeSesion', () => {
    it('saca el número del session_id numero_idorg_idsede', () => {
        expect(numeroDeSesion('51942471637_16_13')).toBe('51942471637');
    });
    it('rechaza sesiones sin número válido', () => {
        expect(numeroDeSesion('abc_16_13')).toBeNull();
        expect(numeroDeSesion('')).toBeNull();
    });
});

describe('mensajeAvisoComprobante', () => {
    it('emitido → número y link textuales', () => {
        const m = mensajeAvisoComprobante('boleta', { success: true, numero: 'B001-0000123', url_pdf: 'https://x/pdf/1' });
        expect(m).toContain('B001-0000123');
        expect(m).toContain('https://x/pdf/1');
    });
    it('fallido → deriva a caja, sin inventar número', () => {
        const m = mensajeAvisoComprobante('factura', { success: false, error: 'x' });
        expect(m).toMatch(/caja/);
        expect(m).not.toMatch(/F\d{3}/);
    });
});

describe('avisarComprobante', () => {
    const cfg = { url: 'https://p/chatbot/emitir', key: 'k' };
    it('postea al canal con idorg, idsede, numero y mensaje', async () => {
        const post = vi.fn().mockResolvedValue({ status: 200 });
        await avisarComprobante({ session_id: '51999888777_16_13', idorg: 16, idsede: 13, tipo: 'boleta', resultado: { success: true, numero: 'B1', url_pdf: 'u' } }, cfg, post);
        expect(post).toHaveBeenCalledWith(cfg.url, expect.objectContaining({ idorg: '16', idsede: '13', numero: '51999888777' }), expect.objectContaining({ headers: { 'x-api-key': 'k' } }));
    });
    it('sin config no postea (feature apagado, no rompe)', async () => {
        const post = vi.fn();
        await avisarComprobante({ session_id: '51999888777_16_13', idorg: 16, idsede: 13, tipo: 'boleta', resultado: { success: true } }, { url: '', key: '' }, post);
        expect(post).not.toHaveBeenCalled();
    });
    it('si el canal falla no lanza (corre en segundo plano)', async () => {
        const post = vi.fn().mockRejectedValue(new Error('503'));
        await expect(avisarComprobante({ session_id: '51999888777_16_13', idorg: 16, idsede: 13, tipo: 'boleta', resultado: { success: true } }, cfg, post)).resolves.toBe(false);
    });
});
