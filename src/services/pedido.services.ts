
export interface Subtotal {
    "id": 0,
    "quitar": false,
    "importe": '',
    "visible": true,
    "esImpuesto": 0,
    "descripcion": "",
    "visible_cpe": true
}

/**
 * ¿Esta descripción de subtotal ES el costo de envío del pedido?
 * Estricto por primera palabra: "DELIVERY", "COSTO DELIVERY", "Costo de
 * entrega", "ENVÍO A DOMICILIO" → sí. "TAPER DELIVERY", "SET DELIVERY" → NO
 * (son cobros aparte que solo contienen la palabra; caso real: la sede Bacs
 * Burguer perdía el cobro del taper porque el includes() lo confundía con la
 * fila de delivery y la lógica lo eliminaba/renombraba).
 */
export const esFilaCostoDelivery = (descripcion: any): boolean => {
    const norm = String(descripcion || '').toLowerCase()
        .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
        .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').trim();
    const palabras = norm.split(/\s+/);
    const conceptos = ['delivery', 'envio', 'entrega'];
    if (conceptos.includes(palabras[0])) return true;             // "delivery", "envio a domicilio"
    if (palabras[0] === 'costo' && conceptos.some((c) => norm.includes(c))) return true; // "costo delivery", "costo de entrega"
    return false;
};

class PedidoServices {
    private arrReglasCarta: any = [];
    private arrSeccionesPedido: any = [];
    // private apiMaps = new ApiMaps();
    constructor() {
    }

    setRules(arrReglasCarta: any) {
        // 'reglas' y/o 'subtotales' pueden venir null (sede sin reglas de carta
        // o sin config de impresión). Normalizamos a [] para no romper el pipeline.
        const r = arrReglasCarta && typeof arrReglasCarta === 'object' ? arrReglasCarta : {};
        this.arrReglasCarta = {
            ...r,
            reglas: Array.isArray(r.reglas) ? r.reglas : [],
            subtotales: Array.isArray(r.subtotales) ? r.subtotales : [],
        };
    }

    cocinarPedido(seccionMasItems: any, itemsFromBot: any) {        
        seccionMasItems = this.setDescripcionCantidadItems(seccionMasItems, itemsFromBot)
        this.arrSeccionesPedido = seccionMasItems; // Asignar antes de validar reglas
        seccionMasItems = this.validarReglasCarta(this.arrReglasCarta.reglas, seccionMasItems)
        return seccionMasItems
    }

    setCanalConsumo(canalFromBot: any, listCanalConsumo: any[], seccionMasItems: any) {
        // normaliza: minusculas, sin acentos, trim. Tolera nombres distintos por sede.
        const norm = (s: any) => (s || '').toString().toLowerCase()
            .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
            .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').trim();
        const pedido = norm(canalFromBot.descripcion);
        const wantsDelivery = pedido.includes('delivery');
        const wantsLlevar = pedido.includes('llevar') || pedido.includes('recoj') || pedido.includes('recog');
        const wantsLocal = pedido.includes('local') || pedido.includes('mesa') || pedido.includes('salon');

        // 1) por id si viniera; 2) por keyword tolerante; 3) por nombre exacto normalizado
        let canalSeleted = listCanalConsumo.find((c: any) => c.idtipo_consumo === canalFromBot.idtipo_consumo);
        if (!canalSeleted) {
            canalSeleted = listCanalConsumo.find((c: any) => {
                const d = norm(c.descripcion);
                if (wantsDelivery) return d.includes('delivery');
                if (wantsLlevar) return d.includes('llevar') || d.includes('recoj');
                if (wantsLocal) return d.includes('local') || d.includes('mesa') || d.includes('salon');
                return d === pedido;
            });
        }

        if (!canalSeleted) {
            throw new Error(`Canal de consumo no encontrado: ${canalFromBot.descripcion}. Canales disponibles: ${listCanalConsumo.map((c: any) => c.descripcion).join(', ')}`);
        }

        canalSeleted.secciones = seccionMasItems;
        return canalSeleted;
    }

