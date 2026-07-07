-- =============================================================================
-- FIX: ventas por mesero (doble conteo en comprobantes compartidos)
-- =============================================================================
-- PROBLEMA
--   Los bloques de mesero (top_meseros, usuarios_meseros, evolucion_diaria_meseros,
--   comparativa_usuarios) sumaban el registro_pago.total COMPLETO a cada mesero que
--   tuviera algun pedido en el comprobante. Si un ticket tenia pedidos de varios
--   meseros, su total se contaba varias veces -> montos inflados y reordenamientos;
--   la suma de meseros podia superar la venta real.
--
-- SOLUCION
--   Cada mesero suma el monto de SUS pedidos, agrupando por idusuario. El monto por
--   pedido = COALESCE(NULLIF(pedido.total,0), pedido.total_r, 0), porque algunas sedes
--   pueblan pedido.total y otras pedido.total_r. Se deduplica por idpedido porque
--   registro_pago_pedido puede tener enlaces duplicados (validado: hasta 2-6 enlaces
--   por pedido) que de otro modo multiplican el SUM. Solo comprobantes no anulados
--   (estado=0). Sin solapamiento entre meseros.
--
-- COMPATIBILIDAD
--   MySQL 5.7: la agregacion por mesero usa una tabla derivada NO correlacionada
--   (JOIN por idusuario). No se usan tablas derivadas correlacionadas (prohibidas en 5.7).
--
-- RECONCILIACION (validado en idsede 13, jun-2026)
--   SUM(monto pedidos, dedup) por comprobante == registro_pago.total en 19/19 casos;
--   total por mesero == venta real del rango (647.99).
--
-- NOTA: la suma de todos los meseros puede NO cuadrar exactamente con
--   SUM(registro_pago.total) global cuando hay descuentos/recargos a nivel de
--   comprobante. Es el comportamiento correcto para "ventas generadas por mesero".
--
-- IMPORTANTE: la columna de monto puede variar por sede. Antes de PROD, verificar en
--   una sede real que COALESCE(NULLIF(total,0), total_r, 0) reconcilia con la venta:
--     SELECT rp.idregistro_pago, rp.total,
--            SUM(DISTINCT_dedup...) -- ver query de validacion en el chat
--   Si una sede usa otra columna (p.ej. total_total), ajustar el COALESCE.
--
-- Idempotente: DROP + CREATE. Ejecutar en DEV, validar, luego PROD con un cliente MySQL.
-- =============================================================================

DROP PROCEDURE IF EXISTS `procedure_module_dash_usuarios`;

DELIMITER $$

