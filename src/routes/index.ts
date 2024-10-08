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

const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: 20223' })
});

router.use('/login', login);
router.use('/login-bot', loginRestobar);
router.use('/login-restobar', loginRestobar);
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

// dashboardñ
router.use('/dash-ventas', dashboard_ventas);
router.use('/dash-iecaja', dashboard_iecaja);
router.use('/dash-colaboradores', dashboard_colaboradores);
router.use('/dash-producto-receta', dashboard_producto_recta);


// router.use('/usuario', auth, usuario);


export default router;