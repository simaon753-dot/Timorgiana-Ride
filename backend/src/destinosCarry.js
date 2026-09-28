import { municipioDe } from './municipios.js';

// A TABELA DE DESTINOS DO PICKUP, EDITÁVEL NO PAINEL (28/09/2026).
//
// PORQUE EXISTE. O Simão trouxe a tabela que os pickups cobram na rua
// («Carry Lulik»: Aileu $50, Baucau $80…) e a comparação mostrou uma coisa
// que a nossa fórmula não sabia: nas viagens longas pela costa, o pickup
// cobra MENOS por quilómetro. Díli–Baucau dava ~$115 pela fórmula contra $80
// na rua; Díli–Batugadé ~$105 contra $70. Nas viagens de serra e médias a
// fórmula acertava. A decisão foi a da rua: entre municípios, um PREÇO FIXO
// POR DESTINO, que é o que o cliente já conhece; dentro de Díli, a fórmula.
//
// COMO SE RECONHECE UM DESTINO: um ponto e um raio. «Maubisse» é tudo o que
// fica até 6 km do centro de Maubisse. Não são as fronteiras administrativas
// — o servidor não as tem, e os destinos da rua não são todos municípios
// (Hera, Metinaro, Batas Mota Ain).
//
// A REGRA: uma ponta da viagem em Díli (o município, ver `municipios.js`) e
// a outra dentro do círculo do destino — nos dois sentidos, Díli–Baucau e
// Baucau–Díli custam o mesmo. Havendo dois círculos, ganha o mais pequeno,
// que é o mais preciso. Uma viagem com paragens pelo caminho fica sempre na
// fórmula: a tabela da rua é de ponto a ponto.
//
// O PREÇO É DA VIAGEM INTEIRA, como na rua — por isso o volume da carga não
// o multiplica. A ajuda a carregar continua a somar-se: é trabalho à porta,
// que a tabela da rua não inclui.
//
// `regra: 'dentro'` é o caso de «Díli Laran»: as DUAS pontas dentro do
// círculo. Vem desligado — dentro de Díli fica a fórmula, que dá ~$6–7
// contra os $10 da rua —, e liga-se no painel se o Simão quiser o preço da rua.

// Os de partida. Os da tabela da rua vêm ligados; os que eu deduzi para os
// municípios que ela não tem vêm DESLIGADOS, à espera de o Simão os confirmar
// — as distâncias em que assentam são aproximadas.
export const DESTINOS_PADRAO = [
  { id: 'aileu', nome: 'Aileu', lat: -8.7281, lng: 125.5664, raioKm: 8, precoUsd: 50, ativo: true },
  {
    id: 'manatuto',
    nome: 'Manatuto',
    lat: -8.51,
    lng: 126.015,
    raioKm: 8,
    precoUsd: 60,
    ativo: true,
  },
  { id: 'gleno', nome: 'Gleno', lat: -8.7167, lng: 125.4333, raioKm: 8, precoUsd: 50, ativo: true },
  {
    id: 'likisa',
    nome: 'Liquiçá',
    lat: -8.5883,
    lng: 125.3417,
    raioKm: 8,
    precoUsd: 40,
    ativo: true,
  },
  { id: 'hera', nome: 'Hera', lat: -8.529, lng: 125.689, raioKm: 4, precoUsd: 15, ativo: true },
  // METINARO E BATAS MOTA AIN ESTAVAM FORA DO SÍTIO (corrigido a 29/09/2026).
  // O ponto de Metinaro ficava 7,2 km a leste da vila e o de Batas Mota Ain
  // 14 km a leste da fronteira, ambos com raio mais pequeno do que o erro: quem
  // escolhia a vila pagava pela fórmula ($33,25 em vez de $20 numa captura do
  // Simão). Os pontos passaram para onde o NOSSO mapa desenha o nome (camada
  // `places`), que é a fonte que bate com o que a pessoa vê. Os preços não
  // mudaram. Ver os casos «vila real» em scripts/testar-destinos.mjs.
  {
    id: 'metinaro',
    nome: 'Metinaro',
    lat: -8.5297,
    lng: 125.741,
    raioKm: 5,
    precoUsd: 20,
    ativo: true,
  },
  {
    id: 'baucau',
    nome: 'Baucau',
    lat: -8.4667,
    lng: 126.45,
    raioKm: 10,
    precoUsd: 80,
    ativo: true,
  },
  {
    id: 'mota-ain',
    nome: 'Batas Mota Ain',
    // O posto de fronteira de Mota Ain; a vila de Batugade fica a 2,2 km,
    // dentro do raio.
    lat: -8.9574,
    lng: 124.9549,
    raioKm: 6,
    precoUsd: 70,
    ativo: true,
  },
  {
    id: 'maubisse',
    nome: 'Maubisse',
    lat: -8.8403,
    lng: 125.5967,
    raioKm: 6,
    precoUsd: 70,
    ativo: true,
  },
  {
    id: 'dili-laran',
    nome: 'Díli Laran',
    lat: -8.5569,
    lng: 125.5603,
    raioKm: 9,
    precoUsd: 10,
    ativo: false,
    regra: 'dentro',
  },
  // Propostas para os municípios que a tabela da rua não tem (28/09/2026).
  { id: 'same', nome: 'Same', lat: -9.0, lng: 125.65, raioKm: 8, precoUsd: 100, ativo: false },
  {
    id: 'maliana',
    nome: 'Maliana',
    lat: -8.9931,
    lng: 125.2214,
    raioKm: 8,
    precoUsd: 100,
    ativo: false,
  },
  {
    id: 'ainaro',
    nome: 'Ainaro',
    lat: -8.9928,
    lng: 125.5075,
    raioKm: 6,
    precoUsd: 110,
    ativo: false,
  },
  {
    id: 'viqueque',
    nome: 'Viqueque',
    lat: -8.8592,
    lng: 126.3644,
    raioKm: 8,
    precoUsd: 135,
    ativo: false,
  },
  { id: 'suai', nome: 'Suai', lat: -9.3122, lng: 125.2564, raioKm: 8, precoUsd: 150, ativo: false },
  {
    id: 'lospalos',
    nome: 'Lospalos',
    lat: -8.515,
    lng: 126.9958,
    raioKm: 8,
    precoUsd: 155,
    ativo: false,
  },
];

