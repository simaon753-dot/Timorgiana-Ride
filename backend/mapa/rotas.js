// AS ROTAS NOSSAS — sem Google, sobre o OpenStreetMap (29/09/2026).
//
// PORQUE EXISTE. O Simão quer que os motoristas naveguem sem o Google. As
// rotas são a peça do meio: o mapa já é nosso (`/mapa`), a navegação vem
// depois. Decidido correr DENTRO deste servidor (opção a): o plano gratuito
// do Render já está quase todo gasto por ele, e um segundo serviço ligado o
// dia inteiro não caberia.
//
// OS PREÇOS NÃO VÊM DAQUI: continuam a vir do Google (`src/rotas.js`). Isto
// serve a navegação nossa (`servidor.js`) e a comparação com o Google, que
// vive do lado da app (`src/comparacaoRotas.js`) porque usa a base de dados —
// e o mapa não usa base de dados nenhuma (ver LEIA-ME.md).
//
// A REDE vem de `rede/estradas-tl.bin`, feita por `scripts/construir-rede.mjs`
// a partir do recorte da Geofabrik. Carrega-se na PRIMEIRA pergunta e não no
// arranque: quem nunca pede uma rota nossa não paga a memória dela.
//
// COMO: o ponto de partida e o de chegada encostam-se ao troço de estrada
// mais perto (numa grelha de ~550 m), e o caminho procura-se com A* entre
// cruzamentos, respeitando os sentidos únicos. Pode-se partir e chegar a meio
// de um troço — é onde as pessoas estão.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FICHEIRO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rede', 'estradas-tl.bin');

// A grelha onde se procura a estrada mais perto de um ponto.
const CELULA = 0.005; // graus, ~550 m
const ENCOSTAR_MAX_M = 1500;

let rede = null;

function carregar() {
  if (rede) return rede;
  const buf = fs.readFileSync(FICHEIRO);
  // Uma cópia alinhada: as vistas tipadas precisam de começar em múltiplos de 4.
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  const tamCabeca = new DataView(ab).getUint32(0, true);
  const meta = JSON.parse(Buffer.from(ab, 4, tamCabeca).toString());
  const inicio = Math.ceil((tamCabeca + 4) / 4) * 4;
  const T = {};
  const TIPOS = { Int32Array, Float32Array, Uint8Array, Int8Array };
  for (const [nome, d] of Object.entries(meta.tabelas)) {
    T[nome] = new TIPOS[d.tipo](ab, inicio + d.desloc, d.n);
  }

  const nV = T.verticePonto.length;
  const nA = T.arestaDe.length;
  const vel = meta.classes.map((c) => meta.velocidades[c] / 3.6); // m/s
  const vMax = Math.max(...vel);

  // Os arcos (arestas com sentido), em lista por vértice de partida.
  const conta = new Int32Array(nV + 1);
  for (let e = 0; e < nA; e++) {
    const s = T.arestaSentido[e];
    if (s >= 0) conta[T.arestaDe[e] + 1]++;
    if (s <= 0) conta[T.arestaPara[e] + 1]++;
  }
  for (let v = 0; v < nV; v++) conta[v + 1] += conta[v];
  const nArcos = conta[nV];
  const arcoAresta = new Int32Array(nArcos);
  const arcoFrente = new Uint8Array(nArcos); // 1 = no sentido do desenho
  const arcoPara = new Int32Array(nArcos);
  const arcoCusto = new Float32Array(nArcos); // segundos
  const cursor = conta.slice(0, nV);
  for (let e = 0; e < nA; e++) {
    const s = T.arestaSentido[e];
    const custo = T.arestaMetros[e] / vel[T.arestaClasse[e]];
    if (s >= 0) {
      const i = cursor[T.arestaDe[e]]++;
      arcoAresta[i] = e;
      arcoFrente[i] = 1;
      arcoPara[i] = T.arestaPara[e];
      arcoCusto[i] = custo;
    }
    if (s <= 0) {
      const i = cursor[T.arestaPara[e]]++;
      arcoAresta[i] = e;
      arcoFrente[i] = 0;
      arcoPara[i] = T.arestaDe[e];
      arcoCusto[i] = custo;
    }
  }

  // A aresta de cada ponto de desenho, e a grelha dos segmentos para encostar.
  const geoAresta = new Int32Array(T.geometria.length);
  const grelha = new Map();
  const la = (p) => T.pontosLat[p] / 1e7;
  const lo = (p) => T.pontosLng[p] / 1e7;
  const chave = (cla, clo) => cla * 100000 + clo;
  for (let e = 0; e < nA; e++) {
    const g0 = T.arestaGeoIni[e];
    const n = T.arestaGeoTam[e];
    for (let k = 0; k < n; k++) geoAresta[g0 + k] = e;
    for (let k = 0; k < n - 1; k++) {
      const a = T.geometria[g0 + k];
      const b = T.geometria[g0 + k + 1];
      const la0 = Math.floor(Math.min(la(a), la(b)) / CELULA);
      const la1 = Math.floor(Math.max(la(a), la(b)) / CELULA);
      const lo0 = Math.floor(Math.min(lo(a), lo(b)) / CELULA);
      const lo1 = Math.floor(Math.max(lo(a), lo(b)) / CELULA);
      for (let x = la0; x <= la1; x++) {
        for (let y = lo0; y <= lo1; y++) {
          const c = chave(x, y);
          let lista = grelha.get(c);
          if (!lista) grelha.set(c, (lista = []));
          lista.push(g0 + k);
        }
      }
    }
  }

  // Quantos troços tocam cada vértice: a navegação só anuncia viragens onde
  // há por onde escolher (três ou mais). Numa curva da própria estrada, ou
  // onde duas vias do mapa se juntam sem cruzamento, não há nada a dizer.
  const grau = new Int32Array(nV);
  for (let e = 0; e < nA; e++) {
    grau[T.arestaDe[e]]++;
    grau[T.arestaPara[e]]++;
  }

  rede = {
    meta,
    T,
    nV,
    grau,
    vel,
    vMax,
    conta,
    arcoAresta,
    arcoFrente,
    arcoPara,
    arcoCusto,
    geoAresta,
    grelha,
    la,
    lo,
    chave,
  };
  return rede;
}

