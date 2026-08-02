-- Solicitudes de activación del chatbot (venta automática desde el panel Piter).
-- Ejecutar a mano en CADA entorno (dev y prod), igual que chatbot-billing.sql.
-- El código usa $queryRaw directo: NO hace falta `prisma db pull`.
CREATE TABLE IF NOT EXISTS chatbot_solicitud (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    idsede      INT NOT NULL,
    estado      ENUM('pendiente','atendida') NOT NULL DEFAULT 'pendiente',
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atendido_en DATETIME NULL,
    KEY idx_chatbot_solicitud_estado (estado),
    KEY idx_chatbot_solicitud_idsede (idsede)
);
