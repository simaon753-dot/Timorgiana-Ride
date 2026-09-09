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
import { setOnline, updateLocation, marcarAusentesOffline } from './drivers.js';
import { one } from './db.js';
import { lugaresRouter } from './routes/lugares.js';
import { estadoDaBusca, marcarPorPerguntar } from './lugares.js';
import { estadoDasRotas, usoDeHoje } from './rotas.js';
import { estadoDoEmail } from './email.js';
import { mosaico } from './mosaicos.js';
import { gzipSync } from 'node:zlib';
import { municipioDe } from './municipios.js';
import {
  ACTIVE_DRIVER,
  expirarPedidosSemResposta,
  MINUTOS_ATE_DESISTIR,
  getRideById,
  toPublicRide,
} from './rides.js';
import { registarSemEsperar, EVENTOS } from './eventos.js';
import { limparAntigos, MESES_ACESSOS, MESES_EVENTOS } from './retencao.js';
import { fileURLToPath } from 'node:url';

const app = express();
// O Render põe um encaminhador à frente da aplicação. Sem isto, `req.ip` é o
// endereço desse encaminhador e não o de quem pediu — ou seja, o travão das
// tentativas de entrada via TODA A GENTE como sendo a mesma pessoa.
//
// O `1` é o número de saltos em que confiamos, e é o certo para o Render. Pôr
// `true` aceitaria qualquer cabeçalho `X-Forwarded-For` que chegasse, e esse
// cabeçalho escreve-se à mão — quem quisesse contornar o travão inventava um
// endereço novo em cada tentativa.
app.set('trust proxy', 1);
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
    // Quantas rotas já pedimos hoje ao Google, e se ele está sequer ligado.
    // Sem isto, a única forma de saber se a Routes API está activa era pedir
    // uma viagem e olhar para a linha — que é adivinhar com passos extra.
    const rotas = { ...estadoDasRotas(), hoje: await usoDeHoje().catch(() => null) };
    // Se o email está ligado, e o último erro se houve algum.
    //
    // Sem isto, um código de confirmação que não chega é indistinguível de um
    // que a pessoa não abriu — e a diferença é toda: num caso corrige-se a
    // configuração, no outro telefona-se à pessoa. Nunca mostra a chave, só
    // se ela existe.
    res.json({ ...base, ok: true, database: 'ok', rotas, email: estadoDoEmail() });
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

// O painel de aprovações, no browser.
//
// Servido pelo MESMO servidor que serve a API, e isso é a decisão que faz
// tudo o resto ser simples: mesma origem, portanto sem CORS, sem segundo
// alojamento, sem segunda conta para manter viva. Um ficheiro estático que
// vai no mesmo deploy do resto.
//
// `noindex` no cabeçalho e `no-store` para o browser não guardar em disco
// uma página que mostra documentos de identificação. A página em si não tem
// dados nenhuns — pede-os à API com a mesma senha da app — mas não custa
// nada dizer aos motores de busca que não têm nada que fazer aqui.
// Quem escreve só o endereço do serviço no browser quer o painel — não há
// mais nada aqui para uma pessoa ver. Sem isto apanhava um 404 seco.
app.get('/', (req, res) => res.redirect('/painel'));

// O MAPA PRÓPRIO, servido daqui.
//
// São 33 MB com Timor-Leste inteiro, do país à rua. Fica no repositório e o
// Render serve-o — não há terceiro serviço, não há conta nova, não há chave
// que possa ser revogada. É a única dependência do mapa que não pode fechar
// por causa de uma facturação.
//
// PEDIDOS POR TROÇOS, e é o que faz isto funcionar. O formato PMTiles é um
// ficheiro só, e quem o lê pede apenas os bytes dos mosaicos que está a
// mostrar — uns kilobytes por ecrã, não os 33 MB. O `sendFile` do Express
// responde a `Range` sozinho; sem isso, cada abertura do mapa descarregava o
// país inteiro.
//
// CORS aberto porque quem pede é a app, de outra origem. O ficheiro é
// público por natureza: são dados do OpenStreetMap, que qualquer um pode ir
// buscar à fonte.
app.get('/mapa/timor-leste.pmtiles', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, ETag');
  // Um mês. O mapa só muda quando alguém correr a receita outra vez, e a
  // diferença entre ter os dados de ontem ou os do mês passado não se vê a
  // conduzir em Díli.
  res.setHeader('Cache-Control', 'public, max-age=2592000');
  res.sendFile(fileURLToPath(new URL('../publico/timor-leste.pmtiles', import.meta.url)));
});

