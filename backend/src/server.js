import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import './db.js'; // inicializa a base de dados ao arrancar
import { authRouter } from './routes/auth.js';
import { ridesRouter } from './routes/rides.js';
import { verifyToken } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// Verificação de saúde (útil para testar a ligação a partir do telemóvel)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'TimorgianaRide', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/rides', ridesRouter);

// 404 para rotas /api desconhecidas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

const server = http.createServer(app);

// --- Tempo real (Socket.io) ---------------------------------------------
// Cada ligação é autenticada pelo token JWT enviado no handshake.
const io = new SocketServer(server, { cors: { origin: '*' } });

io.use((socket, next) => {
  const user = verifyToken(socket.handshake.auth?.token);
  if (!user) return next(new Error('Não autenticado.'));
  socket.user = {
    id: user.id,
    role: user.role,
    name: user.name,
    vehicleType: user.vehicle_type || 'car',
  };
  next();
});

io.on('connection', (socket) => {
  const { user } = socket;
  console.log(`[socket] ligado: ${user.name} (${user.role}#${user.id})`);

  // Sala pessoal: recebe atualizações das suas viagens
  socket.join(`user:${user.id}`);

  // Motoristas recebem novos pedidos (geral + filtrado pelo tipo de veículo)
  if (user.role === 'driver') {
    socket.join('drivers');
    socket.join(`drivers:${user.vehicleType}`);
  }

  socket.on('disconnect', () => {
    console.log(`[socket] desligado: ${user.name} (${user.role}#${user.id})`);
  });
});

// Disponibiliza o io para as rotas
app.set('io', io);

server.listen(config.port, () => {
  console.log(`[server] TimorgianaRide a correr em http://localhost:${config.port}`);
});
