// SE ENCARGA DE COCINAR EL PEDIDO
import axios from "axios";
import PedidoServices from "./pedido.services";
import ClassEstructuraPedido from "../class/estructura.pedido";


export const getEstructuraPedido = async (items: any[], tipo_entrega: any, datos_entrega: any, idsede: number) => {
    const pedidoServices = new PedidoServices();
    const classEstructuraPedido = new ClassEstructuraPedido();
    // obtener reglas de carta
    const rules = await getReglasCarta(idsede);     
    pedidoServices.setRules(rules);      

    // obtenemos los items mas secciones
    const items_secciones = await getSeccionItemsCartaSelected(idsede, items);
    let secciones = items_secciones.secciones;

    // obtenemos los canales de consumo
    const canales_consumo = await getCanalesConsumo(idsede);

    // cocinamos el pedido
    secciones = pedidoServices.cocinarPedido(secciones, items);
    const canalConsumoMasPedido = pedidoServices.setCanalConsumo(tipo_entrega, canales_consumo, secciones)         
    classEstructuraPedido.setTipoConsumo(canalConsumoMasPedido)

    // const direccion_entrega = datos_entrega;
    const arrTotales = await pedidoServices.calcularTotalPedido(secciones, tipo_entrega, datos_entrega);    
    classEstructuraPedido.setSubtotal(arrTotales);

    return classEstructuraPedido.getEstructura();
  
}

const getReglasCarta = async (idsede: number) => {    
    const baseUrl = getBaseUrl();
    try {        
        const response = await axios.get(`${baseUrl}/get-reglas-carta/${idsede}/0`);        
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }    
}

async function getSeccionItemsCartaSelected  (idsede: number, items: any[]): Promise<any> { 
    const baseUrl = getBaseUrl();
    try {
        const response = await axios.post(`${baseUrl}/get-seccion-items`, {
            idsede,
            items
        });
        return response.data;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function getCanalesConsumo(idsede: number) {
    const baseUrl = getBaseUrl();
    try {
        const response = await axios.get(`${baseUrl}/canales/${idsede}`);
        return response.data;
    } catch (error) {
        console.error(error);
        return [];
    }

}

const getBaseUrl = () => {
    let _baseUrl = process.env.BASE_URL || 'http://localhost:20223';
    return _baseUrl + '/api-restobar/chat-bot';

}
