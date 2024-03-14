
export interface Subtotal {
    "id": 0,
    "quitar": false,
    "importe": '',
    "tachado": false,
    "visible": true,
    "esImpuesto": 0,
    "descripcion": "",
    "visible_cpe": true
}

class PedidoServices {
    private arrReglasCarta: any = [];
    private arrSeccionesPedido: any = [];
    // private apiMaps = new ApiMaps();
    constructor() {
    }

    setRules(arrReglasCarta: any) {
        this.arrReglasCarta = arrReglasCarta
    }

    cocinarPedido(seccionMasItems: any, itemsFromBot: any) {        
        this.setDescripcionCantidadItems(seccionMasItems, itemsFromBot)
        this.validarReglasCarta(this.arrReglasCarta.reglas, seccionMasItems)
        return seccionMasItems
    }

    setCanalConsumo(canalFromBot: any, listCanalConsumo: any[], seccionMasItems: any) {                
        let canalSeleted = listCanalConsumo.find((canal: any) => canal.idtipo_consumo === canalFromBot.idtipo_consumo)    
        
        if ( !canalSeleted ) {
            // buscamos por el nombre
            canalSeleted = listCanalConsumo.find((canal: any) => canal.descripcion.toLowerCase() === canalFromBot.descripcion.toLowerCase())
        }
        
        canalSeleted.secciones = seccionMasItems;
        return canalSeleted;
    }

    private setDescripcionCantidadItems(seccionMasItems: any, itemsFromBot: any) {        
        try {
            
            seccionMasItems.map((seccion: any) => {
                seccion.items.map((item: any) => {
                    const itemFromBot = itemsFromBot.find((item_: any) => item_.iditem === item.iditem)
                    const _precionTotal = item.precio_unitario * itemFromBot.cantidad;
                    item.descripcion = itemFromBot.descripcion
                    item.descripcion = itemFromBot.indicaciones ? itemFromBot.indicaciones !== '' ? `${itemFromBot.descripcion} (${itemFromBot.indicaciones})` : itemFromBot.descripcion : itemFromBot.descripcion;
                    item.indicaciones = itemFromBot?.indicaciones || '';
                    item.cantidad_seleccionada = itemFromBot.cantidad
                    item.precio_total = _precionTotal
                    item.precio_total_calc = _precionTotal
                    item.precio_print = _precionTotal
                })
            })
        } catch (error) {
            console.log('error setDescripcionCantidadItems', error);
        }        
    }

    // rules = this.arrReglasCarta.reglas
    private validarReglasCarta(rules: any[], seccionMasItems: any): any {        
        if (rules === null) return;
        // let diferencia = 0;

        this.arrSeccionesPedido = seccionMasItems;
        let xSecc_bus = 0;
        let xSecc_detalle = 0;
        let xCantidadBuscar = 0;
        let xCantidadBuscarSecc_detalle = 0;
        let diferencia = 0;

        let xPrecio_item_bus = 0;
        let xPrecio_mostrado = 0; // preciounitario * cantidad precio_total_cal

        // reset precio_total_calc -> precio_total;
        // seccionMasItems.map((z: any) => {
        //     z.items.map((n: any) => {
        //         console.log('=== 1 item ===', n);
        //     });
        // });            
        
        rules.map((regla: any) => {
            xSecc_bus = regla.idseccion;
            xSecc_detalle = regla.idseccion_detalle;
            xCantidadBuscar = this.getCantidadItemsFromSeccion(xSecc_bus);
            xCantidadBuscarSecc_detalle = this.getCantidadItemsFromSeccion(xSecc_detalle);

            diferencia = xCantidadBuscar - xCantidadBuscarSecc_detalle;
            diferencia = diferencia < 0 ? xCantidadBuscar : diferencia; // no valores negativos

            

            seccionMasItems
                        .filter((z: any) => z.idseccion.toString() === xSecc_detalle.toString())
                        .map((z: any) => {
                            z.items
                                .map((n: any) => {
                                    // console.log('=== init item ===', n);
                                    const precioUnitario_item = parseFloat(n.precio);
                                    const cant_item = n.cantidad_seleccionada;

                                    xPrecio_mostrado = n.precio_total_calc !== null ? n.precio_total_calc : n.precio_total;
                                    xPrecio_item_bus = xPrecio_mostrado;

                                    // console.log('=== xCantidadBuscar ===', xCantidadBuscar);
                                    // console.log('=== xCantidadBuscarSecc_detalle ===', xCantidadBuscarSecc_detalle);                                    

                                    if (xCantidadBuscar >= xCantidadBuscarSecc_detalle) {
                                        xPrecio_item_bus = 0;
                                    } else if (diferencia > 0) {
                                        xPrecio_item_bus = diferencia * precioUnitario_item;
                                        xPrecio_item_bus = xPrecio_mostrado - xPrecio_item_bus; // descuenta del precio que se muestra en pantalla( precio que ya fue procesado)
                                        xPrecio_item_bus = xPrecio_item_bus < 0 ? 0 : xPrecio_item_bus;

                                        diferencia = diferencia - cant_item < 0 ? 0 : diferencia - cant_item;
                                    }

                                    // console.log('=== xPrecio_item_bus ===', xPrecio_item_bus);
                                    // console.log('=== cant_item ===', cant_item);

                                    n.precio_total_calc = parseFloat(xPrecio_item_bus.toString()); //
                                    n.precio_print = parseFloat(xPrecio_item_bus.toString()); //
                                    n.cantidad_descontado = cant_item;

                                    // console.log('=== final item ===', n);
                                });
                        });

            // seccionMasItems.map((z: any) => {
            //     z.items.map((n: any) => {
            //         console.log('=== item ===', n);
            //     });
            // })
        });
    }


