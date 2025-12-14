"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.normalizeResponseDashPuntoEquilibrio = exports.normalizeResponseDashUsuarios = exports.normalizeResponseDashCompras = exports.normalizeResponseDashClientes = exports.normalizeResponseDashProductos = exports.normalizeResponseDashCaja = exports.normalizeResponseDashVentasTotal = exports.normalizeResponseDash = exports.normalizeResponse = void 0;
// Convertir BigInt a Number en un objeto
var convertBigIntToNumber = function (obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint') {
        return Number(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(function (item) { return convertBigIntToNumber(item); });
    }
    if (typeof obj === 'object') {
        var converted = {};
        for (var key in obj) {
            converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
    }
    return obj;
};
// normalizar respuesta procedures
var normalizeResponse = function (rptExec) {
    if (rptExec.length === 0)
        return [];
    return rptExec.map(function (item) {
        var converted = convertBigIntToNumber(item);
        return __assign(__assign({}, converted), { num_semana: Number(converted.num_semana) || 0, semana_actual: Number(converted.semana_actual) || 0, num_dia: Number(converted.num_dia) || 0, hoy: Number(converted.hoy) || 0, num_mes: Number(converted.num_mes) || 0, num_year: Number(converted.num_year) || 0, recupera_stock: converted.recupera_stock ? Number(converted.recupera_stock) : 0 });
    });
};
exports.normalizeResponse = normalizeResponse;
var normalizeResponseDash = function (rptExec) {
    if (rptExec.length === 0)
        return [];
    // Mapeo de campos f0, f1, f2... a nombres reales
    var fieldMap = {
        'f0': 'idregistro_pago',
        'f1': 'fecha',
        'f2': 'fecha_hora',
        'f3': 'hora',
        'f4': 'hora_12h',
        'f5': 'estado',
        'f6': 'fecha_cierre',
        'f7': 'correlativo',
        'f8': 'total',
        'f9': 'hoy',
        'f10': 'destpc',
        'f11': 'idtipo_comprobante',
        'f12': 'des_comprobante',
        'f13': 'img_comprobante',
        'f14': 'idusuario',
        'f15': 'nom_usuario',
        'f16': 'anulado',
        'f17': 'num_mes',
        'f18': 'num_year',
        'f19': 'num_dia',
        'f20': 'dia_semana',
        'f21': 'idcliente',
        'f22': 'idusuario_permiso',
        'f23': 'motivo_anular',
        'f24': 'idce',
        'f25': 'subtotales',
        'f26': 'metodos_pago',
        'f27': 'descuentos',
        'f28': 'nummesa',
        'f29': 'mesero',
        'f30': 'usuario_caja',
        'f31': 'cliente',
        'f32': 'usuario_autoriza_anulacion',
        'f33': 'resumen_comprobantes'
    };
    return rptExec.map(function (item) {
        var normalized = {};
        // Mapear campos f0, f1... a nombres reales
        Object.keys(item).forEach(function (key) {
            var newKey = fieldMap[key] || key;
            var value = item[key];
            normalized[newKey] = typeof value === 'bigint' ? Number(value) : value;
        });
        // Eliminar campos fXX duplicados que ya fueron mapeados
        Object.keys(normalized).forEach(function (key) {
            if (key.match(/^f\d+$/)) {
                delete normalized[key];
            }
        });
        return normalized;
    });
};
exports.normalizeResponseDash = normalizeResponseDash;
// Mapeo específico para ventas con detalle de pagos
var normalizeResponseDashVentasTotal = function (rptExec) {
    if (rptExec.length === 0)
        return [];
    // Mapeo de campos f0, f1, f2... a nombres reales para el detalle de ventas con pagos
    var fieldMap = {
        'f0': 'idregistro_pago_detalle',
        'f1': 'idregistro_pago',
        'f2': 'idtipo_pago',
        'f3': 'importe',
        'f4': 'pagado',
        'f5': 'estado',
        'f6': 'flag_pagado',
        'f7': 'permission_change',
        'f8': 'idregistro_pago_2',
        'f9': 'fecha',
        'f10': 'fecha_hora',
        'f11': 'hora',
        'f12': 'estado_2',
        'f13': 'fecha_cierre',
        'f14': 'des_tp',
        'f15': 'idtipo_comprobante',
        'f16': 'comprobante',
        'f17': 'correlativo',
        'f18': 'hoy',
        'f19': 'img',
        'f20': 'destpc',
        'f21': 'idtipo_comprobante_2',
        'f22': 'des_comprobante',
        'f23': 'img_comprobante',
        'f24': 'idusuario',
        'f25': 'nom_usuario',
        'f26': 'anulado',
        'f27': 'num_mes',
        'f28': 'num_year',
        'f29': 'num_comprobante'
    };
    return rptExec.map(function (item) {
        var normalized = {};
        // Mapear campos f0, f1... a nombres reales
        Object.keys(item).forEach(function (key) {
            var newKey = fieldMap[key] || key;
            var value = item[key];
            normalized[newKey] = typeof value === 'bigint' ? Number(value) : value;
        });
        // Eliminar campos fXX duplicados que ya fueron mapeados
        Object.keys(normalized).forEach(function (key) {
            if (key.match(/^f\d+$/)) {
                delete normalized[key];
            }
        });
        return normalized;
    });
};
exports.normalizeResponseDashVentasTotal = normalizeResponseDashVentasTotal;
// Mapeo para el módulo de caja (procedure_module_dash_caja2)
var normalizeResponseDashCaja = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    var mapResumen = function (items) {
        return items.map(function (item) { return ({
            total_ingresos_caja: parseFloat(item.f0 || 0),
            total_egresos_caja: parseFloat(item.f1 || 0),
            cantidad_movimientos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            total_ventas: parseFloat(item.f3 || 0),
            cantidad_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_efectivo: parseFloat(item.f5 || 0),
            total_tarjeta: parseFloat(item.f6 || 0)
        }); });
    };
    var mapUsuariosCaja = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            cantidad_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            cantidad_ventas_anuladas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            total_ventas_anuladas: parseFloat(item.f7 || 0)
        }); });
    };
    var mapMetodosPagoUsuario = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idtipo_pago: parseInt(item.f2),
            tipo_pago: item.f3,
            img: item.f4,
            cantidad: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total: parseFloat(item.f6 || 0)
        }); });
    };
    var mapMovimientosCajaUsuario = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idie_caja: parseInt(item.f2),
            fecha: item.f3,
            fecha_hora: item.f4,
            motivo: item.f5,
            monto: parseFloat(item.f6 || 0),
            tipo: parseInt(item.f7),
            tipo_descripcion: item.f8
        }); });
    };
    var mapVentasEliminadasUsuario = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idregistro_pago: parseInt(item.f2),
            fecha: item.f3,
            fecha_hora: item.f4,
            total: parseFloat(item.f5 || 0),
            motivo_anular: item.f6,
            idusuario_permiso: item.f7 ? parseInt(item.f7) : null,
            usuario_autoriza_nombre: item.f8
        }); });
    };
    var mapMetodosPago = function (items) {
        return items.map(function (item) { return ({
            idtipo_pago: parseInt(item.f0),
            tipo_pago: item.f1,
            img: item.f2,
            cantidad: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total: parseFloat(item.f4 || 0),
            porcentaje: parseFloat(item.f5 || 0)
        }); });
    };
    var mapFlujoDiario = function (items) {
        return items.map(function (item) { return ({
            fecha: item.f0,
            idusuario: parseInt(item.f1),
            ingresos: parseFloat(item.f2 || 0),
            egresos: parseFloat(item.f3 || 0),
            ventas: parseFloat(item.f4 || 0),
            saldo_neto: parseFloat(item.f5 || 0)
        }); });
    };
    var mapComprobantes = function (items) {
        return items.map(function (item) { return ({
            idtipo_comprobante: item.f0 ? parseInt(item.f0) : null,
            des_comprobante: item.f1,
            img_comprobante: item.f2,
            cantidad: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total: parseFloat(item.f4 || 0),
            porcentaje: parseFloat(item.f5 || 0)
        }); });
    };
    var mapVentasPorHora = function (items) {
        return items.map(function (item) { return ({
            hora: item.f0,
            cantidad_ventas: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            total_ventas: parseFloat(item.f2 || 0)
        }); });
    };
    var mapTopProductos = function (items) {
        return items.map(function (item) { return ({
            idproducto: parseInt(item.f0),
            producto: item.f1,
            cantidad: typeof item.f2 === 'bigint' ? Number(item.f2) : parseFloat(item.f2 || 0),
            total: parseFloat(item.f3 || 0)
        }); });
    };
    var mapMovimientos = function (items) {
        return items.map(function (item) { return ({
            idie_caja: parseInt(item.f0),
            fecha: item.f1,
            fecha_hora: item.f2,
            motivo: item.f3,
            monto: parseFloat(item.f4 || 0),
            tipo: parseInt(item.f5),
            tipo_descripcion: item.f6,
            idusuario: parseInt(item.f7),
            usuario_nombre: item.f8,
            usuario_cargo: item.f9
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumen(data);
        case 'usuarios_caja':
            return mapUsuariosCaja(data);
        case 'metodos_pago_usuario':
            return mapMetodosPagoUsuario(data);
        case 'movimientos_caja_usuario':
            return mapMovimientosCajaUsuario(data);
        case 'ventas_eliminadas_usuario':
            return mapVentasEliminadasUsuario(data);
        case 'metodos_pago':
            return mapMetodosPago(data);
        case 'movimientos':
            return mapMovimientos(data);
        case 'flujo_diario':
            return mapFlujoDiario(data);
        case 'comprobantes':
            return mapComprobantes(data);
        case 'ventas_por_hora':
            return mapVentasPorHora(data);
        case 'top_productos':
            return mapTopProductos(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashCaja = normalizeResponseDashCaja;
// Mapeo para el módulo de productos (procedure_module_dash_productos)
var normalizeResponseDashProductos = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    var mapResumenProductos = function (items) {
        return items.map(function (item) { return ({
            total_productos_activos: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            valor_inventario_total: parseFloat(item.f1 || 0),
            productos_stock_critico: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            productos_stock_bajo: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            productos_sin_stock: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_alertas_stock: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0)
        }); });
    };
    var mapTopVentasCantidadCarta = function (items) {
        return items.map(function (item) { return ({
            id: parseInt(item.f0),
            producto_nombre: item.f1,
            categoria: item.f2,
            seccion_nombre: item.f3,
            cantidad_vendida: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            numero_ventas: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            importe: parseFloat(item.f6 || 0)
        }); });
    };
    var mapTopVentasCantidadAlmacen = function (items) {
        return items.map(function (item) { return ({
            idproducto: parseInt(item.f0),
            almacen_nombre: item.f1,
            producto_nombre: item.f2,
            categoria: item.f3,
            cantidad_vendida: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            numero_ventas: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            importe: parseFloat(item.f6 || 0)
        }); });
    };
    var mapTopVentasIngresos = function (items) {
        return items.map(function (item) { return ({
            iditem: parseInt(item.f0),
            producto_nombre: item.f1,
            seccion_nombre: item.f2,
            cantidad_vendida: typeof item.f3 === 'bigint' ? Number(item.f3) : parseFloat(item.f3 || 0),
            total_ingresos: parseFloat(item.f4 || 0),
            precio_promedio: parseFloat(item.f5 || 0),
            numero_ventas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }); });
    };
    var mapProductosBajaRotacion = function (items) {
        return items.map(function (item) { return ({
            seccion: item.f0,
            producto_nombre: item.f1,
            precio: parseFloat(item.f2 || 0),
            cantidad_vendida: typeof item.f3 === 'bigint' ? Number(item.f3) : parseFloat(item.f3 || 0),
            numero_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ingresos: parseFloat(item.f5 || 0),
            dias_desde_ultima_venta: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }); });
    };
    var mapInventarioAlertas = function (items) {
        return items.map(function (item) { return ({
            idproducto: parseInt(item.f0),
            producto_nombre: item.f1,
            precio_producto: parseFloat(item.f2 || 0),
            stock_actual: parseFloat(item.f3 || 0),
            stock_minimo: parseFloat(item.f4 || 0),
            valor_stock: parseFloat(item.f5 || 0),
            producto_familia: item.f6,
            nivel_alerta: item.f7,
            prioridad: parseInt(item.f8)
        }); });
    };
    var mapInventarioAlertasPorciones = function (items) {
        return items.map(function (item) { return ({
            idporcion: parseInt(item.f0),
            porcion_nombre: item.f1,
            peso: parseFloat(item.f2 || 0),
            stock_actual: parseFloat(item.f3 || 0),
            nivel_alerta: item.f4,
            prioridad: parseInt(item.f5)
        }); });
    };
    var mapRentabilidad = function (items) {
        return items.map(function (item) { return ({
            iditem: parseInt(item.f0),
            producto_nombre: item.f1,
            producto_descripcion: item.f2,
            precio_venta: parseFloat(item.f3 || 0),
            costo_producto: parseFloat(item.f4 || 0),
            seccion: item.f5,
            cantidad_vendida: typeof item.f6 === 'bigint' ? Number(item.f6) : parseFloat(item.f6 || 0),
            total_ingresos: parseFloat(item.f7 || 0),
            food_cost: parseFloat(item.f8 || 0),
            porcentaje_food_cost: item.f9 ? parseFloat(item.f9) : null,
            food_cost_resumen: item.f10 || null,
            receta_sugerida: item.f11 || null,
            updated_at: item.f12 || null
        }); });
    };
    var mapProductosAlmacenInSubitems = function (items) {
        var agrupado = {};
        // Recorrer todos los items
        items.forEach(function (item) {
            var idproductos = item.f1 || [];
            var cantidades = item.f2 || [];
            // Recorrer los arrays y sumar cantidades por idproducto
            idproductos.forEach(function (idproducto, index) {
                var cantidad = cantidades[index] || 1;
                if (agrupado[idproducto]) {
                    agrupado[idproducto] += cantidad;
                }
                else {
                    agrupado[idproducto] = cantidad;
                }
            });
        });
        // Convertir el objeto agrupado a array
        return Object.keys(agrupado).map(function (idproducto) { return ({
            idproducto: parseInt(idproducto),
            cantidad: agrupado[parseInt(idproducto)]
        }); });
    };
    var mapTopVentasPorciones = function (items) {
        return items.map(function (item) { return ({
            cantidad_vendida: typeof item.f0 === 'bigint' ? Number(item.f0) : parseFloat(item.f0 || 0),
            total: parseFloat(item.f1 || 0),
            descripcion_porcion: item.f2
        }); });
    };
    var mapListNombreProductoSubitems = function (items) {
        return items.map(function (item) { return ({
            idproducto: parseInt(item.f0),
            des_producto: item.f1,
            des_almacen: item.f2
        }); });
    };
    var mapPorcionesInSubitems = function (items) {
        var agrupado = {};
        // Recorrer todos los items
        items.forEach(function (item) {
            var idporciones = item.f1 || [];
            var cantidades = item.f2 || [];
            var cantidades_descuenta = item.f3 || [];
            // Recorrer los arrays y sumar cantidades por idporcion
            idporciones.forEach(function (idporcion, index) {
                var cantidad = cantidades[index] || 1;
                var descuenta = cantidades_descuenta[index] || 1;
                var cantidad_total = cantidad * descuenta;
                if (agrupado[idporcion]) {
                    agrupado[idporcion] += cantidad_total;
                }
                else {
                    agrupado[idporcion] = cantidad_total;
                }
            });
        });
        // Convertir el objeto agrupado a array
        return Object.keys(agrupado).map(function (idporcion) { return ({
            idporcion: parseInt(idporcion),
            cantidad: agrupado[parseInt(idporcion)]
        }); });
    };
    var mapListNombrePorcionesSubitems = function (items) {
        return items.map(function (item) { return ({
            idporcion: parseInt(item.f0),
            descripcion_porcion: item.f1
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumenProductos(data);
        case 'top_ventas_cantidad_carta':
            return mapTopVentasCantidadCarta(data);
        case 'top_ventas_cantidad_almacen':
            return mapTopVentasCantidadAlmacen(data);
        case 'top_ventas_ingresos':
            return mapTopVentasIngresos(data);
        case 'productos_baja_rotacion':
            return mapProductosBajaRotacion(data);
        case 'inventario_alertas':
            return mapInventarioAlertas(data);
        case 'inventario_alertas_porciones':
            return mapInventarioAlertasPorciones(data);
        case 'rentabilidad':
            return mapRentabilidad(data);
        case 'productos_almacen_in_subitems':
            var rpt = mapProductosAlmacenInSubitems(data);
            return rpt;
        case 'top_ventas_porciones':
            return mapTopVentasPorciones(data);
        case 'list_nombre_producto_subitems':
            return mapListNombreProductoSubitems(data);
        case 'porciones_in_subitems':
            var rptPorciones = mapPorcionesInSubitems(data);
            return rptPorciones;
        case 'list_nombre_porciones_subitems':
            return mapListNombrePorcionesSubitems(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashProductos = normalizeResponseDashProductos;
// Mapeo para el módulo de clientes (procedure_module_dash_clientes)
var normalizeResponseDashClientes = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    var mapResumenClientes = function (items) {
        return items.map(function (item) { return ({
            total_clientes_registrados: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            clientes_activos: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            clientes_mes_actual: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            clientes_semana_actual: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            clientes_nuevos: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            ticket_promedio_cliente: parseFloat(item.f5 || 0),
            total_ventas_clientes: parseFloat(item.f6 || 0),
            total_compras_clientes: typeof item.f7 === 'bigint' ? Number(item.f7) : parseInt(item.f7 || 0),
            compras_promedio_por_cliente: parseFloat(item.f8 || 0)
        }); });
    };
    var mapListadoClientes = function (items) {
        return items.map(function (item) { return ({
            idcliente: parseInt(item.f0),
            nombres: item.f1,
            ruc: item.f2,
            telefono: item.f3,
            direccion: item.f4,
            email: item.f5,
            total_compras: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            compras_validas: typeof item.f7 === 'bigint' ? Number(item.f7) : parseInt(item.f7 || 0),
            total_gastado: parseFloat(item.f8 || 0),
            ticket_promedio: parseFloat(item.f9 || 0),
            fecha_ultima_compra: item.f10,
            fecha_primera_compra: item.f11,
            dias_desde_ultima_compra: typeof item.f12 === 'bigint' ? Number(item.f12) : parseInt(item.f12 || 0),
            segmento: item.f13,
            estado: item.f14
        }); });
    };
    var mapSegmentacion = function (items) {
        return items.map(function (item) { return ({
            segmento: item.f0,
            cantidad_clientes: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            total_ventas: parseFloat(item.f2 || 0),
            gasto_promedio_cliente: parseFloat(item.f3 || 0),
            total_compras: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            compras_por_cliente: parseFloat(item.f5 || 0)
        }); });
    };
    var mapCreditosPendientes = function (items) {
        return items.map(function (item) { return ({
            idcliente: parseInt(item.f0),
            nombre_cliente: item.f1,
            ruc: item.f2,
            telefono: item.f3,
            direccion: item.f4,
            fecha_registro: item.f5,
            total_credito: parseFloat(item.f6 || 0),
            total_pagado: parseFloat(item.f7 || 0),
            saldo_pendiente: parseFloat(item.f8 || 0),
            porcentaje_pagado: parseFloat(item.f9 || 0),
            ultima_fecha_pago: item.f10,
            numero_pagos: typeof item.f11 === 'bigint' ? Number(item.f11) : parseInt(item.f11 || 0),
            dias_sin_pago: typeof item.f12 === 'bigint' ? Number(item.f12) : parseInt(item.f12 || 0),
            cantidad_compras: typeof item.f13 === 'bigint' ? Number(item.f13) : parseInt(item.f13 || 0),
            estado_credito: item.f14
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumenClientes(data);
        case 'listado':
            return mapListadoClientes(data);
        case 'segmentacion':
            return mapSegmentacion(data);
        case 'creditos_pendientes':
            return mapCreditosPendientes(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashClientes = normalizeResponseDashClientes;
// Mapeo para el módulo de compras (procedure_module_dash_compras)
var normalizeResponseDashCompras = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    var mapResumenCompras = function (items) {
        return items.map(function (item) { return ({
            total_compras_registradas: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            monto_total_compras_registradas: parseFloat(item.f1 || 0),
            monto_compras_contado: parseFloat(item.f2 || 0),
            monto_compras_credito: parseFloat(item.f3 || 0),
            saldo_pendiente_creditos: parseFloat(item.f4 || 0),
            monto_compras_no_registradas: parseFloat(item.f5 || 0),
            total_compras_no_registradas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            monto_total_compras_con_gastos: parseFloat(item.f7 || 0),
            ticket_promedio_compra: parseFloat(item.f8 || 0)
        }); });
    };
    var mapListadoCompras = function (items) {
        return items.map(function (item) { return ({
            idcompra: parseInt(item.f0),
            fecha_compra: item.f1,
            fecha_registro: item.f2,
            fecha_compra_date: item.f3,
            total: parseFloat(item.f4 || 0),
            a_pagar: parseFloat(item.f5 || 0),
            pagado: parseInt(item.f6),
            nota_de_compra: item.f7,
            tipo_compra: item.f8,
            estado_pago: item.f9,
            idproveedor: item.f10 ? parseInt(item.f10) : null,
            nombre_proveedor: item.f11,
            proveedor_dni: item.f12,
            proveedor_telefono: item.f13,
            idusuario: item.f14 ? parseInt(item.f14) : null,
            nombre_usuario: item.f15,
            cargo_usuario: item.f16,
            idalmacen: item.f17 ? parseInt(item.f17) : null
        }); });
    };
    var mapListadoProveedores = function (items) {
        return items.map(function (item) { return ({
            idproveedor: parseInt(item.f0),
            nombre_proveedor: item.f1,
            dni: item.f2,
            telefono: item.f3,
            direccion: item.f4,
            cantidad_compras: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            monto_total: parseFloat(item.f6 || 0),
            monto_contado: parseFloat(item.f7 || 0),
            monto_credito: parseFloat(item.f8 || 0),
            saldo_pendiente: parseFloat(item.f9 || 0),
            primera_compra: item.f10,
            ultima_compra: item.f11
        }); });
    };
    var mapTopProductos = function (items) {
        return items.map(function (item) { return ({
            idproducto: parseInt(item.f0),
            nombre_producto: item.f1,
            veces_comprado: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            cantidad_total: typeof item.f3 === 'bigint' ? Number(item.f3) : parseFloat(item.f3 || 0),
            monto_total: parseFloat(item.f4 || 0),
            precio_promedio: parseFloat(item.f5 || 0),
            precio_minimo: parseFloat(item.f6 || 0),
            precio_maximo: parseFloat(item.f7 || 0),
            ultima_compra: item.f8,
            proveedor_principal: item.f9,
            precio_proveedor_principal: parseFloat(item.f10 || 0)
        }); });
    };
    var mapEvolucionDiariaCompras = function (items) {
        return items.map(function (item) { return ({
            fecha: item.f0,
            cantidad_compras: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            monto_total: parseFloat(item.f2 || 0),
            monto_contado: parseFloat(item.f3 || 0),
            monto_credito: parseFloat(item.f4 || 0)
        }); });
    };
    var mapDetalleCompra = function (items) {
        return items.map(function (item) { return ({
            iddetalle_compra: parseInt(item.f0),
            idcompra: parseInt(item.f1),
            idproducto: parseInt(item.f2),
            producto_nombre: item.f3,
            cantidad: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            precio_unitario: parseFloat(item.f5 || 0),
            subtotal: parseFloat(item.f6 || 0)
        }); });
    };
    var mapProveedoresActivos = function (items) {
        return items.map(function (item) { return ({
            idproveedor: parseInt(item.f0),
            descripcion: item.f1,
            dni: item.f2,
            telefono: item.f3,
            direccion: item.f4,
            email: item.f5,
            compras_periodo: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            monto_periodo: parseFloat(item.f7 || 0)
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumenCompras(data);
        case 'listado':
            return mapListadoCompras(data);
        case 'listado_proveedores':
            return mapListadoProveedores(data);
        case 'top_productos':
            return mapTopProductos(data);
        case 'evolucion_diaria':
            return mapEvolucionDiariaCompras(data);
        case 'detalle_compra':
            return mapDetalleCompra(data);
        case 'proveedores_activos':
            return mapProveedoresActivos(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashCompras = normalizeResponseDashCompras;
// Mapeo para el módulo de usuarios (procedure_module_dash_usuarios)
var normalizeResponseDashUsuarios = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    var mapResumenUsuarios = function (items) {
        return items.map(function (item) { return ({
            total_usuarios: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            usuarios_activos: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            usuarios_caja_activos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            usuarios_meseros_activos: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0),
            total_transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            promedio_ventas_por_usuario: parseFloat(item.f6 || 0),
            ticket_promedio: parseFloat(item.f7 || 0)
        }); });
    };
    var mapUsuariosCaja = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            estado: parseInt(item.f4),
            total_transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total_ventas: parseFloat(item.f6 || 0),
            ticket_promedio: parseFloat(item.f7 || 0),
            ventas_anuladas: typeof item.f8 === 'bigint' ? Number(item.f8) : parseInt(item.f8 || 0),
            monto_anulado: parseFloat(item.f9 || 0),
            ultima_venta: item.f10
        }); });
    };
    var mapUsuariosMeseros = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            estado: parseInt(item.f4),
            total_pedidos: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total_transacciones: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            total_ventas: parseFloat(item.f7 || 0),
            ticket_promedio: parseFloat(item.f8 || 0),
            ultima_atencion: item.f9
        }); });
    };
    var mapDistribucionRoles = function (items) {
        return items.map(function (item) { return ({
            cargo: item.f0,
            cantidad_usuarios: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            usuarios_activos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            usuarios_con_ventas: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0),
            total_transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0)
        }); });
    };
    var mapTopVendedoresCaja = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            ticket_promedio: parseFloat(item.f6 || 0)
        }); });
    };
    var mapTopMeseros = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            pedidos: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total_ventas: parseFloat(item.f6 || 0),
            ticket_promedio: parseFloat(item.f7 || 0)
        }); });
    };
    var mapEvolucionDiariaCaja = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            fecha: item.f2,
            transacciones: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0)
        }); });
    };
    var mapEvolucionDiariaMeseros = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            fecha: item.f2,
            pedidos: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0)
        }); });
    };
    var mapComparativaUsuarios = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            estado: parseInt(item.f4),
            ventas_como_cajero: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            monto_como_cajero: parseFloat(item.f6 || 0),
            pedidos_como_mesero: typeof item.f7 === 'bigint' ? Number(item.f7) : parseInt(item.f7 || 0),
            monto_como_mesero: parseFloat(item.f8 || 0),
            total_general: parseFloat(item.f9 || 0)
        }); });
    };
    var mapBajoRendimiento = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            promedio_general: parseFloat(item.f6 || 0),
            porcentaje_vs_promedio: parseFloat(item.f7 || 0)
        }); });
    };
    var mapListadoCompleto = function (items) {
        return items.map(function (item) { return ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            estado: parseInt(item.f4),
            ultima_actividad: item.f5,
            dias_sin_actividad: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumenUsuarios(data);
        case 'usuarios_caja':
            return mapUsuariosCaja(data);
        case 'usuarios_meseros':
            return mapUsuariosMeseros(data);
        case 'distribucion_roles':
            return mapDistribucionRoles(data);
        case 'top_vendedores_caja':
            return mapTopVendedoresCaja(data);
        case 'top_meseros':
            return mapTopMeseros(data);
        case 'evolucion_diaria_caja':
            return mapEvolucionDiariaCaja(data);
        case 'evolucion_diaria_meseros':
            return mapEvolucionDiariaMeseros(data);
        case 'comparativa_usuarios':
            return mapComparativaUsuarios(data);
        case 'bajo_rendimiento':
            return mapBajoRendimiento(data);
        case 'listado_completo':
            return mapListadoCompleto(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashUsuarios = normalizeResponseDashUsuarios;
// Mapeo para el módulo de punto de equilibrio
// Nota: Prisma devuelve columnas como f0, f1, f2... desde stored procedures
var normalizeResponseDashPuntoEquilibrio = function (data, tipo_consulta) {
    if (!data || data.length === 0)
        return [];
    // Helper para convertir bigint a number
    var toNumber = function (val) {
        if (typeof val === 'bigint')
            return Number(val);
        if (typeof val === 'number')
            return val;
        return parseFloat(val) || 0;
    };
    // Mapeo para resumen principal
    // f0: total_ventas, f1: cantidad_ventas, f2: otros_ingresos, 
    // f3: total_compras, f4: cantidad_compras, f5: gastos_fijos, f6: gastos_variables
    var mapResumen = function (items) {
        return items.map(function (item) {
            var totalVentas = toNumber(item.f0);
            var cantidadVentas = toNumber(item.f1);
            var otrosIngresos = toNumber(item.f2);
            var totalCompras = toNumber(item.f3);
            var cantidadCompras = toNumber(item.f4);
            var gastosFijos = toNumber(item.f5);
            var gastosVariables = toNumber(item.f6);
            var totalIngresos = totalVentas + otrosIngresos;
            var totalEgresos = totalCompras + gastosFijos + gastosVariables;
            var utilidad = totalIngresos - totalEgresos;
            var margenUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;
            return {
                ingresos: {
                    ventas: totalVentas,
                    cantidad_ventas: cantidadVentas,
                    otros_ingresos: otrosIngresos,
                    total: totalIngresos
                },
                egresos: {
                    compras: totalCompras,
                    cantidad_compras: cantidadCompras,
                    gastos_fijos: gastosFijos,
                    gastos_variables: gastosVariables,
                    total: totalEgresos
                },
                utilidad: utilidad,
                margen_utilidad: parseFloat(margenUtilidad.toFixed(2)),
                punto_equilibrio: totalEgresos,
                datos_completos: {
                    ventas: totalVentas > 0,
                    otros_ingresos: otrosIngresos > 0,
                    compras: totalCompras > 0,
                    gastos_fijos: gastosFijos > 0,
                    gastos_variables: gastosVariables > 0
                }
            };
        });
    };
    // Mapeo para evolución mensual
    // f0: anio, f1: mes, f2: mes_nombre, f3: ventas, f4: otros_ingresos,
    // f5: compras, f6: gastos_fijos, f7: gastos_variables, 
    // f8: total_ingresos, f9: total_egresos, f10: balance
    var mapEvolucionMensual = function (items) {
        return items.map(function (item) {
            var ventas = toNumber(item.f3);
            var otrosIngresos = toNumber(item.f4);
            var compras = toNumber(item.f5);
            var gastosFijos = toNumber(item.f6);
            var gastosVariables = toNumber(item.f7);
            var totalIngresos = toNumber(item.f8);
            var totalEgresos = toNumber(item.f9);
            var balance = toNumber(item.f10);
            return {
                anio: toNumber(item.f0),
                mes: toNumber(item.f1),
                mes_nombre: item.f2,
                ventas: ventas,
                otros_ingresos: otrosIngresos,
                compras: compras,
                gastos_fijos: gastosFijos,
                gastos_variables: gastosVariables,
                total_ingresos: totalIngresos,
                total_egresos: totalEgresos,
                balance: balance
            };
        });
    };
    // Mapeo para resumen por categorías
    // f0: categoria, f1: tipo, f2: total, f3: cantidad
    var mapResumenCategorias = function (items) {
        return items.map(function (item) { return ({
            categoria: item.f0,
            tipo: item.f1,
            total: toNumber(item.f2),
            cantidad: toNumber(item.f3)
        }); });
    };
    // Mapeo para detalle de gastos fijos
    // f0: id, f1: concepto, f2: tipo_gasto, f3: importe, f4: fecha_pago, f5: cuota, f6: documento
    var mapDetalleGastosFijos = function (items) {
        return items.map(function (item) { return ({
            id: toNumber(item.f0),
            concepto: item.f1,
            tipo_gasto: item.f2,
            importe: toNumber(item.f3),
            fecha_pago: item.f4,
            cuota: item.f5,
            documento: item.f6
        }); });
    };
    // Mapeo para detalle de gastos variables
    // f0: id, f1: concepto, f2: tipo_gasto, f3: importe, f4: fecha_pago, f5: fecha_registro
    var mapDetalleGastosVariables = function (items) {
        return items.map(function (item) { return ({
            id: toNumber(item.f0),
            concepto: item.f1,
            tipo_gasto: item.f2,
            importe: toNumber(item.f3),
            fecha_pago: item.f4,
            fecha_registro: item.f5
        }); });
    };
    // Mapeo para ingresos diarios
    // f0: dia, f1: fecha, f2: ingreso_dia, f3: ingreso_acumulado
    var mapIngresosDiarios = function (items) {
        return items.map(function (item) { return ({
            dia: toNumber(item.f0),
            fecha: item.f1,
            ingreso_dia: toNumber(item.f2),
            ingreso_acumulado: toNumber(item.f3)
        }); });
    };
    switch (tipo_consulta) {
        case 'resumen':
            return mapResumen(data);
        case 'evolucion_mensual':
            return mapEvolucionMensual(data);
        case 'resumen_categorias':
            return mapResumenCategorias(data);
        case 'detalle_gastos_fijos':
            return mapDetalleGastosFijos(data);
        case 'detalle_gastos_variables':
            return mapDetalleGastosVariables(data);
        case 'ingresos_diarios':
            return mapIngresosDiarios(data);
        default:
            return data;
    }
};
exports.normalizeResponseDashPuntoEquilibrio = normalizeResponseDashPuntoEquilibrio;