// OS MOSAICOS, um a um, num endereço que qualquer motor de mapas entende.
//
// A rota do ficheiro inteiro aqui em cima serve o browser, onde o MapLibre de
// JavaScript sabe ler `pmtiles://`. O MAPLIBRE NATIVO DO TELEMÓVEL NÃO SABE —
// vê esse endereço, não o entende, e não desenha nada.
//
// Foi erro meu: testei o mapa no browser, onde funciona, e não na app, onde
// não podia funcionar. O Simão instalou um APK para descobrir isso.
app.get('/mapa/:z/:x/:y.mvt', async (req, res) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 15) return res.status(400).end();
  try {
    const bruto = await mosaico(z, x, y);
    // Sem conteúdo e não erro: um mosaico vazio é o mar, ou um sítio onde não
    // há nada desenhado. O motor de mapas espera 204 e não estranha.
    if (!bruto) return res.status(204).end();

    res.setHeader('Content-Type', 'application/vnd.mapbox-vector-tile');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');

    // O leitor devolve o mosaico já descomprimido. Volta a comprimir-se antes
    // de sair: são cerca de metade dos bytes, e num plano gratuito a largura
    // de banda é a conta que se paga a sério.
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
      res.setHeader('Content-Encoding', 'gzip');
      return res.end(gzipSync(bruto));
    }
    return res.end(bruto);
  } catch (e) {
    console.error('[mapa] mosaico', z, x, y, e.message);
    return res.status(500).end();
  }
});

// O estilo, ao lado do mapa.
//
// SEPARADO do ficheiro dos mosaicos de propósito: mudar as cores passa a ser
// substituir um ficheiro de texto e publicar o servidor. Ninguém instala APK
// nenhum para o mapa mudar de aspecto.
app.get('/mapa/estilo.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(fileURLToPath(new URL('../publico/estilo.json', import.meta.url)));
});

// OS DOCUMENTOS LEGAIS, num endereço público.
//
// O Google Play exige um URL para a política de privacidade — o texto dentro
// da aplicação não serve, e sem ele a submissão é recusada. É requisito de
// publicação, não uma cortesia.
//
// As páginas são GERADAS do mesmo texto que a app mostra
// (`scripts/gerar-legal.mjs`), e não escritas à parte. Duas cópias de um
// documento legal divergem, e duas versões diferentes são piores do que uma
// só: ninguém sabe qual vale.
//
// Ao contrário do painel, estas QUEREM ser indexadas — quem procurar a
// política de privacidade da TimorgianaRide deve encontrá-la.
for (const [caminho, ficheiro] of [
  ['/privacidade', 'privacidade.html'],
  ['/termos', 'termos.html'],
]) {
  app.get(caminho, (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(fileURLToPath(new URL(`../publico/${ficheiro}`, import.meta.url)));
  });
}

