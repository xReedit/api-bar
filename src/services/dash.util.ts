// Convertir BigInt a Number en un objeto
const convertBigIntToNumber = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'bigint') {
        return Number(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => convertBigIntToNumber(item));
    }
    
    if (typeof obj === 'object') {
        const converted: any = {};
        for (const key in obj) {
            converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
    }
    
    return obj;
};

// normalizar respuesta procedures
export const normalizeResponse = (rptExec: any) => {
    if ( rptExec.length === 0 ) return [];
        return rptExec.map((item: any) => {
            const converted = convertBigIntToNumber(item);
            return {
                ...converted,
                num_semana: Number(converted.num_semana) || 0,
                semana_actual: Number(converted.semana_actual) || 0,
                num_dia: Number(converted.num_dia) || 0,
                hoy: Number(converted.hoy) || 0,
                num_mes: Number(converted.num_mes) || 0,
                num_year: Number(converted.num_year) || 0,
                recupera_stock: converted.recupera_stock ? Number(converted.recupera_stock) : 0,
            };
        });
}

export const normalizeResponseDash = (rptExec: any) => {
    if (rptExec.length === 0) return [];
    
    // Mapeo de campos f0, f1, f2... a nombres reales
    const fieldMap: { [key: string]: string } = {
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
    
    return rptExec.map((item: any) => {
        const normalized: any = {};
        
        // Mapear campos f0, f1... a nombres reales
        Object.keys(item).forEach(key => {
            const newKey = fieldMap[key] || key;
            const value = item[key];
            normalized[newKey] = typeof value === 'bigint' ? Number(value) : value;
        });
        
        // Eliminar campos fXX duplicados que ya fueron mapeados
        Object.keys(normalized).forEach(key => {
            if (key.match(/^f\d+$/)) {
                delete normalized[key];
            }
        });
        
        return normalized;
    });
}

// Mapeo específico para ventas con detalle de pagos
export const normalizeResponseDashVentasTotal = (rptExec: any) => {
    if (rptExec.length === 0) return [];
    
    // Mapeo de campos f0, f1, f2... a nombres reales para el detalle de ventas con pagos
    const fieldMap: { [key: string]: string } = {
        'f0': 'idregistro_pago_detalle',
        'f1': 'idregistro_pago',
        'f2': 'idtipo_pago',
        'f3': 'importe',
        'f4': 'pagado',
        'f5': 'estado',
        'f6': 'flag_pagado',
        'f7': 'permission_change',
        'f8': 'idregistro_pago_2', // duplicado
        'f9': 'fecha',
        'f10': 'fecha_hora',
        'f11': 'hora',
        'f12': 'estado_2', // duplicado
        'f13': 'fecha_cierre',
        'f14': 'des_tp',
        'f15': 'idtipo_comprobante',
        'f16': 'comprobante',
        'f17': 'correlativo',
        'f18': 'hoy',
        'f19': 'img',
        'f20': 'destpc',
        'f21': 'idtipo_comprobante_2', // duplicado
        'f22': 'des_comprobante',
        'f23': 'img_comprobante',
        'f24': 'idusuario',
        'f25': 'nom_usuario',
        'f26': 'anulado',
        'f27': 'num_mes',
        'f28': 'num_year',
        'f29': 'num_comprobante'
    };
    
    return rptExec.map((item: any) => {
        const normalized: any = {};
        
        // Mapear campos f0, f1... a nombres reales
        Object.keys(item).forEach(key => {
            const newKey = fieldMap[key] || key;
            const value = item[key];
            normalized[newKey] = typeof value === 'bigint' ? Number(value) : value;
        });
        
        // Eliminar campos fXX duplicados que ya fueron mapeados
        Object.keys(normalized).forEach(key => {
            if (key.match(/^f\d+$/)) {
                delete normalized[key];
            }
        });
        
        return normalized;
    });
}

// Mapeo para el módulo de caja (procedure_module_dash_caja2)
export const normalizeResponseDashCaja = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    const mapResumen = (items: any[]) => {
        return items.map(item => ({
            total_ingresos_caja: parseFloat(item.f0 || 0),
            total_egresos_caja: parseFloat(item.f1 || 0),
            cantidad_movimientos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            total_ventas: parseFloat(item.f3 || 0),
            cantidad_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_efectivo: parseFloat(item.f5 || 0),
            total_tarjeta: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapUsuariosCaja = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            cantidad_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            cantidad_ventas_anuladas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            total_ventas_anuladas: parseFloat(item.f7 || 0)
        }));
    };
    
    const mapMetodosPagoUsuario = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idtipo_pago: parseInt(item.f2),
            tipo_pago: item.f3,
            img: item.f4,
            cantidad: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapMovimientosCajaUsuario = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idie_caja: parseInt(item.f2),
            fecha: item.f3,
            fecha_hora: item.f4,
            motivo: item.f5,
            monto: parseFloat(item.f6 || 0),
            tipo: parseInt(item.f7),
            tipo_descripcion: item.f8
        }));
    };
    
    const mapVentasEliminadasUsuario = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            usuario_nombre: item.f1,
            idregistro_pago: parseInt(item.f2),
            fecha: item.f3,
            fecha_hora: item.f4,
            total: parseFloat(item.f5 || 0),
            motivo_anular: item.f6,
            idusuario_permiso: item.f7 ? parseInt(item.f7) : null,
            usuario_autoriza_nombre: item.f8
        }));
    };
    
    const mapMetodosPago = (items: any[]) => {
        return items.map(item => ({
            idtipo_pago: parseInt(item.f0),
            tipo_pago: item.f1,
            img: item.f2,
            cantidad: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total: parseFloat(item.f4 || 0),
            porcentaje: parseFloat(item.f5 || 0)
        }));
    };
    
    const mapFlujoDiario = (items: any[]) => {
        return items.map(item => ({
            fecha: item.f0,
            idusuario: parseInt(item.f1),            
            ingresos: parseFloat(item.f2 || 0),
            egresos: parseFloat(item.f3 || 0),
            ventas: parseFloat(item.f4 || 0),
            saldo_neto: parseFloat(item.f5 || 0)
        }));
    };
    
    const mapComprobantes = (items: any[]) => {
        return items.map(item => ({
            idtipo_comprobante: item.f0 ? parseInt(item.f0) : null,
            des_comprobante: item.f1,
            img_comprobante: item.f2,
            cantidad: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total: parseFloat(item.f4 || 0),
            porcentaje: parseFloat(item.f5 || 0)
        }));
    };
    
    const mapVentasPorHora = (items: any[]) => {
        return items.map(item => ({
            hora: item.f0,
            cantidad_ventas: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            total_ventas: parseFloat(item.f2 || 0)
        }));
    };
    
    const mapTopProductos = (items: any[]) => {
        return items.map(item => ({
            idproducto: parseInt(item.f0),
            producto: item.f1,
            cantidad: typeof item.f2 === 'bigint' ? Number(item.f2) : parseFloat(item.f2 || 0),
            total: parseFloat(item.f3 || 0)
        }));
    };
    
    const mapMovimientos = (items: any[]) => {
        return items.map(item => ({
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
        }));
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
}

