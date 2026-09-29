// A NAVEGAÇÃO NOSSA — a página (29/09/2026). Ver src/routes/navegar.js.
//
//   /navegar?para=LAT,LNG&nome=…&lingua=pt|tet|en
//   /navegar?para=…&de=LAT,LNG&simular=1   ← um carro percorre a rota sozinho
//   /navegar?recolha=LAT,LNG&nomeRecolha=…&para=LAT,LNG&nome=…
//           &paragens=LAT,LNG;LAT,LNG&fase=recolha|destino   ← a viagem inteira
//
// O mapa é o nosso (/mapa), a rota vem de /navegar/rota (rotasNossas.js, sem
// Google), a posição vem do GPS do telemóvel, a voz do próprio telemóvel.
import {
  Map as MapaLibre,
  Marker,
  LngLatBounds,
  setWorkerUrl,
} from '/navegar/vendor/maplibre-6.10.0/maplibre-gl.mjs';

setWorkerUrl('/navegar/vendor/maplibre-6.10.0/maplibre-gl-worker.mjs');

// ── Parâmetros ─────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const LINGUA = ['pt', 'tet', 'en'].includes(params.get('lingua')) ? params.get('lingua') : 'pt';
const DESTINO = lerPonto(params.get('para'));
const NOME_DESTINO = (params.get('nome') || '').slice(0, 80);
const SIMULAR = params.get('simular') === '1';
// Só na simulação: quantas vezes mais depressa (1 a 10), para ver um
// percurso longo sem esperar por ele.
const SIMULAR_X = Math.max(1, Math.min(10, Number(params.get('x')) || 1));
// Só na simulação: sair da rota de propósito, para ensaiar o recálculo.
const SIMULAR_DESVIO = params.get('desvio') === '1';
// DENTRO DA APP (ecrã Navegar, versão 1.5.0): a voz, o ecrã ligado e o sair
// são da app, porque o WebView do Android não tem a voz do navegador. Fala-se
// com ela por mensagens. Fora da app, tudo como antes.
const NA_APP = params.get('naApp') === '1' && !!window.ReactNativeWebView;
function paraApp(mensagem) {
  window.ReactNativeWebView.postMessage(JSON.stringify(mensagem));
}
const PARTIDA_FIXA = lerPonto(params.get('de'));

// A VIAGEM INTEIRA (29/09/2026, pedido do Simão). Com `recolha`, a página
// mostra o caminho do motorista até ao passageiro e, a seguir, até ao destino
// (`para`), passando pelas paragens do Pickup. `fase` diz onde se está:
// 'recolha' (a ir buscar) ou 'destino' (com o passageiro). A mudança de uma
// para a outra não apaga nada: a continuação, que já estava desenhada, passa
// a ser a linha principal.
const RECOLHA = lerPonto(params.get('recolha'));
const NOME_RECOLHA = (params.get('nomeRecolha') || '').slice(0, 80);
const PARAGENS = String(params.get('paragens') || '')
  .split(';')
  .map(lerPonto)
  .filter(Boolean)
  .slice(0, 2);
const MODO_VIAGEM = !!(RECOLHA && lerPonto(params.get('para')));
let fase = MODO_VIAGEM && params.get('fase') !== 'destino' ? 'recolha' : 'destino';
let paragensPorFazer = PARAGENS.slice();
let estadoViagem = null; // o que a app diz: accepted, arriving, in_progress

