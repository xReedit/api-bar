# API Restobar - Backend

## 📋 Descripción General
API REST para sistema de gestión de restobar desarrollada con Node.js, Express, TypeScript y Prisma ORM.

## 🛠️ Stack Tecnológico

### Core
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Lenguaje**: TypeScript 4.9.5
- **ORM**: Prisma 5.15.1

### Dependencias Principales
- **Autenticación**: jsonwebtoken 9.0.0, bcryptjs 2.4.3
- **Base de datos**: @prisma/client 5.15.1
- **CORS**: cors 2.8.5
- **Variables de entorno**: dotenv 16.4.5
- **Utilidades de fecha**: date-fns 4.1.0
- **HTTP Client**: axios 1.7.2
- **WebSockets**: socket.io-client 2.4.0

### Herramientas de Desarrollo
- **Compilador**: ts-node 10.9.2
- **Monitor**: nodemon 3.0.3
- **Build**: rimraf + tsc

## 📁 Estructura del Proyecto

```
restobar/
├── src/
│   ├── app.ts                    # Punto de entrada de la aplicación
│   ├── controllers/              # Controladores de rutas
│   │   ├── dashboard/            # Controladores de dashboard
│   │   ├── restobar/             # Controladores específicos de restobar
│   │   ├── usuario.ts
│   │   ├── rol.ts
│   │   ├── sede.ts
│   │   ├── colaborador.ts
│   │   ├── colaborador.contrato.ts
│   │   ├── chat.bot.ts
│   │   ├── login.restobar.ts
│   │   ├── permiso.remoto.ts
│   │   ├── reimpresion.ts
│   │   └── app.repartidor.ts
│   ├── middleware/               # Middlewares
│   │   ├── auth.ts              # Autenticación JWT
│   │   └── error.ts             # Manejo de errores
│   ├── routes/                   # Definición de rutas
│   │   └── index.ts
│   ├── services/                 # Lógica de negocio
│   │   ├── cocinar.pedido.ts
│   │   ├── dash.util.ts
│   │   ├── pedido.services.ts
│   │   ├── socket.services.ts
│   │   └── usuario.service.ts
│   ├── utils/                    # Utilidades
│   ├── class/                    # Clases personalizadas
│   └── tests/                    # Tests
├── prisma/
│   └── schema.prisma             # Esquema de base de datos
├── dist/                         # Código compilado
├── .env                          # Variables de entorno
├── package.json
└── tsconfig.json
```

## 🚀 Scripts Disponibles

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar proyecto
npm run buildx

# Producción
npm run prod

# Iniciar aplicación compilada
npm start
```

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para autenticación:

- **Secret Key**: Configurado en `middleware/auth.ts`
- **Middleware `auth`**: Valida token en header `Authorization: Bearer <token>`
- **Middleware `authVerify`**: Valida token enviado en body

### Uso del Middleware
```typescript
// Ruta protegida
router.use('/rol', auth, rol);

// Verificación de login
router.use('/verify-login', authVerify);
```

## 🌐 Endpoints Principales

### Base URL
```
http://localhost:20223/api-restobar
```

### Autenticación
- `POST /login` - Login general
- `POST /login-bot` - Login para bot
- `POST /login-restobar` - Login restobar
- `POST /login-user` - Login de usuario
- `POST /verify-login` - Verificar token

### Gestión (Requieren autenticación)
- `/rol` - Gestión de roles
- `/sede` - Gestión de sedes
- `/colaborador` - Gestión de colaboradores
- `/colaborador-contrato` - Contratos de colaboradores

### Sin Autenticación
- `/chat-bot` o `/chatbot` - Bot de chat
- `/permiso-remoto` - Permisos remotos
- `/reimpresion` - Reimpresiones
- `/app-repartidor` - App de repartidores

### Restobar
- `/restobar/cobranza` - Gestión de cobranzas

### Dashboard (Requieren autenticación)
- `/dash-ventas` - Dashboard de ventas
- `/dash-iecaja` - Dashboard de ingreso/egreso de caja
- `/dash-colaboradores` - Dashboard de colaboradores
- `/dash-producto-receta` - Dashboard de productos y recetas
- `/dash-clientes` - Dashboard de clientes
- `/dash-usuarios` - Dashboard de usuarios
- `/dash-compras` - Dashboard de compras
- `/dash-punto-equilibrio` - Dashboard de punto de equilibrio
- `/dash-promociones-cupones` - Dashboard de promociones y cupones

## ⚙️ Configuración

### Variables de Entorno (.env)
```env
PORT=20223
DATABASE_URL="tu_connection_string"
```

### Puerto
- **Desarrollo/Producción**: 20223 (configurable via `PORT` en .env)

### CORS
- Habilitado para todas las origins
- Configurado en `app.ts`

### Body Parser
- Límite de payload: **50MB**
- Soporta JSON y URL-encoded

## 🗄️ Base de Datos

- **ORM**: Prisma
- **Schema**: `prisma/schema.prisma`
- El archivo está en `.gitignore` por seguridad

### Comandos Prisma Útiles
```bash
# Generar cliente Prisma
npx prisma generate

# Crear migración
npx prisma migrate dev

# Abrir Prisma Studio
npx prisma studio
```

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar en desarrollo
npm run dev
```

## 🔧 Desarrollo

### Agregar Nueva Ruta
1. Crear controlador en `src/controllers/`
2. Importar en `src/routes/index.ts`
3. Registrar ruta con o sin middleware `auth`

### Estructura de Controlador
```typescript
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
    // Lógica aquí
});

export default router;
```

## 📝 Notas Importantes

- El middleware de error debe estar registrado **antes** de las rutas
- Todas las rutas de dashboard requieren autenticación
- El sistema soporta WebSockets para funcionalidades en tiempo real
- Límite de payload aumentado a 50MB para soportar archivos grandes

## 🐛 Debugging

- Los logs se manejan a través de la consola
- El middleware de error captura excepciones no manejadas
- En desarrollo, nodemon reinicia automáticamente el servidor

## 📄 Licencia
ISC
