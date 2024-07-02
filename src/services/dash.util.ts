// normalizar respuesta procedures
export const normalizeResponse = (rptExec: any) => {
        return rptExec.map((item: any) => {
            return {
                ...item,
                num_semana: Number(item.num_semana) || 0,
                semana_actual: Number(item.semana_actual) || 0,
                num_dia: Number(item.num_dia) || 0,
                hoy: Number(item.hoy) || 0,
                num_mes: Number(item.num_mes) || 0,
                num_year: Number(item.num_year) || 0,
                recupera_stock: item.recupera_stock ? Number(item.recupera_stock) : 0,
            };
        });
}