function lerPonto(texto) {
  const [lat, lng] = String(texto || '')
    .split(',')
    .map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// ── Textos, nas três línguas da app ─────────────────────────────────────
//
// A VOZ EM TÉTUM não existe em telemóvel nenhum que eu conheça. O texto em
// tétum é lido com a voz portuguesa: a escrita do tétum é fonética e muito
// próxima da portuguesa, e ouvir «fila ba liman karuk» com sotaque português
// entende-se melhor do que a mesma coisa dita em português a quem fala tétum.
// É um rascunho, e quem decide se serve são os motoristas.
const lado = {
  esquerda: { pt: 'esquerda', tet: 'liman karuk', en: 'left' },
  direita: { pt: 'direita', tet: 'liman los', en: 'right' },
};
const ruaPt = (r) => (r ? ` para ${r}` : '');
const ruaTet = (r) => (r ? ` ba ${r}` : '');
const ruaEn = (r) => (r ? ` onto ${r}` : '');
const TEXTOS = {
  pt: {
    comecar: 'Começar navegação',
    destino: 'Destino',
    nota: 'Com o nosso mapa e sem Google. Mantenha o ecrã ligado e o volume alto.',
    gps: 'À procura do sinal GPS…',
    gpsNegado:
      'Sem acesso à localização. Autorize a localização desta página no navegador e toque outra vez.',
    gpsFalhou: 'Não foi possível obter a posição. Confirme que o GPS está ligado.',
    aCalcular: 'A calcular a rota…',
    recalcular: 'Saiu da rota. A recalcular…',
    semRota: 'Não há caminho por estrada até ao destino.',
    erroRede: 'Sem ligação ao servidor. A tentar outra vez…',
    recentrar: 'Recentrar',
    faltaDestino: 'Falta o destino. Abra a navegação a partir da app.',
    chegaAs: (h) => `chegada às ${h}`,
    voz: 'Voz',
    verPercurso: 'Ver o percurso',
    sair: 'Sair',
    terminado: 'Navegação terminada. Pode voltar à app.',
    simulacao: 'Simulação: o carro anda sozinho.',
    partida: (r) => (r ? `Siga pela ${r}` : 'Siga em frente'),
    frente: (r) => `Continue em frente${ruaPt(r)}`,
    virar: (l, r) => `Vire à ${lado[l].pt}${ruaPt(r)}`,
    ligeiramente: (l, r) => `Vire ligeiramente à ${lado[l].pt}${ruaPt(r)}`,
    apertada: (l, r) => `Vire acentuadamente à ${lado[l].pt}${ruaPt(r)}`,
    rotunda: (n, r) => `Na rotunda, saia na ${n}.ª saída${ruaPt(r)}`,
    chegada: () => 'Chegou ao destino',
    daqui: (d) => `Daqui a ${d}, `,
    metrosFala: (n) => `${n} metros`,
    kmFala: (x) => `${x} quilómetros`,
    decimal: ',',
  },
  tet: {
    comecar: 'Hahú navegasaun',
    destino: 'Destinu',
    nota: 'Ho ami-nia mapa, la ho Google. Rai ekran moris no lian aas.',
    gps: 'Buka hela sinál GPS…',
    gpsNegado:
      'La iha asesu ba lokalizasaun. Fó lisensa ba pájina ne’e iha navegadór no toka fali.',
    gpsFalhou: 'La bele hetan ita-nia fatin. Haree katak GPS moris.',
    aCalcular: 'Kalkula hela dalan…',
    recalcular: 'Sai husi dalan. Kalkula fali…',
    semRota: 'La iha dalan liuhusi estrada ba destinu.',
    erroRede: 'La iha ligasaun ho servidór. Koko fali…',
    recentrar: 'Fila ba ita',
    faltaDestino: 'Destinu la iha. Loke navegasaun husi aplikasaun.',
    chegaAs: (h) => `to’o iha oras ${h}`,
    voz: 'Lian',
    verPercurso: 'Haree dalan tomak',
    sair: 'Sai',
    terminado: 'Navegasaun remata ona. Bele fila ba aplikasaun.',
    simulacao: 'Simulasaun: karreta la’o mesak.',
    partida: (r) => (r ? `La’o tuir ${r}` : 'La’o ba oin'),
    frente: (r) => `Kontinua ba oin${ruaTet(r)}`,
    virar: (l, r) => `Fila ba ${lado[l].tet}${ruaTet(r)}`,
    ligeiramente: (l, r) => `Fila uitoan ba ${lado[l].tet}${ruaTet(r)}`,
    apertada: (l, r) => `Fila maka’as ba ${lado[l].tet}${ruaTet(r)}`,
    rotunda: (n, r) => `Iha rotunda, sai iha dalan ${n}${ruaTet(r)}`,
    chegada: () => 'Ita to’o ona iha destinu',
    daqui: (d) => `Hafoin ${d}, `,
    metrosFala: (n) => `${n} metru`,
    kmFala: (x) => `${x} kilómetru`,
    decimal: ',',
  },
  en: {
    comecar: 'Start navigation',
    destino: 'Destination',
    nota: 'With our own map and no Google. Keep the screen on and the volume up.',
    gps: 'Looking for GPS signal…',
    gpsNegado: 'No access to location. Allow location for this page in the browser and tap again.',
    gpsFalhou: 'Could not get your position. Check that GPS is on.',
    aCalcular: 'Calculating route…',
    recalcular: 'Off route. Recalculating…',
    semRota: 'There is no road route to the destination.',
    erroRede: 'No connection to the server. Retrying…',
    recentrar: 'Re-centre',
    faltaDestino: 'Missing destination. Open navigation from the app.',
    chegaAs: (h) => `arrive at ${h}`,
    voz: 'Voice',
    verPercurso: 'Route overview',
    sair: 'Exit',
    terminado: 'Navigation ended. You can go back to the app.',
    simulacao: 'Simulation: the car drives by itself.',
    partida: (r) => (r ? `Head along ${r}` : 'Head straight on'),
    frente: (r) => `Continue straight${ruaEn(r)}`,
    virar: (l, r) => `Turn ${lado[l].en}${ruaEn(r)}`,
    ligeiramente: (l, r) => `Bear ${lado[l].en}${ruaEn(r)}`,
    apertada: (l, r) => `Turn sharp ${lado[l].en}${ruaEn(r)}`,
    rotunda: (n, r) => `At the roundabout, take exit ${n}${ruaEn(r)}`,
    chegada: () => 'You have arrived',
    daqui: (d) => `In ${d}, `,
    metrosFala: (n) => `${n} meters`,
    kmFala: (x) => `${x} kilometers`,
    decimal: '.',
  },
};
const T = TEXTOS[LINGUA];
// Os textos da viagem inteira (29/09/2026). O tétum é rascunho, a rever.
const TEXTOS_VIAGEM = {
  pt: {
    localRecolha: 'Local de recolha',
    localDestino: 'Local de destino',
    paragemN: (n) => `Paragem ${n}`,
    chegouRecolha: 'Chegou ao local de recolha',
    chegouParagem: (n) => `Chegou à paragem ${n}`,
    cheguei: 'Cheguei',
    iniciar: 'Iniciar viagem',
    voltarViagem: 'Voltar à viagem',
    seguirDestino: 'Seguir para o destino',
    chegaRecolha: 'chega ao local de recolha',
    chegaDestino: 'chega ao destino',
  },
  tet: {
    localRecolha: 'Fatin foti',
    localDestino: 'Fatin destinu',
    paragemN: (n) => `Paragen ${n}`,
    chegouRecolha: 'Ita to’o ona iha fatin foti',
    chegouParagem: (n) => `Ita to’o ona iha paragen ${n}`,
    cheguei: 'Ha’u to’o ona',
    iniciar: 'Hahú viajen',
    voltarViagem: 'Fila ba viajen',
    seguirDestino: 'La’o ba destinu',
    chegaRecolha: 'to’o iha fatin foti',
    chegaDestino: 'to’o iha destinu',
  },
  en: {
    localRecolha: 'Pickup point',
    localDestino: 'Destination',
    paragemN: (n) => `Stop ${n}`,
    chegouRecolha: 'You have reached the pickup point',
    chegouParagem: (n) => `You have reached stop ${n}`,
    cheguei: 'I have arrived',
    iniciar: 'Start trip',
    voltarViagem: 'Back to trip',
    seguirDestino: 'Go to destination',
    chegaRecolha: 'you reach the pickup point',
    chegaDestino: 'you reach the destination',
  },
};
Object.assign(T, TEXTOS_VIAGEM[LINGUA]);

function frase(i) {
  const [base, l = null] = String(i.tipo).split('-');
  if (i.tipo === 'partida') return T.partida(i.rua);
  if (i.tipo === 'frente') return T.frente(i.rua);
  if (i.tipo === 'esquerda' || i.tipo === 'direita') return T.virar(i.tipo, i.rua);
  if (base === 'ligeiramente') return T.ligeiramente(l, i.rua);
  if (base === 'apertada') return T.apertada(l, i.rua);
  if (i.tipo === 'rotunda') return T.rotunda(Math.max(1, i.saida || 1), i.rua);
  if (i.tipo === 'paragem') return T.paragemN(i.indice || 1);
  // A chegada como PRÓXIMA manobra diz para onde se vai; o «chegou» é dito
  // quando se chega (ver aoPosicao).
  if (MODO_VIAGEM) return fase === 'recolha' ? T.localRecolha : T.localDestino;
  return T.chegada();
}

function arredondar(m) {
  if (m < 100) return Math.max(10, Math.round(m / 10) * 10);
  if (m < 1000) return Math.round(m / 50) * 50;
  return null;
}
function distTexto(m) {
  const r = arredondar(m);
  if (r != null) return `${r} m`;
  return `${(m / 1000).toFixed(1).replace('.', T.decimal)} km`;
}
function distFala(m) {
  const r = arredondar(m);
  if (r != null) return T.metrosFala(r);
  return T.kmFala((m / 1000).toFixed(1).replace('.', T.decimal));
}

// ── Elementos ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
document.documentElement.lang = LINGUA === 'tet' ? 'tet' : LINGUA;
$('inicioTitulo').textContent =
  MODO_VIAGEM && fase === 'recolha' ? NOME_RECOLHA || T.localRecolha : NOME_DESTINO || T.destino;
$('inicioNota').textContent = SIMULAR ? `${T.nota} ${T.simulacao}` : T.nota;
$('comecar').textContent = T.comecar;
$('recentrar').textContent = T.recentrar;
$('voz').setAttribute('aria-label', T.voz);
$('geral').setAttribute('aria-label', T.verPercurso);
$('sair').setAttribute('aria-label', T.sair);
$('voz').innerHTML = icone('altifalante');
$('geral').innerHTML = icone('percurso');
$('sair').innerHTML = icone('fechar');

function icone(nome) {
  const p = {
    altifalante:
      '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    percurso:
      '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  }[nome];
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E5C54" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

// A SETA da instrução: um desenho por tipo, espelhado para a esquerda.
function desenharSeta(tipo) {
  const esquerda = tipo.endsWith('esquerda');
  const base = tipo.replace(/-?(esquerda|direita)$/, '') || 'virar';
  const traco =
    'fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  const cabeca = (d) => `<path d="${d}" fill="#fff"/>`;
  let desenho;
  if (tipo === 'partida' || tipo === 'frente') {
    desenho = `<path d="M28 48V14" ${traco}/>${cabeca('M28 6l10 12H18z')}`;
  } else if (tipo === 'chegada' || tipo === 'paragem') {
    desenho = `<path d="M28 50V10" ${traco}/><path d="M30 10h16l-5 7 5 7H30z" fill="#FF6B4A"/>`;
  } else if (tipo === 'rotunda') {
    desenho = `<circle cx="28" cy="30" r="10" ${traco}/><path d="M28 50V40M34 22l8-10" ${traco}/>${cabeca('M46 6l-2 14-11-8z')}`;
  } else if (base === 'ligeiramente') {
    desenho = `<path d="M22 50V30l14-14" ${traco}/>${cabeca('M44 8l-2 16-14-14z')}`;
  } else if (base === 'apertada') {
    desenho = `<path d="M18 50V22a8 8 0 0 1 16 0v10" ${traco}/>${cabeca('M34 44l-9-12h18z')}`;
  } else {
    desenho = `<path d="M18 50V28a8 8 0 0 1 8-8h14" ${traco}/>${cabeca('M50 20L38 30V10z')}`;
  }
  $('seta').innerHTML = esquerda
    ? `<g transform="translate(56 0) scale(-1 1)">${desenho}</g>`
    : desenho;
}

function mostrarEstado(texto) {
  $('estado').textContent = texto || '';
  $('estado').classList.toggle('visivel', !!texto);
}

// ── Voz ────────────────────────────────────────────────────────────────
let vozLigada = true;
let vozEscolhida = null;
function escolherVoz() {
  const vozes = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const quer = LINGUA === 'en' ? ['en-GB', 'en-US', 'en'] : ['pt-PT', 'pt-BR', 'pt'];
  for (const q of quer) {
    const v = vozes.find(
      (x) => x.lang && x.lang.replace('_', '-').toLowerCase().startsWith(q.toLowerCase())
    );
    if (v) return v;
  }
  return null;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => (vozEscolhida = escolherVoz());
  vozEscolhida = escolherVoz();
}
function falar(texto) {
  // Na simulação, o que se diria fica também escrito na consola — é a
  // única forma de conferir a voz num ensaio sem som.
  if (SIMULAR && texto) console.info('[voz]', texto);
  if (!vozLigada || !texto) return;
  if (NA_APP) return paraApp({ tipo: 'falar', texto, lingua: LINGUA });
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = LINGUA === 'en' ? 'en-GB' : 'pt-PT';
  if (vozEscolhida) u.voice = vozEscolhida;
  u.rate = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
$('voz').addEventListener('click', () => {
  vozLigada = !vozLigada;
  $('voz').setAttribute('aria-pressed', String(vozLigada));
  if (!vozLigada && NA_APP) paraApp({ tipo: 'calar' });
  else if (!vozLigada && window.speechSynthesis) speechSynthesis.cancel();
});

// ── Ecrã sempre ligado ─────────────────────────────────────────────────
let trinco = null;
async function manterEcra() {
  if (NA_APP) return; // a app mantém o ecrã ligado enquanto este ecrã está aberto
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      trinco = await navigator.wakeLock.request('screen');
    }
  } catch {
    // Sem isto a navegação funciona na mesma; o ecrã só se apaga sozinho.
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navegando) manterEcra();
});

// ── O mapa ─────────────────────────────────────────────────────────────
const mapa = new MapaLibre({
  container: 'mapa',
  style: '/mapa/estilo.json',
  center: DESTINO ? [DESTINO.lng, DESTINO.lat] : [125.578, -8.556],
  zoom: 14,
  attributionControl: { compact: true, customAttribution: '© OpenStreetMap' },
});
let camadasProntas = false;
const vazio = { type: 'FeatureCollection', features: [] };
function camadas() {
  if (camadasProntas || !mapa.isStyleLoaded()) return;
  camadasProntas = true;
  // A CONTINUAÇÃO (da recolha ao destino), por baixo e mais clara, a tracejado:
  // vê-se para onde se vai a seguir sem se confundir com o caminho de agora.
  mapa.addSource('seguinte', { type: 'geojson', data: vazio });
  mapa.addLayer({
    id: 'seguinte',
    type: 'line',
    source: 'seguinte',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#0E5C54',
      'line-width': 6,
      'line-opacity': 0.4,
      'line-dasharray': [1.4, 1],
    },
  });
  mapa.addSource('rota', { type: 'geojson', data: vazio });
  mapa.addLayer({
    id: 'rota-contorno',
    type: 'line',
    source: 'rota',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#0A463F', 'line-width': 11 },
  });
  mapa.addLayer({
    id: 'rota',
    type: 'line',
    source: 'rota',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#2E9E7E', 'line-width': 7 },
  });
  if (rota) desenharRota();
  desenharSeguinte();
}
// Em vários momentos, e não só no `styledata`: o estilo pode acabar de
// carregar depois do último desses eventos, e aí a linha nunca entrava — o
// carro andava num mapa sem percurso (visto no primeiro ensaio, 29/09/2026).
mapa.on('styledata', camadas);
mapa.on('load', camadas);
mapa.on('idle', camadas);

