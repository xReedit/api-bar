import express from 'express'
import cors from "cors";

import routes from "./routes";
import { env } from 'process';

const app = express()

app.use(cors());
app.use(express.json());

app.use('/api-restobar', routes)

const portConect = env.PORT || 20223;

app.get('/', function (req, res) {
    res.status(200).json({ message: 'Estás conectado a nuestra API RESTOBAR port: '+ portConect })
});



app.listen(portConect, () =>
    console.log('REST API server ready at: http://localhost:20223'),
)