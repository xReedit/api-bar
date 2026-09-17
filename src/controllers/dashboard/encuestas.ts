// Dashboard: encuestas de satisfaccion (resultados, malas experiencias y su seguimiento).
// Contrato: plan/ENCUESTAS-DASHBOARD-PLAN.md del POS legacy.
//
// A diferencia de los demas dash-*, aqui TODA sede pedida se valida contra las sedes del token (JWT del login del
// dashboard: { id, idorg, sedes:[{idsede,nombre}] }): un usuario no puede leer ni atender encuestas de otro negocio
// cambiando el idsede del body.
import * as express from 'express';
import { Request, Response } from 'express';
import { CustomRequest } from '../../middleware/auth';
import { limitarRangoFechasDashboard } from '../../utils/utils';
import * as dash from '../../services/encuesta.dash.service';

const router = express.Router();
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Sesion { idusuario: number; idorg: number; sedes: { idsede: number; nombre: string }[] }

/** Datos del JWT. 403 si el token no trae org o sedes (tokens de otros logins). */
export const sesionDe = (req: Request): Sesion => {
    const t = (req as CustomRequest).token as any;
    const sedes = Array.isArray(t?.sedes)
        ? t.sedes.map((s: any) => ({ idsede: Number(s.idsede), nombre: String(s.nombre ?? '') })).filter((s: any) => Number.isSafeInteger(s.idsede) && s.idsede > 0)
        : [];
    const idorg = Number(t?.idorg);
    const idusuario = Number(t?.id);
    if (!sedes.length || !Number.isSafeInteger(idorg) || idorg <= 0 || !Number.isSafeInteger(idusuario)) {
        throw new dash.ErrorDash(403, 'Tu sesión no tiene acceso a encuestas. Vuelve a iniciar sesión.');
    }
    return { idusuario, idorg, sedes };
};

/** La sede pedida debe ser una de las del token. */
export const sedePermitida = (s: Sesion, idsede: unknown): number => {
    const id = Number(idsede);
    if (!Number.isSafeInteger(id) || id <= 0) throw new dash.ErrorDash(400, 'Parámetro inválido: idsede.');
    if (!s.sedes.some((x) => x.idsede === id)) throw new dash.ErrorDash(403, 'No tienes acceso a ese local.');
    return id;
};

export const rangoDe = (params: any): dash.Rango => {
    const ini = typeof params?.rango_start_date === 'string' ? params.rango_start_date : '';
    const fin = typeof params?.rango_end_date === 'string' ? params.rango_end_date : '';
    if (!FECHA_RE.test(ini) || !FECHA_RE.test(fin) || ini > fin) throw new dash.ErrorDash(400, 'Rango de fechas inválido.');
    const l = limitarRangoFechasDashboard(ini, fin);
    return { inicio: l.fecha_inicio, fin: l.fecha_fin };
};

const responder = (res: Response, fn: () => Promise<unknown>, contexto: string) =>
    fn().then(
        (datos) => res.status(200).json(datos),
        (e) => {
            if (e instanceof dash.ErrorDash) return res.status(e.status).json({ error: e.message });
            console.error(`[dash-encuestas] ${contexto}:`, e);
            return res.status(500).json({ error: 'No se pudieron cargar las encuestas.' });
        },
    );

router.get('/', (_req, res) => { res.status(200).json({ message: 'Estás conectado al api dash ENCUESTAS' }); });

router.post('/tablero', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    return dash.tablero(sedePermitida(s, req.body?.idsede), rangoDe(req.body?.params));
}, 'tablero'));

router.post('/alertas', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    const estado = ['pendientes', 'atendidas', 'todas'].includes(req.body?.estado) ? req.body.estado : 'pendientes';
    return dash.alertas(sedePermitida(s, req.body?.idsede), rangoDe(req.body?.params), estado);
}, 'alertas'));

router.post('/alertas/atender', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    const id = Number(req.body?.id);
    const nota = typeof req.body?.nota === 'string' ? req.body.nota.trim() : '';
    if (!Number.isSafeInteger(id) || id <= 0) throw new dash.ErrorDash(400, 'Parámetro inválido: id.');
    if (nota.length < 3 || nota.length > 500) throw new dash.ErrorDash(400, 'La nota debe tener entre 3 y 500 caracteres.');
    const idsede = await dash.sedeDeRespuesta(id);
    // respuesta inexistente o de otro negocio: mismo 403, sin revelar cual de las dos
    if (idsede === null || !s.sedes.some((x) => x.idsede === idsede)) throw new dash.ErrorDash(403, 'No tienes acceso a esa respuesta.');
    return { ok: true, atencion: await dash.atender(id, s.idusuario, nota) };
}, 'atender'));

router.post('/comentarios', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    const filtro = ['malos', 'buenos', 'todos'].includes(req.body?.filtro) ? req.body.filtro : 'todos';
    const pagina = Math.max(1, Math.min(10_000, Math.floor(Number(req.body?.pagina) || 1)));
    return dash.comentarios(sedePermitida(s, req.body?.idsede), rangoDe(req.body?.params), filtro, pagina);
}, 'comentarios'));

router.post('/locales', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    const pedidas = Array.isArray(req.body?.sedes) ? req.body.sedes.map((x: unknown) => sedePermitida(s, x)) : s.sedes.map((x) => x.idsede);
    // sin spread de Set: el tsconfig compila a ES5
    const unicas = (pedidas as number[]).filter((x, i, a) => a.indexOf(x) === i);
    if (unicas.length > 50) throw new dash.ErrorDash(400, 'Demasiados locales.');
    return dash.locales(s.sedes.filter((x) => unicas.includes(x.idsede)), rangoDe(req.body?.params));
}, 'locales'));

router.post('/encuestas', (req, res) => responder(res, async () => {
    const s = sesionDe(req);
    const idsede = req.body?.idsede === undefined || req.body?.idsede === null ? null : sedePermitida(s, req.body.idsede);
    return dash.encuestas(s.idorg, s.sedes.map((x) => x.idsede), idsede);
}, 'encuestas'));

export default router;
