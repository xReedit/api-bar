import express from 'express'
import cors from "cors";

import routes from "./routes";
import { env } from 'process';
import { errorHandler } from './middleware/error';

const app = express()

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



app.listen(portConect, () => {})