    private setDescripcionCantidadItems(seccionMasItems: any, itemsFromBot: any) {
        try {

            seccionMasItems.map((seccion: any) => {
                seccion.items.map((item: any) => {
                    // Number(): el iditem viaja como string por un lado (bot / JSON) y
                    // como number por el otro (get-seccion-items). Con === estricto el
                    // find devolvía undefined, el `.cantidad` lanzaba y el catch vacío
                    // se lo tragaba: TODOS los items siguientes se quedaban sin precio
                    // en silencio. Ahora un item sin match se salta y los demás siguen.
                    const itemFromBot = itemsFromBot.find((item_: any) => Number(item_.iditem) === Number(item.iditem))
                    if (!itemFromBot) return;
                    // Sobreprecio de las opciones/seleccionables (pizza mediana, extra
                    // queso...). Entra ACÁ, antes de validarReglasCarta, para que las
                    // reglas de carta descuenten sobre la base correcta y para que
                    // precio_total / precio_total_calc / precio_print (ticket, resumen,
                    // comprobante) y getTotalItemsPedido queden cuadrados solos.
                    // Carta plana: el campo no viene → 0 → resultado idéntico al de hoy.
                    //
                    // Cuadre con procedure_pwa_pedido_guardar: el SP emite una fila por
                    // elemento de subitems_view con punitario = elemento.precio /
                    // cantidad_seleccionada + precio_plato, así que
                    //   Σ(elemento.precio + precio_plato*cant_sel) + remanente*precio_plato
                    //   = sobreprecio_total + precio_plato*cantidad_total = _precionTotal.
                    const _sobreprecio = Number(itemFromBot.sobreprecio_total) || 0;
                    const _precionTotal = item.precio_unitario * itemFromBot.cantidad + _sobreprecio;
                    item.descripcion = itemFromBot.descripcion
                    item.descripcion = itemFromBot.indicaciones ? itemFromBot.indicaciones !== '' ? `${itemFromBot.descripcion} (${itemFromBot.indicaciones})` : itemFromBot.descripcion : itemFromBot.descripcion;
                    item.indicaciones = itemFromBot?.indicaciones || '';
                    item.cantidad_seleccionada = itemFromBot.cantidad
                    item.precio_total = _precionTotal
                    item.precio_total_calc = _precionTotal
                    item.precio_print = _precionTotal
                    // Solo se agrega la clave cuando hay opciones: sin ella el item
                    // cocinado queda byte-idéntico al de las cartas planas de hoy.
                    if (itemFromBot.subitems_view?.length) item.subitems_view = itemFromBot.subitems_view;
                })
            })
        } catch (error) {

        }

        return seccionMasItems;
    }

