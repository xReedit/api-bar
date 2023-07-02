import express from 'express'
import cors from "cors";

import routes from "./routes";

const app = express()

app.use(cors());
app.use(express.json());

app.use('/restobar', routes)

app.listen(20223, () =>
    console.log('REST API server ready at: http://localhost:20223'),
)