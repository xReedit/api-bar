-- Modificar el procedimiento para que retorne el SQL en lugar de ejecutarlo directamente
DROP PROCEDURE IF EXISTS procedure_module_dash_pedidos_ventas;

DELIMITER $$

CREATE PROCEDURE procedure_module_dash_pedidos_ventas(
	in xidsede int,
	in periodo_params json
)
BEGIN
	
	
	 -- LA FECHA DEBE ESTAR EN FORMATO YYYY-MM-DD
    DECLARE fecha_concat CHAR(100) DEFAULT '';
    DECLARE hoy_concat CHAR(200) DEFAULT '';
    DECLARE columm_add_concat CHAR(255) DEFAULT '';

    SET @hora_cierre = (SELECT hora_cierre_dia FROM sede_opciones WHERE idsede=xidsede);
    SET @hora_cierre = IFNULL(@hora_cierre, '00:00');    

    SET @periodo = periodo_params->>'$.periodo'; 

    -- ============================================
    -- LÓGICA DE PERÍODOS (IGUAL QUE ANTES)
    -- ============================================
    IF @periodo = 'hoy' THEN 
        SET @fecha_hora_inicio = DATE_FORMAT(CONCAT(CURDATE(), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @fecha_hora_cierre = DATE_FORMAT(CONCAT(ADDDATE(CURDATE(), INTERVAL 1 DAY), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @lastIdRegistroPago = (SELECT MIN(idregistro_pago) FROM registro_pago WHERE idsede = xidsede AND fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) LIMIT 2);
        
        SET fecha_concat = CONCAT("rp.idregistro_pago >= ",@lastIdRegistroPago);
        SET hoy_concat = CONCAT("IF (rp.fecha_hora BETWEEN '",@fecha_hora_inicio,"' AND '", @fecha_hora_cierre ,"', 1, 0 )");
    
    ELSEIF @periodo = 'semana' THEN
        SET @max_date = (SELECT fecha_hora FROM registro_pago WHERE idsede = xidsede ORDER BY idregistro_pago DESC LIMIT 1);                
        SET @fecha_hora_inicio = DATE_FORMAT(CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @fecha_hora_cierre = DATE_FORMAT(CONCAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
    
        SET hoy_concat = "IF(WEEK(rp.fecha_hora) = WEEK(NOW()), 1, 0)";
        SET fecha_concat = CONCAT("rp.fecha_hora BETWEEN '",@fecha_hora_inicio,"' AND '",@fecha_hora_cierre,"'");
        SET columm_add_concat = CONCAT(" , WEEK(rp.fecha_hora, 1) num_semana, IF(WEEK(rp.fecha_hora,1) = WEEK('", @max_date ,"',1), 1, 0) semana_actual, DAYNAME(rp.fecha_hora) nom_dia, CASE WHEN DAYOFWEEK(rp.fecha_hora) = 1 THEN 7 ELSE DAYOFWEEK(rp.fecha_hora) - 1 END num_dia"); 
    
    ELSEIF @periodo = 'mes' THEN    
        SET @mes_selected = periodo_params->>'$.mes_selected';
        SET @yy = SUBSTRING_INDEX(@mes_selected, '-', 1);
        SET @mm = SUBSTRING_INDEX(@mes_selected, '-', -1);
        SET @first_day_month = CONCAT(periodo_params->>'$.mes_selected','01');
        
        SET @first_day_last_month = DATE_FORMAT(DATE_SUB(STR_TO_DATE(CONCAT(@yy, '-', @mm, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH), '%Y-%m-%d');
        SET @first_day_next_month = DATE_FORMAT(DATE_ADD(LAST_DAY(STR_TO_DATE(CONCAT(@yy, '-', @mm, '-01'), '%Y-%m-%d')), INTERVAL 1 DAY), '%Y-%m-%d');    

        SET @fecha_hora_inicio = DATE_FORMAT(CONCAT(@first_day_last_month, ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @fecha_hora_cierre = DATE_FORMAT(CONCAT(@first_day_next_month, ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
    
        SET @minMaxID = (SELECT CONCAT(MIN(rp.idregistro_pago),',',MAX(rp.idregistro_pago)) FROM registro_pago rp WHERE idsede=xidsede AND rp.fecha_hora BETWEEN @fecha_hora_inicio AND @fecha_hora_cierre);        
    
        IF (@minMaxID IS NOT NULL) THEN
            SET @lastIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', -1);
            SET @firstIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', 1);
        ELSE 
            SET @lastIdRegistroPago = 0;
            SET @firstIdRegistroPago = 0;
        END IF;
        SET columm_add_concat = ", MONTHNAME(rp.fecha_hora) nom_mes, MONTH(rp.fecha_hora) num_mes";
    
        SET hoy_concat = CONCAT(" IF(MONTH(rp.fecha_hora) = ", @mm ,", 1, IF(MONTH(rp.fecha_hora) < ", @mm ," - 1, 2, 0))");
        SET fecha_concat = CONCAT(" (rp.idregistro_pago BETWEEN ",@firstIdRegistroPago ," AND ",@lastIdRegistroPago,")");

    ELSEIF @periodo = 'dia' THEN    
        SET @dia_selected = periodo_params->>'$.dia_selected';
        SET @fecha_hora_inicio = DATE_FORMAT(CONCAT(@dia_selected, ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @fecha_hora_cierre = DATE_FORMAT(CONCAT(ADDDATE(@dia_selected, INTERVAL 1 DAY), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @minMaxID = (SELECT CONCAT(MIN(rp.idregistro_pago),',',MAX(rp.idregistro_pago)) FROM registro_pago rp WHERE idsede=xidsede AND rp.fecha_hora BETWEEN @fecha_hora_inicio AND @fecha_hora_cierre);
    
        IF (@minMaxID IS NOT NULL) THEN
            SET @lastIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', -1);
            SET @firstIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', 1);
        ELSE 
            SET @lastIdRegistroPago = 0;
            SET @firstIdRegistroPago = 0;
        END IF;

        SET hoy_concat = "'1'";
        SET fecha_concat = CONCAT("rp.idregistro_pago BETWEEN ",@firstIdRegistroPago," AND ",@lastIdRegistroPago);
    
    ELSEIF @periodo = 'rango' THEN
        SET @start_date = periodo_params->>'$.rango_start_date';
        SET @end_date = periodo_params->>'$.rango_end_date';        
        
        SET @fecha_hora_inicio = DATE_FORMAT(CONCAT(@start_date, ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
        SET @fecha_hora_cierre = DATE_FORMAT(CONCAT(ADDDATE(@end_date, INTERVAL 1 DAY), ' ', @hora_cierre), '%Y-%m-%d %H:%i:%s');
    
        SET @minMaxID = (SELECT CONCAT(MIN(rp.idregistro_pago),',',MAX(rp.idregistro_pago)) FROM registro_pago rp WHERE idsede=xidsede AND rp.fecha_hora BETWEEN @fecha_hora_inicio AND @fecha_hora_cierre);
        IF (@minMaxID IS NOT NULL) THEN
            SET @lastIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', -1);
            SET @firstIdRegistroPago = SUBSTRING_INDEX(@minMaxID, ',', 1);
        ELSE 
            SET @lastIdRegistroPago = 0;
            SET @firstIdRegistroPago = 0;
        END IF;
    
        SET hoy_concat = "'1'"; 
        SET fecha_concat = CONCAT("rp.idregistro_pago BETWEEN ",@firstIdRegistroPago," AND ",@lastIdRegistroPago);
        
    END IF;

    -- ============================================
    -- CONSTRUIR EL SQL DINÁMICO
    -- ============================================
    
    SET @sql_query = CONCAT("
        -- Crear tablas temporales
        DROP TEMPORARY TABLE IF EXISTS tmp_ventas_base;
        CREATE TEMPORARY TABLE tmp_ventas_base AS
        SELECT 
            rp.idregistro_pago,
            DATE(rp.fecha_hora) fecha,
            rp.fecha_hora,
            DATE_FORMAT(rp.fecha_hora, '%H:%i') hora,
            TIME_FORMAT(rp.fecha_hora, '%H:%i %p') hora_12h,
            rp.estado,
            rp.fecha_cierre,
            rp.correlativo,
            rp.total,
            ", hoy_concat, " hoy,
            tpc.descripcion destpc,
            tc.idtipo_comprobante,
            COALESCE(tc.descripcion, 'NINGUNO') des_comprobante,
            COALESCE(tc.img, 'tp-comp-1.png') img_comprobante,
            rp.idusuario,
            u.nombres nom_usuario,
            rp.estado anulado,
            MONTH(rp.fecha_hora) num_mes,
            YEAR(rp.fecha_hora) num_year,
            DAY(rp.fecha_hora) num_dia,
            DAYOFWEEK(rp.fecha_hora) dia_semana,
            rp.idcliente
            ", columm_add_concat, "
        FROM registro_pago rp
        INNER JOIN usuario u ON rp.idusuario = u.idusuario
        INNER JOIN tipo_consumo tpc ON tpc.idtipo_consumo = rp.idtipo_consumo
        LEFT JOIN tipo_comprobante_serie tcs ON rp.idtipo_comprobante_serie = tcs.idtipo_comprobante_serie
        LEFT JOIN tipo_comprobante tc ON tcs.idtipo_comprobante = tc.idtipo_comprobante
        WHERE ", fecha_concat, " AND rp.idsede = ", xidsede, ";
        
        ALTER TABLE tmp_ventas_base ADD INDEX idx_id (idregistro_pago);
        
        DROP TEMPORARY TABLE IF EXISTS tmp_subtotales;
        CREATE TEMPORARY TABLE tmp_subtotales AS
        SELECT 
            rpds.idregistro_pago,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'descripcion', rpds.descripcion,
                    'importe', rpds.importe,
                    'tachado', rpds.tachado
                )
            ) subtotales
        FROM registro_pago_subtotal rpds
        INNER JOIN tmp_ventas_base tv ON rpds.idregistro_pago = tv.idregistro_pago
        WHERE rpds.estado = 0
        GROUP BY rpds.idregistro_pago;
        
        ALTER TABLE tmp_subtotales ADD INDEX idx_id (idregistro_pago);
        
        DROP TEMPORARY TABLE IF EXISTS tmp_metodos_pago;
        CREATE TEMPORARY TABLE tmp_metodos_pago AS
        SELECT 
            rpd.idregistro_pago,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'idtipo_pago', rpd.idtipo_pago,
                    'tipo_pago', COALESCE(tp.descripcion, 'SIN TIPO PAGO'),
                    'img', tp.img,
                    'importe', rpd.importe
                )
            ) metodos_pago
        FROM registro_pago_detalle rpd
        INNER JOIN tmp_ventas_base tv ON rpd.idregistro_pago = tv.idregistro_pago
        LEFT JOIN tipo_pago tp ON rpd.idtipo_pago = tp.idtipo_pago
        GROUP BY rpd.idregistro_pago;
        
        ALTER TABLE tmp_metodos_pago ADD INDEX idx_id (idregistro_pago);
        
        DROP TEMPORARY TABLE IF EXISTS tmp_pedido_info;
        CREATE TEMPORARY TABLE tmp_pedido_info AS
        SELECT 
            rpdp.idregistro_pago,
            MAX(p.nummesa) nummesa,
            JSON_OBJECT(
                'idusuario', MAX(u.idusuario),
                'nombres', MAX(u.nombres),
                'usuario', MAX(u.usuario),
                'cargo', MAX(u.cargo)
            ) mesero
        FROM registro_pago_pedido rpdp
        INNER JOIN tmp_ventas_base tv ON rpdp.idregistro_pago = tv.idregistro_pago
        INNER JOIN pedido p ON rpdp.idpedido = p.idpedido
        INNER JOIN usuario u ON p.idusuario = u.idusuario
        GROUP BY rpdp.idregistro_pago;
        
        ALTER TABLE tmp_pedido_info ADD INDEX idx_id (idregistro_pago);
        
        -- Consulta final
        SELECT 
            tv.*,
            COALESCE(ts.subtotales, JSON_ARRAY()) subtotales,
            COALESCE(tmp.metodos_pago, JSON_ARRAY()) metodos_pago,
            COALESCE(tpi.nummesa, 0) nummesa,
            tpi.mesero,
            JSON_OBJECT(
                'idusuario', uc.idusuario,
                'nombres', uc.nombres,
                'usuario', uc.usuario,
                'cargo', uc.cargo
            ) usuario_caja,
            CASE 
                WHEN c.idcliente > 0 THEN
                    JSON_OBJECT(
                        'idcliente', c.idcliente,
                        'nombres', c.nombres,
                        'ruc', c.ruc,
                        'telefono', c.telefono,
                        'direccion', c.direccion,
                        'email', c.email
                    )
                ELSE NULL
            END cliente
        FROM tmp_ventas_base tv
        LEFT JOIN tmp_subtotales ts ON tv.idregistro_pago = ts.idregistro_pago
        LEFT JOIN tmp_metodos_pago tmp ON tv.idregistro_pago = tmp.idregistro_pago
        LEFT JOIN tmp_pedido_info tpi ON tv.idregistro_pago = tpi.idregistro_pago
        INNER JOIN usuario uc ON tv.idusuario = uc.idusuario
        LEFT JOIN cliente c ON tv.idcliente = c.idcliente
        ORDER BY tv.idregistro_pago DESC;
        
        DROP TEMPORARY TABLE IF EXISTS tmp_ventas_base;
        DROP TEMPORARY TABLE IF EXISTS tmp_subtotales;
        DROP TEMPORARY TABLE IF EXISTS tmp_metodos_pago;
        DROP TEMPORARY TABLE IF EXISTS tmp_pedido_info;
    ");
    
    -- RETORNAR EL SQL EN LUGAR DE EJECUTARLO
    SELECT @sql_query AS f0;
	
END$$

DELIMITER ;
