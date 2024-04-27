import io from 'socket.io-client';
require('dotenv').config();

class SocketService {
    private socket: any;

    constructor() {                            
    }

    // evento para conectarse al socket
    async connectSocket(query: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const socketServer = process.env.SOCKET_SERVER_URL_RESTOBAR || 'http://localhost:5819';
            console.log('socketServer', socketServer);
            this.socket = io(socketServer, {
                query
            });

            this.socket.on('connect', () => {
                console.log('Conectado al socket');
                resolve(true);
            });
        });
    }

    querySocket(perfil: string): any {
        let _querySocket = {}
        switch (perfil) {
            case 'repartidor': 
                _querySocket = {
                    idrepartidor: 0,
                    isFromApp: 1,
                    isRepartidor: true,
                    firts_socketid: ''
                }
                break;
        }

        return _querySocket;
    }

    emitEvent(eventName: string, eventData: any) {
        console.log('eventName', eventName);
        this.socket.emit(eventName, eventData);                
    }

    // evento para desconectarse del socket
    disconnect() {
        this.socket.disconnect();
    }
}

export default SocketService;