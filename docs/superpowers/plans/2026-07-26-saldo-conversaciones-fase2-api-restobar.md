# Saldo de conversaciones — Fase 2 (api-restobar + Niubiz) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** api-restobar vende paquetes de conversaciones: expone saldo/packs al panel Piter, cobra con Niubiz (checkout web, verificación server-side) y acredita la recarga en chatbot-go de forma idempotente.

**Architecture:** Router nuevo `src/controllers/chatbot.billing.ts` montado en `/chat-bot/billing` CON el middleware `auth` (JWT Bearer existente, el mismo del login del panel). Lógica pura testeable en `src/services/billing.helpers.ts`; clientes HTTP delgados `src/services/niubiz.service.ts` y `src/services/chatbotgo.service.ts` (axios). Tablas MySQL nuevas por SQL directo con `$queryRaw`/`$executeRaw` — **sin modelos Prisma** (no requiere `db pull` para funcionar). Spec: repo chatbot-go `docs/superpowers/specs/2026-07-23-conversation-credits-design.md`.

**Tech Stack:** Express 4 + TypeScript (tsc → dist/), Prisma raw SQL sobre MySQL, axios, vitest (devDep nueva, solo para lógica pura), Niubiz API (security/session/authorization v3).

## Global Constraints

- **`prisma/` está gitignored a propósito** (drift dev/prod): NUNCA commitear nada bajo `prisma/`; las tablas nuevas van en `sql/chatbot-billing.sql` (versionado) y se ejecutan a mano por entorno. El código usa SOLO `$queryRaw`/`$executeRawUnsafe`, sin modelos generados.
- El monto a cobrar sale SIEMPRE de la BD (`chatbot_pack` / `chatbot_pago`), jamás del body del cliente.
- Verificación de pago server-side contra Niubiz authorization v3; éxito = `ACTION_CODE === '000'`.
- Idempotencia end-to-end: `chatbot_pago.niubiz_tx` UNIQUE; la acreditación a chatbot-go usa `tx_id = "niubiz-<transactionId>"` contra su `POST /billing/recarga` (ya idempotente por tx_id). Reintentar `confirmar` nunca duplica saldo.
- Montaje: `router.use('/chat-bot/billing', auth, chatbot_billing)` en `src/routes/index.ts` **ANTES** de `router.use('/chat-bot', chat_bot)` (el router sin auth no debe capturar `/chat-bot/billing/*`).
- Env vars nuevas (leer con `process.env.X || default`): `NIUBIZ_BASE_URL` (default `https://apisandbox.vnforappstest.com`), `NIUBIZ_STATIC_JS_URL` (default `https://static-content-qas.vnforapps.com/v2/js/checkout.js?qa=true`), `NIUBIZ_USER`, `NIUBIZ_PASS`, `NIUBIZ_MERCHANT_ID`, `CHATBOT_GO_URL` (default `http://localhost:8080`), `CHATBOT_BILLING_KEY` (misma que `BILLING_API_KEY` del chatbot-go). Actualizar `.env.example`.
- Estilo del repo: router-as-controller (`express.Router()` + handlers inline, `export default router`), `const prisma = new PrismaClient()` a nivel de módulo, respuestas `{ success: boolean, ... }`, try/catch con `res.status(500).json({ success:false, error })`. Comentarios en español.
- Moneda `PEN`. `purchaseNumber` = `chatbot_pago.id` (numérico, cumple el formato Niubiz).
- Verificación: `npm run buildx` (tsc) verde y `npx vitest run` verde. El repo no tiene otros tests: no romper `npm run dev`.

---

### Task 1: SQL de tablas + vitest + helpers puros (TDD)

**Files:**
- Create: `sql/chatbot-billing.sql`
- Create: `src/services/billing.helpers.ts`
- Test: `src/services/billing.helpers.test.ts`
- Modify: `package.json` (devDep `vitest`, script `test`)
- Modify: `.env.example` (documentar env vars nuevas)

**Interfaces:**
- Consumes: nada.
- Produces: tablas `chatbot_pack`, `chatbot_pago`; funciones puras:
  - `validarIniciar(body: unknown): { idsede: number; idPack: number } | null`
  - `validarConfirmar(body: unknown): { purchaseNumber: number; transactionToken: string } | null`
  - `parseAuthorizationResponse(data: unknown): { ok: boolean; actionCode: string; transactionId: string; descripcion: string }`
  - `buildRecargaPayload(pago: { idsede: number; conversaciones: number; monto: number; niubizTx: string }): { tx_id: string; idsede: string; cantidad: number; monto: number }`

