// Um motorista de teste, para ver a posição a mexer no ecrã do passageiro.
//
// PARA QUE SERVE. Provar o acompanhamento em tempo real precisa de dois
// telemóveis: um a pedir e outro a conduzir. Quem tem um só nunca chega a
// ver o carro aproximar-se — que é justamente a parte que faz o passageiro
// confiar na aplicação.
//
// Este script faz o papel do segundo telemóvel. Liga-se ao servidor pelo
// mesmo socket que a aplicação usa, entra ao serviço, aceita a viagem que
// lhe for oferecida e passa a enviar posições — a partir do posto de
// combustível do ETO e a caminho da recolha.
//
// NÃO É UM ATALHO NO SERVIDOR. Fala pelo mesmo caminho que a app do
// motorista: mesma autenticação, mesmos eventos, mesmas verificações. Se
// este script consegue, um telemóvel também consegue — e o contrário
// também é verdade, que é o que faz dele um teste e não uma encenação.
//
//   node scripts/motorista-de-teste.mjs
//
// Pára com Ctrl+C, e ao parar fica offline.
import 'dotenv/config';
import { io } from 'socket.io-client';
import { pool, query, one } from '../src/db.js';
import bcrypt from 'bcryptjs';

const TEL = '79999124';
const SENHA = 'teste-motorista-2026';
const ETO = { lat: -8.55382, lng: 125.56584 }; // posto de combustível, Farol
const SERVIDOR = process.env.SERVIDOR || 'https://timorgiana-ride.onrender.com';
const TIPO = process.env.TIPO || 'car';