    private getCantidadItemsFromSeccion(idseccion: number) {
        let total = 0;
        this.arrSeccionesPedido.map((z: any) => {
            if (z.idseccion === idseccion) {
                z.items.map((n: any) => {
                    total += parseFloat(n.cantidad_seleccionada);
                });
            }
        });
        return total;
    }

    // calcular costo de entrega si es delivery
    // async calcCostoEntrega(datos_entrega: any, coordenadasSede:any, parametros: any) {     
    //     // const _coordenadasCliente = `${datos_entrega.latitude}, ${datos_entrega.longitude}`
    //     // const _coordenadasSede = `${coordenadasSede.latitude}, ${coordenadasSede.longitude}`
    //     const distancia = datos_entrega.direccion?.distance || 1
    //     const _arrCostoEntrega = await this.apiMaps.getSubtotaCostoEntrega(distancia, parametros)          
    //     return _arrCostoEntrega;
    // }    

    // obterner costos no impuestos por idseccion
    private getCostosAdicionalesPorSeccion(idseccion: number, idtipo_consumo: number) {
        return this.arrReglasCarta.subtotales.filter((item: any) => item.es_impuesto === 0 && item.idseccion === idseccion && item.idtipo_consumo === idtipo_consumo  )
    }

     // obtener el subtotal de los items del pedido
    private getTotalItemsPedido(arrSeccionesPedido: any[]) {
        let total = 0        
        for (let seccion of arrSeccionesPedido) {
            for (let item of seccion.items) {                
                total += parseFloat(item.precio_print);
            }
        }        
        return total
    }

    private xCalcMontoBaseIGV(importeTotal: any, procentaje_IGV: any) {
        return (parseFloat(importeTotal) / (1 + (procentaje_IGV / 100)));
    }

