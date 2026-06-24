# Web Push Notifications — Activación

Todo el código está implementado. Solo faltan **3 pasos** para activar.

## 1. Instalar dependencias

```bash
cd D:\Projects\backend-prisma\restobar
npm install
```

Esto instala `web-push` y `@types/web-push` que ya están en `package.json`.

## 2. Generar VAPID keys

```bash
npx web-push generate-vapid-keys
```

Te imprimirá algo así:

```
Public Key:  BJ8kc...largo...XYZ
Private Key: d8gK1...largo...abc
```

## 3. Configurar variables de entorno

### Backend (`D:\Projects\backend-prisma\restobar\.env`)

Agregar:

```env
VAPID_PUBLIC_KEY=BJ8kc...largo...XYZ
VAPID_PRIVATE_KEY=d8gK1...largo...abc
VAPID_SUBJECT=mailto:admin@tu-restobar.com

# Opcional: activa el watcher que dispara los 3 eventos automáticamente
PUSH_WATCHER_ENABLED=true

# Opcional: umbral en soles para considerar "anulación importante" (default 200)
PUSH_UMBRAL_ANULACION=200
```

### Frontend (`D:\Projects\proyectos svelte\dashboard\.env`)

Agregar solo la pública:

```env
PUBLIC_VAPID_PUBLIC_KEY=BJ8kc...largo...XYZ
```

> **Importante:** ambas keys (pública del frontend y pública del backend) deben ser **idénticas**.

## 4. Crear las tablas en MySQL

```bash
mysql -u resto -p restobar < prisma/sql_manual/push_subscriptions.sql
```

O abrir `prisma/sql_manual/push_subscriptions.sql` y ejecutarlo en tu cliente SQL.

Crea dos tablas:
- `push_subscriptions`: guarda los endpoints/keys de cada dispositivo suscrito.
- `push_notification_log`: evita enviar la misma notif dos veces el mismo día.

## 5. Reiniciar el backend

```bash
npm run dev
```

Si `PUSH_WATCHER_ENABLED=true`, verás en consola:

```
[push-watcher] Iniciado
```

---

## Cómo probar

1. Abre el dashboard (`npm run dev` en `D:\Projects\proyectos svelte\dashboard`).
2. Inicia sesión con cualquier usuario.
3. En el sidebar, junto al avatar, verás un icono de **campanita** 🔔. Click.
4. El navegador pedirá permiso → aceptar.
5. La campanita se vuelve color primario (`BellRing`).
6. **Prueba manual del envío** con curl/Postman:

   ```bash
   curl -X POST http://localhost:20223/api-restobar/push/test \
     -H "Authorization: Bearer <TU_TOKEN_DASHBOARD>" \
     -H "Content-Type: application/json" \
     -d '{"idsede": 13, "title": "Hola", "body": "Funciona!"}'
   ```

   Deberías recibir la notificación incluso con la ventana minimizada.

7. **Prueba automática** (si el watcher está habilitado):
   - Cada 1 min revisa anulaciones del día con monto >= umbral.
   - Cada 5 min revisa productos con stock crítico.
   - Cada 15 min revisa si se alcanzó la meta del día.

---

## Endpoints disponibles

Todos bajo `/api-restobar/push` (requieren `Authorization: Bearer`):

| Método | Ruta              | Descripción                              |
|--------|-------------------|------------------------------------------|
| POST   | `/subscribe`      | Registra suscripción de un dispositivo   |
| POST   | `/unsubscribe`    | Marca como deshabilitada una suscripción |
| POST   | `/resubscribe`    | Refresh automático (SW lo llama solo)    |
| POST   | `/test`           | Envía notif de prueba a una sede         |
| GET    | `/`               | Healthcheck                              |

---

## Disparar "cierre del día" manualmente

Desde un cron del sistema operativo (Task Scheduler en Windows) a las 23:55:

```bash
curl -X POST http://localhost:20223/api-restobar/push/cierre-dia \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

> ⚠️ Este endpoint **no existe aún**. Si quieres este disparo automático, abre
> `src/services/push.watcher.ts`, hay una función `dispararCierreDia(fecha?)`
> exportada que puedes llamar desde un nuevo endpoint o desde el setInterval
> (verificando que sean las 23:55 antes de disparar).

---

## Archivos involucrados

### Backend
- `src/controllers/push.ts` — Router con subscribe/unsubscribe/test/etc.
- `src/services/push.sender.ts` — Envío con `web-push` + helpers de eventos.
- `src/services/push.watcher.ts` — Polling de los 3 eventos (opt-in).
- `prisma/sql_manual/push_subscriptions.sql` — DDL de tablas.
- `src/routes/index.ts` — Registro del router en `/api-restobar/push`.
- `src/app.ts` — Arranca el watcher al levantar el server.

### Frontend (dashboard)
- `static/sw.js` — Service Worker con handlers `push` y `notificationclick`.
- `src/lib/services/push.service.ts` — API pública para suscribir/desuscribir.
- `src/lib/components/PushToggle.svelte` — Botón campanita en el sidebar.
- `src/lib/components/Sidebar.svelte` — Integra el toggle.

---

## Troubleshooting

**No me llega la notificación de prueba:**
- Verifica permisos del navegador (Chrome → Configuración → Sitio → Notificaciones).
- Revisa la consola del navegador por errores en el SW.
- Revisa que la tabla `push_subscriptions` tenga una fila con `enabled=1` para tu idsede.
- Mira la columna `last_error` de esa fila.

**Safari iOS no recibe nada:**
- iOS requiere que la PWA esté **instalada** (Add to Home Screen).
- Solo funciona en iOS 16.4+.
- Si está instalada, abre la app desde el icono del Home Screen al menos una vez.

**El watcher no arranca:**
- Verifica que `PUSH_WATCHER_ENABLED=true` esté en `.env` (sin espacios).
- Revisa los logs al arrancar: debería decir `[push-watcher] Iniciado`.

**Error "VAPID public key no configurada":**
- Confirma que `PUBLIC_VAPID_PUBLIC_KEY` esté en el `.env` del dashboard.
- En SvelteKit, las variables con prefijo `PUBLIC_` requieren reiniciar `npm run dev`.