- [ ] **Step 1: SQL versionado**

`sql/chatbot-billing.sql`:

```sql
-- Saldo de conversaciones (Fase 2): paquetes en venta y registro de pagos.
-- Ejecutar a mano en CADA entorno (dev y prod). prisma/ no se versiona:
-- el código usa $queryRaw directo, NO hace falta `prisma db pull` para esto.
CREATE TABLE IF NOT EXISTS chatbot_pack (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    conversaciones INT NOT NULL,
    precio_soles   DECIMAL(10,2) NOT NULL,
    activo         TINYINT NOT NULL DEFAULT 1
);

-- Un pago por intento de recarga. purchaseNumber de Niubiz = id.
-- niubiz_tx se llena al confirmar (UNIQUE = idempotencia del lado MySQL).
CREATE TABLE IF NOT EXISTS chatbot_pago (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    idsede         INT NOT NULL,
    id_pack        INT NOT NULL,
    conversaciones INT NOT NULL,
    monto          DECIMAL(10,2) NOT NULL,
    estado         ENUM('pendiente','pagado','fallido') NOT NULL DEFAULT 'pendiente',
    niubiz_tx      VARCHAR(100) NULL,
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chatbot_pago_niubiz_tx (niubiz_tx),
    KEY idx_chatbot_pago_idsede (idsede)
);

-- Los packs los define el dueño del SaaS a mano, ejemplo:
-- INSERT INTO chatbot_pack (conversaciones, precio_soles) VALUES (100, 59.00);
```

- [ ] **Step 2: Aplicar el SQL en la BD de desarrollo**

Con la `DATABASE_URL` del `.env` local, correr el SQL (una vez, idempotente). Opción sin cliente mysql: script one-off (NO commitear) `apply-sql.ts` en la raíz:

```ts
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
const prisma = new PrismaClient();
(async () => {
  const sql = readFileSync('sql/chatbot-billing.sql', 'utf8');
  for (const stmt of sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('ok');
  await prisma.$disconnect();
})();
```

Run: `npx ts-node apply-sql.ts` → `ok`. Luego borrar `apply-sql.ts`.

- [ ] **Step 3: vitest como devDependency**

Run: `npm install -D vitest`
En `package.json` cambiar el script `test` a: `"test": "vitest run"`.

- [ ] **Step 4: Escribir los tests de los helpers (RED)**

`src/services/billing.helpers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
    buildRecargaPayload,
    parseAuthorizationResponse,
    validarConfirmar,
    validarIniciar,
} from './billing.helpers';

describe('validarIniciar', () => {
    it('acepta idsede e idPack numéricos (number o string numérica)', () => {
        expect(validarIniciar({ idsede: 2, id_pack: 1 })).toEqual({ idsede: 2, idPack: 1 });
        expect(validarIniciar({ idsede: '2', id_pack: '1' })).toEqual({ idsede: 2, idPack: 1 });
    });
    it('rechaza faltantes, no numéricos o <= 0', () => {
        expect(validarIniciar({})).toBeNull();
        expect(validarIniciar({ idsede: 0, id_pack: 1 })).toBeNull();
        expect(validarIniciar({ idsede: 2, id_pack: 'abc' })).toBeNull();
        expect(validarIniciar(null)).toBeNull();
    });
});

describe('validarConfirmar', () => {
    it('acepta purchaseNumber numérico y transactionToken no vacío', () => {
        expect(validarConfirmar({ purchaseNumber: '7', transactionToken: 'tok' }))
            .toEqual({ purchaseNumber: 7, transactionToken: 'tok' });
    });
    it('rechaza token vacío o purchaseNumber inválido', () => {
        expect(validarConfirmar({ purchaseNumber: '7', transactionToken: '' })).toBeNull();
        expect(validarConfirmar({ purchaseNumber: 'x', transactionToken: 'tok' })).toBeNull();
        expect(validarConfirmar(undefined)).toBeNull();
    });
});

describe('parseAuthorizationResponse', () => {
    it('ACTION_CODE 000 en dataMap = aprobado, con TRANSACTION_ID', () => {
        const r = parseAuthorizationResponse({
            dataMap: { ACTION_CODE: '000', TRANSACTION_ID: '990000123', ACTION_DESCRIPTION: 'Aprobado' },
        });
        expect(r).toEqual({ ok: true, actionCode: '000', transactionId: '990000123', descripcion: 'Aprobado' });
    });
    it('rechazo trae ok=false con código y descripción', () => {
        const r = parseAuthorizationResponse({
            data: { ACTION_CODE: '180', ACTION_DESCRIPTION: 'Tarjeta inválida', TRANSACTION_ID: '990000124' },
        });
        expect(r.ok).toBe(false);
        expect(r.actionCode).toBe('180');
        expect(r.descripcion).toBe('Tarjeta inválida');
    });
    it('respuesta irreconocible = ok=false sin reventar', () => {
        const r = parseAuthorizationResponse('cualquier cosa');
        expect(r.ok).toBe(false);
        expect(r.actionCode).toBe('');
    });
});

describe('buildRecargaPayload', () => {
    it('arma el payload para chatbot-go con tx_id prefijado e idsede string', () => {
        expect(buildRecargaPayload({ idsede: 2, conversaciones: 100, monto: 59, niubizTx: '990000123' }))
            .toEqual({ tx_id: 'niubiz-990000123', idsede: '2', cantidad: 100, monto: 59 });
    });
});
```

