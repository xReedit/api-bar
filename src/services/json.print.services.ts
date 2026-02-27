export class JsonPrintService {
    datosSede: any;
    elPedido: any
    impresoras: any
    constructor() {
        
    }

    // relacionar secciones con impresoras
    private relationRowToPrint(iscliente: boolean = false): void {
        


        const _objMiPedido = this.elPedido
        const _tpcPrinter: any = [];
        const xRptPrint: any = []; // respuesta para enviar al backend
        const listOnlyPrinters: any = []; // lista de solo impresoras
        let xImpresoraPrint: any = []; // array de impresoras
        let xArrayBodyPrint: any = []; // el array de secciones e items a imprimir
        let printerAsigando: any = null;

        // this.impresoras = <any[]>this.impresoras;
        // valores de la primera impresora // impresora donde se pone el logo
        const _dataPrinterGenerales = this.impresoras[0]
        const num_copias_all = _dataPrinterGenerales.num_copias; // numero de copias para las demas impresoras -local
        const var_size_font_tall_comanda = _dataPrinterGenerales.var_size_font_tall_comanda; // tamañao de letras
        const pie_pagina = _dataPrinterGenerales.pie_pagina;
        const pie_pagina_comprobante = _dataPrinterGenerales.pie_pagina_comprobante;
        const isPrintPedidoDeliveryCompleto = _dataPrinterGenerales.isprint_all_delivery.toString() === '1';
        let isHayDatosPrintObj = true; // si hay datos en el obj xArrayBodyPrint para imprimir
        let isPedidoDelivery = false;
        // let indexP = 0;

        // si es cliente asigna impresora a seccion sin impresora // ej delivery por aplicacion
        if (iscliente) {
            this.setFirstPrinterSeccionCliente(_objMiPedido, this.impresoras);
        }

        // 041052022
        // si el tipo de consumo tiene un impresora especifica
        // ej: todo delivery se imprime en una impresora x

        let isTpcPrinter = false;
        let listTPCPrinter = _tpcPrinter;
        listTPCPrinter = listTPCPrinter.filter((p: any) => p.idimpresora !== 0);
        isTpcPrinter = listTPCPrinter.length > 0;
        console.log('isTpcPrinter', isTpcPrinter);

        if (isTpcPrinter) {
            listTPCPrinter.map((p: any) => {
                const _tpcPrint = p.idtipo_consumo;
                const xIdPrint = p.idimpresora;
                xArrayBodyPrint = [];

                _objMiPedido.tipoconsumo
                    .filter((tpc: any) => tpc.idtipo_consumo === _tpcPrint)
                    .map((tpc: any, indexP: number) => {
                        xArrayBodyPrint[indexP] = { 'des': tpc.descripcion, 'id': tpc.idtipo_consumo, 'titlo': tpc.titulo, 'conDatos': false };
                        tpc.secciones
                            // .filter((s: any) => s.id === _tpcPrint)
                            .map((s: any) => {
                                s.items.map((i: any) => {

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

                if (xArrayBodyPrint.length === 0 || !isHayDatosPrintObj) { return; }

                // buscamos la impresora en xArrayImpresoras;
                printerAsigando = this.impresoras.filter((pp: any) => pp.idimpresora === xIdPrint)[0];

                xImpresoraPrint = [];
                const childPrinter: any = {};
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
        } else {


            // si es punto auto pedido agregamos la impresora asignada
            // const _puntoConfig = JSON.parse(localStorage.getItem('sys::punto')) || {};
            // _puntoConfig.ispunto_autopedido = _puntoConfig ? _puntoConfig.ispunto_autopedido : false;
    
            this.impresoras.map((p: any) => {
                isHayDatosPrintObj = false;
                xArrayBodyPrint = [];
    
    
                _objMiPedido.tipoconsumo
                    .map((tpc: any, indexP: number) => {
                        xArrayBodyPrint[indexP] = { 'des': tpc.descripcion, 'id': tpc.idtipo_consumo, 'titlo': tpc.titulo, 'conDatos': false };
                        isPedidoDelivery = tpc.descripcion.toLowerCase() === 'delivery';
    
                        tpc.secciones
                            .filter((s: any) => s.idimpresora === p.idimpresora)
                            .map((s: any) => {
                                printerAsigando = p;
    
                                // imprime todo el pedido en todas las areas si es delivery
                                if (isPedidoDelivery && isPrintPedidoDeliveryCompleto) {
                                    tpc.secciones.map((seccion: any) => {
                                        seccion.items.map((i: any) => {
    
                                            if (i.flag_add_tpc) { return; }
    
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
    
                                s.items.map((i: any) => {
                                    if (i.flag_add_tpc) { return; }
                                    if (i.imprimir_comanda === 0 && !iscliente) { return; } // no imprimir // productos bodega u otros
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
                            .filter((s: any) => s.idimpresora_otro === p.idimpresora)
                            .map((s: any) => {
                                printerAsigando = p;
    
                                // imprime todo el pedido en todas las areas si es delivery
                                if (isPedidoDelivery && isPrintPedidoDeliveryCompleto) {
                                    tpc.secciones.map((seccion: any) => {
                                        seccion.items.map((i: any) => {
    
                                            if (i.flag_add_tpc) { return; }
    
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
    
                                s.items.map((i: any) => {
                                    if (i.flag_add_tpc) { return; }
                                    if (i.imprimir_comanda === 0 && !iscliente) { return; } // no imprimir // productos bodega u otros
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
    
    
                if (xArrayBodyPrint.length === 0 || !isHayDatosPrintObj) { return; }
    
                xImpresoraPrint = [];
                const childPrinter: any = {};
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



    }

    // recuepra la primera impresora para imprimir cuando manda el cliente y si la seccion no tiene impresora
    private GetFirstPrinter(listPrinter: any): any {
        let firtsPrinter: any = null;
        const countPrinters = listPrinter.length;
        if (countPrinters > 0) {
            firtsPrinter = listPrinter[0];
        }

        if (countPrinters > 1 && firtsPrinter.descripcion.toLowerCase() === 'caja') {
            firtsPrinter = listPrinter[1];
        }

        return firtsPrinter;
    }

    // asigna impresora a las seccion que no tienen // para cuando el cliente realize el pedido imprima
    private setFirstPrinterSeccionCliente(_objMiPedido: any, listPrinter: any) {
        let firtsIdPrinter: any = {};

        _objMiPedido.tipoconsumo
            .map((tpc: any) => {
                firtsIdPrinter = tpc.secciones.filter((s: any) => s.idimpresora !== 0)[0];
                // console.log('impresora por tipo de consumo', firtsIdPrinter);
                if (firtsIdPrinter) { return; }
            });

        // sino encontro ningun impresora asigna impresora de la lista de impresoras
        if (!firtsIdPrinter) {
            console.log('selecciona primera impresora');
            firtsIdPrinter = this.GetFirstPrinter(listPrinter);
        }

        if (!firtsIdPrinter) { return; }

        // asignamos a las secciones que no tienen impresora
        _objMiPedido.tipoconsumo
            .map((tpc: any, indexP: number) => {
                firtsIdPrinter = tpc.secciones.filter((s: any) => s.idimpresora === 0)
                    .map((s: any) => { s.idimpresora = firtsIdPrinter.idimpresora; });
            });
    }


    enviarMiPedido(iscliente: boolean = false, infoSede: any, elPedido: any, impresoras: any): any {
        this.elPedido = elPedido;
        this.datosSede = infoSede.sede;
        this.impresoras = impresoras
        return this.relationRowToPrint(iscliente);
    }

}