    getArraySubtotal(seccionMasItems: any, idtipo_consumo: number, arrSubtotalCostoEntega: any){
        let importeCostosAdicionales = 0
        let arrSubtotales: any = []
        //

        // costos adicionales a nivel pedido (delivery, servicios, etc)        
        const _arrCostosNivelPedido = this.arrReglasCarta.subtotales.filter((item: any) => item.es_impuesto === 0 && item.idtipo_consumo === idtipo_consumo && item.nivel === 1)        
        _arrCostosNivelPedido.map((c: any) => {
            const _idSubtotal = `${c.tipo}${c.id}` 
            const _costoXcantidad = parseFloat(c.monto)
            const _subtotal: any = arrSubtotales.find((s: Subtotal) => s.descripcion.toLowerCase().trim() === c.descripcion.toLowerCase().trim())

            // si en la reglas incluye delivery, costo de entrega, entrega, envio ya no lo ponemos en el subtotal
            const exclusiones = ['delivery', 'entrega', 'envio'];

            if (exclusiones.some(exclusion => c.descripcion.toLowerCase().trim().includes(exclusion))) {
                // continuar
                return
            }

            if (_subtotal) {
                _subtotal.importe = (parseFloat(_subtotal.importe) + _costoXcantidad).toFixed(2)
            } else {

                arrSubtotales.push({
                    id: _idSubtotal,
                    quitar: true,
                    importe: _costoXcantidad.toFixed(2),
                    tachado: false,
                    visible: true,
                    esImpuesto: 0,
                    descripcion: c.descripcion,
                    visible_cpe: false
                })
            }
        })
    

        // costos adicionales  a nivel items
        seccionMasItems.map((item: any) => {
            let costosAdicionales = this.getCostosAdicionalesPorSeccion(item.idseccion, idtipo_consumo)
            // console.log('costosAdicionales', costosAdicionales);
            costosAdicionales.map((c: any) => {
                // si el nivel es 0 se multiplica por la cantidad de items de la seccion
                // console.log('c', c);
                // console.log('seccion', item);
                const _idSubtotal = `${c.tipo}${c.id}`
                const _totalItemsSeccion = item.totalItems || item.count_items;
                const _costoXcantidad = c.nivel === 0 ? parseFloat(c.monto) * _totalItemsSeccion : parseFloat(c.monto)

                // buscamos si ya existe el subtotal
                const _subtotal = arrSubtotales.find((s: Subtotal) => s.descripcion.toLowerCase().trim() === c.descripcion.toLowerCase().trim())
                if (_subtotal) {
                    _subtotal.importe = (parseFloat(_subtotal.importe) + _costoXcantidad).toFixed(2)
                } else {

                    arrSubtotales.push({
                        id: _idSubtotal,
                        quitar: true,
                        importe: _costoXcantidad.toFixed(2),
                        tachado: false,
                        visible: true,
                        esImpuesto: 0,
                        descripcion: c.descripcion,
                        visible_cpe: false
                    })
                }

                importeCostosAdicionales += _costoXcantidad
            })
        })

        let totalItemsPedido = this.getTotalItemsPedido(this.arrSeccionesPedido)
        let importeSubTotal = totalItemsPedido;
       

       
        // console.log('importeSubTotal', importeSubTotal);

        // total en productos
        let rowSubtotalProductos = {
            id: 0,
            quitar: false,
            importe: importeSubTotal.toFixed(2),
            tachado: false,
            visible: true,
            esImpuesto: 0,
            descripcion: "SUB TOTAL",
            visible_cpe: true
        }

        // console.log('rowSubtotalProductos',rowSubtotalProductos);

        arrSubtotales.unshift(rowSubtotalProductos)

        // array delivery calculado segun la distancia
        if (arrSubtotalCostoEntega) {            
            arrSubtotales.splice(1, 0, arrSubtotalCostoEntega)
        }

        
        
        // totoal arrSubtotales antes de impuestos
        // console.log('arrSubtotales', arrSubtotales);
        let totalSubtotales = arrSubtotales.map((x: any) => parseFloat(x.importe)).reduce((a: number, b: number) => a + b, 0)

        // console.log('totalSubtotales', totalSubtotales);
        


        // agregar solo el igv sobre el total
        let rowIGVAdd: any = null
        const rowIGV = this.arrReglasCarta.subtotales.filter((item: any) => item.es_impuesto === 1 && item.descripcion.toLowerCase().trim() === 'i.g.v')[0] || []
        const rowSubtotal = rowSubtotalProductos // arrSubtotales.filter((item: any) => item.descripcion.toLowerCase().trim() === 'sub total')[0] || []
        let _importeIGV = parseFloat(rowIGV.monto)
        importeSubTotal = parseFloat(rowSubtotal.importe)
    
        if (_importeIGV > 0) {
            importeSubTotal = this.xCalcMontoBaseIGV(totalSubtotales, _importeIGV)
            _importeIGV = totalSubtotales - importeSubTotal
            // rowIGV.importe = _importeIGV.toFixed(2)      

            rowSubtotal.importe = importeSubTotal.toFixed(2)

            rowIGVAdd = {
                id: rowIGV.id,
                quitar: false,
                importe: _importeIGV.toFixed(2),
                tachado: false,
                visible: true,
                esImpuesto: 1,
                descripcion: rowIGV.descripcion,
                visible_cpe: true
            }
        }

        // si existe igv agrega despues del subtotal
        if (rowIGVAdd) {
            arrSubtotales.splice(1, 0, rowIGVAdd)
        }

        // total despues de impuestos
        // totalSubtotales = arrSubtotales.map(x => x.importe).reduce((a, b) => parseFloat(a) + parseFloat(b), 0)

        arrSubtotales.push({
            id: 0,
            quitar: false,
            importe: totalSubtotales.toFixed(2),
            tachado: false,
            visible: true,
            esImpuesto: 0,
            descripcion: "TOTAL",
            visible_cpe: true
        })
                
        return arrSubtotales;
    }

