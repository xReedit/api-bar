// Espera una promesa como máximo `ms`. Si vence el tope devuelve EN_PROCESO y
// la promesa SIGUE corriendo (no se cancela): sirve para responderle a tiempo a
// quien llama mientras el trabajo termina en segundo plano.
export const EN_PROCESO = Symbol('en_proceso');

export const esperarConTope = <T>(promesa: Promise<T>, ms: number): Promise<T | typeof EN_PROCESO> => {
    let timer: ReturnType<typeof setTimeout>;
    const tope = new Promise<typeof EN_PROCESO>((r) => { timer = setTimeout(() => r(EN_PROCESO), ms); });
    return Promise.race([promesa, tope]).finally(() => clearTimeout(timer));
};