// O carro: um círculo teal com a seta, que roda com o rumo.
const elCarro = document.createElement('div');
elCarro.innerHTML =
  '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="#0E5C54" stroke="#fff" stroke-width="4"/><path d="M22 10l9 20-9-5-9 5z" fill="#fff"/></svg>';
const carro = new Marker({ element: elCarro, rotationAlignment: 'map', pitchAlignment: 'map' });
let carroNoMapa = false;

// OS PINOS COM ETIQUETA. São elementos da página presos ao mapa, e não
// desenho dentro dele: acompanham o ponto a cada movimento, zoom ou rotação,
// ficam sempre direitos, e nunca são escondidos para dar lugar a um nome de
// rua — que é o que um texto desenhado no mapa faria.
function marcadorComEtiqueta(cor, titulo, sub) {
  const el = document.createElement('div');
  el.className = 'marcador';
  const etiqueta = document.createElement('div');
  etiqueta.className = 'etiqueta';
  etiqueta.style.borderColor = cor;
  const forte = document.createElement('strong');
  forte.textContent = titulo;
  etiqueta.appendChild(forte);
  if (sub) {
    const pequeno = document.createElement('span');
    pequeno.textContent = sub;
    etiqueta.appendChild(pequeno);
  }
  el.appendChild(etiqueta);
  el.insertAdjacentHTML(
    'beforeend',
    `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C17 43 32 27 32 16A15 15 0 0 0 2 16c0 11 15 27 15 27z" fill="${cor}" stroke="#fff" stroke-width="3"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>`
  );
  return el;
}
const pino = (el, p) =>
  new Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(mapa);