function distM(la1, lo1, la2, lo2) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLa = (la2 - la1) * r;
  const dLo = (lo2 - lo1) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// O troço de estrada mais perto do ponto, e onde nele cai a projecção.
function encostar(R, lat, lng) {
  const { T, grelha, la, lo, chave } = R;
  const cx = Math.floor(lat / CELULA);
  const cy = Math.floor(lng / CELULA);
  const mLat = 110574;
  const mLng = 111320 * Math.cos((lat * Math.PI) / 180);
  let melhor = null;
  // Anel a anel, e só se pára quando a estrada encontrada está garantidamente
  // mais perto do que qualquer uma do anel seguinte — senão a primeira que
  // aparecesse ganhava a uma mais perto do outro lado da fronteira da célula.
  for (let raio = 1; raio <= 3; raio++) {
    if (melhor && melhor.d <= (raio - 1) * CELULA * mLat * 0.99) break;
    for (let x = cx - raio; x <= cx + raio; x++) {
      for (let y = cy - raio; y <= cy + raio; y++) {
        const lista = grelha.get(chave(x, y));
        if (!lista) continue;
        for (const g of lista) {
          const a = T.geometria[g];
          const b = T.geometria[g + 1];
          const ax = (lo(a) - lng) * mLng;
          const ay = (la(a) - lat) * mLat;
          const bx = (lo(b) - lng) * mLng;
          const by = (la(b) - lat) * mLat;
          const vx = bx - ax;
          const vy = by - ay;
          const c2 = vx * vx + vy * vy;
          const t = c2 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / c2)) : 0;
          const d = Math.hypot(ax + t * vx, ay + t * vy);
          if (!melhor || d < melhor.d) melhor = { g, t, d };
        }
      }
    }
  }
  if (!melhor || melhor.d > ENCOSTAR_MAX_M) return null;
  const e = R.geoAresta[melhor.g];
  const g0 = T.arestaGeoIni[e];
  // Metros desde o início do troço até à projecção.
  let ate = 0;
  for (let g = g0; g < melhor.g; g++) {
    const a = T.geometria[g];
    const b = T.geometria[g + 1];
    ate += distM(la(a), lo(a), la(b), lo(b));
  }
  const a = T.geometria[melhor.g];
  const b = T.geometria[melhor.g + 1];
  ate += melhor.t * distM(la(a), lo(a), la(b), lo(b));
  const pLat = la(a) + melhor.t * (la(b) - la(a));
  const pLng = lo(a) + melhor.t * (lo(b) - lo(a));
  return { e, g: melhor.g, ate, lat: pLat, lng: pLng, afastamento: melhor.d };
}

