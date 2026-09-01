import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { podeTrabalhar } from './documents.js';
import { temFotoDeHoje } from './turnos.js';
import { initSchema, pool, query } from './db.js';
import { authRouter } from './routes/auth.js';
import { ridesRouter } from './routes/rides.js';
import { driverRouter } from './routes/driver.js';
import { adminRouter } from './routes/admin.js';
import { quoteRouter } from './routes/quote.js';
import { verifyToken } from './auth.js';
import { setOnline, updateLocation } from './drivers.js';
import { one } from './db.js';
import { lugaresRouter } from './routes/lugares.js';
import { estadoDaBusca } from './lugares.js';
import { municipioDe } from './municipios.js';

const app = express();
app.use(cors());
// Limite maior: os documentos dos motoristas viajam em base64
app.use(express.json({ limit: '6mb' }));

// Saúde real: confirma que a base de dados responde. Verificar apenas que
// o processo está vivo daria "ok" com o servidor incapaz de autenticar
// alguém — os painéis verdes e os utilizadores à porta.
// Qual é a versão que está mesmo no ar? Já perdemos tempo várias vezes a
// testar contra um servidor que ainda tinha o código anterior — o Render
// demora minutos a reconstruir depois de um push. O Render expõe o commit
// em RENDER_GIT_COMMIT; localmente não existe e dizemos 'local'.
const VERSAO = (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7);
const ARRANQUE = new Date().toISOString();

app.get('/api/health', async (req, res) => {
  const base = {
    service: 'TimorgianaRide',
    time: new Date().toISOString(),
    versao: VERSAO,
    desde: ARRANQUE,
    // Diz se a segunda camada da busca está ligada — nunca a chave, só se
    // ela existe. Sem isto, a única forma de saber era escrever destinos na
    // app e adivinhar pela resposta.
    busca: estadoDaBusca(),
  };
  try {
    await query('SELECT 1');
    res.json({ ...base, ok: true, database: 'ok' });
  } catch (e) {
    console.error('[health] base de dados inacessível:', e.message);
    res.status(503).json({ ...base, ok: false, database: 'inacessível' });
  }
});

// Tarifas de referência. A app usa isto para sugerir um valor a partir
// da distância — mas o preço final continua a ser combinado entre as
// duas pessoas, que é o princípio do serviço.
app.get('/api/config/fares', (req, res) => {
  res.json({ fares: config.tarifas, currency: 'USD' });
});

// Números de emergência. Sem autenticação de propósito: uma pessoa em
// perigo pode ter a sessão expirada, e nada aqui é privado.
app.get('/api/config/emergencia', (req, res) => {
  res.json({ numeros: config.numerosEmergencia });
});

app.use('/api/auth', authRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/driver', driverRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/lugares', lugaresRouter);

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
      driverStatus: user.driver_status || null,
      isOnline: !!user.is_online,
      isAdmin: !!user.is_admin,
      municipio: user.municipio || null,
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
  // Os administradores ficam sempre numa sala própria para receberem os
  // pedidos de ajuda no instante em que acontecem.
  if (user.isAdmin) socket.join('admins');
  // Receber pedidos depende de estar aprovado, não do papel escolhido no
  // registo. Quem nunca pediu para conduzir tem driverStatus a 'pending'
  // por omissão e não entra nas salas — o que está certo.
  const podeReceberPedidos = user.driverStatus === 'approved';

  // Sala do município, além da do tipo de veículo.
  //
  // O Simão decidiu que cada município vê os seus pedidos: quem está em
  // Lospalos não recebe uma viagem pedida em Díli. Filtrar só a lista não
  // chegava — o `ride:new` empurra o pedido para o telemóvel em tempo real e
  // o motorista continuaria a vê-lo aparecer.
  //
  // A sala muda quando o motorista muda de município, o que se sabe a cada
  // posição comunicada. Começa no último município conhecido para não haver
  // um vazio entre ligar-se e mexer-se.
  let salaMunicipio = null;
  let dentroDasSalas = false;

  const ajustarMunicipio = (m) => {
    const nova = m ? `drivers:${user.vehicleType}:${m}` : null;
    if (nova === salaMunicipio) return;
    if (salaMunicipio) socket.leave(salaMunicipio);
    if (nova && dentroDasSalas) socket.join(nova);
    salaMunicipio = nova;
  };

  const entrarNasSalas = () => {
    dentroDasSalas = true;
    socket.join('drivers');
    socket.join(`drivers:${user.vehicleType}`);
    if (salaMunicipio) socket.join(salaMunicipio);
  };
  const sairDasSalas = () => {
    dentroDasSalas = false;
    socket.leave('drivers');
    socket.leave(`drivers:${user.vehicleType}`);
    if (salaMunicipio) socket.leave(salaMunicipio);
  };

  if (user.role === 'driver') ajustarMunicipio(user.municipio);

  // Só entra nas salas se estiver aprovado E disponível. Um motorista a
  // almoçar não deve receber pedidos que não vai aceitar — para o
  // passageiro, um pedido que ninguém atende é pior do que nenhum.
  if (podeReceberPedidos && user.isOnline) entrarNasSalas();

  socket.on('driver:setOnline', async (online, ack) => {
    if (!podeReceberPedidos) return;
    try {
      // As mesmas condições da rota HTTP. Existirem dois caminhos para
      // ficar disponível e só um verificar seria o mesmo que não
      // verificar: bastava usar o outro.
      if (online) {
        const apto = await podeTrabalhar(user.id);
        if (!apto.pode) return ack?.({ ok: false, motivo: apto.motivo, qual: apto.qual });
        if (!(await temFotoDeHoje(user.id))) {
          return ack?.({ ok: false, motivo: 'foto_de_turno' });
        }
      }
      await setOnline(user.id, online);
      user.isOnline = !!online;
      if (online) entrarNasSalas();
      else sairDasSalas();
      if (typeof ack === 'function') ack({ ok: true, online: !!online });
    } catch (e) {
      console.error('[socket] driver:setOnline', e.message);
      if (typeof ack === 'function') ack({ ok: false });
    }
  });

  // Posição do motorista: guardada e reencaminhada ao passageiro da
  // viagem em curso, para ele ver o veículo a aproximar-se.
  socket.on('driver:location', async ({ lat, lng } = {}) => {
    if (user.role !== 'driver') return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    try {
      await updateLocation(user.id, lat, lng);
      // Mudou de município? Muda de sala, e passa a ver os pedidos de lá.
      ajustarMunicipio(municipioDe(lat, lng));
      const viagem = await one(
        `SELECT id, passenger_id FROM rides
         WHERE driver_id = $1 AND status IN ('accepted','arriving')
         ORDER BY id DESC LIMIT 1`,
        [user.id]
      );
      if (viagem) {
        io.to(`user:${viagem.passenger_id}`).emit('ride:driverLocation', {
          rideId: viagem.id,
          lat,
          lng,
        });
      }
    } catch (e) {
      console.error('[socket] driver:location', e.message);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`[socket] desligado: ${user.name} (${user.role}#${user.id})`);
    // Se o motorista fecha a app, deixa de estar disponível. Caso
    // contrário continuaria a receber pedidos que nunca veria.
    if (podeReceberPedidos && user.isOnline) {
      await setOnline(user.id, false).catch(() => {});
    }
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