if (DESTINO) {
  pino(
    marcadorComEtiqueta(
      '#FF6B4A',
      MODO_VIAGEM ? T.localDestino : NOME_DESTINO || T.destino,
      MODO_VIAGEM ? NOME_DESTINO : ''
    ),
    DESTINO
  );
}
let pinoRecolha =
  MODO_VIAGEM && fase === 'recolha'
    ? pino(marcadorComEtiqueta('#0E5C54', T.localRecolha, NOME_RECOLHA), RECOLHA)
    : null;
const pinosParagem = new Map(
  PARAGENS.map((p, i) => [p, pino(marcadorComEtiqueta('#0A463F', T.paragemN(i + 1), ''), p)])
);

let seguir = true;
mapa.on('dragstart', () => {
  if (!navegando) return;
  seguir = false;
  $('recentrar').classList.add('visivel');
});
$('recentrar').addEventListener('click', () => {
  seguir = true;
  $('recentrar').classList.remove('visivel');
  if (ultimaPosicao) acompanhar(ultimaPosicao, true);
});
$('geral').addEventListener('click', () => {
  if (!rota) return;
  // «Ver o percurso» mostra também a continuação, antes da recolha.
  seguir = false;
  $('recentrar').classList.add('visivel');
  verTudo();
});

// ── A rota ─────────────────────────────────────────────────────────────
let rota = null; // { linha: [[lng,lat]…], instrucoes, km, min, acum: [], total }
let indiceProjeccao = 0;
let ditas = new Map(); // instrução → { longe, perto }

