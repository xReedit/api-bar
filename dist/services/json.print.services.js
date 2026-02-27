"use strict";
exports.__esModule = true;
exports.JsonPrintService = void 0;
var JsonPrintService = /** @class */ (function () {
    function JsonPrintService() {
    }
    // relacionar secciones con impresoras
    JsonPrintService.prototype.relationRowToPrint = function (iscliente) {
        var _this = this;
        if (iscliente === void 0) { iscliente = false; }
        var _objMiPedido = this.elPedido;
        var _tpcPrinter = [];
        var xRptPrint = []; // respuesta para enviar al backend
        var listOnlyPrinters = []; // lista de solo impresoras
        var xImpresoraPrint = []; // array de impresoras
        var xArrayBodyPrint = []; // el array de secciones e items a imprimir
        var printerAsigando = null;
        // this.impresoras = <any[]>this.impresoras;
        // valores de la primera impresora // impresora donde se pone el logo
        var _dataPrinterGenerales = this.impresoras[0];
        var num_copias_all = _dataPrinterGenerales.num_copias; // numero de copias para las demas impresoras -local
        var var_size_font_tall_comanda = _dataPrinterGenerales.var_size_font_tall_comanda; // tamañao de letras
        var pie_pagina = _dataPrinterGenerales.pie_pagina;
        var pie_pagina_comprobante = _dataPrinterGenerales.pie_pagina_comprobante;
        var isPrintPedidoDeliveryCompleto = _dataPrinterGenerales.isprint_all_delivery.toString() === '1';
        var isHayDatosPrintObj = true; // si hay datos en el obj xArrayBodyPrint para imprimir
        var isPedidoDelivery = false;
        // let indexP = 0;
        // si es cliente asigna impresora a seccion sin impresora // ej delivery por aplicacion
        if (iscliente) {
            this.setFirstPrinterSeccionCliente(_objMiPedido, this.impresoras);
        }
        // 041052022
        // si el tipo de consumo tiene un impresora especifica
        // ej: todo delivery se imprime en una impresora x
        var isTpcPrinter = false;
        var listTPCPrinter = _tpcPrinter;
        listTPCPrinter = listTPCPrinter.filter(function (p) { return p.idimpresora !== 0; });
        isTpcPrinter = listTPCPrinter.length > 0;
        console.log('isTpcPrinter', isTpcPrinter);
        if (isTpcPrinter) {
            listTPCPrinter.map(function (p) {
                var _tpcPrint = p.idtipo_consumo;
                var xIdPrint = p.idimpresora;
                xArrayBodyPrint = [];
                _objMiPedido.tipoconsumo
                    .filter(function (tpc) { return tpc.idtipo_consumo === _tpcPrint; })
                    .map(function (tpc, indexP) {
                    xArrayBodyPrint[indexP] = { 'des': tpc.descripcion, 'id': tpc.idtipo_consumo, 'titlo': tpc.titulo, 'conDatos': false };
                    tpc.secciones
                        // .filter((s: any) => s.id === _tpcPrint)
                        .map(function (s) {
                        s.items.map(function (i) {
                            isHayDatosPrintObj = true;
                            xArrayBodyPrint[indexP].conDatos = true; // si la seccion tiene items
                            xArrayBodyPrint[indexP][i.iditem] = i;
                            xArrayBodyPrint[indexP][i.iditem].des_seccion = s.des;
                            xArrayBodyPrint[indexP][i.iditem].sec_orden = s.sec_orden;
                            xArrayBodyPrint[indexP][i.iditem].cantidad = i.cantidad_seleccionada.toString().padStart(2, '0');
                            xArrayBodyPrint[indexP][i.iditem].precio_print = parseFloat(i.precio_print.toString()).toFixed(2);
                            if (!i.subitems_view) {
                                xArrayBodyPrint[indexP][i.iditem].subitems_view = null;
                            }
                            i.flag_add_tpc = true;
                        });
                    });
                });
                if (xArrayBodyPrint.length === 0 || !isHayDatosPrintObj) {
                    return;
                }
                // buscamos la impresora en xArrayImpresoras;
                printerAsigando = _this.impresoras.filter(function (pp) { return pp.idimpresora === xIdPrint; })[0];
                xImpresoraPrint = [];
                var childPrinter = {};
                childPrinter.ip_print = printerAsigando.ip;
                childPrinter.var_margen_iz = printerAsigando.var_margen_iz;
                childPrinter.var_size_font = printerAsigando.var_size_font;
                childPrinter.local = 0;
                childPrinter.num_copias = printerAsigando.num_copias; // num_copias_all;
                childPrinter.var_size_font_tall_comanda = var_size_font_tall_comanda;
                childPrinter.copia_local = 0; // no imprime // solo para impresora local
                childPrinter.img64 = '';
                childPrinter.papel_size = printerAsigando.papel_size;
                childPrinter.pie_pagina = pie_pagina;
                childPrinter.pie_pagina_comprobante = pie_pagina_comprobante;
                xImpresoraPrint.push(childPrinter);
                xRptPrint.push({
                    arrBodyPrint: xArrayBodyPrint,
                    arrPrinters: xImpresoraPrint
                });
                listOnlyPrinters.push(childPrinter);
            });
        }
        else {
            // si es punto auto pedido agregamos la impresora asignada
            // const _puntoConfig = JSON.parse(localStorage.getItem('sys::punto')) || {};
            // _puntoConfig.ispunto_autopedido = _puntoConfig ? _puntoConfig.ispunto_autopedido : false;
            this.impresoras.map(function (p) {
                isHayDatosPrintObj = false;
                xArrayBodyPrint = [];
                _objMiPedido.tipoconsumo
                    .map(function (tpc, indexP) {
                    xArrayBodyPrint[indexP] = { 'des': tpc.descripcion, 'id': tpc.idtipo_consumo, 'titlo': tpc.titulo, 'conDatos': false };
                    isPedidoDelivery = tpc.descripcion.toLowerCase() === 'delivery';
                    tpc.secciones
                        .filter(function (s) { return s.idimpresora === p.idimpresora; })
                        .map(function (s) {
                        printerAsigando = p;
                        // imprime todo el pedido en todas las areas si es delivery
                        if (isPedidoDelivery && isPrintPedidoDeliveryCompleto) {
                            tpc.secciones.map(function (seccion) {
                                seccion.items.map(function (i) {
                                    if (i.flag_add_tpc) {
                                        return;
                                    }
                                    isHayDatosPrintObj = true;
                                    xArrayBodyPrint[indexP].conDatos = true; // si la seccion tiene items
                                    xArrayBodyPrint[indexP][i.iditem] = i;
                                    xArrayBodyPrint[indexP][i.iditem].des_seccion = seccion.des;
                                    xArrayBodyPrint[indexP][i.iditem].sec_orden = seccion.sec_orden;
                                    xArrayBodyPrint[indexP][i.iditem].cantidad = i.cantidad_seleccionada.toString().padStart(2, '0');
                                    xArrayBodyPrint[indexP][i.iditem].precio_print = parseFloat(i.precio_print.toString()).toFixed(2);
                                    if (!i.subitems_view) {
                                        xArrayBodyPrint[indexP][i.iditem].subitems_view = null;
                                    }
                                });
                            });
                        }
                        s.items.map(function (i) {
                            if (i.flag_add_tpc) {
                                return;
                            }
                            if (i.imprimir_comanda === 0 && !iscliente) {
                                return;
                            } // no imprimir // productos bodega u otros
                            // xArrayBodyPrint[indexP][i.iditem] = [];
                            isHayDatosPrintObj = true;
                            xArrayBodyPrint[indexP].conDatos = true; // si la seccion tiene items
                            xArrayBodyPrint[indexP][i.iditem] = i;
                            xArrayBodyPrint[indexP][i.iditem].des_seccion = s.des;
                            xArrayBodyPrint[indexP][i.iditem].sec_orden = s.sec_orden;
                            xArrayBodyPrint[indexP][i.iditem].cantidad = i.cantidad_seleccionada.toString().padStart(2, '0');
                            xArrayBodyPrint[indexP][i.iditem].precio_print = parseFloat(i.precio_print.toString()).toFixed(2);
                            if (!i.subitems_view) {
                                xArrayBodyPrint[indexP][i.iditem].subitems_view = null;
                            }
                        });
                    });
                    // otra impresora en seccion
                    tpc.secciones
                        .filter(function (s) { return s.idimpresora_otro === p.idimpresora; })
                        .map(function (s) {
                        printerAsigando = p;
                        // imprime todo el pedido en todas las areas si es delivery
                        if (isPedidoDelivery && isPrintPedidoDeliveryCompleto) {
                            tpc.secciones.map(function (seccion) {
                                seccion.items.map(function (i) {
                                    if (i.flag_add_tpc) {
                                        return;
                                    }
                                    isHayDatosPrintObj = true;
                                    xArrayBodyPrint[indexP].conDatos = true; // si la seccion tiene items
                                    xArrayBodyPrint[indexP][i.iditem] = i;
                                    xArrayBodyPrint[indexP][i.iditem].des_seccion = seccion.des;
                                    xArrayBodyPrint[indexP][i.iditem].sec_orden = seccion.sec_orden;
                                    xArrayBodyPrint[indexP][i.iditem].cantidad = i.cantidad_seleccionada.toString().padStart(2, '0');
                                    xArrayBodyPrint[indexP][i.iditem].precio_print = parseFloat(i.precio_print.toString()).toFixed(2);
                                    if (!i.subitems_view) {
                                        xArrayBodyPrint[indexP][i.iditem].subitems_view = null;
                                    }
                                });
                            });
                        }
                        s.items.map(function (i) {
                            if (i.flag_add_tpc) {
                                return;
                            }
                            if (i.imprimir_comanda === 0 && !iscliente) {
                                return;
                            } // no imprimir // productos bodega u otros
                            // xArrayBodyPrint[indexP][i.iditem] = [];
                            isHayDatosPrintObj = true;
                            xArrayBodyPrint[indexP].conDatos = true; // si la seccion tiene items
                            xArrayBodyPrint[indexP][i.iditem] = i;
                            xArrayBodyPrint[indexP][i.iditem].des_seccion = s.des;
                            xArrayBodyPrint[indexP][i.iditem].sec_orden = s.sec_orden;
                            xArrayBodyPrint[indexP][i.iditem].cantidad = i.cantidad_seleccionada.toString().padStart(2, '0');
                            xArrayBodyPrint[indexP][i.iditem].precio_print = parseFloat(i.precio_print.toString()).toFixed(2);
                            if (!i.subitems_view) {
                                xArrayBodyPrint[indexP][i.iditem].subitems_view = null;
                            }
                        });
                    });
                });
                if (xArrayBodyPrint.length === 0 || !isHayDatosPrintObj) {
                    return;
                }
                xImpresoraPrint = [];
                var childPrinter = {};
                childPrinter.ip_print = printerAsigando.ip;
                childPrinter.var_margen_iz = printerAsigando.var_margen_iz;
                childPrinter.var_size_font = printerAsigando.var_size_font;
                childPrinter.local = 0;
                childPrinter.num_copias = printerAsigando.num_copias; // num_copias_all;
                childPrinter.var_size_font_tall_comanda = var_size_font_tall_comanda;
                childPrinter.copia_local = 0; // no imprime // solo para impresora local
                childPrinter.img64 = '';
                childPrinter.papel_size = printerAsigando.papel_size;
                childPrinter.pie_pagina = pie_pagina;
                childPrinter.pie_pagina_comprobante = pie_pagina_comprobante;
                xImpresoraPrint.push(childPrinter);
                // console.log('xArrayBodyPrint', xArrayBodyPrint);
                // console.log('xImpresoraPrint', xImpresoraPrint);
                xRptPrint.push({
                    arrBodyPrint: xArrayBodyPrint,
                    arrPrinters: xImpresoraPrint
                });
                listOnlyPrinters.push(childPrinter);
            });
        }
        xRptPrint.listPrinters = listOnlyPrinters;
        // console.log('xRptPrint', xRptPrint);
        return xRptPrint;
    };
    // recuepra la primera impresora para imprimir cuando manda el cliente y si la seccion no tiene impresora
    JsonPrintService.prototype.GetFirstPrinter = function (listPrinter) {
        var firtsPrinter = null;
        var countPrinters = listPrinter.length;
        if (countPrinters > 0) {
            firtsPrinter = listPrinter[0];
        }
        if (countPrinters > 1 && firtsPrinter.descripcion.toLowerCase() === 'caja') {
            firtsPrinter = listPrinter[1];
        }
        return firtsPrinter;
    };
    // asigna impresora a las seccion que no tienen // para cuando el cliente realize el pedido imprima
    JsonPrintService.prototype.setFirstPrinterSeccionCliente = function (_objMiPedido, listPrinter) {
        var firtsIdPrinter = {};
        _objMiPedido.tipoconsumo
            .map(function (tpc) {
            firtsIdPrinter = tpc.secciones.filter(function (s) { return s.idimpresora !== 0; })[0];
            // console.log('impresora por tipo de consumo', firtsIdPrinter);
            if (firtsIdPrinter) {
                return;
            }
        });
        // sino encontro ningun impresora asigna impresora de la lista de impresoras
        if (!firtsIdPrinter) {
            console.log('selecciona primera impresora');
            firtsIdPrinter = this.GetFirstPrinter(listPrinter);
        }
        if (!firtsIdPrinter) {
            return;
        }
        // asignamos a las secciones que no tienen impresora
        _objMiPedido.tipoconsumo
            .map(function (tpc, indexP) {
            firtsIdPrinter = tpc.secciones.filter(function (s) { return s.idimpresora === 0; })
                .map(function (s) { s.idimpresora = firtsIdPrinter.idimpresora; });
        });
    };
    JsonPrintService.prototype.enviarMiPedido = function (iscliente, infoSede, elPedido, impresoras) {
        if (iscliente === void 0) { iscliente = false; }
        this.elPedido = elPedido;
        this.datosSede = infoSede.sede;
        this.impresoras = impresoras;
        return this.relationRowToPrint(iscliente);
    };
    return JsonPrintService;
}());
exports.JsonPrintService = JsonPrintService;