// Os pontos de desenho de um troço, entre dois pontos a meio dele ou nas pontas.
function desenhoDoTroco(R, e, frente) {
  const { T, la, lo } = R;
  const g0 = T.arestaGeoIni[e];
  const n = T.arestaGeoTam[e];
  const pts = [];
  for (let k = 0; k < n; k++) {
    const p = T.geometria[g0 + k];
    pts.push({ lat: la(p), lng: lo(p) });
  }
  return frente ? pts : pts.reverse();
}

// Um troço cortado: da projecção até uma das pontas.
function pedacoDoTroco(R, enc, paraOFim) {
  const { T, la, lo } = R;
  const g0 = T.arestaGeoIni[enc.e];
  const n = T.arestaGeoTam[enc.e];
  const pts = [];
  if (paraOFim) {
    pts.push({ lat: enc.lat, lng: enc.lng });
    for (let g = enc.g + 1; g < g0 + n; g++) {
      const p = T.geometria[g];
      pts.push({ lat: la(p), lng: lo(p) });
    }
  } else {
    pts.push({ lat: enc.lat, lng: enc.lng });
    for (let g = enc.g; g >= g0; g--) {
      const p = T.geometria[g];
      pts.push({ lat: la(p), lng: lo(p) });
    }
  }
  return pts;
}