function metros(a, b) {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// ── A conta ──────────────────────────────────────────────────────────────
//
// Aprovada, com os cinco documentos e a fotografia do dia. Não é para
// contornar as verificações: é para as CUMPRIR, porque de outro modo o
// servidor recusa-lhe a entrada ao serviço — e é isso que se quer provar.
async function prepararConta() {
  let u = await one('SELECT * FROM users WHERE phone = $1', [TEL]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, phone, password_hash, role, vehicle_type, vehicle_model,
                          vehicle_plate, vehicle_color, vehicle_seats, driver_status,
                          terms_version, driver_terms_version, privacy_version)
       VALUES ('Motorista de teste', $1, $3, 'driver', $2, 'Toyota Avanza', 'TESTE-01',
               'branco', 4, 'approved', 'teste', 'teste', 'teste')
       RETURNING *`,
      [TEL, TIPO, await bcrypt.hash(SENHA, 10)]
    );
  } else {
    u = await one(
      `UPDATE users SET driver_status='approved', role='driver', vehicle_type=$2,
              password_hash=$3
        WHERE id=$1 RETURNING *`,
      [u.id, TIPO, await bcrypt.hash(SENHA, 10)]
    );
  }

  const hoje = "(NOW() AT TIME ZONE 'Asia/Dili')::date";
  for (const k of ['photo', 'identity', 'licence', 'vehicle', 'inspection']) {
    const comData = ['licence', 'vehicle', 'inspection'].includes(k);
    await query(
      `INSERT INTO driver_documents (user_id, kind, mime, bytes, size_bytes, expires_on)
       VALUES ($1,$2,'image/jpeg','\\x00'::bytea,1, ${comData ? `${hoje} + 200` : 'NULL'})
       ON CONFLICT (user_id, kind) DO UPDATE
         SET expires_on = EXCLUDED.expires_on`,
      [u.id, k]
    );
  }
  await query(
    `INSERT INTO driver_shifts (user_id, dia, mime, bytes)
     VALUES ($1, ${hoje}, 'image/jpeg', '\\x00'::bytea)
     ON CONFLICT (user_id, dia) DO NOTHING`,
    [u.id]
  );
  await query('UPDATE users SET last_lat=$2, last_lng=$3 WHERE id=$1', [u.id, ETO.lat, ETO.lng]);
  return u;
}

const u = await prepararConta();
console.log(`\n  Motorista de teste  ·  #${u.id}  ·  ${TIPO === 'car' ? 'Carro' : 'Motorizada'} branco  ·  TESTE-01`);
console.log(`  No posto do ETO  ·  ${ETO.lat}, ${ETO.lng}`);
console.log(`  Servidor: ${SERVIDOR}\n`);

// ENTRAR PELA PORTA DA FRENTE, e não com um bilhete feito em casa.
//
// A primeira versão assinava o token aqui, com o segredo do .env local. O
// servidor do Render tem outro segredo, e recusou-o com "Não autenticado" —
// e ainda bem. Um script de teste que consegue forjar credenciais não está
// a testar a autenticação: está a contorná-la.
//
// Agora faz o que a aplicação faz: telemóvel e palavra-passe no /auth/login,
// e usa o token que o servidor devolver.
const entrada = await fetch(`${SERVIDOR}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: TEL, password: SENHA }),
});
if (!entrada.ok) {
  console.log('  ✗ não entrou:', (await entrada.text()).slice(0, 140));
  await pool.end();
  process.exit(1);
}
const TOKEN = (await entrada.json()).token;
console.log('  ✓ sessão iniciada no servidor\n');

const socket = io(SERVIDOR, {
  transports: ['websocket'],
  auth: { token: TOKEN },
});

let posicao = { ...ETO };
let viagem = null;
let relogio = null;

socket.on('connect', () => {
  console.log('  ligado. A entrar ao serviço…');
  socket.emit('driver:setOnline', true, (r) => {
    if (!r?.ok) {
      console.log(`  ✗ recusado: ${r?.motivo || 'sem motivo'}`);
      return terminar();
    }
    console.log('  ✓ ao serviço, à espera de pedido.\n');
    console.log('  Peça uma viagem no seu telemóvel — escolha ' +
      (TIPO === 'car' ? 'CARRO' : 'MOTORIZADA') + '.\n');
    enviarPosicao();
    relogio = setInterval(enviarPosicao, 4000);
  });
});

function enviarPosicao() {
  socket.emit('driver:location', posicao);
  // A caminho da recolha: aproxima-se 60 metros de cada vez. É o que faz o
  // ponto MEXER no ecrã dele — parado, não se distingue de uma fotografia.
  if (viagem?.origin) {
    const d = metros(posicao, viagem.origin);
    if (d > 40) {
      const f = Math.min(1, 60 / d);
      posicao = {
        lat: posicao.lat + (viagem.origin.lat - posicao.lat) * f,
        lng: posicao.lng + (viagem.origin.lng - posicao.lng) * f,
      };
      console.log(`  a ${Math.round(d)} m da recolha`);
    } else if (d <= 40) {
      console.log('  ✓ chegou ao ponto de recolha');
    }
  }
}

socket.on('ride:new', async (r) => {
  if (viagem) return;
  console.log(`\n  ► pedido #${r.id}  ·  ${r.originLabel || '—'}  →  ${r.destLabel || '—'}`);
  const resp = await fetch(`${SERVIDOR}/api/rides/${r.id}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + TOKEN,
    },
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    console.log('  ✗ não consegui aceitar:', (await resp.text()).slice(0, 120));
    return;
  }
  // Number() de propósito: o Postgres devolve `double precision` como texto
  // no JSON, e uma soma com texto dá concatenação em vez de aritmética — o
  // carro deslizaria para o meio do oceano em vez de andar até à recolha.
  const oLat = Number(r.originLat);
  const oLng = Number(r.originLng);
  viagem = { id: r.id, origin: Number.isFinite(oLat) && Number.isFinite(oLng)
    ? { lat: oLat, lng: oLng } : null };
  console.log(viagem.origin
    ? '  ✓ ACEITE. A caminho — veja o carro mexer no seu ecrã.\n'
    : '  ✓ ACEITE, mas o pedido veio sem coordenadas de recolha: fico parado no ETO.\n');
});

socket.on('connect_error', (e) => console.log('  ✗ ligação:', e.message));

async function terminar() {
  clearInterval(relogio);
  try { socket.emit('driver:setOnline', false); } catch {}
  await query('UPDATE users SET is_online = FALSE WHERE id = $1', [u.id]).catch(() => {});
  socket.close();
  await pool.end().catch(() => {});
  console.log('\n  offline. Fim.\n');
  process.exit(0);
}
process.on('SIGINT', terminar);
