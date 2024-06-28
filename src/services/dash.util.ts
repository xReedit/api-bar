// normalizar respuesta procedures
export const normalizeResponse = (rptExec: any) => {
        return rptExec.map((item: any) => {
            return {
                ...item,
                num_semana: Number(item.num_semana),
                semana_actual: Number(item.semana_actual),
                num_dia: Number(item.num_dia),
                hoy: Number(item.hoy),
                num_mes: Number(item.num_mes),
                num_year: Number(item.num_year),
                recupera_stock: item.recupera_stock ? Number(item.recupera_stock) : 0,
            };
        });
}