// Mapeo para el módulo de productos (procedure_module_dash_productos)
export const normalizeResponseDashProductos = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    const mapResumenProductos = (items: any[]) => {
        return items.map(item => ({
            total_productos_activos: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            valor_inventario_total: parseFloat(item.f1 || 0),
            productos_stock_critico: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            productos_stock_bajo: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            productos_sin_stock: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_alertas_stock: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0)
        }));
    };
    
    const mapTopVentasCantidadCarta = (items: any[]) => {
        return items.map(item => ({
            id: parseInt(item.f0),
            producto_nombre: item.f1,
            categoria: item.f2,
            seccion_nombre: item.f3,
            cantidad_vendida: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            numero_ventas: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            importe: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapTopVentasCantidadAlmacen = (items: any[]) => {
        return items.map(item => ({
            idproducto: parseInt(item.f0),
            almacen_nombre: item.f1,
            producto_nombre: item.f2,
            categoria: item.f3,
            cantidad_vendida: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            numero_ventas: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            importe: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapTopVentasIngresos = (items: any[]) => {
        return items.map(item => ({
            iditem: parseInt(item.f0),
            producto_nombre: item.f1,
            seccion_nombre: item.f2,            
            cantidad_vendida: typeof item.f3 === 'bigint' ? Number(item.f3) : parseFloat(item.f3 || 0),
            total_ingresos: parseFloat(item.f4 || 0),
            precio_promedio: parseFloat(item.f5 || 0),
            numero_ventas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }));
    };
    
    const mapProductosBajaRotacion = (items: any[]) => {
        return items.map(item => ({
            seccion: item.f0,
            producto_nombre: item.f1,
            precio: parseFloat(item.f2 || 0),
            cantidad_vendida: typeof item.f3 === 'bigint' ? Number(item.f3) : parseFloat(item.f3 || 0),
            numero_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ingresos: parseFloat(item.f5 || 0),
            dias_desde_ultima_venta: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }));
    };
    
    const mapInventarioAlertas = (items: any[]) => {
        return items.map(item => ({
            idproducto: parseInt(item.f0),
            producto_nombre: item.f1,
            precio_producto: parseFloat(item.f2 || 0),
            stock_actual: parseFloat(item.f3 || 0),
            stock_minimo: parseFloat(item.f4 || 0),
            valor_stock: parseFloat(item.f5 || 0),
            producto_familia: item.f6,
            nivel_alerta: item.f7,
            prioridad: parseInt(item.f8)
        }));
    };
    
    const mapInventarioAlertasPorciones = (items: any[]) => {
        return items.map(item => ({
            idporcion: parseInt(item.f0),
            porcion_nombre: item.f1,
            peso: parseFloat(item.f2 || 0),
            stock_actual: parseFloat(item.f3 || 0),
            nivel_alerta: item.f4,
            prioridad: parseInt(item.f5)
        }));
    };
    
    const mapRentabilidad = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapProductosAlmacenInSubitems = (items: any[]) => {
        const agrupado: { [key: number]: number } = {};
        
        // Recorrer todos los items
        items.forEach(item => {
            const idproductos = item.f1 || [];
            const cantidades = item.f2 || [];
            
            // Recorrer los arrays y sumar cantidades por idproducto
            idproductos.forEach((idproducto: number, index: number) => {
                const cantidad = cantidades[index] || 1;
                
                if (agrupado[idproducto]) {
                    agrupado[idproducto] += cantidad;
                } else {
                    agrupado[idproducto] = cantidad;
                }
            });
        });
        
        // Convertir el objeto agrupado a array
        return Object.keys(agrupado).map(idproducto => ({
            idproducto: parseInt(idproducto),
            cantidad: agrupado[parseInt(idproducto)]
        }));
    };
    
    const mapTopVentasPorciones = (items: any[]) => {
        return items.map(item => ({
            cantidad_vendida: typeof item.f0 === 'bigint' ? Number(item.f0) : parseFloat(item.f0 || 0),
            total: parseFloat(item.f1 || 0),
            descripcion_porcion: item.f2
        }));
    };
    
    const mapListNombreProductoSubitems = (items: any[]) => {
        return items.map(item => ({
            idproducto: parseInt(item.f0),
            des_producto: item.f1,
            des_almacen: item.f2
        }));
    };
    
    const mapPorcionesInSubitems = (items: any[]) => {
        const agrupado: { [key: number]: number } = {};
        
        // Recorrer todos los items
        items.forEach(item => {
            const idporciones = item.f1 || [];
            const cantidades = item.f2 || [];
            const cantidades_descuenta = item.f3 || [];
            
            // Recorrer los arrays y sumar cantidades por idporcion
            idporciones.forEach((idporcion: number, index: number) => {
                const cantidad = cantidades[index] || 1;
                const descuenta = cantidades_descuenta[index] || 1;

                const cantidad_total = cantidad * descuenta;
                
                if (agrupado[idporcion]) {
                    agrupado[idporcion] += cantidad_total;
                } else {
                    agrupado[idporcion] = cantidad_total;
                }
            });
        });
        
        // Convertir el objeto agrupado a array
        return Object.keys(agrupado).map(idporcion => ({
            idporcion: parseInt(idporcion),
            cantidad: agrupado[parseInt(idporcion)]
        }));
    };
    
    const mapListNombrePorcionesSubitems = (items: any[]) => {
        return items.map(item => ({
            idporcion: parseInt(item.f0),
            descripcion_porcion: item.f1
        }));
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

            const rpt = mapProductosAlmacenInSubitems(data);

            return rpt;
        case 'top_ventas_porciones':
            return mapTopVentasPorciones(data);
        case 'list_nombre_producto_subitems':
            return mapListNombreProductoSubitems(data);
        case 'porciones_in_subitems':

            const rptPorciones = mapPorcionesInSubitems(data);

            return rptPorciones;
        case 'list_nombre_porciones_subitems':
            return mapListNombrePorcionesSubitems(data);
        default:
            return data;
    }
}

// Mapeo para el módulo de clientes (procedure_module_dash_clientes)
export const normalizeResponseDashClientes = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    const mapResumenClientes = (items: any[]) => {
        return items.map(item => ({
            total_clientes_registrados: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            clientes_activos: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            clientes_mes_actual: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            clientes_semana_actual: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            clientes_nuevos: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            ticket_promedio_cliente: parseFloat(item.f5 || 0),
            total_ventas_clientes: parseFloat(item.f6 || 0),
            total_compras_clientes: typeof item.f7 === 'bigint' ? Number(item.f7) : parseInt(item.f7 || 0),
            compras_promedio_por_cliente: parseFloat(item.f8 || 0)
        }));
    };
    
    const mapListadoClientes = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapSegmentacion = (items: any[]) => {
        return items.map(item => ({
            segmento: item.f0,
            cantidad_clientes: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            total_ventas: parseFloat(item.f2 || 0),
            gasto_promedio_cliente: parseFloat(item.f3 || 0),
            total_compras: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            compras_por_cliente: parseFloat(item.f5 || 0)
        }));
    };
    
    const mapCreditosPendientes = (items: any[]) => {
        return items.map(item => ({
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
        }));
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
}

// Mapeo para el módulo de compras (procedure_module_dash_compras)
export const normalizeResponseDashCompras = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    const mapResumenCompras = (items: any[]) => {
        return items.map(item => ({
            total_compras_registradas: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            monto_total_compras_registradas: parseFloat(item.f1 || 0),
            monto_compras_contado: parseFloat(item.f2 || 0),
            monto_compras_credito: parseFloat(item.f3 || 0),
            saldo_pendiente_creditos: parseFloat(item.f4 || 0),
            monto_compras_no_registradas: parseFloat(item.f5 || 0),
            total_compras_no_registradas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            monto_total_compras_con_gastos: parseFloat(item.f7 || 0),
            ticket_promedio_compra: parseFloat(item.f8 || 0)
        }));
    };
    
    const mapListadoCompras = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapListadoProveedores = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapTopProductos = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapEvolucionDiariaCompras = (items: any[]) => {
        return items.map(item => ({
            fecha: item.f0,
            cantidad_compras: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            monto_total: parseFloat(item.f2 || 0),
            monto_contado: parseFloat(item.f3 || 0),
            monto_credito: parseFloat(item.f4 || 0)
        }));
    };
    
    const mapDetalleCompra = (items: any[]) => {
        return items.map(item => ({
            iddetalle_compra: parseInt(item.f0),
            idcompra: parseInt(item.f1),
            idproducto: parseInt(item.f2),
            producto_nombre: item.f3,
            cantidad: typeof item.f4 === 'bigint' ? Number(item.f4) : parseFloat(item.f4 || 0),
            precio_unitario: parseFloat(item.f5 || 0),
            subtotal: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapProveedoresActivos = (items: any[]) => {
        return items.map(item => ({
            idproveedor: parseInt(item.f0),
            descripcion: item.f1,
            dni: item.f2,
            telefono: item.f3,
            direccion: item.f4,
            email: item.f5,
            compras_periodo: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0),
            monto_periodo: parseFloat(item.f7 || 0)
        }));
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
}

// Mapeo para el módulo de usuarios (procedure_module_dash_usuarios)
export const normalizeResponseDashUsuarios = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    const mapResumenUsuarios = (items: any[]) => {
        return items.map(item => ({
            total_usuarios: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
            usuarios_activos: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            usuarios_caja_activos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            usuarios_meseros_activos: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0),
            total_transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            promedio_ventas_por_usuario: parseFloat(item.f6 || 0),
            ticket_promedio: parseFloat(item.f7 || 0)
        }));
    };
    
    const mapUsuariosCaja = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapUsuariosMeseros = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapDistribucionRoles = (items: any[]) => {
        return items.map(item => ({
            cargo: item.f0,
            cantidad_usuarios: typeof item.f1 === 'bigint' ? Number(item.f1) : parseInt(item.f1 || 0),
            usuarios_activos: typeof item.f2 === 'bigint' ? Number(item.f2) : parseInt(item.f2 || 0),
            usuarios_con_ventas: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0),
            total_transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0)
        }));
    };
    
    const mapTopVendedoresCaja = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            ticket_promedio: parseFloat(item.f6 || 0)
        }));
    };
    
    const mapTopMeseros = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            pedidos: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            transacciones: typeof item.f5 === 'bigint' ? Number(item.f5) : parseInt(item.f5 || 0),
            total_ventas: parseFloat(item.f6 || 0),
            ticket_promedio: parseFloat(item.f7 || 0)
        }));
    };
    
    const mapEvolucionDiariaCaja = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            fecha: item.f2,
            transacciones: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            total_ventas: parseFloat(item.f4 || 0)
        }));
    };
    
    const mapEvolucionDiariaMeseros = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            fecha: item.f2,
            pedidos: typeof item.f3 === 'bigint' ? Number(item.f3) : parseInt(item.f3 || 0),
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0)
        }));
    };
    
    const mapComparativaUsuarios = (items: any[]) => {
        return items.map(item => ({
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
        }));
    };
    
    const mapBajoRendimiento = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            transacciones: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
            total_ventas: parseFloat(item.f5 || 0),
            promedio_general: parseFloat(item.f6 || 0),
            porcentaje_vs_promedio: parseFloat(item.f7 || 0)
        }));
    };
    
    const mapListadoCompleto = (items: any[]) => {
        return items.map(item => ({
            idusuario: parseInt(item.f0),
            nombres: item.f1,
            usuario: item.f2,
            cargo: item.f3,
            estado: parseInt(item.f4),
            ultima_actividad: item.f5,
            dias_sin_actividad: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
        }));
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
}

