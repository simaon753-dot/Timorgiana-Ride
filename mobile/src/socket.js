import { io } from 'socket.io-client';
import { getBaseUrl } from './serverUrl.js';

// Cria uma ligação Socket.io autenticada pelo token JWT.
// O endereço é lido no momento da ligação (o utilizador pode tê-lo
// mudado nas definições). Não inclui /api — o Socket.io liga à raiz.
export function createSocket(token) {
  return io(getBaseUrl(), {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
}