function comMedidas(r) {
  const acum = new Float64Array(r.linha.length);
  for (let k = 1; k < r.linha.length; k++) {
    acum[k] = acum[k - 1] + metros(r.linha[k - 1], r.linha[k]);
  }
  return { ...r, acum, total: acum[r.linha.length - 1] };
}
function prepararRota(r) {
  rota = r.acum ? r : comMedidas(r);
  indiceProjeccao = 0;
  ditas = new Map();
  paragensMarcadas = new Set();
  desenharRota();
}

// A continuação, da recolha ao destino — só antes da recolha.
let rotaSeguinte = null;
let paragensMarcadas = new Set();
function desenharSeguinte() {
  if (!camadasProntas) return;
  mapa.getSource('seguinte').setData(
    rotaSeguinte
      ? {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: rotaSeguinte.linha },
        }
      : vazio
  );
}
async function pedirSeguinte() {
  if (!MODO_VIAGEM || fase !== 'recolha' || rotaSeguinte) return;
  try {
    const r = await fetch(urlRota(RECOLHA, DESTINO, PARAGENS));
    if (r.ok && fase === 'recolha') {
      rotaSeguinte = comMedidas(await r.json());
      desenharSeguinte();
    }
  } catch {
    // Sem a continuação, a navegação até à recolha funciona na mesma.
  }
}

// Para onde se navega AGORA: a recolha, ou o destino pelas paragens que faltam.
function alvo() {
  return fase === 'recolha' ? { para: RECOLHA, via: [] } : { para: DESTINO, via: paragensPorFazer };
}
function urlRota(de, para, via) {
  const v = via && via.length ? `&via=${via.map((p) => `${p.lat},${p.lng}`).join(';')}` : '';
  return `/navegar/rota?de=${de.lat},${de.lng}&para=${para.lat},${para.lng}${v}`;
}

// A PASSAGEM DE FASE: a continuação, que já estava desenhada, passa a ser a
// linha principal no mesmo instante — sem nada a desaparecer enquanto se
// pede uma rota nova. Só se pede se a continuação não chegou a vir.
function mudarFase() {
  if (fase === 'destino' || !MODO_VIAGEM) return;
  fase = 'destino';
  aEsperar = false;
  chegou = false;
  if (pinoRecolha) {
    pinoRecolha.remove();
    pinoRecolha = null;
  }
  if (rotaSeguinte) {
    prepararRota(rotaSeguinte);
    rotaSeguinte = null;
    desenharSeguinte();
    falar(frase(rota.instrucoes[0]));
  } else if (ultimaPosicao) {
    pedirRota(ultimaPosicao).then((ok) => ok && falar(frase(rota.instrucoes[0])));
  }
  actualizarAccao();
}

function desenharRota() {
  camadas();
  if (!camadasProntas || !rota) return;
  mapa.getSource('rota').setData({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: rota.linha },
  });
}

function verTudo() {
  if (!rota) return;
  const b = new LngLatBounds();
  for (const c of rota.linha) b.extend(c);
  for (const c of rotaSeguinte?.linha || []) b.extend(c);
  mapa.fitBounds(b, {
    // Margem para as ETIQUETAS dos pinos, e não só para os pinos: com 40 px
    // as das pontas saíam cortadas («ocal de destino»).
    padding: { top: 170, bottom: 150, left: 100, right: 100 },
    bearing: 0,
    pitch: 0,
    duration: 800,
  });
}

async function pedirRota(de, recalculo = false) {
  mostrarEstado(recalculo ? T.recalcular : T.aCalcular);
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const a = alvo();
      const r = await fetch(urlRota(de, a.para, a.via));
      if (r.status === 404) {
        mostrarEstado(T.semRota);
        return false;
      }
      if (!r.ok) throw new Error(String(r.status));
      prepararRota(await r.json());
      mostrarEstado('');
      return true;
    } catch {
      mostrarEstado(T.erroRede);
      await new Promise((s) => setTimeout(s, 3000));
    }
  }
  return false;
}

