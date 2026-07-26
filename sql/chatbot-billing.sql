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
    estado         ENUM('pendiente','procesando','pagado','fallido') NOT NULL DEFAULT 'pendiente',
    niubiz_tx      VARCHAR(100) NULL,
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chatbot_pago_niubiz_tx (niubiz_tx),
    KEY idx_chatbot_pago_idsede (idsede)
);

-- Los packs los define el dueño del SaaS a mano, ejemplo:
-- INSERT INTO chatbot_pack (conversaciones, precio_soles) VALUES (100, 59.00);

-- Runbook: pagos "aprobados por Niubiz pero no registrados" (ver
-- chatbot.billing.ts, catch de la actualización a 'pagado') o reclamos
-- huérfanos quedan en estado='procesando'. Para encontrarlos:
-- SELECT * FROM chatbot_pago WHERE estado='procesando' AND actualizado_en < NOW() - INTERVAL 15 MINUTE;

-- Si la tabla ya existía sin 'procesando' (versión anterior de este archivo):
ALTER TABLE chatbot_pago MODIFY estado ENUM('pendiente','procesando','pagado','fallido') NOT NULL DEFAULT 'pendiente';

-- Si la tabla ya existía sin actualizado_en:
ALTER TABLE chatbot_pago ADD COLUMN actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