// Os limites de cada campo — um engano de dedo não pode pôr Baucau a $800
// nem um círculo a cobrir meio país.
export const LIMITES_DESTINOS = {
  maximo: 60,
  nome: { min: 2, max: 40 },
  lat: { min: -9.6, max: -8.1 },
  lng: { min: 124.0, max: 127.4 },
  raioKm: { min: 0.5, max: 30 },
  precoUsd: { min: 1, max: 500 },
};

const comRegra = (d) => ({ regra: 'desde_dili', ...d });

// Em memória, como os preços do Carry: consultado em cada cotação.
let destinos = DESTINOS_PADRAO.map(comRegra);
let personalizados = false;

export function destinosEmVigor() {
  return { destinos, personalizados };
}

// Aplica o que veio da base; sem nada (ou inválido), volta aos de partida.
export function aplicarDestinos(lista) {
  const v = lista == null ? {} : validarDestinos(lista);
  personalizados = !!v.limpos;
  destinos = (v.limpos || DESTINOS_PADRAO).map(comRegra);
}

// Só os campos conhecidos, dentro dos limites. Devolve `{ erro }` ou `{ limpos }`.
export function validarDestinos(lista) {
  if (!Array.isArray(lista)) return { erro: 'Lista de destinos inválida.' };
  if (lista.length > LIMITES_DESTINOS.maximo) return { erro: 'Demasiados destinos.' };
  const L = LIMITES_DESTINOS;
  const dentro = (n, l) =>
    n !== null &&
    n !== '' &&
    Number.isFinite(Number(n)) &&
    Number(n) >= l.min &&
    Number(n) <= l.max;
  const ids = new Set();
  const limpos = [];
  for (const d of lista) {
    const nome = typeof d?.nome === 'string' ? d.nome.trim() : '';
    if (nome.length < L.nome.min || nome.length > L.nome.max) {
      return { erro: 'Cada destino precisa de um nome (2 a 40 letras).' };
    }
    if (!dentro(d.lat, L.lat) || !dentro(d.lng, L.lng)) {
      return { erro: 'Há coordenadas fora de Timor-Leste.' };
    }
    if (!dentro(d.raioKm, L.raioKm)) return { erro: 'O raio tem de ser de 0,5 a 30 km.' };
    if (!dentro(d.precoUsd, L.precoUsd)) return { erro: 'O preço tem de ser de $1 a $500.' };
    let id = String(d.id || nome)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!id) id = 'destino';
    while (ids.has(id)) id += '-2';
    ids.add(id);
    limpos.push({
      id,
      nome,
      lat: Math.round(Number(d.lat) * 1e5) / 1e5,
      lng: Math.round(Number(d.lng) * 1e5) / 1e5,
      raioKm: Math.round(Number(d.raioKm) * 10) / 10,
      precoUsd: Math.round(Number(d.precoUsd) * 100) / 100,
      ativo: d.ativo !== false,
      regra: d.regra === 'dentro' ? 'dentro' : 'desde_dili',
    });
  }
  return { limpos };
}

function km(a, b) {
  const dLat = (b.lat - a.lat) * 111.32;
  const dLng = (b.lng - a.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// O destino de preço fixo desta viagem, ou null. Síncrono de propósito: é
// chamado dentro de `preco()`, na cotação e na criação da viagem, e as duas
// têm de ver exactamente a mesma resposta.
export function destinoFixo(origem, destino) {
  if (!origem || !destino) return null;
  const o = { lat: Number(origem.lat), lng: Number(origem.lng) };
  const d = { lat: Number(destino.lat), lng: Number(destino.lng) };
  if (![o.lat, o.lng, d.lat, d.lng].every(Number.isFinite)) return null;
  const emDili = (p) => municipioDe(p.lat, p.lng) === 'dili';
  let melhor = null;
  for (const x of destinos) {
    if (!x.ativo) continue;
    const dentroO = km(o, x) <= x.raioKm;
    const dentroD = km(d, x) <= x.raioKm;
    const serve =
      x.regra === 'dentro'
        ? dentroO && dentroD
        : (dentroD && !dentroO && emDili(o)) || (dentroO && !dentroD && emDili(d));
    if (serve && (!melhor || x.raioKm < melhor.raioKm)) melhor = x;
  }
  return melhor ? { id: melhor.id, nome: melhor.nome, precoUsd: melhor.precoUsd } : null;
}
