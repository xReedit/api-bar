-- =============================================================================
-- Tabla de suscripciones a Web Push
-- Ejecutar UNA VEZ en la BD MySQL del restobar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    idusuario     INT          NOT NULL,
    idsede        INT          NOT NULL,
    endpoint      TEXT         NOT NULL,
    endpoint_hash CHAR(64)     NOT NULL,
    p256dh_key    TEXT         NOT NULL,
    auth_key      TEXT         NOT NULL,
    user_agent    VARCHAR(255) NULL,
    enabled       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_error    VARCHAR(255) NULL,
    UNIQUE KEY uq_endpoint_hash (endpoint_hash),
    KEY idx_user (idusuario),
    KEY idx_sede (idsede),
    KEY idx_enabled (enabled)
);

-- Tabla auxiliar opcional para no enviar la notif "meta alcanzada" más de una vez al día
CREATE TABLE IF NOT EXISTS push_notification_log (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    idsede     INT          NOT NULL,
    evento     VARCHAR(50)  NOT NULL,
    fecha      DATE         NOT NULL,
    sent_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sede_evento_fecha (idsede, evento, fecha)
);
