import { io } from 'socket.io-client';
import { API_BASE_URL } from './config.js';

// Cria uma ligação Socket.io autenticada pelo token JWT.
// API_BASE_URL não inclui o /api (o Socket.io liga à raiz do servidor).
export function createSocket(token) {
  return io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
}
