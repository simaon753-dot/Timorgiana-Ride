import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { initSchema, pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { ridesRouter } from './routes/rides.js';
import { verifyToken } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'TimorgianaRide', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/rides', ridesRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Tratamento central de erros. Sem isto, uma falha da base de dados
// devolveria uma página HTML de erro em vez de JSON, e a app mostraria
// uma mensagem incompreensível.
app.use((err, req, res, next) => {
  console.error('[erro]', req.method, req.path, '—', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro no servidor. Tenta de novo.' });
});

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

io.use(async (socket, next) => {
  try {
    const user = await verifyToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('Não autenticado.'));
    socket.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      vehicleType: user.vehicle_type || 'car',
    };
    next();
  } catch (e) {
    next(new Error('Falha na autenticação.'));
  }
});

io.on('connection', (socket) => {
  const { user } = socket;
  console.log(`[socket] ligado: ${user.name} (${user.role}#${user.id})`);

  socket.join(`user:${user.id}`);
  if (user.role === 'driver') {
    socket.join('drivers');
    socket.join(`drivers:${user.vehicleType}`);
  }

  socket.on('disconnect', () => {
    console.log(`[socket] desligado: ${user.name} (${user.role}#${user.id})`);
  });
});

app.set('io', io);

// Só começa a aceitar pedidos depois de a base de dados estar pronta —
// senão os primeiros utilizadores apanhavam erros de tabela inexistente.
async function start() {
  try {
    await initSchema();
  } catch (e) {
    console.error('[arranque] não foi possível preparar a base de dados:', e.message);
    process.exit(1);
  }

  server.listen(config.port, () => {
    console.log(`[server] TimorgianaRide a escutar na porta ${config.port}`);
  });
}

// Encerramento limpo: o alojamento envia SIGTERM antes de reiniciar
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, async () => {
    console.log(`[server] ${sinal} recebido, a encerrar…`);
    server.close();
    await pool.end().catch(() => {});
    process.exit(0);
  });
}

start();