- [ ] **Step 5: Correr y ver que falla**

Run: `npx vitest run`
Expected: FAIL (módulo `./billing.helpers` no existe).

- [ ] **Step 6: Implementar los helpers (GREEN)**

`src/services/billing.helpers.ts`:

```ts
// Lógica pura del cobro de recargas del chatbot (sin IO): validación de
// entradas y parseo de la respuesta de autorización de Niubiz. Separada del
// router para poder testearla sin Express ni red.

/** Entrada validada de POST /chat-bot/billing/pago/iniciar. */
export const validarIniciar = (body: unknown): { idsede: number; idPack: number } | null => {
    const b = body as Record<string, unknown> | null;
    const idsede = Number(b?.idsede);
    const idPack = Number(b?.id_pack);
    if (!Number.isInteger(idsede) || idsede <= 0) { return null; }
    if (!Number.isInteger(idPack) || idPack <= 0) { return null; }
    return { idsede, idPack };
};

/** Entrada validada de POST /chat-bot/billing/pago/confirmar. */
export const validarConfirmar = (body: unknown): { purchaseNumber: number; transactionToken: string } | null => {
    const b = body as Record<string, unknown> | null;
    const purchaseNumber = Number(b?.purchaseNumber);
    const transactionToken = typeof b?.transactionToken === 'string' ? b.transactionToken.trim() : '';
    if (!Number.isInteger(purchaseNumber) || purchaseNumber <= 0) { return null; }
    if (!transactionToken) { return null; }
    return { purchaseNumber, transactionToken };
};

/** Resultado normalizado de la autorización de Niubiz. */
export interface AuthResult {
    ok: boolean;
    actionCode: string;
    transactionId: string;
    descripcion: string;
}

/**
 * Normaliza la respuesta de POST api.authorization/v3. Niubiz devuelve los
 * campos en `dataMap` (200) o en `data` (400 con rechazo). Aprobado =
 * ACTION_CODE '000'. Tolerante: cualquier forma inesperada = no aprobado.
 */
export const parseAuthorizationResponse = (data: unknown): AuthResult => {
    const d = data as Record<string, any> | null;
    const map = (d && typeof d === 'object' && (d.dataMap || d.data)) || {};
    const actionCode = String(map.ACTION_CODE ?? '');
    return {
        ok: actionCode === '000',
        actionCode,
        transactionId: String(map.TRANSACTION_ID ?? ''),
        descripcion: String(map.ACTION_DESCRIPTION ?? d?.errorMessage ?? ''),
    };
};

/** Payload de acreditación para POST /billing/recarga del chatbot-go. */
export const buildRecargaPayload = (pago: {
    idsede: number;
    conversaciones: number;
    monto: number;
    niubizTx: string;
}): { tx_id: string; idsede: string; cantidad: number; monto: number } => ({
    tx_id: `niubiz-${pago.niubizTx}`,
    idsede: String(pago.idsede),
    cantidad: pago.conversaciones,
    monto: pago.monto,
});
```

- [ ] **Step 7: Correr y ver que pasa**

Run: `npx vitest run`
Expected: PASS (8 tests).

- [ ] **Step 8: Documentar env vars**

Agregar al final de `.env.example`:

```bash
# Saldo chatbot (Fase 2): Niubiz + acreditación en chatbot-go
NIUBIZ_BASE_URL=https://apisandbox.vnforappstest.com
NIUBIZ_STATIC_JS_URL=https://static-content-qas.vnforapps.com/v2/js/checkout.js?qa=true
NIUBIZ_USER=
NIUBIZ_PASS=
NIUBIZ_MERCHANT_ID=
CHATBOT_GO_URL=http://localhost:8080
CHATBOT_BILLING_KEY=
```

- [ ] **Step 9: Build + commit**

Run: `npm run buildx && npx vitest run`
Expected: tsc verde, tests PASS.

```bash
git add sql/chatbot-billing.sql src/services/billing.helpers.ts src/services/billing.helpers.test.ts package.json package-lock.json .env.example
git commit -m "feat(billing): tablas de packs/pagos y helpers puros del cobro de recargas"
```

---

### Task 2: Clientes HTTP (Niubiz + chatbot-go)

**Files:**
- Create: `src/services/niubiz.service.ts`
- Create: `src/services/chatbotgo.service.ts`

**Interfaces:**
- Consumes: `parseAuthorizationResponse`, `AuthResult` (Task 1); axios (dep existente).
- Produces:
  - `niubizConfigurado(): boolean`
  - `getAccessToken(): Promise<string>`
  - `createSession(accessToken: string, amount: number, clientIp: string): Promise<string>` (devuelve `sessionKey`)
  - `authorize(accessToken: string, order: { tokenId: string; purchaseNumber: number; amount: number }): Promise<AuthResult>`
  - `niubizMerchantId(): string`, `niubizCheckoutJsUrl(): string`
  - `getSaldo(idsede: string): Promise<any>` y `acreditarRecarga(payload: { tx_id: string; idsede: string; cantidad: number; monto: number }): Promise<void>` (chatbot-go, header `x-api-key`)

**Nota de testing:** son wrappers delgados de axios sin lógica de negocio (la lógica parseable está en los helpers ya testeados); se verifican compilando y en el smoke test de Task 4. Mismo criterio que el resto de clientes HTTP del repo.

- [ ] **Step 1: Implementar el cliente Niubiz**

`src/services/niubiz.service.ts`:

```ts
// Cliente delgado del API de Niubiz (botón de pago web).
// Flujo: getAccessToken (Basic) → createSession (monto) → [checkout.js en el
// front] → authorize (transactionToken). Sandbox por defecto; producción se
// configura por env (NIUBIZ_BASE_URL=https://apiprod.vnforapps.com y el
// checkout.js sin ?qa=true).
import axios from 'axios';
import { AuthResult, parseAuthorizationResponse } from './billing.helpers';

const BASE = () => process.env.NIUBIZ_BASE_URL || 'https://apisandbox.vnforappstest.com';
const TIMEOUT_MS = 15000;

export const niubizMerchantId = (): string => process.env.NIUBIZ_MERCHANT_ID || '';

export const niubizCheckoutJsUrl = (): string =>
    process.env.NIUBIZ_STATIC_JS_URL || 'https://static-content-qas.vnforapps.com/v2/js/checkout.js?qa=true';

/** true si las credenciales mínimas están configuradas. */
export const niubizConfigurado = (): boolean =>
    Boolean(process.env.NIUBIZ_USER && process.env.NIUBIZ_PASS && process.env.NIUBIZ_MERCHANT_ID);

/** Token de acceso (texto plano) vía Basic auth. */
export const getAccessToken = async (): Promise<string> => {
    const resp = await axios.get(`${BASE()}/api.security/v1/security`, {
        auth: { username: process.env.NIUBIZ_USER || '', password: process.env.NIUBIZ_PASS || '' },
        timeout: TIMEOUT_MS,
        responseType: 'text',
        transformResponse: [(d) => d], // el token llega como texto plano, no JSON
    });
    return String(resp.data).trim();
};

/** Crea la sesión de pago por el monto exacto; devuelve el sessionKey del checkout. */
export const createSession = async (accessToken: string, amount: number, clientIp: string): Promise<string> => {
    const resp = await axios.post(
        `${BASE()}/api.ecommerce/v2/ecommerce/token/session/${niubizMerchantId()}`,
        {
            channel: 'web',
            amount,
            antifraud: { clientIp, merchantDefineData: { MDD4: 'integraciones@papaya.com.pe', MDD32: 'papaya', MDD75: 'Registrado', MDD77: 1 } },
        },
        { headers: { Authorization: accessToken, 'Content-Type': 'application/json' }, timeout: TIMEOUT_MS },
    );
    return String(resp.data?.sessionKey || '');
};

/** Autoriza (cobra) la transacción del checkout. Nunca lanza por rechazo: lo normaliza. */
export const authorize = async (
    accessToken: string,
    order: { tokenId: string; purchaseNumber: number; amount: number },
): Promise<AuthResult> => {
    const resp = await axios.post(
        `${BASE()}/api.authorization/v3/authorization/ecommerce/${niubizMerchantId()}`,
        {
            channel: 'web',
            captureType: 'manual',
            countable: true,
            order: {
                tokenId: order.tokenId,
                purchaseNumber: String(order.purchaseNumber),
                amount: order.amount,
                currency: 'PEN',
            },
        },
        {
            headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
            timeout: TIMEOUT_MS,
            validateStatus: () => true, // un rechazo llega como 400: lo parseamos, no lo tiramos
        },
    );
    return parseAuthorizationResponse(resp.data);
};
```

