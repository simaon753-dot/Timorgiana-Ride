// Leva a viagem do motorista de teste até ao fim.
//
// Faz o que um motorista faz, pela ordem e pelos mesmos caminhos: avisa que
// chegou, começa a viagem com o código de recolha, percorre o trajecto
// enviando posições, e conclui.
//
// O CÓDIGO DE RECOLHA É O ÚNICO ATALHO DESTE TESTE. Leio-o da base de dados
// em vez de o ouvir do passageiro. A validação do lado do servidor corre na
// mesma — um código errado seria recusado —, mas o gesto humano que o código
// existe para provar (o passageiro dizer, o motorista escrever) fica por
// testar. Está dito para não passar por provado o que não foi.
import 'dotenv/config';
import { io } from 'socket.io-client';
import { pool, one, query } from '../src/db.js';

const TEL = '79999124';
const SENHA = 'teste-motorista-2026';
const SERVIDOR = process.env.SERVIDOR || 'https://timorgiana-ride.onrender.com';
const PASSO_M = 120; // metros por salto
const INTERVALO_MS = 3000;

const metros = (a, b) => {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

const u = await one('SELECT id FROM users WHERE phone = $1', [TEL]);
const v = await one(
  `SELECT id, status, pickup_code, origin_lat, origin_lng, dest_lat, dest_lng, dest_label
     FROM rides WHERE driver_id = $1 AND status IN ('accepted','arriving','in_progress')
     ORDER BY id DESC LIMIT 1`,
  [u.id]
);
if (!v) {
  console.log('  não há viagem em curso.');
  await pool.end();
  process.exit(0);
}

const entrada = await fetch(`${SERVIDOR}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: TEL, password: SENHA }),
});
const TOKEN = (await entrada.json()).token;
const api = (caminho, corpo) =>
  fetch(`${SERVIDOR}/api${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify(corpo || {}),
  });

console.log(`\n  viagem #${v.id}  ·  ${v.status}  →  ${v.dest_label}`);

const socket = io(SERVIDOR, { transports: ['websocket'], auth: { token: TOKEN } });
await new Promise((r) => socket.on('connect', r));
socket.emit('driver:setOnline', true, () => {});

// SAIR DE SERVIÇO SEJA COMO FOR QUE ISTO MORRA.
//
// Este guião põe um motorista ao serviço no servidor de PRODUÇÃO. Se for
// interrompido a meio — Ctrl+C, `pkill`, o terminal fechado, o computador a
// adormecer — fica lá um motorista fantasma, e um passageiro a sério pode
// ver a viagem aceite por um carro que não existe.
//
// Aconteceu com o outro guião em 06/09/2026 e foi preciso limpar à mão.
// Um ensaio não pode estragar a produção.
async function sairDeServico() {
  try {
    socket.emit('driver:setOnline', false);
  } catch {
    /* o socket já pode estar morto; a base é que decide */
  }
  await query('UPDATE users SET is_online = FALSE WHERE id = $1', [u.id]).catch(() => {});
  console.log('\n  offline. Fim.\n');
  process.exit(0);
}
for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sinal, sairDeServico);
process.on('uncaughtException', (e) => {
  console.error('\n  ✗ erro:', e?.message || e);
  sairDeServico();
});

let pos = { lat: Number(v.origin_lat), lng: Number(v.origin_lng) };
const destino = { lat: Number(v.dest_lat), lng: Number(v.dest_lng) };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

if (v.status === 'accepted') {
  const r = await api(`/rides/${v.id}/status`, { status: 'arriving' });
  console.log(r.ok ? '  ✓ a chegar ao ponto de recolha' : '  ✗ ' + (await r.text()).slice(0, 90));
  await espera(2500);
}

if (v.status !== 'in_progress') {
  const r = await api(`/rides/${v.id}/start`, { code: v.pickup_code });
  console.log(
    r.ok
      ? `  ✓ viagem iniciada com o código ${v.pickup_code} (lido da base — ver a nota no topo)`
      : '  ✗ ' + (await r.text()).slice(0, 120)
  );
  await espera(2000);
}

// PELA ESTRADA, e não a direito.
//
// A primeira versão ia em linha recta, e numa viagem de dez quilómetros
// isso faz o carro atravessar a baía. Na app não é defeito — ela desenha
// onde lhe dizem, e um motorista a sério manda posições de GPS, que estão
// na estrada porque ele está na estrada. Mas um ensaio que não se parece
// com a realidade ensaia pouco.
//
// É o MESMO motor de rotas que desenha a linha no mapa do passageiro, e
// "full" em vez de "simplified": para desenhar bastam vinte pontos, para
// andar por eles quantos mais melhor.
async function estrada(a, b) {
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  try {
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(relogio);
    const j = await r.json();
    const pontos = j?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(pontos) || pontos.length < 2) return null;
    return pontos.map((c) => ({ lat: c[1], lng: c[0] }));
  } catch {
    return null;
  }
}

console.log(`\n  a caminho de ${v.dest_label}\n`);
const caminho = (await estrada(pos, destino)) || [];
console.log(
  caminho.length
    ? `  pela estrada, ${caminho.length} pontos\n`
    : '  sem rota do servidor de estradas: vai a direito\n'
);

const total = metros(pos, destino);
while (metros(pos, destino) > 60) {
  const d = metros(pos, destino);
  // Consome os pontos da estrada que couberem no salto; quando acabarem,
  // aproxima-se do destino a direito. Sem rede é o que há, e um ensaio
  // imperfeito continua a valer mais do que nenhum.
  let restante = PASSO_M;
  while (restante > 0 && caminho.length) {
    const proximo = caminho[0];
    const p = metros(pos, proximo);
    if (p <= restante) {
      pos = proximo;
      caminho.shift();
      restante -= p;
    } else {
      const f = restante / p;
      pos = {
        lat: pos.lat + (proximo.lat - pos.lat) * f,
        lng: pos.lng + (proximo.lng - pos.lng) * f,
      };
      restante = 0;
    }
  }
  if (!caminho.length) {
    const f = Math.min(1, PASSO_M / d);
    pos = {
      lat: pos.lat + (destino.lat - pos.lat) * f,
      lng: pos.lng + (destino.lng - pos.lng) * f,
    };
  }
  socket.emit('driver:location', pos);
  const feito = Math.round(((total - d) / total) * 100);
  console.log(`  ${String(feito).padStart(3)} %   faltam ${Math.round(d)} m`);
  await espera(INTERVALO_MS);
}
socket.emit('driver:location', destino);
console.log('\n  ✓ chegou ao destino');
await espera(2000);

const fim = await api(`/rides/${v.id}/status`, { status: 'completed' });
console.log(fim.ok ? '  ✓ VIAGEM CONCLUÍDA' : '  ✗ ' + (await fim.text()).slice(0, 120));

socket.emit('driver:setOnline', false);
await query('UPDATE users SET is_online = FALSE WHERE id = $1', [u.id]).catch(() => {});
socket.close();
await pool.end();
console.log();
process.exit(0);
