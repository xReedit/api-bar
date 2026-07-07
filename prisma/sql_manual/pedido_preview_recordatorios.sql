-- Recordatorios de confirmación de pedido.
-- Agrega el estado necesario para el watcher de recordatorios
-- (backend-pedidos/controllers/recordatorioPedido.js).
--
-- Correr una vez en la BD MySQL `restobar`:
--   mysql -u resto -p restobar < prisma/sql_manual/pedido_preview_recordatorios.sql

ALTER TABLE pedido_preview
  ADD COLUMN recordatorios INT NOT NULL DEFAULT 0,
  ADD COLUMN last_recordatorio_at DATETIME NULL;

-- Índice para que el watcher filtre rápido los pendientes vencidos.
CREATE INDEX idx_pedido_preview_estado_fecha
  ON pedido_preview (estado, last_recordatorio_at, created_at);