- [ ] **Step 2: Implementar el cliente chatbot-go**

`src/services/chatbotgo.service.ts`:

```ts
// Cliente del servicio chatbot-go (saldo de conversaciones). Los endpoints
// /billing/* del chatbot exigen x-api-key (BILLING_API_KEY de ese servicio).
import axios from 'axios';

const BASE = () => process.env.CHATBOT_GO_URL || 'http://localhost:8080';
const KEY = () => process.env.CHATBOT_BILLING_KEY || '';
const TIMEOUT_MS = 10000;

/** Saldo actual de la sede (proxy directo del JSON del chatbot). */
export const getSaldo = async (idsede: string): Promise<any> => {
    const resp = await axios.get(`${BASE()}/billing/saldo`, {
        params: { idsede },
        headers: { 'x-api-key': KEY() },
        timeout: TIMEOUT_MS,
    });
    return resp.data;
};

/** Acredita una recarga (idempotente por tx_id del lado del chatbot). */
export const acreditarRecarga = async (payload: {
    tx_id: string;
    idsede: string;
    cantidad: number;
    monto: number;
}): Promise<void> => {
    await axios.post(`${BASE()}/billing/recarga`, payload, {
        headers: { 'x-api-key': KEY(), 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
    });
};
```

- [ ] **Step 3: Build + commit**

Run: `npm run buildx && npx vitest run`
Expected: verde.

```bash
git add src/services/niubiz.service.ts src/services/chatbotgo.service.ts
git commit -m "feat(billing): clientes HTTP de Niubiz y chatbot-go"
```

---

### Task 3: Router /chat-bot/billing con auth JWT

**Files:**
- Create: `src/controllers/chatbot.billing.ts`
- Modify: `src/routes/index.ts` (import + mount ANTES de `/chat-bot`)

**Interfaces:**
- Consumes: helpers (Task 1), servicios (Task 2), middleware `auth` de `src/middleware/auth.ts`, patrón `PrismaClient` del repo.
- Produces rutas (todas bajo `/api-restobar/chat-bot/billing`, JWT Bearer obligatorio):
  - `GET /saldo/:idsede` → `{ success, saldo }` (proxy chatbot-go)
  - `GET /packs` → `{ success, packs: [{id, conversaciones, precio_soles}] }`
  - `POST /pago/iniciar` `{idsede, id_pack}` → `{ success, purchaseNumber, amount, sessionKey, merchantId, checkoutJsUrl }`
  - `POST /pago/confirmar` `{purchaseNumber, transactionToken}` → `{ success, acreditado, saldo? }` | 402 `{ success:false, error, actionCode }`

- [ ] **Step 1: Implementar el router**

`src/controllers/chatbot.billing.ts`:

```ts
// Recarga de conversaciones del chatbot (panel Piter): saldo, packs en venta,
// y cobro con Niubiz. El monto SIEMPRE sale de la BD; el pago se verifica
// server-side (authorization) y la acreditación al chatbot-go es idempotente
// por tx_id — reintentar confirmar nunca duplica saldo.
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import { buildRecargaPayload, validarConfirmar, validarIniciar } from '../services/billing.helpers';
import * as chatbotgo from '../services/chatbotgo.service';
import * as niubiz from '../services/niubiz.service';

const router = express.Router();
const prisma = new PrismaClient();

interface PagoRow {
    id: number;
    idsede: number;
    conversaciones: number;
    monto: number;
    estado: 'pendiente' | 'pagado' | 'fallido';
    niubiz_tx: string | null;
}

/** Saldo actual de la sede (proxy del chatbot-go). */
router.get('/saldo/:idsede', async (req: Request, res: Response) => {
    try {
        const saldo = await chatbotgo.getSaldo(String(req.params.idsede));
        res.status(200).json({ success: true, saldo });
    } catch (error) {
        console.error('billing saldo:', error);
        res.status(502).json({ success: false, error: 'saldo no disponible' });
    }
});

/** Paquetes activos en venta. */
router.get('/packs', async (_req: Request, res: Response) => {
    try {
        const packs = await prisma.$queryRaw`
            SELECT id, conversaciones, precio_soles FROM chatbot_pack
            WHERE activo = 1 ORDER BY conversaciones ASC`;
        res.status(200).json({ success: true, packs });
    } catch (error) {
        console.error('billing packs:', error);
        res.status(500).json({ success: false, error: 'no se pudieron listar los paquetes' });
    }
});

/** Crea el pago pendiente y la sesión Niubiz para abrir el checkout. */
router.post('/pago/iniciar', async (req: Request, res: Response) => {
    const entrada = validarIniciar(req.body);
    if (!entrada) {
        return res.status(400).json({ success: false, error: 'idsede e id_pack son obligatorios' });
    }
    if (!niubiz.niubizConfigurado()) {
        return res.status(503).json({ success: false, error: 'pasarela de pago no configurada' });
    }
    try {
        const packs = await prisma.$queryRaw<{ id: number; conversaciones: number; precio_soles: number }[]>`
            SELECT id, conversaciones, precio_soles FROM chatbot_pack
            WHERE id = ${entrada.idPack} AND activo = 1`;
        if (!packs.length) {
            return res.status(404).json({ success: false, error: 'paquete no disponible' });
        }
        const pack = packs[0];
        const monto = Number(pack.precio_soles);

        // El pago nace pendiente; su id es el purchaseNumber de Niubiz.
        await prisma.$executeRaw`
            INSERT INTO chatbot_pago (idsede, id_pack, conversaciones, monto)
            VALUES (${entrada.idsede}, ${pack.id}, ${pack.conversaciones}, ${monto})`;
        const idRows = await prisma.$queryRaw<{ id: number }[]>`SELECT LAST_INSERT_ID() AS id`;
        const purchaseNumber = Number(idRows[0].id);

        const accessToken = await niubiz.getAccessToken();
        const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
        const sessionKey = await niubiz.createSession(accessToken, monto, clientIp.split(',')[0].trim());

        res.status(200).json({
            success: true,
            purchaseNumber: String(purchaseNumber),
            amount: monto,
            sessionKey,
            merchantId: niubiz.niubizMerchantId(),
            checkoutJsUrl: niubiz.niubizCheckoutJsUrl(),
        });
    } catch (error) {
        console.error('billing iniciar:', error);
        res.status(500).json({ success: false, error: 'no se pudo iniciar el pago' });
    }
});

/**
 * Verifica el pago contra Niubiz y acredita en chatbot-go. Reintentable:
 * un pago ya pagado no se re-cobra, solo re-intenta la acreditación.
 */
router.post('/pago/confirmar', async (req: Request, res: Response) => {
    const entrada = validarConfirmar(req.body);
    if (!entrada) {
        return res.status(400).json({ success: false, error: 'purchaseNumber y transactionToken son obligatorios' });
    }
    try {
        const pagos = await prisma.$queryRaw<PagoRow[]>`
            SELECT id, idsede, conversaciones, monto, estado, niubiz_tx FROM chatbot_pago
            WHERE id = ${entrada.purchaseNumber}`;
        if (!pagos.length) {
            return res.status(404).json({ success: false, error: 'pago no encontrado' });
        }
        const pago = pagos[0];

        // Reintento de un pago ya cobrado: solo re-acreditar (idempotente).
        if (pago.estado === 'pagado' && pago.niubiz_tx) {
            const resultado = await acreditar({ ...pago, niubiz_tx: pago.niubiz_tx });
            return res.status(200).json({ success: true, ...resultado });
        }
        if (pago.estado !== 'pendiente') {
            return res.status(409).json({ success: false, error: `pago en estado ${pago.estado}` });
        }

        const accessToken = await niubiz.getAccessToken();
        const auth = await niubiz.authorize(accessToken, {
            tokenId: entrada.transactionToken,
            purchaseNumber: pago.id,
            amount: Number(pago.monto),
        });

        if (!auth.ok) {
            await prisma.$executeRaw`
                UPDATE chatbot_pago SET estado = 'fallido' WHERE id = ${pago.id} AND estado = 'pendiente'`;
            console.warn('billing: pago rechazado', { purchaseNumber: pago.id, actionCode: auth.actionCode });
            return res.status(402).json({
                success: false,
                error: auth.descripcion || 'pago rechazado',
                actionCode: auth.actionCode,
            });
        }

        await prisma.$executeRaw`
            UPDATE chatbot_pago SET estado = 'pagado', niubiz_tx = ${auth.transactionId}
            WHERE id = ${pago.id}`;
        console.log('billing: pago aprobado', { purchaseNumber: pago.id, tx: auth.transactionId });

        const resultado = await acreditar({ ...pago, niubiz_tx: auth.transactionId });
        return res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        console.error('billing confirmar:', error);
        res.status(500).json({ success: false, error: 'no se pudo confirmar el pago' });
    }
});

/**
 * Acredita el pago en chatbot-go y devuelve { acreditado, saldo? }. Si la
 * acreditación falla, el pago YA está cobrado: se responde success con
 * acreditado=false y el front puede reintentar confirmar (idempotente).
 */
const acreditar = async (
    pago: { idsede: number; conversaciones: number; monto: number; niubiz_tx: string },
): Promise<{ acreditado: boolean; saldo?: any }> => {
    try {
        await chatbotgo.acreditarRecarga(buildRecargaPayload({
            idsede: pago.idsede,
            conversaciones: pago.conversaciones,
            monto: Number(pago.monto),
            niubizTx: pago.niubiz_tx,
        }));
    } catch (error) {
        console.error('billing: pago cobrado pero NO acreditado (reintentar confirmar)', error);
        return { acreditado: false };
    }
    try {
        const saldo = await chatbotgo.getSaldo(String(pago.idsede));
        return { acreditado: true, saldo };
    } catch {
        return { acreditado: true }; // acreditado; el saldo se verá al recargar el panel
    }
};

export default router;
```