app.get('/painel', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  // `fileURLToPath` e não `.pathname`.
  //
  // O `.pathname` de uma URL devolve o caminho CODIFICADO: a pasta deste
  // projecto chama-se "Claude Code", com um espaço, e saía
  // ".../Claude%20Code/..." — que o sistema de ficheiros não encontra.
  // No servidor do Render o caminho não tem espaços e isto nunca teria dado
  // erro; só se via no computador de quem o escreveu.
  res.sendFile(fileURLToPath(new URL('../publico/painel.html', import.meta.url)));
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
      // O MUNICÍPIO, CALCULADO DA ÚLTIMA POSIÇÃO CONHECIDA.
      //
      // Estava `user.municipio || null`, e a coluna `municipio` não existe em
      // `users` — nem o auth.js nem o users.js alguma vez a calcularam.
      // Chegava aqui sempre a null.
      //
      // O comentário logo abaixo dizia que devia começar no último município
      // conhecido "para não haver um vazio entre ligar-se e mexer-se". Esse
      // vazio existia: ao ligar o serviço, o motorista entrava em `drivers` e
      // `drivers:car`, mas NÃO na sala do seu município — e é para a sala do
      // município que os pedidos vão.
      //
      // Só entrava lá na primeira posição comunicada, que depende de um sinal
      // de GPS. Em Díli, entre prédios, isso são segundos ou dezenas de
      // segundos em que o motorista está online e não recebe pedido nenhum.
      //
      // Descoberto a testar com um motorista de teste: o primeiro pedido do
      // Simão não chegou e o segundo chegou — a diferença foi ter havido uma
      // posição comunicada entre os dois.
      municipio: municipioDe(Number(user.last_lat), Number(user.last_lng)),
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
      // 'in_progress' TAMBÉM, e faltava.
      //
      // A posição do motorista só era enviada ao passageiro enquanto a
      // viagem estivesse 'accepted' ou 'arriving'. No instante em que a
      // viagem COMEÇA, o envio parava — e o mapa do passageiro congelava no
      // último ponto antes de entrar no carro.
      //
      // Ou seja: durante a viagem inteira, que é justamente quando alguém
      // quer ver por onde vai, o mapa não mostrava nada. Descoberto a
      // percorrer 6,6 km de teste até Cristo Rei sem que o Simão visse o
      // carro sair do sítio.
      //
      // É também o que alimenta o "estou na Avenida X" e o que a pessoa com
      // quem a viagem foi partilhada vê — os dois estavam mortos pela mesma
      // razão.
      const viagem = await one(
        `SELECT id, passenger_id FROM rides
         WHERE driver_id = $1 AND status = ANY($2)
         ORDER BY id DESC LIMIT 1`,
        [user.id, ACTIVE_DRIVER]
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

  // OS FANTASMAS DO REINÍCIO ANTERIOR.
  //
  // Nenhum socket sobrevive a um reinício, mas a base de dados sobrevive.
  // Quem estava ao serviço quando o servidor caiu continua marcado como
  // disponível, sem ligação nenhuma — e o `disconnect` que trataria disso
  // morreu com o servidor.
  //
  // No plano gratuito do Render isto acontece a cada publicação e sempre
  // que o serviço acorda de dormir, portanto não é um caso raro: é o caso
  // normal.
  //
  // Varre-se uma vez ao arrancar e depois de minuto a minuto, para os que
  // desaparecem em marcha. Ver `marcarAusentesOffline` para saber porque
  // não se limpa toda a gente de uma vez.
  async function varrerAusentes(quando) {
    try {
      const idos = await marcarAusentesOffline();
      if (idos.length) {
        console.log(
          `[presença] ${quando}: ${idos.length} motorista(s) sem sinal, marcados indisponíveis` +
            ` — ${idos.map((d) => `#${d.id} ${d.name}`).join(', ')}`
        );
      }
    } catch (e) {
      console.error('[presença] não foi possível varrer:', e.message);
    }
  }
  await varrerAusentes('ao arrancar');

  // PEDIDOS QUE NINGUÉM ACEITOU.
  //
  // Vai à boleia do mesmo varrimento de minuto a minuto, e pela mesma razão:
  // um temporizador próprio não corre quando o servidor adormece, mas este
  // acorda com ele. Ver `expirarPedidosSemResposta`.
  async function varrerPedidosMortos() {
    try {
      const mortos = await expirarPedidosSemResposta();
      for (const p of mortos) {
        // Avisar quem estava à espera. Sem isto, o ecrã do passageiro ficava a
        // dizer "à procura de motorista" para sempre, sobre uma viagem que já
        // não existe.
        const linha = await getRideById(p.id);
        if (linha)
          io.to(`user:${p.passenger_id}`).emit(
            'ride:update',
            toPublicRide(linha, { paraPassageiro: true })
          );
        registarSemEsperar({
          rideId: p.id,
          que: EVENTOS.CANCELADA,
          de: 'requested',
          para: 'cancelled',
          detalhe: { motivo: 'sem_motorista', minutos: MINUTOS_ATE_DESISTIR },
        });
      }
      if (mortos.length) {
        console.log(
          `[pedidos] ${mortos.length} sem resposta há ${MINUTOS_ATE_DESISTIR} min, fechados`
        );
      }
    } catch (e) {
      console.error('[pedidos] não foi possível varrer:', e.message);
    }
  }
  await varrerPedidosMortos();

  // O QUE JÁ PASSOU DO PRAZO.
  //
  // De hora a hora, e não de minuto a minuto como os outros dois: apagar
  // linhas velhas não tem pressa nenhuma, e uma passagem que não encontra
  // nada continua a custar uma ida à base de dados.
  //
  // Corre também ao arrancar, porque no plano gratuito o servidor adormece —
  // se só corresse pelo temporizador, uma semana de pouco movimento passava
  // sem limpeza nenhuma.
  async function varrerPrazos() {
    try {
      const feito = await limparAntigos();
      if (feito.eventos || feito.acessos) {
        console.log(
          `[retenção] ${feito.eventos} evento(s) além de ${MESES_EVENTOS} meses e` +
            ` ${feito.acessos} acesso(s) além de ${MESES_ACESSOS} meses, apagados`
        );
      }
    } catch (e) {
      console.error('[retenção] não foi possível limpar:', e.message);
    }
  }
  await varrerPrazos();
  setInterval(varrerPrazos, 3600000).unref();

  // Perguntar ao Google pelos lugares aprovados que ainda não foram
  // perguntados. Não se espera por isto para abrir a porta: são chamadas a um
  // serviço de fora, e o servidor não deve ficar em baixo porque o Google
  // está lento.
  marcarPorPerguntar(query)
    .then((n) => {
      if (n) console.log(`[lugares] ${n} lugar(es) perguntados ao Google`);
    })
    .catch((e) => console.error('[lugares] não foi possível perguntar:', e.message));
  setInterval(() => {
    varrerAusentes('em marcha');
    varrerPedidosMortos();
  }, 60000).unref();

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