    // rules = this.arrReglasCarta.reglas
    private validarReglasCarta(rules: any[], seccionMasItems: any): any {
        // sin reglas: devolvemos las secciones tal cual (antes devolvía undefined
        // y se perdía el pedido → crash posterior).
        if (!Array.isArray(rules) || rules.length === 0) return seccionMasItems;
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

        return seccionMasItems;
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

            // Si la regla ES el costo de delivery, no se agrega aquí (lo pone
            // el costo calculado). OJO: predicado ESTRICTO — "TAPER DELIVERY"
            // es un cobro aparte y no debe excluirse (caso real Bacs Burguer).
            if (esFilaCostoDelivery(c.descripcion)) {
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
            costosAdicionales.map((c: any) => {
                // si el nivel es 0 se multiplica por la cantidad de items de la seccion
                // console.log('c', c);
                // console.log('seccion', item);
                const _idSubtotal = `${c.tipo}${c.id}`
                const _totalItemsSeccion = item.items.reduce((a: any, b: any) => a + parseFloat(b.cantidad_seleccionada), 0)
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
                        visible: true,
                        esImpuesto: 0,
                        descripcion: c.descripcion,
                        visible_cpe: false
                    })
                }

                importeCostosAdicionales += _costoXcantidad
            })
        })

        // let totalItemsPedido = this.getTotalItemsPedido(this.arrSeccionesPedido)
        let totalItemsPedido = this.getTotalItemsPedido(seccionMasItems)
        let importeSubTotal = totalItemsPedido;
       

       
        // console.log('importeSubTotal', importeSubTotal);

        // total en productos
        let rowSubtotalProductos = {
            descripcion: "Sub Total",
            importe: importeSubTotal.toFixed(2),
            visible: true,
            quitar: false,
            visible_cpe: true
        }

        // console.log('rowSubtotalProductos',rowSubtotalProductos);

        arrSubtotales.unshift(rowSubtotalProductos)

        // array delivery calculado segun la config del panel (fijo/variable/zonas)
        if (arrSubtotalCostoEntega) {
            // El costo CALCULADO es la única fuente de la fila de envío: las
            // filas de delivery configuradas en las reglas de la sede se anulan
            // SIEMPRE (predicado estricto: "TAPER DELIVERY" y similares son
            // cobros aparte y se conservan — antes se borraban y la sede perdía
            // plata). Si el calculado es 0 (delivery gratis), solo se anula la
            // fila de la sede sin mostrar una línea en 0.00.
            arrSubtotales = arrSubtotales.filter((s: any) => !esFilaCostoDelivery(s.descripcion));
            if (parseFloat(arrSubtotalCostoEntega.importe) > 0) {
                arrSubtotales.splice(1, 0, arrSubtotalCostoEntega)
            }
        }

        
        
        // totoal arrSubtotales antes de impuestos
        // console.log('arrSubtotales', arrSubtotales);
        let totalSubtotales = arrSubtotales.map((x: any) => parseFloat(x.importe)).reduce((a: number, b: number) => a + b, 0)

        // console.log('totalSubtotales', totalSubtotales);
        


        // agregar solo el igv sobre el total
        let rowIGVAdd: any = null
        const rowIGV = this.arrReglasCarta.subtotales.filter((item: any) => item.es_impuesto === 1 && item.descripcion.toLowerCase().trim() === 'i.g.v' && item.activo === 0)[0] || []
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
            descripcion: "Total",
            importe: totalSubtotales.toFixed(2),
            visible: true,
            visible_cpe: true
        })
                
        return arrSubtotales;
    }

    getResumenPedidoShowCliente(seccionMasItems: any, canal_consumo: any, arrSubtotales: any) {
        // esta funcion mostrar el resumen del pedido como si fuera un ticket impreso.
        // el formato a utiliza es cantidad, descripcion (indicaciones), precio y los totales                
        
        let stringFormatted = '';
        let totalItemsPedido = arrSubtotales.length ? arrSubtotales[arrSubtotales.length - 1].importe : '0.00';
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

                // Opciones elegidas (seleccionables): una línea sangrada por elemento
                // de subitems_view. El importe solo se imprime si la opción cuesta
                // (extra > 0); las gratuitas van sin columna de precio. Sin el campo
                // (carta plana) no se emite nada y la salida es idéntica a la de hoy.
                ;(item.subitems_view || []).forEach((el: any) => {
                    const _importeEl = Number(el.precio) > 0 ? Number(el.precio).toFixed(2) : ''
                    listItemSesccion.push({ descripcion: `     + ${el.cantidad_seleccionada}x ${el.des}`, importe: _importeEl })
                })

                // Agregar indicaciones en línea separada si existen
                if (item.indicaciones) {
                    const _indicaciones = { descripcion: `     (${item.indicaciones})`, importe: '' }
                    listItemSesccion.push(_indicaciones)
                }
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
        let deliveryCost = datosEntrega.delivery_cost || datosEntrega.costo_entrega || 0;
        let distance = datosEntrega.distance || datosEntrega.distancia || 0;

        // Buscar el subtotal de delivery en las reglas de carta para obtener su
        // ID — SOLO si la fila realmente ES el costo de envío (predicado
        // estricto: "TAPER DELIVERY" no debe heredar aquí su nombre/id).
        const subtotalDeliveryRegla = this.arrReglasCarta.subtotales.find((item: any) =>
            esFilaCostoDelivery(item.descripcion)
        );

        const idSubtotal = subtotalDeliveryRegla ? `${subtotalDeliveryRegla.tipo}${subtotalDeliveryRegla.id}` : 'a48';

        let subtotalCostoEntrega = {
            id: idSubtotal,
            quitar: true,
            importe: parseFloat(deliveryCost).toFixed(2),
            visible: true,
            esImpuesto: 0,
            descripcion: subtotalDeliveryRegla?.descripcion || "COSTO DELIVERY",
            visible_cpe: false,
            distancia_km: distance,
            success: true
        };

        return subtotalCostoEntrega;
    }


    generarPreviewId(): string {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 5; i++) {
            id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return id;
    }

    async guardarPedidoPreview(prisma: any, estructuraPedido: any, ticketFormateado: string): Promise<string> {
        const previewId = this.generarPreviewId();
        
        await prisma.$executeRaw`
            INSERT INTO pedido_preview (id, estructura, ticket_formateado, estado)
            VALUES (${previewId}, ${JSON.stringify(estructuraPedido)}, ${ticketFormateado}, 'pending')
        `;
        
        return previewId;
    }
    
}

export default PedidoServices;
