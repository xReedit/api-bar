import { PrismaClient } from '@prisma/client';

// Un solo cliente para toda la app. Cada `new PrismaClient()` levanta su propio
// motor de consultas y su propio pool de conexiones: con 42 instancias el proceso
// pasaba de ~580MB en horario suave. Importar siempre desde aqui.
const prisma = new PrismaClient();

export default prisma;