// ── Geometria ──────────────────────────────────────────────────────────
function metros(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLa = (b[1] - a[1]) * r;
  const dLo = (b[0] - a[0]) * r;
  const h =
    Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function rumo(a, b) {
  const r = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x =
    Math.cos(a[1] * r) * Math.sin(b[1] * r) -
    Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// Onde, na rota, fica esta posição: quantos metros já se fizeram e a que
// distância se está da linha. Procura-se primeiro perto da última projecção
// (é quase sempre aí), e só se não servir na linha inteira.
function projectar(p) {
  const L = rota.linha;
  const mLat = 110574;
  const mLng = 111320 * Math.cos((p[1] * Math.PI) / 180);
  const tentar = (de, ate) => {
    let melhor = null;
    for (let k = Math.max(0, de); k < Math.min(L.length - 1, ate); k++) {
      const ax = (L[k][0] - p[0]) * mLng;
      const ay = (L[k][1] - p[1]) * mLat;
      const bx = (L[k + 1][0] - p[0]) * mLng;
      const by = (L[k + 1][1] - p[1]) * mLat;
      const vx = bx - ax;
      const vy = by - ay;
      const c2 = vx * vx + vy * vy;
      const t = c2 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / c2)) : 0;
      const d = Math.hypot(ax + t * vx, ay + t * vy);
      if (!melhor || d < melhor.d) melhor = { k, t, d };
    }
    return melhor;
  };
  let m = tentar(indiceProjeccao - 5, indiceProjeccao + 200);
  if (!m || m.d > 40) {
    const todo = tentar(0, L.length);
    if (todo && (!m || todo.d < m.d)) m = todo;
  }
  indiceProjeccao = m.k;
  const s = rota.acum[m.k] + m.t * (rota.acum[m.k + 1] - rota.acum[m.k]);
  return { s, afastamento: m.d, rumoLinha: rumo(L[m.k], L[m.k + 1]) };
}

// ── A cada posição ─────────────────────────────────────────────────────
let navegando = false;
let ultimaPosicao = null;
let foraDaRota = 0;
let ultimoRecalculo = 0;
let aPedirRota = false;
let chegou = false;
let aEsperar = false; // chegou à recolha, à espera do passageiro

async function aoPosicao(pos) {
  const p = [pos.lng, pos.lat];
  ultimaPosicao = pos;
  carro.setLngLat(p);
  if (!carroNoMapa) {
    carro.addTo(mapa);
    carroNoMapa = true;
  }

  if (!rota) {
    if (aPedirRota) return;
    aPedirRota = true;
    const ok = await pedirRota(pos);
    aPedirRota = false;
    if (ok) falar(frase(rota.instrucoes[0]));
    if (!ok) return;
    pedirSeguinte();
  }
  if (chegou) return;

  const proj = projectar(p);
  const rumoCarro = pos.rumo != null && (pos.velocidade || 0) > 1.5 ? pos.rumo : proj.rumoLinha;
  carro.setRotation(rumoCarro);

  // FORA DA ROTA: três leituras seguidas a mais de 45 m (e mais longe do que
  // o erro do próprio GPS), e no máximo um recálculo a cada 12 segundos.
  const limite = Math.max(45, (pos.precisao || 0) + 20);
  foraDaRota = proj.afastamento > limite ? foraDaRota + 1 : 0;
  if (SIMULAR && proj.afastamento > 20) {
    console.info('[desvio]', Math.round(proj.afastamento), 'm, leituras fora:', foraDaRota);
  }
  if (foraDaRota >= 3 && Date.now() - ultimoRecalculo > 12000 && !aPedirRota) {
    ultimoRecalculo = Date.now();
    foraDaRota = 0;
    aPedirRota = true;
    await pedirRota(pos, true);
    aPedirRota = false;
    return;
  }

  const restante = Math.max(0, rota.total - proj.s);

  // AS PARAGENS POR ONDE JÁ SE PASSOU saem da lista — um recálculo daqui para
  // a frente já não volta a elas — e a app fica a saber, para o «Navegar» de
  // fora (Google, Organic) também as saltar.
  for (const par of rota.paragens || []) {
    if (paragensMarcadas.has(par.indice) || proj.s < par.metros - 30) continue;
    paragensMarcadas.add(par.indice);
    let perto = null;
    for (const q of paragensPorFazer) {
      const d = metros([q.lng, q.lat], [par.lng, par.lat]);
      if (d < 200 && (!perto || d < perto.d)) perto = { q, d };
    }
    if (perto) {
      paragensPorFazer = paragensPorFazer.filter((q) => q !== perto.q);
      if (NA_APP) paraApp({ tipo: 'paragemFeita', lat: perto.q.lat, lng: perto.q.lng });
    }
  }

  // NA RECOLHA: diz-se uma vez, e espera-se pelo passageiro. Se o carro se
  // afastar outra vez, volta a navegar até lá.
  if (fase === 'recolha' && MODO_VIAGEM) {
    if (restante < 25 && !aEsperar) {
      aEsperar = true;
      desenharSeta('chegada');
      $('faixaDist').textContent = '';
      $('faixaTexto').textContent = T.chegouRecolha;
      falar(T.chegouRecolha);
      $('resumoTempo').textContent = T.localRecolha;
      $('resumoResto').textContent = NOME_RECOLHA;
      actualizarAccao();
    } else if (aEsperar && restante > 80) {
      aEsperar = false;
      actualizarAccao();
    }
    if (aEsperar) {
      acompanhar(pos, false, rumoCarro);
      return;
    }
  }
  if (restante < 25) {
    chegou = true;
    actualizarAccao();
    desenharSeta('chegada');
    $('faixaDist').textContent = '';
    $('faixaTexto').textContent = T.chegada();
    falar(T.chegada());
    $('resumoTempo').textContent = T.chegada();
    $('resumoResto').textContent = NOME_DESTINO;
    return;
  }

  // A PRÓXIMA MANOBRA, e o que já se disse dela.
  const proxima = rota.instrucoes.find((i) => i.tipo !== 'partida' && i.metros > proj.s + 5);
  if (proxima) {
    const falta = proxima.metros - proj.s;
    desenharSeta(proxima.tipo);
    $('faixaDist').textContent = distTexto(falta);
    $('faixaTexto').textContent = frase(proxima);
    const d = ditas.get(proxima) || { longe: false, perto: false };
    if (!d.longe && falta <= 400 && falta > 120) {
      d.longe = true;
      // A CHEGADA diz-se «daqui a 300 metros, chega ao local de recolha», e
      // perto não se repete: o «chegou» diz-se ao chegar (ver acima). No
      // primeiro ensaio ouvia-se «local de recolha» e logo «chegou ao local
      // de recolha», a mesma coisa duas vezes.
      const f =
        proxima.tipo === 'chegada'
          ? fase === 'recolha'
            ? T.chegaRecolha
            : T.chegaDestino
          : frase(proxima);
      falar(T.daqui(distFala(falta)) + f.charAt(0).toLowerCase() + f.slice(1));
    } else if (!d.perto && falta <= 60 && proxima.tipo !== 'chegada') {
      d.perto = d.longe = true;
      falar(proxima.tipo === 'paragem' ? T.chegouParagem(proxima.indice || 1) : frase(proxima));
    }
    ditas.set(proxima, d);
  }

  // Quanto falta, e a que horas se chega: o tempo da rota, na proporção do
  // caminho que falta.
  const segundos = rota.min * 60 * (restante / rota.total);
  const hora = new Date(Date.now() + segundos * 1000);
  $('resumoTempo').textContent =
    `${Math.max(1, Math.round(segundos / 60))} min · ${distTexto(restante)}`;
  $('resumoResto').textContent = T.chegaAs(
    `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`
  );

  acompanhar(pos, false, rumoCarro);
}