- [ ] **Step 2: Montar el router CON auth**

En `src/routes/index.ts`: agregar el import junto a los demás controllers:

```ts
import chatbot_billing from '../controllers/chatbot.billing';
```

y montar (el orden importa — ANTES de la línea `router.use('/chat-bot', chat_bot);`):

```ts
// Recargas del chatbot: requiere sesión del panel (JWT), a diferencia del
// resto de /chat-bot/* que sigue sin auth por compatibilidad.
router.use('/chat-bot/billing', auth, chatbot_billing);
```

(`auth` ya se importa en ese archivo para otras rutas; si no, importarlo de `../middleware/auth`.)

- [ ] **Step 3: Build + tests + commit**

Run: `npm run buildx && npx vitest run`
Expected: verde.

```bash
git add src/controllers/chatbot.billing.ts src/routes/index.ts
git commit -m "feat(billing): rutas /chat-bot/billing (saldo, packs, iniciar y confirmar pago) con JWT"
```

---

### Task 4: Smoke test local end-to-end (sin tarjeta real)

**Files:** ninguno nuevo (verificación manual; script temporal NO commiteado).

**Interfaces:**
- Consumes: todo lo anterior; el chatbot-go local (repo `D:\Projects\proyectos svelte\chatbot-papaya-restobar`) con Postgres docker y `BILLING_API_KEY` seteada.

- [ ] **Step 1: Preparar entorno**

En `.env` local de api-restobar agregar: `CHATBOT_GO_URL=http://localhost:8080` y `CHATBOT_BILLING_KEY=test-key-local`. Arrancar chatbot-go con `BILLING_API_KEY=test-key-local` y su Postgres docker. Insertar un pack de prueba en MySQL dev: `INSERT INTO chatbot_pack (conversaciones, precio_soles) VALUES (100, 59.00);`

- [ ] **Step 2: JWT de prueba**

El middleware `auth` verifica JWT con la clave de `src/middleware/auth.ts`. Generar un token de prueba (script one-off, no commitear):

```ts
import jwt from 'jsonwebtoken';
console.log(jwt.sign({ smoke: true }, 'DalePlay182182'));
```