CREATE PROCEDURE `procedure_module_dash_usuarios`(
    IN xidsede INT,
    IN xtipo_consulta VARCHAR(50),
    IN xfecha_inicio DATE,
    IN xfecha_fin DATE
)
BEGIN
    DECLARE v_min_id INT;
    DECLARE v_max_id INT;

    SELECT MIN(idregistro_pago), MAX(idregistro_pago)
    INTO v_min_id, v_max_id
    FROM registro_pago
    WHERE idsede = xidsede
      AND DATE(fecha_hora) BETWEEN xfecha_inicio AND xfecha_fin;

    IF v_min_id IS NULL THEN
        SET v_min_id = 0;
        SET v_max_id = 0;
    END IF;

    -- ============================================
    -- resumen (sin cambios)
    -- ============================================
    IF xtipo_consulta = 'resumen' THEN
        SELECT
            (SELECT COUNT(DISTINCT u.idusuario)
                FROM usuario u WHERE u.idsede = xidsede AND u.estado = 0) AS total_usuarios,
            (SELECT COUNT(DISTINCT u.idusuario)
                FROM usuario u WHERE u.idsede = xidsede AND u.estado = 0) AS usuarios_activos,
            (SELECT COUNT(DISTINCT rp.idusuario)
                FROM registro_pago rp
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0) AS usuarios_caja_activos,
            (SELECT COUNT(DISTINCT p.idusuario)
                FROM pedido p
                INNER JOIN registro_pago_pedido rpp ON p.idpedido = rpp.idpedido
                INNER JOIN registro_pago rp ON rpp.idregistro_pago = rp.idregistro_pago
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0) AS usuarios_meseros_activos,
            (SELECT COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0)
                FROM registro_pago
                WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND idsede = xidsede AND estado = 0) AS total_ventas,
            (SELECT COUNT(*)
                FROM registro_pago
                WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND idsede = xidsede AND estado = 0) AS total_transacciones,
            COALESCE(
                (SELECT SUM(CAST(total AS DECIMAL(10,2))) FROM registro_pago
                    WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND idsede = xidsede AND estado = 0) /
                NULLIF((SELECT COUNT(DISTINCT idusuario) FROM registro_pago
                    WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND idsede = xidsede AND estado = 0), 0),
                0
            ) AS promedio_ventas_por_usuario,
            COALESCE(
                (SELECT SUM(CAST(total AS DECIMAL(10,2))) FROM registro_pago
                    WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND idsede = xidsede AND estado = 0) /
                NULLIF((SELECT COUNT(*) FROM registro_pago
                    WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND idsede = xidsede AND estado = 0), 0),
                0
            ) AS ticket_promedio;

    -- ============================================
    -- usuarios_caja (sin cambios)
    -- ============================================
    ELSEIF xtipo_consulta = 'usuarios_caja' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo, u.estado,
            COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END) AS total_transacciones,
            COALESCE(SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS total_ventas,
            COALESCE(
                SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END) /
                NULLIF(COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END), 0), 0
            ) AS ticket_promedio,
            COUNT(CASE WHEN rp.estado = 1 THEN rp.idregistro_pago END) AS ventas_anuladas,
            COALESCE(SUM(CASE WHEN rp.estado = 1 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS monto_anulado,
            MAX(CASE WHEN rp.estado = 0 THEN rp.fecha_hora END) AS ultima_venta
        FROM usuario u
        LEFT JOIN registro_pago rp ON u.idusuario = rp.idusuario
            AND rp.idregistro_pago BETWEEN v_min_id AND v_max_id
            AND rp.idsede = xidsede
        WHERE u.idsede = xidsede
        GROUP BY u.idusuario, u.nombres, u.usuario, u.cargo, u.estado
        HAVING total_transacciones > 0 OR u.estado = 0
        ORDER BY total_ventas DESC;

    -- ============================================
    -- usuarios_meseros (FIX: monto por SUS pedidos, dedup por idpedido)
    -- ============================================
    ELSEIF xtipo_consulta = 'usuarios_meseros' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo, u.estado,
            mes.pedidos AS total_pedidos,
            (SELECT COUNT(DISTINCT rp2.idregistro_pago)
                FROM registro_pago rp2
                INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                WHERE p2.idusuario = u.idusuario
                  AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp2.idsede = xidsede AND rp2.estado = 0) AS total_transacciones,
            mes.total_ventas AS total_ventas,
            COALESCE(mes.total_ventas / NULLIF(
                (SELECT COUNT(DISTINCT rp2.idregistro_pago)
                    FROM registro_pago rp2
                    INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                    INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                    WHERE p2.idusuario = u.idusuario
                      AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND rp2.idsede = xidsede AND rp2.estado = 0), 0), 0) AS ticket_promedio,
            (SELECT MAX(rp2.fecha_hora)
                FROM registro_pago rp2
                INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                WHERE p2.idusuario = u.idusuario
                  AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp2.idsede = xidsede AND rp2.estado = 0) AS ultima_atencion
        FROM usuario u
        INNER JOIN (
            SELECT x.idusuario, COUNT(*) AS pedidos, SUM(x.monto) AS total_ventas
            FROM (
                SELECT DISTINCT p.idpedido, p.idusuario,
                       COALESCE(NULLIF(CAST(p.total AS DECIMAL(10,2)), 0), CAST(p.total_r AS DECIMAL(10,2)), 0) AS monto
                FROM pedido p
                INNER JOIN registro_pago_pedido rpp ON p.idpedido = rpp.idpedido
                INNER JOIN registro_pago rp ON rpp.idregistro_pago = rp.idregistro_pago
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0
            ) x
            GROUP BY x.idusuario
        ) mes ON mes.idusuario = u.idusuario
        WHERE u.idsede = xidsede AND u.estado = 0
        ORDER BY mes.total_ventas DESC;

    -- ============================================
    -- distribucion_roles (sin cambios)
    -- ============================================
    ELSEIF xtipo_consulta = 'distribucion_roles' THEN
        SELECT
            COALESCE(u.cargo, 'SIN CARGO') AS cargo,
            COUNT(DISTINCT u.idusuario) AS cantidad_usuarios,
            COUNT(DISTINCT CASE WHEN u.estado = 0 THEN u.idusuario END) AS usuarios_activos,
            COUNT(DISTINCT rp.idusuario) AS usuarios_con_ventas,
            COALESCE(SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS total_ventas,
            COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END) AS total_transacciones
        FROM usuario u
        LEFT JOIN registro_pago rp ON u.idusuario = rp.idusuario
            AND rp.idregistro_pago BETWEEN v_min_id AND v_max_id
            AND rp.idsede = xidsede
        WHERE u.idsede = xidsede AND u.estado = 0
        GROUP BY u.cargo
        ORDER BY cantidad_usuarios DESC;

    -- ============================================
    -- top_vendedores_caja (sin cambios)
    -- ============================================
    ELSEIF xtipo_consulta = 'top_vendedores_caja' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo,
            COUNT(rp.idregistro_pago) AS transacciones,
            COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))), 0) AS total_ventas,
            COALESCE(SUM(CAST(rp.total AS DECIMAL(10,2))) / NULLIF(COUNT(rp.idregistro_pago), 0), 0) AS ticket_promedio
        FROM usuario u
        INNER JOIN registro_pago rp ON u.idusuario = rp.idusuario
            AND rp.idregistro_pago BETWEEN v_min_id AND v_max_id
            AND rp.idsede = xidsede
            AND rp.estado = 0
        WHERE u.idsede = xidsede AND u.estado = 0
        GROUP BY u.idusuario, u.nombres, u.usuario, u.cargo
        ORDER BY total_ventas DESC
        LIMIT 10;

    -- ============================================
    -- top_meseros (FIX: monto por SUS pedidos, dedup por idpedido)
    -- ============================================
    ELSEIF xtipo_consulta = 'top_meseros' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo,
            mes.pedidos AS pedidos,
            (SELECT COUNT(DISTINCT rp2.idregistro_pago)
                FROM registro_pago rp2
                INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                WHERE p2.idusuario = u.idusuario
                  AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp2.idsede = xidsede AND rp2.estado = 0) AS transacciones,
            mes.total_ventas AS total_ventas,
            COALESCE(mes.total_ventas / NULLIF(
                (SELECT COUNT(DISTINCT rp2.idregistro_pago)
                    FROM registro_pago rp2
                    INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                    INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                    WHERE p2.idusuario = u.idusuario
                      AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                      AND rp2.idsede = xidsede AND rp2.estado = 0), 0), 0) AS ticket_promedio
        FROM usuario u
        INNER JOIN (
            SELECT x.idusuario, COUNT(*) AS pedidos, SUM(x.monto) AS total_ventas
            FROM (
                SELECT DISTINCT p.idpedido, p.idusuario,
                       COALESCE(NULLIF(CAST(p.total AS DECIMAL(10,2)), 0), CAST(p.total_r AS DECIMAL(10,2)), 0) AS monto
                FROM pedido p
                INNER JOIN registro_pago_pedido rpp ON p.idpedido = rpp.idpedido
                INNER JOIN registro_pago rp ON rpp.idregistro_pago = rp.idregistro_pago
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0
            ) x
            GROUP BY x.idusuario
        ) mes ON mes.idusuario = u.idusuario
        WHERE u.idsede = xidsede AND u.estado = 0
        ORDER BY mes.total_ventas DESC
        LIMIT 10;

    -- ============================================
    -- evolucion_diaria_caja (sin cambios)
    -- ============================================
    ELSEIF xtipo_consulta = 'evolucion_diaria_caja' THEN
        SELECT
            u.idusuario, u.nombres,
            DATE(rp.fecha_hora) AS fecha,
            COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END) AS transacciones,
            COALESCE(SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS total_ventas
        FROM usuario u
        INNER JOIN registro_pago rp ON u.idusuario = rp.idusuario
            AND rp.idregistro_pago BETWEEN v_min_id AND v_max_id
            AND rp.idsede = xidsede
        WHERE u.idsede = xidsede AND u.estado = 0
        GROUP BY u.idusuario, u.nombres, DATE(rp.fecha_hora)
        HAVING total_ventas > 0
        ORDER BY fecha ASC, total_ventas DESC;

    -- ============================================
    -- evolucion_diaria_meseros (FIX: monto por SUS pedidos, dedup por idpedido)
    -- ============================================
    ELSEIF xtipo_consulta = 'evolucion_diaria_meseros' THEN
        SELECT
            u.idusuario, u.nombres,
            mesd.fecha,
            mesd.pedidos AS pedidos,
            (SELECT COUNT(DISTINCT rp2.idregistro_pago)
                FROM registro_pago rp2
                INNER JOIN registro_pago_pedido rpp2 ON rp2.idregistro_pago = rpp2.idregistro_pago
                INNER JOIN pedido p2 ON rpp2.idpedido = p2.idpedido
                WHERE p2.idusuario = u.idusuario
                  AND DATE(rp2.fecha_hora) = mesd.fecha
                  AND rp2.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp2.idsede = xidsede AND rp2.estado = 0) AS transacciones,
            mesd.total_ventas AS total_ventas
        FROM usuario u
        INNER JOIN (
            SELECT x.idusuario, x.fecha, COUNT(*) AS pedidos, SUM(x.monto) AS total_ventas
            FROM (
                SELECT DISTINCT p.idpedido, p.idusuario, DATE(rp.fecha_hora) AS fecha,
                       COALESCE(NULLIF(CAST(p.total AS DECIMAL(10,2)), 0), CAST(p.total_r AS DECIMAL(10,2)), 0) AS monto
                FROM pedido p
                INNER JOIN registro_pago_pedido rpp ON p.idpedido = rpp.idpedido
                INNER JOIN registro_pago rp ON rpp.idregistro_pago = rp.idregistro_pago
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0
            ) x
            GROUP BY x.idusuario, x.fecha
        ) mesd ON mesd.idusuario = u.idusuario
        WHERE u.idsede = xidsede AND u.estado = 0
        ORDER BY mesd.fecha ASC, mesd.total_ventas DESC;

    -- ============================================
    -- comparativa_usuarios (FIX: monto_como_mesero por SUS pedidos, dedup por idpedido)
    -- ============================================
    ELSEIF xtipo_consulta = 'comparativa_usuarios' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo, u.estado,
            COALESCE(caj.ventas_como_cajero, 0) AS ventas_como_cajero,
            COALESCE(caj.monto_como_cajero, 0) AS monto_como_cajero,
            COALESCE(mes.pedidos_como_mesero, 0) AS pedidos_como_mesero,
            COALESCE(mes.monto_como_mesero, 0) AS monto_como_mesero,
            (COALESCE(caj.monto_como_cajero, 0) + COALESCE(mes.monto_como_mesero, 0)) AS total_general
        FROM usuario u
        LEFT JOIN (
            SELECT rp.idusuario,
                COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END) AS ventas_como_cajero,
                COALESCE(SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS monto_como_cajero
            FROM registro_pago rp
            WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
              AND rp.idsede = xidsede
            GROUP BY rp.idusuario
        ) caj ON caj.idusuario = u.idusuario
        LEFT JOIN (
            SELECT x.idusuario,
                   COUNT(*) AS pedidos_como_mesero,
                   SUM(x.monto) AS monto_como_mesero
            FROM (
                SELECT DISTINCT p.idpedido, p.idusuario,
                       COALESCE(NULLIF(CAST(p.total AS DECIMAL(10,2)), 0), CAST(p.total_r AS DECIMAL(10,2)), 0) AS monto
                FROM pedido p
                INNER JOIN registro_pago_pedido rpp ON p.idpedido = rpp.idpedido
                INNER JOIN registro_pago rp ON rpp.idregistro_pago = rp.idregistro_pago
                WHERE rp.idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND rp.idsede = xidsede AND rp.estado = 0
            ) x
            GROUP BY x.idusuario
        ) mes ON mes.idusuario = u.idusuario
        WHERE u.idsede = xidsede
        ORDER BY total_general DESC;

    -- ============================================
    -- bajo_rendimiento (sin cambios - solo cajeros)
    -- ============================================
    ELSEIF xtipo_consulta = 'bajo_rendimiento' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo,
            COUNT(CASE WHEN rp.estado = 0 THEN rp.idregistro_pago END) AS transacciones,
            COALESCE(SUM(CASE WHEN rp.estado = 0 THEN CAST(rp.total AS DECIMAL(10,2)) ELSE 0 END), 0) AS total_ventas,
            (SELECT COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0)
                FROM registro_pago
                WHERE idregistro_pago BETWEEN v_min_id AND v_max_id
                  AND idsede = xidsede AND estado = 0) AS promedio_general,
            0 AS porcentaje_vs_promedio
        FROM usuario u
        INNER JOIN registro_pago rp ON u.idusuario = rp.idusuario
            AND rp.idregistro_pago BETWEEN v_min_id AND v_max_id
            AND rp.idsede = xidsede
            AND rp.estado = 0
        WHERE u.idsede = xidsede AND u.estado = 0
        GROUP BY u.idusuario, u.nombres, u.usuario, u.cargo
        HAVING transacciones < 5
        ORDER BY total_ventas ASC;

    -- ============================================
    -- listado_completo (sin cambios)
    -- ============================================
    ELSEIF xtipo_consulta = 'listado_completo' THEN
        SELECT
            u.idusuario, u.nombres, u.usuario, u.cargo, u.estado,
            (SELECT MAX(rp.fecha_hora)
                FROM registro_pago rp
                WHERE rp.idusuario = u.idusuario AND rp.idsede = xidsede AND rp.estado = 0) AS ultima_actividad,
            DATEDIFF(CURDATE(), (SELECT MAX(DATE(rp.fecha_hora))
                FROM registro_pago rp
                WHERE rp.idusuario = u.idusuario AND rp.idsede = xidsede AND rp.estado = 0)) AS dias_sin_actividad
        FROM usuario u
        WHERE u.idsede = xidsede
        ORDER BY u.nombres;

    END IF;
END$$

DELIMITER ;