// A câmara segue o carro, virada para onde ele vai, mais afastada a andar
// depressa — a 60 km/h precisa-se de ver mais longe do que a 20.
let jaCentrou = false;
function acompanhar(pos, agora, rumoCarro) {
  if (!seguir) return;
  // A PRIMEIRA VEZ SALTA: o mapa abre centrado no destino, e voar de lá até
  // ao carro levava segundos em que o carro não se via (ensaio de 29/09).
  if (!jaCentrou) {
    jaCentrou = true;
    mapa.jumpTo({ center: [pos.lng, pos.lat], zoom: 17, bearing: rumoCarro ?? 0, pitch: 45 });
    return;
  }
  const v = pos.velocidade || 0;
  const zoom = v > 16 ? 15.5 : v > 9 ? 16.3 : 17;
  const topo = $('faixa').offsetHeight || 100;
  const baixo = $('barra').offsetHeight || 90;
  mapa.easeTo({
    center: [pos.lng, pos.lat],
    bearing: rumoCarro ?? mapa.getBearing(),
    pitch: 45,
    zoom,
    padding: { top: topo + 20, bottom: baixo + 120, left: 0, right: 0 },
    duration: agora ? 400 : 900,
    essential: true,
  });
}

// ── GPS, ou a simulação ────────────────────────────────────────────────
let vigia = null;
function comecarGps() {
  if (!('geolocation' in navigator)) {
    mostrarEstado(T.gpsFalhou);
    return;
  }
  mostrarEstado(T.gps);
  vigia = navigator.geolocation.watchPosition(
    (g) =>
      aoPosicao({
        lat: g.coords.latitude,
        lng: g.coords.longitude,
        rumo: Number.isFinite(g.coords.heading) ? g.coords.heading : null,
        velocidade: Number.isFinite(g.coords.speed) ? g.coords.speed : 0,
        precisao: g.coords.accuracy,
      }),
    (e) => {
      if (e.code === 1) {
        // Sem autorização: volta ao início, onde a mensagem se lê e o botão
        // volta a pedir.
        navegando = false;
        $('inicio').classList.remove('escondido');
        $('erroInicio').textContent = T.gpsNegado;
        mostrarEstado('');
      } else mostrarEstado(T.gpsFalhou);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
}

// A SIMULAÇÃO: pede a rota a partir de `de` (ou do centro de Díli) e anda
// por ela a ~40 km/h, uma posição por segundo, como um GPS a sério.
async function comecarSimulacao() {
  const de = PARTIDA_FIXA || { lat: -8.5536, lng: 125.5783 };
  await aoPosicao({ ...de, velocidade: 0 });
  if (!rota) return;
  let s = 0;
  let rotaSimulada = rota;
  let tique = 0;
  const passo = 11 * SIMULAR_X; // metros por segundo (~40 km/h × x)
  const relogio = setInterval(() => {
    if (chegou || !rota) return clearInterval(relogio);
    if (aPedirRota) return;
    // Rota nova (recalculada): recomeça-se do princípio dela, que é onde o
    // carro está.
    if (rota !== rotaSimulada) {
      rotaSimulada = rota;
      s = 0;
    }
    tique++;
    s = Math.min(rota.total, s + passo);
    const L = rota.linha;
    let k = 0;
    while (k < L.length - 2 && rota.acum[k + 1] < s) k++;
    const seg = rota.acum[k + 1] - rota.acum[k] || 1;
    const t = (s - rota.acum[k]) / seg;
    const lng = L[k][0] + t * (L[k + 1][0] - L[k][0]);
    const lat = L[k][1] + t * (L[k + 1][1] - L[k][1]);
    // O DESVIO: entre o 30.º e o 36.º segundo, 110 m PARA O LADO — na
    // perpendicular ao sentido em que o carro vai. Longe de mais para ser erro
    // do GPS. Nos dois primeiros ensaios o desvio foi fixo (norte, depois
    // leste) e caiu em cima de outro bocado da mesma rota — e a página, com
    // razão, não contou como desvio.
    const r90 = ((rumo(L[k], L[k + 1]) + 90) * Math.PI) / 180;
    const fora = SIMULAR_DESVIO && tique >= 30 && tique < 36 ? 110 : 0;
    const dLat = (Math.cos(r90) * fora) / 110574;
    const dLng = (Math.sin(r90) * fora) / (111320 * Math.cos((lat * Math.PI) / 180));
    aoPosicao({
      lat: lat + dLat,
      lng: lng + dLng,
      rumo: rumo(L[k], L[k + 1]),
      velocidade: 11,
      precisao: 5,
    });
  }, 1000);
}

// ── Começar e sair ─────────────────────────────────────────────────────
if (!DESTINO) {
  $('comecar').disabled = true;
  $('erroInicio').textContent = T.faltaDestino;
}
// ── A acção da viagem (29/09/2026) ─────────────────────────────────────
//
// Dentro da app, o botão do passo seguinte da viagem, para o motorista não
// ter de sair da navegação: «Cheguei», «Iniciar viagem» (a app pede o código
// do passageiro) e, no destino, «Voltar à viagem». Quem faz a acção é a app,
// com as mesmas funções do cartão da viagem; a página só pede. No navegador,
// sem app, fica só «Seguir para o destino», que muda de fase aqui.
function accaoActual() {
  if (NA_APP) {
    if (fase === 'recolha' && estadoViagem === 'accepted')
      return { rotulo: T.cheguei, accao: 'cheguei' };
    if (fase === 'recolha' && estadoViagem === 'arriving')
      return { rotulo: T.iniciar, accao: 'iniciar' };
    if (fase === 'destino' && chegou) return { rotulo: T.voltarViagem, accao: 'voltar' };
    return null;
  }
  if (MODO_VIAGEM && fase === 'recolha' && aEsperar)
    return { rotulo: T.seguirDestino, accao: 'fase' };
  return null;
}
function actualizarAccao() {
  const a = navegando ? accaoActual() : null;
  $('accao').classList.toggle('visivel', !!a);
  document.body.classList.toggle('com-accao', !!a);
  if (a) {
    $('accao').textContent = a.rotulo;
    $('accao').dataset.accao = a.accao;
  }
}
$('accao').addEventListener('click', () => {
  const a = $('accao').dataset.accao;
  if (a === 'fase') return mudarFase();
  if (NA_APP) paraApp({ tipo: 'accao', accao: a });
});
// A app diz o estado da viagem; ao passar a «em curso», muda-se de fase.
window.tgaEstado = (e) => {
  estadoViagem = e;
  if (e === 'in_progress') mudarFase();
  actualizarAccao();
};

function comecar() {
  $('erroInicio').textContent = '';
  // O toque desbloqueia a voz: uma frase vazia agora deixa as seguintes sair.
  if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  manterEcra();
  navegando = true;
  $('inicio').classList.add('escondido');
  $('faixa').classList.add('visivel');
  $('barra').classList.add('visivel');
  desenharSeta('partida');
  $('faixaDist').textContent = '';
  $('faixaTexto').textContent = NOME_DESTINO || T.destino;
  if (SIMULAR) comecarSimulacao();
  else comecarGps();
  actualizarAccao();
  // A app responde com o estado da viagem (tgaEstado). Pedido daqui, e não
  // só mandado por ela ao carregar: assim não se perde se chegar cedo.
  if (NA_APP) paraApp({ tipo: 'pronta' });
}
$('comecar').addEventListener('click', comecar);
// Dentro da app arranca logo: o ecrã de início existe para o toque que
// desbloqueia a voz do navegador, e aqui a voz é a da app.
if (NA_APP && DESTINO) comecar();

$('sair').addEventListener('click', () => {
  navegando = false;
  if (NA_APP) {
    if (vigia != null) navigator.geolocation.clearWatch(vigia);
    return paraApp({ tipo: 'sair' });
  }
  if (vigia != null) navigator.geolocation.clearWatch(vigia);
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (trinco) trinco.release().catch(() => {});
  if (history.length > 1) history.back();
  else {
    window.close();
    mostrarEstado(T.terminado);
  }
});
