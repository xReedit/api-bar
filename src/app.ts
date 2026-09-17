// ponytail: polyfill Web Crypto para Node < 19 (el AWS SDK v3 necesita globalThis.crypto.getRandomValues). Quitar cuando el server corra Node 20+.
import { webcrypto } from 'crypto'
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto

import express from 'express'
import cors from "cors";

import routes from "./routes";
import { env } from 'process';
import { errorHandler } from './middleware/error';
import { startPushWatcher } from './services/push.watcher';

const app = express()

// IP real del cliente para el rate limit de /encuesta-publica. Se confia por DIRECCION y no por numero de saltos:
// a la API se llega por el VPS de la encuesta y directo por papaya.com.pe, con distinta cantidad de proxies, y un
// conteo fijo o se falsifica (X-Forwarded-For del cliente) o deja a todos con la misma IP (limite global).
// TRUST_PROXY_IPS = IPs de los proxies propios separadas por coma (el de papaya.com.pe si no es local y la IP
// publica del VPS de la encuesta). loopback siempre: proxy en la misma maquina y proxy de Vite en desarrollo.
app.set('trust proxy', ['loopback', ...(env.TRUST_PROXY_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean)]);

app.use(cors());
app.use(express.json());
app.use(errorHandler);

// Aumentar el límite de tamaño de la carga útil a 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use('/api-restobar', routes)

const portConect = env.PORT || 20223;

app.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: '+ portConect })
});



app.listen(portConect, () => {
    // Arranca el watcher de push notifications (opt-in vía PUSH_WATCHER_ENABLED=true)
    startPushWatcher();
})