Run: `npx ts-node gen-token.ts` → TOKEN. Borrar el script.

- [ ] **Step 3: Smoke sin Niubiz (auth + packs + saldo + idempotencia de acreditación)**

Con `npm run dev` corriendo:

```bash
# sin token → 401
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api-restobar/chat-bot/billing/packs
# con token → packs
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api-restobar/chat-bot/billing/packs
# saldo proxy (sede 99 del smoke de Fase 1)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api-restobar/chat-bot/billing/saldo/99
# iniciar sin credenciales Niubiz → 503 limpio
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"idsede":99,"id_pack":1}' http://localhost:3000/api-restobar/chat-bot/billing/pago/iniciar
```

Expected: 401 / lista con el pack / `{success:true, saldo:{...}}` / `{success:false, error:'pasarela de pago no configurada'}` (503).

Además, probar la acreditación directa simulando un pago aprobado: insertar a mano un pago pagado y verificar el reintento idempotente:

```sql
INSERT INTO chatbot_pago (idsede, id_pack, conversaciones, monto, estado, niubiz_tx)
VALUES (99, 1, 100, 59.00, 'pagado', 'SMOKE-1');
```

```bash
# confirmar de un pago ya pagado → re-acredita (idempotente en chatbot-go)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"purchaseNumber":<ID_INSERTADO>,"transactionToken":"ignorado"}' \
  http://localhost:3000/api-restobar/chat-bot/billing/pago/confirmar
# repetir el mismo curl → mismo resultado, saldo NO se duplica (verificar bolsa en el dashboard del bot)
```

Expected: `{success:true, acreditado:true, saldo:{...bolsa: +100...}}` dos veces, con la bolsa subiendo UNA sola vez.

- [ ] **Step 4: Smoke con Niubiz sandbox (SOLO si hay credenciales)**

Si el dueño ya pasó `NIUBIZ_USER/PASS/MERCHANT_ID` de sandbox: setearlas en `.env`, repetir `pago/iniciar` (debe devolver `sessionKey` real) y probar el checkout completo desde un HTML mínimo con la tarjeta de prueba de Niubiz. Si NO hay credenciales: dejar constancia en el reporte y este paso queda pendiente para cuando lleguen las keys (el resto del flujo ya quedó probado con el paso 3).

- [ ] **Step 5: Commit final (si hubo ajustes) y notas**

```bash
git status  # limpiar scripts temporales; commitear solo ajustes de código si los hubo
```

---

## Notas de deploy (Fase 2)

1. **MySQL prod:** ejecutar `sql/chatbot-billing.sql` + INSERT de los packs con los precios que definas.
2. **.env prod (api-restobar):** `NIUBIZ_BASE_URL=https://apiprod.vnforapps.com`, `NIUBIZ_STATIC_JS_URL=https://static-content.vnforapps.com/v2/js/checkout.js`, `NIUBIZ_USER/PASS/MERCHANT_ID` (keys de producción), `CHATBOT_GO_URL=<url interna del chatbot-go>`, `CHATBOT_BILLING_KEY=<valor nuevo>`.
3. **chatbot-go EC2:** setear `BILLING_API_KEY=<el mismo valor>` y reiniciar (enciende /billing/*).
4. **api-restobar:** `npm run buildx` + restart pm2 (`papaya-restobar-api`).
5. `prisma db pull && npx prisma generate` en el server es OPCIONAL para esto (el código usa raw SQL), pero inofensivo si se corre.

## Riesgos / decisiones anotadas

- **SECRET_KEY del JWT está hardcodeada** en `src/middleware/auth.ts` (preexistente, afecta a todo el API, no solo a esto). Anotado como follow-up de seguridad: moverla a env y rotarla.
- Cualquier usuario autenticado del panel puede recargar cualquier sede (paga por ella); restringir por sede del token queda para cuando el JWT lleve la sede (follow-up menor).
- Los endpoints de Niubiz (`captureType`, forma de `dataMap`) se validan contra sandbox en el smoke de Task 4; el parseo es tolerante y cualquier forma inesperada = pago no aprobado (nunca se acredita de más).

## Fase siguiente

- **Fase 3 (Piter, repo `front-piter-chat-bot`):** widget de saldo + página de recarga que consume estos endpoints con el JWT del panel y abre el checkout con `checkoutJsUrl`/`sessionKey`/`merchantId`/`purchaseNumber`.
