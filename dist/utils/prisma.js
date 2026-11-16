"use strict";
exports.__esModule = true;
var client_1 = require("@prisma/client");
// Un solo cliente para toda la app. Cada `new PrismaClient()` levanta su propio
// motor de consultas y su propio pool de conexiones: con 42 instancias el proceso
// pasaba de ~580MB en horario suave. Importar siempre desde aqui.
var prisma = new client_1.PrismaClient();
exports["default"] = prisma;
