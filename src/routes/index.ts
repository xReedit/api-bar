import * as express from "express";
import { login } from "../controllers/usuario";
import { auth, authVerify } from '../middleware/auth';
import rol from "../controllers/rol";
import sede from "../controllers/sede";
import colaborador from "../controllers/colaborador";
import colaborador_contrato from "../controllers/colaborador.contrato";
import chat_bot from "../controllers/chat.bot";
import loginRestobar from "../controllers/login.restobar";
import permiso_remoto from "../controllers/permiso.remoto";
import reinpresion from "../controllers/reimpresion";
import app_repartidor from "../controllers/app.repartidor";
import restobar_cobranza from "../controllers/restobar/cobranza";
import dashboard_ventas from "../controllers/dashboard/ventas";
import dashboard_iecaja from "../controllers/dashboard/iecaja";
import dashboard_colaboradores from "../controllers/dashboard/colaboradores";
import dashboard_producto_recta from "../controllers/dashboard/producto-receta";
import dashboard_clientes from "../controllers/dashboard/clientes";
import dashboard_usuarios from "../controllers/dashboard/usuarios";
import dashboard_compras from "../controllers/dashboard/compras";
import dashboard_punto_equilibrio from "../controllers/dashboard/punto-equilibrio";
import dashboard_promociones_cupones from "../controllers/dashboard/promociones-cupones";

const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: 20223' })
});

router.use('/login', login);
router.use('/login-bot', loginRestobar);
router.use('/login-restobar', loginRestobar);
router.use('/login-user', loginRestobar);
router.use('/verify-login', authVerify);
router.use('/rol', auth, rol);
router.use('/sede', auth, sede);
router.use('/colaborador', auth, colaborador);
router.use('/colaborador-contrato', auth, colaborador_contrato);
router.use('/chat-bot', chat_bot);
router.use('/permiso-remoto', permiso_remoto);
router.use('/reimpresion', reinpresion);
router.use('/app-repartidor', app_repartidor);

// restobar
router.use('/restobar/cobranza', restobar_cobranza);

// dashboard
router.use('/dash-ventas', auth, dashboard_ventas);
router.use('/dash-iecaja', auth, dashboard_iecaja);
router.use('/dash-colaboradores', auth, dashboard_colaboradores);
router.use('/dash-producto-receta', auth, dashboard_producto_recta);
router.use('/dash-clientes', auth, dashboard_clientes);
router.use('/dash-usuarios', auth, dashboard_usuarios);
router.use('/dash-compras', auth, dashboard_compras);
router.use('/dash-punto-equilibrio', auth, dashboard_punto_equilibrio);
router.use('/dash-promociones-cupones', auth, dashboard_promociones_cupones);


// router.use('/usuario', auth, usuario);


export default router;