    getResumenPedidoShowCliente(seccionMasItems: any, canal_consumo: any, arrSubtotales: any) {
        // esta funcion mostrar el resumen del pedido como si fuera un ticket impreso.
        // el formato a utiliza es cantidad, descripcion (indicaciones), precio y los totales                
        
        let stringFormatted = '';
        let totalItemsPedido = arrSubtotales[arrSubtotales.length - 1].importe;
        // console.log('totalItemsPedido', totalItemsPedido);
        // let importeSubTotal = totalItemsPedido;
        
        // canal de consumo
        stringFormatted += `Pedido *${canal_consumo.descripcion}*\n`
        stringFormatted += `El importe total es *${totalItemsPedido}*\n\n`

        

        // el resumen de productos segun el formato anterior
        let newItem = { descripcion: '', importe: '' }
        seccionMasItems.map((seccion: any) => {
            newItem.descripcion = `*${seccion.des.toUpperCase()}*`
            newItem.importe = '.'

            const _tituloSeccion = [newItem]
            let listItemSesccion: any = []

            stringFormatted += this.formatPadArrayToString(_tituloSeccion, false)


            seccion.items.map((item: any) => {                
                const _newItem = { descripcion: `${item.cantidad_seleccionada} ${item.des}`, importe: parseFloat(item.precio_print).toFixed(2).toString() } 
                listItemSesccion.push(_newItem)
            })
            

            stringFormatted += this.formatPadArrayToString(listItemSesccion, true)
        })        
        
        // los subtotales todo los que venta en arrSubtotales
        stringFormatted += '\n'
        let listItemSubtotales: any = []
        arrSubtotales.map((item: any) => {
            // console.log('item subtotal', item);
            const _newItem = { descripcion: `${item.descripcion}`, importe: parseFloat(item.importe).toFixed(2).toString() } 
            listItemSubtotales.push(_newItem)
        })

        stringFormatted += this.formatPadArrayToString(listItemSubtotales, true);

        return stringFormatted;

    }

    private formatPadArrayToString(data: any, isConPuntos = true) {
        let stringFormatted = '';
        const maxLength = 55; // Longitud máxima de la línea
        const maxDescripcionLength = 27; // Nueva longitud máxima para la descripción

        const _separacion = isConPuntos ? '..' : ' '

        data.forEach((item: any) => {            
            let descripcion = item.descripcion;
            if (isConPuntos && descripcion.length > maxDescripcionLength) {
                descripcion = descripcion.substring(0, maxDescripcionLength - 3) + '...';
            }

            const lentghDescripcion = descripcion.length;
            const lentghImporte = item.importe.length;
            const espacioDerecha = maxLength - (lentghDescripcion);
            const conceptoFormatted = descripcion.toLowerCase().padEnd(espacioDerecha, _separacion);
            const montoFormatted = item.importe.padStart(5, ' ');

            stringFormatted += `${conceptoFormatted}${montoFormatted}\n`;
        });


        return stringFormatted
    }

    async calcularTotalPedido(secciones:any, tipo_entrega: any, datos_entrega: any): Promise<any> {     
        let arrTotales: any = null;   
        let arrSubtotalCostoEntega = null;
        if ( tipo_entrega.descripcion.toLowerCase() === 'delivery' ) {            

            arrSubtotalCostoEntega = this.getSubtotalCostoEntrega(datos_entrega)
        }

        arrTotales = this.getArraySubtotal(secciones, tipo_entrega.idtipo_consumo, arrSubtotalCostoEntega)                
        return arrTotales;
    }

    
    private getSubtotalCostoEntrega(datosEntrega: any) {
        let deliveryCost = datosEntrega.delivery_cost;
        let distance = datosEntrega.distance;

        let subtotalCostoEntrega = {
            id: 0,
            quitar: true,
            importe: parseFloat(deliveryCost).toFixed(2),
            tachado: false,
            visible: true,
            esImpuesto: 0,
            descripcion: "Costo de entrega",
            visible_cpe: false,
            distancia_km: distance,
            success: true
        };

        return subtotalCostoEntrega;
    }
    
    
}

export default PedidoServices;