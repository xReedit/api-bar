"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var PedidoServices = /** @class */ (function () {
    // private apiMaps = new ApiMaps();
    function PedidoServices() {
        this.arrReglasCarta = [];
        this.arrSeccionesPedido = [];
    }
    PedidoServices.prototype.setRules = function (arrReglasCarta) {
        this.arrReglasCarta = arrReglasCarta;
    };
    PedidoServices.prototype.cocinarPedido = function (seccionMasItems, itemsFromBot) {
        seccionMasItems = this.setDescripcionCantidadItems(seccionMasItems, itemsFromBot);
        seccionMasItems = this.validarReglasCarta(this.arrReglasCarta.reglas, seccionMasItems);
        return seccionMasItems;
    };
    PedidoServices.prototype.setCanalConsumo = function (canalFromBot, listCanalConsumo, seccionMasItems) {
        var canalSeleted = listCanalConsumo.find(function (canal) { return canal.idtipo_consumo === canalFromBot.idtipo_consumo; });
        if (!canalSeleted) {
            // buscamos por el nombre
            canalSeleted = listCanalConsumo.find(function (canal) { return canal.descripcion.toLowerCase() === canalFromBot.descripcion.toLowerCase(); });
        }
        canalSeleted.secciones = seccionMasItems;
        return canalSeleted;
    };
    PedidoServices.prototype.setDescripcionCantidadItems = function (seccionMasItems, itemsFromBot) {
        try {
            seccionMasItems.map(function (seccion) {
                seccion.items.map(function (item) {
                    var itemFromBot = itemsFromBot.find(function (item_) { return item_.iditem === item.iditem; });
                    var _precionTotal = item.precio_unitario * itemFromBot.cantidad;
                    item.descripcion = itemFromBot.descripcion;
                    item.descripcion = itemFromBot.indicaciones ? itemFromBot.indicaciones !== '' ? "".concat(itemFromBot.descripcion, " (").concat(itemFromBot.indicaciones, ")") : itemFromBot.descripcion : itemFromBot.descripcion;
                    item.indicaciones = (itemFromBot === null || itemFromBot === void 0 ? void 0 : itemFromBot.indicaciones) || '';
                    item.cantidad_seleccionada = itemFromBot.cantidad;
                    item.precio_total = _precionTotal;
                    item.precio_total_calc = _precionTotal;
                    item.precio_print = _precionTotal;
                });
            });
        }
        catch (error) {
            console.log('error setDescripcionCantidadItems', error);
        }
        return seccionMasItems;
    };
    // rules = this.arrReglasCarta.reglas
    PedidoServices.prototype.validarReglasCarta = function (rules, seccionMasItems) {
        var _this = this;
        if (rules === null)
            return;
        // let diferencia = 0;
        this.arrSeccionesPedido = seccionMasItems;
        var xSecc_bus = 0;
        var xSecc_detalle = 0;
        var xCantidadBuscar = 0;
        var xCantidadBuscarSecc_detalle = 0;
        var diferencia = 0;
        var xPrecio_item_bus = 0;
        var xPrecio_mostrado = 0; // preciounitario * cantidad precio_total_cal
        // reset precio_total_calc -> precio_total;
        // seccionMasItems.map((z: any) => {
        //     z.items.map((n: any) => {
        //         console.log('=== 1 item ===', n);
        //     });
        // });            
        rules.map(function (regla) {
            xSecc_bus = regla.idseccion;
            xSecc_detalle = regla.idseccion_detalle;
            xCantidadBuscar = _this.getCantidadItemsFromSeccion(xSecc_bus);
            xCantidadBuscarSecc_detalle = _this.getCantidadItemsFromSeccion(xSecc_detalle);
            diferencia = xCantidadBuscar - xCantidadBuscarSecc_detalle;
            diferencia = diferencia < 0 ? xCantidadBuscar : diferencia; // no valores negativos
            seccionMasItems
                .filter(function (z) { return z.idseccion.toString() === xSecc_detalle.toString(); })
                .map(function (z) {
                z.items
                    .map(function (n) {
                    // console.log('=== init item ===', n);
                    var precioUnitario_item = parseFloat(n.precio);
                    var cant_item = n.cantidad_seleccionada;
                    xPrecio_mostrado = n.precio_total_calc !== null ? n.precio_total_calc : n.precio_total;
                    xPrecio_item_bus = xPrecio_mostrado;
                    // console.log('=== xCantidadBuscar ===', xCantidadBuscar);
                    // console.log('=== xCantidadBuscarSecc_detalle ===', xCantidadBuscarSecc_detalle);                                    
                    if (xCantidadBuscar >= xCantidadBuscarSecc_detalle) {
                        xPrecio_item_bus = 0;
                    }
                    else if (diferencia > 0) {
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
    };
    PedidoServices.prototype.getCantidadItemsFromSeccion = function (idseccion) {
        var total = 0;
        this.arrSeccionesPedido.map(function (z) {
            if (z.idseccion === idseccion) {
                z.items.map(function (n) {
                    total += parseFloat(n.cantidad_seleccionada);
                });
            }
        });
        return total;
    };
    // calcular costo de entrega si es delivery
    // async calcCostoEntrega(datos_entrega: any, coordenadasSede:any, parametros: any) {     
    //     // const _coordenadasCliente = `${datos_entrega.latitude}, ${datos_entrega.longitude}`
    //     // const _coordenadasSede = `${coordenadasSede.latitude}, ${coordenadasSede.longitude}`
    //     const distancia = datos_entrega.direccion?.distance || 1
    //     const _arrCostoEntrega = await this.apiMaps.getSubtotaCostoEntrega(distancia, parametros)          
    //     return _arrCostoEntrega;
    // }    
    // obterner costos no impuestos por idseccion
    PedidoServices.prototype.getCostosAdicionalesPorSeccion = function (idseccion, idtipo_consumo) {
        return this.arrReglasCarta.subtotales.filter(function (item) { return item.es_impuesto === 0 && item.idseccion === idseccion && item.idtipo_consumo === idtipo_consumo; });
    };
    // obtener el subtotal de los items del pedido
    PedidoServices.prototype.getTotalItemsPedido = function (arrSeccionesPedido) {
        var total = 0;
        for (var _i = 0, arrSeccionesPedido_1 = arrSeccionesPedido; _i < arrSeccionesPedido_1.length; _i++) {
            var seccion = arrSeccionesPedido_1[_i];
            for (var _a = 0, _b = seccion.items; _a < _b.length; _a++) {
                var item = _b[_a];
                total += parseFloat(item.precio_print);
            }
        }
        return total;
    };
    PedidoServices.prototype.xCalcMontoBaseIGV = function (importeTotal, procentaje_IGV) {
        return (parseFloat(importeTotal) / (1 + (procentaje_IGV / 100)));
    };
    PedidoServices.prototype.getArraySubtotal = function (seccionMasItems, idtipo_consumo, arrSubtotalCostoEntega) {
        var _this = this;
        var importeCostosAdicionales = 0;
        var arrSubtotales = [];
        //
        // costos adicionales a nivel pedido (delivery, servicios, etc)        
        var _arrCostosNivelPedido = this.arrReglasCarta.subtotales.filter(function (item) { return item.es_impuesto === 0 && item.idtipo_consumo === idtipo_consumo && item.nivel === 1; });
        _arrCostosNivelPedido.map(function (c) {
            var _idSubtotal = "".concat(c.tipo).concat(c.id);
            var _costoXcantidad = parseFloat(c.monto);
            var _subtotal = arrSubtotales.find(function (s) { return s.descripcion.toLowerCase().trim() === c.descripcion.toLowerCase().trim(); });
            // si en la reglas incluye delivery, costo de entrega, entrega, envio ya no lo ponemos en el subtotal
            var exclusiones = ['delivery', 'entrega', 'envio'];
            if (exclusiones.some(function (exclusion) { return c.descripcion.toLowerCase().trim().includes(exclusion); })) {
                // continuar
                return;
            }
            if (_subtotal) {
                _subtotal.importe = (parseFloat(_subtotal.importe) + _costoXcantidad).toFixed(2);
            }
            else {
                arrSubtotales.push({
                    id: _idSubtotal,
                    quitar: true,
                    importe: _costoXcantidad.toFixed(2),
                    tachado: false,
                    visible: true,
                    esImpuesto: 0,
                    descripcion: c.descripcion,
                    visible_cpe: false
                });
            }
        });
        // costos adicionales  a nivel items
        seccionMasItems.map(function (item) {
            var costosAdicionales = _this.getCostosAdicionalesPorSeccion(item.idseccion, idtipo_consumo);
            costosAdicionales.map(function (c) {
                // si el nivel es 0 se multiplica por la cantidad de items de la seccion
                // console.log('c', c);
                // console.log('seccion', item);
                var _idSubtotal = "".concat(c.tipo).concat(c.id);
                var _totalItemsSeccion = item.items.reduce(function (a, b) { return a + parseFloat(b.cantidad_seleccionada); }, 0);
                var _costoXcantidad = c.nivel === 0 ? parseFloat(c.monto) * _totalItemsSeccion : parseFloat(c.monto);
                // buscamos si ya existe el subtotal
                var _subtotal = arrSubtotales.find(function (s) { return s.descripcion.toLowerCase().trim() === c.descripcion.toLowerCase().trim(); });
                if (_subtotal) {
                    _subtotal.importe = (parseFloat(_subtotal.importe) + _costoXcantidad).toFixed(2);
                }
                else {
                    arrSubtotales.push({
                        id: _idSubtotal,
                        quitar: true,
                        importe: _costoXcantidad.toFixed(2),
                        tachado: false,
                        visible: true,
                        esImpuesto: 0,
                        descripcion: c.descripcion,
                        visible_cpe: false
                    });
                }
                importeCostosAdicionales += _costoXcantidad;
            });
        });
        // let totalItemsPedido = this.getTotalItemsPedido(this.arrSeccionesPedido)
        var totalItemsPedido = this.getTotalItemsPedido(seccionMasItems);
        var importeSubTotal = totalItemsPedido;
        // console.log('importeSubTotal', importeSubTotal);
        // total en productos
        var rowSubtotalProductos = {
            id: 0,
            quitar: false,
            importe: importeSubTotal.toFixed(2),
            tachado: false,
            visible: true,
            esImpuesto: 0,
            descripcion: "SUB TOTAL",
            visible_cpe: true
        };
        // console.log('rowSubtotalProductos',rowSubtotalProductos);
        arrSubtotales.unshift(rowSubtotalProductos);
        // array delivery calculado segun la distancia
        if (arrSubtotalCostoEntega) {
            arrSubtotales.splice(1, 0, arrSubtotalCostoEntega);
        }
        // totoal arrSubtotales antes de impuestos
        // console.log('arrSubtotales', arrSubtotales);
        var totalSubtotales = arrSubtotales.map(function (x) { return parseFloat(x.importe); }).reduce(function (a, b) { return a + b; }, 0);
        // console.log('totalSubtotales', totalSubtotales);
        // agregar solo el igv sobre el total
        var rowIGVAdd = null;
        var rowIGV = this.arrReglasCarta.subtotales.filter(function (item) { return item.es_impuesto === 1 && item.descripcion.toLowerCase().trim() === 'i.g.v' && item.activo === 0; })[0] || [];
        var rowSubtotal = rowSubtotalProductos; // arrSubtotales.filter((item: any) => item.descripcion.toLowerCase().trim() === 'sub total')[0] || []
        var _importeIGV = parseFloat(rowIGV.monto);
        importeSubTotal = parseFloat(rowSubtotal.importe);
        if (_importeIGV > 0) {
            importeSubTotal = this.xCalcMontoBaseIGV(totalSubtotales, _importeIGV);
            _importeIGV = totalSubtotales - importeSubTotal;
            // rowIGV.importe = _importeIGV.toFixed(2)      
            rowSubtotal.importe = importeSubTotal.toFixed(2);
            rowIGVAdd = {
                id: rowIGV.id,
                quitar: false,
                importe: _importeIGV.toFixed(2),
                tachado: false,
                visible: true,
                esImpuesto: 1,
                descripcion: rowIGV.descripcion,
                visible_cpe: true
            };
        }
        // si existe igv agrega despues del subtotal
        if (rowIGVAdd) {
            arrSubtotales.splice(1, 0, rowIGVAdd);
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
        });
        return arrSubtotales;
    };
    PedidoServices.prototype.getResumenPedidoShowCliente = function (seccionMasItems, canal_consumo, arrSubtotales) {
        // esta funcion mostrar el resumen del pedido como si fuera un ticket impreso.
        // el formato a utiliza es cantidad, descripcion (indicaciones), precio y los totales                
        var _this = this;
        var stringFormatted = '';
        var totalItemsPedido = arrSubtotales[arrSubtotales.length - 1].importe;
        // console.log('totalItemsPedido', totalItemsPedido);
        // let importeSubTotal = totalItemsPedido;
        // canal de consumo
        stringFormatted += "Pedido *".concat(canal_consumo.descripcion, "*\n");
        stringFormatted += "El importe total es *".concat(totalItemsPedido, "*\n\n");
        // el resumen de productos segun el formato anterior
        var newItem = { descripcion: '', importe: '' };
        seccionMasItems.map(function (seccion) {
            newItem.descripcion = "*".concat(seccion.des.toUpperCase(), "*");
            newItem.importe = '.';
            var _tituloSeccion = [newItem];
            var listItemSesccion = [];
            stringFormatted += _this.formatPadArrayToString(_tituloSeccion, false);
            seccion.items.map(function (item) {
                var _newItem = { descripcion: "".concat(item.cantidad_seleccionada, " ").concat(item.des), importe: parseFloat(item.precio_print).toFixed(2).toString() };
                listItemSesccion.push(_newItem);
            });
            stringFormatted += _this.formatPadArrayToString(listItemSesccion, true);
        });
        // los subtotales todo los que venta en arrSubtotales
        stringFormatted += '\n';
        var listItemSubtotales = [];
        arrSubtotales.map(function (item) {
            // console.log('item subtotal', item);
            var _newItem = { descripcion: "".concat(item.descripcion), importe: parseFloat(item.importe).toFixed(2).toString() };
            listItemSubtotales.push(_newItem);
        });
        stringFormatted += this.formatPadArrayToString(listItemSubtotales, true);
        return stringFormatted;
    };
    PedidoServices.prototype.formatPadArrayToString = function (data, isConPuntos) {
        if (isConPuntos === void 0) { isConPuntos = true; }
        var stringFormatted = '';
        var maxLength = 55; // Longitud máxima de la línea
        var maxDescripcionLength = 27; // Nueva longitud máxima para la descripción
        var _separacion = isConPuntos ? '..' : ' ';
        data.forEach(function (item) {
            var descripcion = item.descripcion;
            if (isConPuntos && descripcion.length > maxDescripcionLength) {
                descripcion = descripcion.substring(0, maxDescripcionLength - 3) + '...';
            }
            var lentghDescripcion = descripcion.length;
            var lentghImporte = item.importe.length;
            var espacioDerecha = maxLength - (lentghDescripcion);
            var conceptoFormatted = descripcion.toLowerCase().padEnd(espacioDerecha, _separacion);
            var montoFormatted = item.importe.padStart(5, ' ');
            stringFormatted += "".concat(conceptoFormatted).concat(montoFormatted, "\n");
        });
        return stringFormatted;
    };
    PedidoServices.prototype.calcularTotalPedido = function (secciones, tipo_entrega, datos_entrega) {
        return __awaiter(this, void 0, void 0, function () {
            var arrTotales, arrSubtotalCostoEntega;
            return __generator(this, function (_a) {
                arrTotales = null;
                arrSubtotalCostoEntega = null;
                if (tipo_entrega.descripcion.toLowerCase() === 'delivery') {
                    arrSubtotalCostoEntega = this.getSubtotalCostoEntrega(datos_entrega);
                }
                arrTotales = this.getArraySubtotal(secciones, tipo_entrega.idtipo_consumo, arrSubtotalCostoEntega);
                return [2 /*return*/, arrTotales];
            });
        });
    };
    PedidoServices.prototype.getSubtotalCostoEntrega = function (datosEntrega) {
        var deliveryCost = datosEntrega.delivery_cost || datosEntrega.costo_entrega || 0;
        var distance = datosEntrega.distance || datosEntrega.distancia || 0;
        var subtotalCostoEntrega = {
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
    };
    return PedidoServices;
}());
exports["default"] = PedidoServices;
