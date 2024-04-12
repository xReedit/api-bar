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

const router = express.Router();

router.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: 20223' })
});

router.use('/login', login);
router.use('/login-bot', loginRestobar);
// router.use('/login-restobar', loginRestobar);
router.use('/verify-login', authVerify);
router.use('/rol', auth, rol);
router.use('/sede', auth, sede);
router.use('/colaborador', auth, colaborador);
router.use('/colaborador-contrato', auth, colaborador_contrato);
router.use('/chat-bot', chat_bot);
router.use('/permiso-remoto', permiso_remoto);
router.use('/reimpresion', reinpresion);
// router.use('/usuario', auth, usuario);


export default router;