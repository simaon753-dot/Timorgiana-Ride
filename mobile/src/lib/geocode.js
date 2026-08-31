import { getApiUrl } from '../serverUrl.js';
// Pesquisa e nomes de lugares, via OpenStreetMap (Nominatim).
//
// O Nominatim exige que cada aplicação se identifique e pede que não se
// façam mais de ~1 pedido por segundo. Por isso a pesquisa é adiada
// enquanto a pessoa escreve (ver useBuscaLugares) em vez de disparar a
// cada tecla.
const UA = 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)';
const BASE = 'https://nominatim.openstreetmap.org';

// Limites de Timor-Leste: evita devolver sítios com o mesmo nome noutros
// países, que seria pior do que não encontrar nada.
//
// A caixa é usada com `bounded=1`, ou seja, corta mesmo o que fica de fora.
// A anterior — 124.0 a 127.4 — encostava às pontas do país sem folga
// nenhuma: a ponta ocidental de Oecusse e o norte de Ataúro ficavam à
// beira da linha. Um sítio meio metro fora deixava de aparecer, e quem
// procurasse não percebia porquê.
//
// Agora leva margem em toda a volta. Alargar não traz lixo de outros
// países porque quem faz o trabalho de excluir é o `countrycodes`; a caixa
// só evita homónimos e ordena por proximidade.
const TIMOR = { viewbox: '123.8,-9.8,127.6,-8.0', countrycodes: 'tl' };

function nomeCurto(display) {
  return display.split(',').slice(0, 2).join(',').trim();
}

// ── Rede lenta ────────────────────────────────────────────────────────
//
// Em Díli a ligação é lenta e o preço dos dados é real. Três medidas, e
// nenhuma delas muda o que o utilizador vê quando a rede está boa:
//
//   1. PRAZO. Sem prazo, um pedido pendurado numa rede má nunca resolve
//      nem falha — fica para sempre, e com ele o nome da rua.
//   2. MEMÓRIA. A mesma rua perguntada duas vezes custa duas vezes. Um
//      motorista que faz o mesmo percurso todos os dias passa a pagar
//      pelo nome de cada rua uma vez por sessão, e não a cada passagem.
//   3. UM DE CADA VEZ. Numa rede lenta os pedidos acumulam-se mais
//      depressa do que se resolvem. Se já houver um a caminho, o
//      seguinte é descartado: a posição de agora vale mais do que uma
//      resposta sobre onde se esteve há trinta segundos.
const PRAZO_MS = 9000;
const memoria = new Map();
const MAX_MEMORIA = 200;

// Três casas decimais são cerca de 110 metros — a mesma ordem de grandeza
// do salto mínimo que já se exige para voltar a perguntar.
function chave(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function lembrar(k, valor) {
  if (memoria.size >= MAX_MEMORIA) memoria.delete(memoria.keys().next().value);
  memoria.set(k, valor);
  return valor;
}

async function buscar(url, sinal, token) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
  // Um sinal vindo de fora (o utilizador mudou de ecrã) também corta.
  if (sinal) sinal.addEventListener?.('abort', () => ctrl.abort());
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': UA,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

// Busca de lugares, agora pelo nosso servidor.
//
// Antes ia direita ao Nominatim, do telemóvel. Passou a ir pelo servidor por
// duas razões, e a segunda é a que mais se nota em Díli:
//
//   1. O servidor tem uma segunda camada — o Google — para os sítios que o
//      OpenStreetMap ainda não conhece. A chave de facturação não pode viver
//      dentro da app: quem descarrega o APK consegue tirá-la de lá.
//   2. O servidor guarda as respostas. O segundo passageiro a procurar
//      "Timor Plaza" recebe-a sem sair do país.
//
// Se o nosso servidor não responder, cai para o Nominatim como sempre fez.
// O que é novo tem de poder falhar sem levar o resto atrás — o mesmo
// princípio do sino das notificações.
export async function pesquisarLugares(termo, sinal, token) {
  const q = String(termo || '').trim();
  if (q.length < 3) return [];

  if (token) {
    const r = await buscar(`${getApiUrl()}/lugares?q=${encodeURIComponent(q)}`, sinal, token);
    if (Array.isArray(r?.lugares)) return r.lugares;
  }
  return pesquisarNoNominatim(q, sinal);
}

// O caminho antigo, guardado inteiro como rede de segurança.
async function pesquisarNoNominatim(q, sinal) {
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '6',
    addressdetails: '0',
    countrycodes: TIMOR.countrycodes,
    viewbox: TIMOR.viewbox,
    bounded: '1',
  });

  const rs = await buscar(`${BASE}/search?${params}`, sinal);
  if (!Array.isArray(rs)) return [];
  try {
    return rs.map((x) => ({
      id: `${x.osm_type || 'x'}${x.osm_id || Math.random()}`,
      label: nomeCurto(x.display_name),
      detalhe: x.display_name.split(',').slice(2, 4).join(',').trim(),
      lat: Number(x.lat),
      lng: Number(x.lon),
    }));
  } catch {
    return []; // resposta inesperada
  }
}

export async function nomeDoLugar(lat, lng) {
  const k = `l:${chave(lat, lng)}`;
  if (memoria.has(k)) return memoria.get(k);
  const j = await buscar(`${BASE}/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`);
  if (!j) return null; // falha não se guarda: da próxima pode correr bem
  return lembrar(k, j?.display_name ? nomeCurto(j.display_name) : null);
}

export const rotuloCoordenadas = (lat, lng) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// Nome da RUA onde está um ponto. Usado para acompanhar o veículo em
// movimento: o que interessa a quem vai no carro — e a quem quer avisar
// alguém — é "estou na Avenida de Portugal", não uma coordenada.
//
// zoom=17 e addressdetails=1 para vir o campo `road`; sem isso o Nominatim
// devolve o bairro, que muda pouco e não ajuda a localizar.
let ruaEmCurso = false;

export async function nomeDaRua(lat, lng) {
  const k = `r:${chave(lat, lng)}`;
  if (memoria.has(k)) return memoria.get(k);

  // Já há um a caminho: desiste. O rótulo do veículo fica com o nome
  // anterior mais um instante, que é melhor do que uma fila de pedidos a
  // responder sobre ruas por onde já se passou.
  if (ruaEmCurso) return null;
  ruaEmCurso = true;
  try {
    const j = await buscar(
      `${BASE}/reverse?format=json&zoom=17&addressdetails=1&lat=${lat}&lon=${lng}`
    );
    if (!j) return null;
    const a = j?.address || {};
    const rua = a.road || a.pedestrian || a.residential || a.suburb || a.village;
    return lembrar(k, rua || (j?.display_name ? nomeCurto(j.display_name) : null));
  } finally {
    ruaEmCurso = false;
  }
}

// Metros entre dois pontos. Serve para não repetir a pergunta ao Nominatim
// enquanto o veículo não sair do sítio — um carro parado num semáforo não
// tem rua nova para nos dizer, e o serviço é gratuito e partilhado.
export function metrosEntre(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
