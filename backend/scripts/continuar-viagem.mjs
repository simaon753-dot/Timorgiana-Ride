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
const PASSO_M = 120;      // metros por salto
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
if (!v) { console.log('  não há viagem em curso.'); await pool.end(); process.exit(0); }

const entrada = await fetch(`${SERVIDOR}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  console.log(r.ok
    ? `  ✓ viagem iniciada com o código ${v.pickup_code} (lido da base — ver a nota no topo)`
    : '  ✗ ' + (await r.text()).slice(0, 120));
  await espera(2000);
}

console.log(`\n  a caminho de ${v.dest_label}\n`);
const total = metros(pos, destino);
while (metros(pos, destino) > 60) {
  const d = metros(pos, destino);
  const f = Math.min(1, PASSO_M / d);
  pos = { lat: pos.lat + (destino.lat - pos.lat) * f, lng: pos.lng + (destino.lng - pos.lng) * f };
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