// Uma fila de prioridade simples (monte binário) sobre índices de vértice.
class Monte {
  constructor() {
    this.v = [];
    this.k = [];
  }
  get vazio() {
    return this.v.length === 0;
  }
  por(vertice, prioridade) {
    const { v, k } = this;
    let i = v.length;
    v.push(vertice);
    k.push(prioridade);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [v[p], v[i]] = [v[i], v[p]];
      [k[p], k[i]] = [k[i], k[p]];
      i = p;
    }
  }
  tirar() {
    const { v, k } = this;
    const topo = v[0];
    const prioridade = k[0];
    const ultV = v.pop();
    const ultK = k.pop();
    if (v.length) {
      v[0] = ultV;
      k[0] = ultK;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < v.length && k[l] < k[m]) m = l;
        if (r < v.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [v[m], v[i]] = [v[i], v[m]];
        [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return { vertice: topo, prioridade };
  }
}

// A ROTA: { km, min, linha, fonte: 'nossa', encosto: {origem, destino} } ou
// null quando um dos pontos não tem estrada a menos de 1,5 km, ou não há
// caminho (uma ilha, Ataúro, Oecusse por terra).
export function rotaNossa(a, b, comTrocos = false) {
  const R = carregar();
  const { T, vel, vMax, conta, arcoAresta, arcoFrente, arcoPara, arcoCusto, la, lo } = R;
  const s = encostar(R, a.lat, a.lng);
  const d = encostar(R, b.lat, b.lng);
  if (!s || !d) return null;

  const velS = vel[T.arestaClasse[s.e]];
  const velD = vel[T.arestaClasse[d.e]];
  const LS = T.arestaMetros[s.e];
  const LD = T.arestaMetros[d.e];
  const sentS = T.arestaSentido[s.e];
  const sentD = T.arestaSentido[d.e];

  const nV = R.nV;
  const custo = new Float64Array(nV).fill(Infinity);
  const veioPor = new Int32Array(nV).fill(-1); // arco usado para chegar
  const monte = new Monte();
  const vPonto = (v) => T.verticePonto[v];
  const h = (v) => distM(la(vPonto(v)), lo(vPonto(v)), d.lat, d.lng) / vMax;

  // Sair do ponto de partida pelas pontas do troço a que foi encostado.
  if (sentS >= 0) {
    const v = T.arestaPara[s.e];
    custo[v] = (LS - s.ate) / velS;
    veioPor[v] = -2; // saída de frente
    monte.por(v, custo[v] + h(v));
  }
  if (sentS <= 0) {
    const v = T.arestaDe[s.e];
    const c = s.ate / velS;
    if (c < custo[v]) {
      custo[v] = c;
      veioPor[v] = -3; // saída para trás
      monte.por(v, c + h(v));
    }
  }

  // Chegar ao destino a meio do troço dele.
  let melhor = Infinity;
  let chegada = null; // { vertice, frente }
  const chegar = (v) => {
    if (sentD >= 0 && v === T.arestaDe[d.e]) {
      const c = custo[v] + d.ate / velD;
      if (c < melhor) {
        melhor = c;
        chegada = { vertice: v, frente: true };
      }
    }
    if (sentD <= 0 && v === T.arestaPara[d.e]) {
      const c = custo[v] + (LD - d.ate) / velD;
      if (c < melhor) {
        melhor = c;
        chegada = { vertice: v, frente: false };
      }
    }
  };

  // No mesmo troço, no sentido permitido: não há caminho mais curto.
  let direto = null;
  if (s.e === d.e) {
    if (sentS >= 0 && d.ate >= s.ate) direto = (d.ate - s.ate) / velS;
    else if (sentS <= 0 && d.ate <= s.ate) direto = (s.ate - d.ate) / velS;
    if (direto != null) melhor = direto;
  }

  const visto = new Uint8Array(nV);
  while (!monte.vazio) {
    const { vertice: v, prioridade } = monte.tirar();
    if (prioridade >= melhor) break;
    if (visto[v]) continue;
    visto[v] = 1;
    chegar(v);
    for (let i = conta[v]; i < conta[v + 1]; i++) {
      const w = arcoPara[i];
      const c = custo[v] + arcoCusto[i];
      if (c < custo[w]) {
        custo[w] = c;
        veioPor[w] = i;
        monte.por(w, c + h(w));
      }
    }
  }
  if (melhor === Infinity) return null;

  // O CAMINHO, TROÇO A TROÇO e pela ordem em que se percorre: a aresta, o
  // sentido e o desenho de cada um. A linha sai da junção deles; a navegação
  // precisa de saber onde se muda de troço, que é onde se vira.
  let trocos;
  if (direto != null && melhor === direto) {
    trocos = [
      {
        e: s.e,
        frente: d.ate >= s.ate,
        pts: [
          { lat: s.lat, lng: s.lng },
          { lat: d.lat, lng: d.lng },
        ],
      },
    ];
  } else {
    const atras = [];
    atras.push({
      e: d.e,
      frente: chegada.frente,
      pts: pedacoDoTroco(R, d, !chegada.frente).reverse(),
    });
    let v = chegada.vertice;
    while (veioPor[v] >= 0) {
      const i = veioPor[v];
      const frente = arcoFrente[i] === 1;
      atras.push({ e: arcoAresta[i], frente, pts: desenhoDoTroco(R, arcoAresta[i], frente) });
      // O vértice de onde este arco saiu.
      v = frente ? T.arestaDe[arcoAresta[i]] : T.arestaPara[arcoAresta[i]];
    }
    atras.push({ e: s.e, frente: veioPor[v] === -2, pts: pedacoDoTroco(R, s, veioPor[v] === -2) });
    trocos = atras.reverse();
  }
  const linha = [];
  for (const t of trocos) {
    for (const q of t.pts) {
      const u = linha[linha.length - 1];
      if (!u || u.lat !== q.lat || u.lng !== q.lng) linha.push(q);
    }
    // Onde este troço acaba na linha — a junção com o seguinte.
    t.fim = linha.length - 1;
  }
  const acumulado = new Float64Array(linha.length);
  for (let k = 1; k < linha.length; k++) {
    acumulado[k] =
      acumulado[k - 1] + distM(linha[k - 1].lat, linha[k - 1].lng, linha[k].lat, linha[k].lng);
  }
  const m = acumulado[linha.length - 1];
  return {
    km: Math.round((m / 1000) * 10) / 10,
    min: Math.round(melhor / 60),
    linha,
    fonte: 'nossa',
    encosto: { origem: Math.round(s.afastamento), destino: Math.round(d.afastamento) },
    ...(comTrocos ? { trocos, acumulado } : {}),
  };
}

// ── A NAVEGAÇÃO: a rota com as instruções (29/09/2026) ─────────────────
//
// Para a página /navegar. Cada instrução diz O QUE fazer, PARA ONDE (o nome
// da rua) e A QUANTOS METROS do início fica — a página mede o resto com o GPS.
// O texto não vem daqui: vem um tipo («esquerda», «rotunda» com a saída), e a
// página escreve-o e di-lo na língua de quem conduz.
//
// UMA VIRAGEM mede-se pelo ângulo entre o sentido em que se chega à junção e
// o sentido em que se sai, olhando uns metros para trás e para a frente — o
// último segmento sozinho pode ter um metro e apontar para qualquer lado.
const OLHAR_M = 15;

function rumoEntre(a, b) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x =
    Math.cos(a.lat * r) * Math.sin(b.lat * r) -
    Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// O sentido de viagem a chegar a `j` (passo -1) ou a sair de `j` (passo +1).
function rumoNaJuncao(linha, acumulado, j, passo) {
  let k = j + passo;
  while (k > 0 && k < linha.length - 1 && Math.abs(acumulado[k] - acumulado[j]) < OLHAR_M)
    k += passo;
  k = Math.max(0, Math.min(linha.length - 1, k));
  if (k === j) return null;
  return passo < 0 ? rumoEntre(linha[k], linha[j]) : rumoEntre(linha[j], linha[k]);
}

export function rotaParaNavegar(a, b) {
  const r = rotaNossa(a, b, true);
  if (!r) return null;
  const R = rede;
  const { T } = R;
  const nome = (e) => (T.arestaNome && T.arestaNome[e] >= 0 ? R.meta.nomes[T.arestaNome[e]] : '');
  const rotunda = (e) => !!(T.arestaRotunda && T.arestaRotunda[e]);
  const { linha, acumulado, trocos } = r;
  const aqui = (j) => ({ metros: Math.round(acumulado[j]), lat: linha[j].lat, lng: linha[j].lng });

  const instrucoes = [{ tipo: 'partida', rua: nome(trocos[0].e), ...aqui(0) }];
  let naRotunda = null;
  // A ÚLTIMA RUA COM NOME por onde se passou, e não o troço anterior: no mapa
  // há bocados sem nome a meio de avenidas, e comparar com eles fazia dizer
  // «em frente, Avenida Nicolau Lobato» a quem já ia nela.
  let ruaActual = nome(trocos[0].e);
  for (let k = 1; k < trocos.length; k++) {
    const antes = trocos[k - 1];
    const depois = trocos[k];
    const j = antes.fim;
    const v = antes.frente ? T.arestaPara[antes.e] : T.arestaDe[antes.e];

    // ROTUNDAS: anuncia-se à entrada, com a saída que se toma, contada pelas
    // saídas por onde se passa (troços que saem da rotunda e se podem tomar).
    if (rotunda(depois.e) && !rotunda(antes.e)) {
      naRotunda = { tipo: 'rotunda', saida: 0, rua: '', ...aqui(j) };
      instrucoes.push(naRotunda);
      continue;
    }
    if (naRotunda && rotunda(antes.e)) {
      let haSaida = false;
      for (let i = R.conta[v]; i < R.conta[v + 1]; i++) {
        if (!rotunda(R.arcoAresta[i])) haSaida = true;
      }
      if (haSaida) naRotunda.saida++;
      if (!rotunda(depois.e)) {
        naRotunda.rua = nome(depois.e);
        if (naRotunda.rua) ruaActual = naRotunda.rua;
        naRotunda = null;
      }
      continue;
    }

    const entrada = rumoNaJuncao(linha, acumulado, j, -1);
    const saida = rumoNaJuncao(linha, acumulado, j, 1);
    if (entrada == null || saida == null) continue;
    let ang = saida - entrada;
    if (ang > 180) ang -= 360;
    if (ang < -180) ang += 360;
    const abs = Math.abs(ang);
    const novoNome = nome(depois.e);
    const mudaNome = !!novoNome && novoNome !== ruaActual;
    if (novoNome) ruaActual = novoNome;
    if (R.grau[v] < 3 && !(mudaNome && abs > 30)) continue;
    const lado = ang > 0 ? 'direita' : 'esquerda';
    let tipo;
    if (abs <= 20) {
      // Em frente só se diz quando a rua muda de nome num cruzamento: é o
      // que ajuda a saber onde se está sem encher a viagem de avisos.
      if (!mudaNome || R.grau[v] < 3) continue;
      tipo = 'frente';
    } else if (abs <= 50) tipo = `ligeiramente-${lado}`;
    else if (abs <= 140) tipo = lado;
    else tipo = `apertada-${lado}`;
    instrucoes.push({ tipo, rua: nome(depois.e), ...aqui(j) });
  }
  instrucoes.push({ tipo: 'chegada', rua: '', ...aqui(linha.length - 1) });

  // DUAS MANOBRAS IGUAIS A MENOS DE 80 m são uma só: no ensaio da Colmera à
  // Timor Plaza, dois «ligeiramente à esquerda» a 60 m um do outro deram
  // três frases seguidas. Fica a primeira, com a rua da segunda.
  const juntas = [];
  for (const i of instrucoes) {
    const a = juntas[juntas.length - 1];
    if (a && a.tipo === i.tipo && i.tipo !== 'chegada' && i.metros - a.metros < 80) {
      if (i.rua) a.rua = i.rua;
      continue;
    }
    juntas.push(i);
  }

  return {
    km: r.km,
    min: r.min,
    fonte: 'nossa',
    // [lng, lat] com 6 casas (~10 cm): metade dos bytes de objectos.
    linha: linha.map((p) => [Math.round(p.lng * 1e6) / 1e6, Math.round(p.lat * 1e6) / 1e6]),
    instrucoes: juntas,
  };
}

// A ROTA POR VÁRIOS PONTOS: partida, paragens pelo meio, destino
// (29/09/2026, para o Pickup com paragens). Troço a troço, e junta-se tudo
// numa linha só; a chegada de cada troço do meio passa a instrução
// «paragem» com o número dela. `paragens` diz onde cada uma fica na linha
// (em metros), para a página saber quando se passou por ela.
export function rotaPorPontos(pontos) {
  if (pontos.length === 2) return rotaParaNavegar(pontos[0], pontos[1]);
  const linha = [];
  const instrucoes = [];
  const paragens = [];
  let antes = 0;
  let km = 0;
  let min = 0;
  for (let i = 0; i < pontos.length - 1; i++) {
    const r = rotaParaNavegar(pontos[i], pontos[i + 1]);
    if (!r) return null;
    const ultimo = i === pontos.length - 2;
    const comprimento = r.instrucoes[r.instrucoes.length - 1].metros;
    for (const ins of r.instrucoes) {
      // A partida dos troços seguintes não se diz: o carro não parou de andar.
      if (i > 0 && ins.tipo === 'partida') continue;
      const metros = ins.metros + antes;
      if (ins.tipo === 'chegada' && !ultimo) {
        instrucoes.push({ ...ins, tipo: 'paragem', indice: i + 1, metros });
        paragens.push({ indice: i + 1, metros, lat: ins.lat, lng: ins.lng });
        continue;
      }
      instrucoes.push({ ...ins, metros });
    }
    linha.push(...(linha.length ? r.linha.slice(1) : r.linha));
    antes += comprimento;
    km += r.km;
    min += r.min;
  }
  return { km: Math.round(km * 10) / 10, min, fonte: 'nossa', linha, instrucoes, paragens };
}

// Para o /api/health e para quem quiser saber de que dados vêm as rotas.
export function sobreARede() {
  if (!fs.existsSync(FICHEIRO)) return { existe: false };
  const R = rede;
  return R
    ? { existe: true, carregada: true, fonte: R.meta.fonte, cruzamentos: R.nV }
    : { existe: true, carregada: false };
}
