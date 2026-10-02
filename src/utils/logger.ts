import pino from 'pino';
import { format } from 'util';

// Logger unico de la app. Reemplaza console.* para que produccion no se sature:
// los diagnosticos ruidosos (geocoding, impresion, flujo del bot) son `debug` y
// quedan apagados salvo que se suba LOG_LEVEL.
//
// LOG_LEVEL: trace|debug|info|warn|error|fatal|silent
//   produccion  -> info  (sin el detalle de cada geocodificacion)
//   desarrollo  -> debug (todo, con formato legible via pino-pretty)
// Subirlo en caliente sin tocar codigo:
//   LOG_LEVEL=debug pm2 restart restobar-api --update-env

const esProduccion = process.env.NODE_ENV === 'production';

// pino-pretty es devDependency: con `npm ci --omit=dev` no existe en el server.
// Si ademas alli NODE_ENV no quedo en 'production', pedir el transport tumbaria
// el arranque. Se usa solo si de verdad esta instalado.
const hayPinoPretty = (() => {
    try {
        require.resolve('pino-pretty');
        return true;
    } catch {
        return false;
    }
})();

export const logger = pino({
    level: process.env.LOG_LEVEL || (esProduccion ? 'info' : 'debug'),
    // pm2 ya pone su propio timestamp en el archivo; en dev lo formatea pino-pretty.
    base: undefined,
    hooks: {
        // pino NO concatena los argumentos sueltos: logger.error('fallo:', err.message)
        // imprimiria solo "fallo:" y tiraria el detalle. Como el codigo venia de
        // console.*, se formatea igual que console (util.format) cuando el primer
        // argumento es un string. Objeto primero = comportamiento nativo de pino
        // (campos estructurados), por si mas adelante se usa.
        logMethod(args: any[], method: any) {
            if (args.length > 1 && typeof args[0] === 'string') {
                return method.call(this, format(...(args as [string, ...any[]])));
            }
            return method.apply(this, args as any);
        }
    },
    // ponytail: pino-pretty solo en dev. En produccion sale JSON por stdout y lo
    // recoge pm2 (mas barato y se puede grepear/parsear).
    ...(esProduccion || !hayPinoPretty ? {} : {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
        }
    })
});

export default logger;
