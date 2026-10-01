-- =============================================================================
-- Reglas de alerta del asistente IA
-- =============================================================================
-- "Avisame si algun local baja del 70% de su meta."
--
-- El tipo es un catalogo CERRADO, no texto libre: lo que el usuario dicta en
-- lenguaje natural se traduce a (tipo, umbral) y se valida en el servidor. Si
-- la condicion fuera libre, el modelo acabaria generando consultas, que es
-- justo lo que esta arquitectura evita.
--
-- Aplicar con:
--   mysql -u resto -p restobar < sql/asistente-reglas.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS asistente_regla_alerta (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    idorg           INT NOT NULL,
    idsede          INT NOT NULL,
    idusuario       INT NOT NULL COMMENT 'quien la creo',

    tipo            VARCHAR(40) NOT NULL COMMENT 'catalogo cerrado, ver services/asistente/reglas.ts',
    umbral          DECIMAL(12,2) NOT NULL,
    descripcion     VARCHAR(200) NOT NULL COMMENT 'texto legible que ve el usuario',

    activa          TINYINT(1) NOT NULL DEFAULT 1,
    creado_en       DATETIME NOT NULL,

    -- Evita repetir el mismo aviso varias veces el mismo dia.
    ultimo_disparo  DATE NULL,

    KEY idx_sede_activa (idsede, activa),
    KEY idx_org (idorg)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