// Mapeo para el módulo de punto de equilibrio
// Nota: Prisma devuelve columnas como f0, f1, f2... desde stored procedures
export const normalizeResponseDashPuntoEquilibrio = (data: any[], tipo_consulta: string) => {
    if (!data || data.length === 0) return [];
    
    // Helper para convertir bigint a number
    const toNumber = (val: any): number => {
        if (typeof val === 'bigint') return Number(val);
        if (typeof val === 'number') return val;
        return parseFloat(val) || 0;
    };
    
    // Mapeo para resumen principal
    // f0: total_ventas, f1: cantidad_ventas, f2: otros_ingresos, 
    // f3: total_compras, f4: cantidad_compras, f5: gastos_fijos, f6: gastos_variables
    const mapResumen = (items: any[]) => {
        return items.map(item => {
            const totalVentas = toNumber(item.f0);
            const cantidadVentas = toNumber(item.f1);
            const otrosIngresos = toNumber(item.f2);
            const totalCompras = toNumber(item.f3);
            const cantidadCompras = toNumber(item.f4);
            const gastosFijos = toNumber(item.f5);
            const gastosVariables = toNumber(item.f6);
            
            const totalIngresos = totalVentas + otrosIngresos;
            const totalEgresos = totalCompras + gastosFijos + gastosVariables;
            const utilidad = totalIngresos - totalEgresos;
            const margenUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;
            
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
    const mapEvolucionMensual = (items: any[]) => {
        return items.map(item => {
            const ventas = toNumber(item.f3);
            const otrosIngresos = toNumber(item.f4);
            const compras = toNumber(item.f5);
            const gastosFijos = toNumber(item.f6);
            const gastosVariables = toNumber(item.f7);
            const totalIngresos = toNumber(item.f8);
            const totalEgresos = toNumber(item.f9);
            const balance = toNumber(item.f10);
            
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
    const mapResumenCategorias = (items: any[]) => {
        return items.map(item => ({
            categoria: item.f0,
            tipo: item.f1,
            total: toNumber(item.f2),
            cantidad: toNumber(item.f3)
        }));
    };
    
    // Mapeo para detalle de gastos fijos
    // f0: id, f1: concepto, f2: tipo_gasto, f3: importe, f4: fecha_pago, f5: cuota, f6: documento
    const mapDetalleGastosFijos = (items: any[]) => {
        return items.map(item => ({
            id: toNumber(item.f0),
            concepto: item.f1,
            tipo_gasto: item.f2,
            importe: toNumber(item.f3),
            fecha_pago: item.f4,
            cuota: item.f5,
            documento: item.f6
        }));
    };
    
    // Mapeo para detalle de gastos variables
    // f0: id, f1: concepto, f2: tipo_gasto, f3: importe, f4: fecha_pago, f5: fecha_registro
    const mapDetalleGastosVariables = (items: any[]) => {
        return items.map(item => ({
            id: toNumber(item.f0),
            concepto: item.f1,
            tipo_gasto: item.f2,
            importe: toNumber(item.f3),
            fecha_pago: item.f4,
            fecha_registro: item.f5
        }));
    };
    
    // Mapeo para ingresos diarios
    // f0: dia, f1: fecha, f2: ingreso_dia, f3: ingreso_acumulado
    const mapIngresosDiarios = (items: any[]) => {
        return items.map(item => ({
            dia: toNumber(item.f0),
            fecha: item.f1,
            ingreso_dia: toNumber(item.f2),
            ingreso_acumulado: toNumber(item.f3)
        }));
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
}

// Mapeo para comparar locales/sedes
export const normalizeResponseCompararLocales = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
        idsede: typeof item.f0 === 'bigint' ? Number(item.f0) : parseInt(item.f0 || 0),
        nombre_sede: item.f1,
        fecha: item.f2,
        total_ventas: parseFloat(item.f3 || 0),
        cantidad_ventas: typeof item.f4 === 'bigint' ? Number(item.f4) : parseInt(item.f4 || 0),
        total_anulado: parseFloat(item.f5 || 0),
        cantidad_anuladas: typeof item.f6 === 'bigint' ? Number(item.f6) : parseInt(item.f6 || 0)
    }));
}

// Mapeo para el módulo de promociones y cupones (procedure_dash_promociones_cupones)
export const normalizeResponseDashPromocionesCupones = (data: any, tipo_consulta: string) => {
    if (!data) return tipo_consulta === 'all' ? { cupones: [], promociones: [], promociones_detalle: [], descuentos: [] } : [];

    const toNumber = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'bigint') return Number(val);
        if (typeof val === 'number') return val;
        const n = parseFloat(val);
        return Number.isFinite(n) ? n : 0;
    };

    const toInt = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'bigint') return Number(val);
        const n = parseInt(val, 10);
        return Number.isFinite(n) ? n : 0;
    };

    const toBoolNumber = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (typeof val === 'bigint') return Number(val);
        if (val === '1' || val === 1) return 1;
        return 0;
    };

    // Mapeo cupones: f0=idcupon, f1=titulo, f2=descripcion, f3=fecha_inicio, f4=fecha_termina,
    // f5=idsede, f6=activo, f7=estado, f8=cantidad_maxima, f9=cantidad_activado, f10=cantidad_emitido,
    // f11=importe_minimo, f12=is_automatico, f13=cupon_manual, f14=solo_clientes, f15=codigos_generados,
    // f16=codigos_usados, f17=tasa_canje, f18=estado_calculado
    const mapCupones = (items: any[]) => {
        if (!items || items.length === 0) return [];
        return items.map(item => ({
            idcupon: toInt(item.f0),
            titulo: item.f1,
            descripcion: item.f2,
            fecha_inicio: item.f3,
            fecha_termina: item.f4,
            idsede: toInt(item.f5),
            activo: toBoolNumber(item.f6),
            estado: item.f7,
            cantidad_maxima: toInt(item.f8),
            cantidad_activado: toInt(item.f9),
            cantidad_emitido: toInt(item.f10),
            importe_minimo: toNumber(item.f11),
            is_automatico: toBoolNumber(item.f12),
            cupon_manual: toBoolNumber(item.f13),
            solo_clientes: toBoolNumber(item.f14),
            codigos_generados: toInt(item.f15),
            codigos_usados: toInt(item.f16),
            tasa_canje: toNumber(item.f17),
            estado_calculado: item.f18
        }));
    };

    // Mapeo promociones: f0=idpromocion, f1=idsede, f2=estado, f3=activo, f4=fecha_registro,
    // f5=tipo_promocion, f6=titulo, f7=descripcion, f8=fecha_inicio, f9=fecha_fin,
    // f10=hora_inicio, f11=hora_fin, f12=dias_semana, f13=solo_app, f14=cantidad_items, f15=estado_calculado
    const mapPromociones = (items: any[]) => {
        if (!items || items.length === 0) return [];
        return items.map(item => ({
            idpromocion: toInt(item.f0),
            idsede: toInt(item.f1),
            estado: item.f2,
            activo: toBoolNumber(item.f3),
            fecha_registro: item.f4,
            tipo_promocion: item.f5,
            titulo: item.f6,
            descripcion: item.f7,
            fecha_inicio: item.f8,
            fecha_fin: item.f9,
            hora_inicio: item.f10,
            hora_fin: item.f11,
            dias_semana: item.f12,
            solo_app: toBoolNumber(item.f13),
            cantidad_items: toInt(item.f14),
            estado_calculado: item.f15
        }));
    };

    // Mapeo promociones_detalle: f0=idpromocion_detalle, f1=idpromocion, f2=tipo, f3=descripcion,
    // f4=porc_descuento, f5=cantidad, f6=precio, f7=precio_final
    const mapPromocionesDetalle = (items: any[]) => {
        if (!items || items.length === 0) return [];
        return items.map(item => ({
            idpromocion_detalle: toInt(item.f0),
            idpromocion: toInt(item.f1),
            tipo: item.f2,
            descripcion: item.f3,
            porc_descuento: toNumber(item.f4),
            cantidad: toNumber(item.f5),
            precio: toNumber(item.f6),
            precio_final: toNumber(item.f7)
        }));
    };

    // Mapeo descuentos: f0=idtipo_descuento, f1=tipo_descuento, f2=cantidad_usos, f3=total_descuento
    const mapDescuentos = (items: any[]) => {
        if (!items || items.length === 0) return [];
        return items.map(item => ({
            idtipo_descuento: toInt(item.f0),
            tipo_descuento: item.f1,
            cantidad_usos: toInt(item.f2),
            total_descuento: toNumber(item.f3)
        }));
    };

    if (tipo_consulta === 'all') {
        const r0 = Array.isArray(data?.[0]) ? data[0] : [];
        const r1 = Array.isArray(data?.[1]) ? data[1] : [];
        const r2 = Array.isArray(data?.[2]) ? data[2] : [];
        const r3 = Array.isArray(data?.[3]) ? data[3] : [];

        return {
            cupones: mapCupones(r0),
            promociones: mapPromociones(r1),
            promociones_detalle: mapPromocionesDetalle(r2),
            descuentos: mapDescuentos(r3)
        };
    }

    const items = Array.isArray(data) ? data : (Array.isArray(data?.[0]) ? data[0] : []);
    switch (tipo_consulta) {
        case 'cupones':
            return mapCupones(items);
        case 'promociones':
            return mapPromociones(items);
        case 'promociones_detalle':
            return mapPromocionesDetalle(items);
        case 'descuentos':
            return mapDescuentos(items);
        default:
            return items;
    }
};
