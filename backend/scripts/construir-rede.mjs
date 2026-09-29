// CONSTRÓI A REDE DE ESTRADAS DE TIMOR-LESTE a partir do OpenStreetMap
// (29/09/2026). Corre neste computador; o resultado vai para o servidor.
//
//   node scripts/construir-rede.mjs ../mapa-proprio/osm/east-timor-AAMMDD.osm.pbf
//
// PORQUE EXISTE. O Simão quer que os motoristas naveguem sem o Google. O
// primeiro passo foi o Organic Maps; este é o segundo: rotas calculadas por
// NÓS, sobre os mesmos dados do nosso mapa. Sai daqui `rede/estradas-tl.bin`,
// que `src/rotasNossas.js` lê.
//
// O FICHEIRO .osm.pbf NÃO VAI PARA O GIT (17,8 MB, ver .gitignore). Para
// actualizar: descarregar o recorte novo da Geofabrik
// (download.geofabrik.de/asia/east-timor-latest.osm.pbf) e correr isto outra
// vez. Dados © colaboradores do OpenStreetMap, licença ODbL.
//
// SEM BIBLIOTECA NOVA. O formato .osm.pbf são blocos comprimidos com zlib de
// mensagens protobuf, e o servidor já tem o `pbf` (usa-o para os mosaicos do
// mapa). O que falta são as mensagens do OpenStreetMap, lidas aqui à mão —
// ver https://wiki.openstreetmap.org/wiki/PBF_Format.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PbfReader } from 'pbf';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGEM = process.argv[2];
if (!ORIGEM) {
  console.error('Uso: node scripts/construir-rede.mjs <ficheiro .osm.pbf>');
  process.exit(1);
}
const SAIDA = path.join(AQUI, '..', 'rede', 'estradas-tl.bin');

// ── Que estradas entram, e a que velocidade (km/h) ────────────────────
//
// Velocidades de DÍLI, e não de manual: a mesma lógica do `routing.js`, que
// usa 20 km/h na cidade porque uma estimativa optimista que falha é pior. Não
// decidem o preço — servem para escolher o caminho e dar um tempo razoável.
// As `_link` (acessos) contam como a estrada principal.
const VELOCIDADE = {
  motorway: 70,
  trunk: 55,
  primary: 40,
  secondary: 35,
  tertiary: 30,
  unclassified: 25,
  residential: 20,
  living_street: 10,
  road: 20,
  service: 12,
  // Os trilhos entram — em Timor-Leste há aldeias a que só se chega por eles,
  // e é por eles que a mota e o Pickup vão — mas devagar, para o caminho só
  // passar por um quando não há estrada a sério.
  track: 12,
};
// Um número pequeno por classe, para o servidor poder distinguir sem guardar
// o texto (e para a página de navegação um dia desenhar a estrada certa).
const CLASSES = Object.keys(VELOCIDADE);

function classeDaVia(tags) {
  let h = tags.highway;
  if (!h) return null;
  if (h.endsWith('_link')) h = h.slice(0, -5);
  if (!(h in VELOCIDADE)) return null;
  if (tags.area === 'yes') return null;
  // Proibido a carros: acesso privado ou fechado, salvo se disser que os
  // veículos a motor podem.
  const motor = tags.motor_vehicle || tags.motorcar || tags.vehicle;
  if (motor === 'no' || motor === 'private') return null;
  if ((tags.access === 'no' || tags.access === 'private') && motor !== 'yes') return null;
  if (h === 'service' && (tags.service === 'parking_aisle' || tags.service === 'drive-through')) {
    return null;
  }
  return h;
}

// 1 = só no sentido do desenho; -1 = só ao contrário; 0 = os dois.
function sentidoDaVia(tags) {
  const o = tags.oneway;
  if (o === 'yes' || o === '1' || o === 'true') return 1;
  if (o === '-1' || o === 'reverse') return -1;
  if (o === 'no') return 0;
  // Rotundas são de sentido único mesmo sem o dizer.
  if (tags.junction === 'roundabout' || tags.junction === 'circular') return 1;
  if (tags.highway === 'motorway' || tags.highway === 'motorway_link') return 1;
  return 0;
}

// ── Leitura do .osm.pbf ────────────────────────────────────────────────
function* blocosDeDados(buf) {
  let pos = 0;
  while (pos < buf.length) {
    const tamCabeca = buf.readUInt32BE(pos);
    pos += 4;
    const cabeca = new PbfReader(buf.subarray(pos, pos + tamCabeca)).readFields(
      (tag, o, p) => {
        if (tag === 1) o.tipo = p.readString();
        else if (tag === 3) o.tamanho = p.readVarint();
      },
      { tipo: '', tamanho: 0 }
    );
    pos += tamCabeca;
    const blob = new PbfReader(buf.subarray(pos, pos + cabeca.tamanho)).readFields((tag, o, p) => {
      if (tag === 1) o.cru = p.readBytes();
      else if (tag === 3) o.zlib = p.readBytes();
    }, {});
    pos += cabeca.tamanho;
    if (cabeca.tipo !== 'OSMData') continue;
    if (!blob.cru && !blob.zlib) throw new Error('Bloco com compressão que não sei ler (só zlib).');
    yield blob.cru ? Buffer.from(blob.cru) : zlib.inflateSync(blob.zlib);
  }
}

// Um PrimitiveBlock: tabela de textos, grupos, e a escala das coordenadas.
// A escala (campos 17, 19, 20) vem DEPOIS dos grupos, por isso primeiro
// marcam-se onde estão os grupos e só depois se lêem.
function lerBloco(dados, { aoNo, aoCaminho }) {
  const p = new PbfReader(dados);
  const b = { textos: [], grupos: [], escala: 100, latOff: 0, lngOff: 0 };
  p.readFields((tag, o, r) => {
    if (tag === 1) {
      r.readMessage((t, lista, rr) => {
        if (t === 1) lista.push(rr.readString());
      }, o.textos);
    } else if (tag === 2) {
      const tam = r.readVarint();
      o.grupos.push([r.pos, r.pos + tam]);
      r.pos += tam;
    } else if (tag === 17) o.escala = r.readVarint();
    else if (tag === 19) o.latOff = r.readVarint(true);
    else if (tag === 20) o.lngOff = r.readVarint(true);
  }, b);
  const coord = (v, off) => (off + b.escala * v) * 1e-9;

  for (const [ini, fim] of b.grupos) {
    p.pos = ini;
    p.readFields(
      (tag, _o, r) => {
        if (tag === 2 && aoNo) {
          // DenseNodes: ids, latitudes e longitudes em diferenças acumuladas.
          const d = r.readMessage(
            (t, x, rr) => {
              if (t === 1) rr.readPackedSVarint(x.ids);
              else if (t === 8) rr.readPackedSVarint(x.lats);
              else if (t === 9) rr.readPackedSVarint(x.lngs);
            },
            { ids: [], lats: [], lngs: [] }
          );
          let id = 0;
          let la = 0;
          let lo = 0;
          for (let i = 0; i < d.ids.length; i++) {
            id += d.ids[i];
            la += d.lats[i];
            lo += d.lngs[i];
            aoNo(id, coord(la, b.latOff), coord(lo, b.lngOff));
          }
        } else if (tag === 1 && aoNo) {
          const n = r.readMessage(
            (t, x, rr) => {
              if (t === 1) x.id = rr.readSVarint();
              else if (t === 8) x.la = rr.readSVarint();
              else if (t === 9) x.lo = rr.readSVarint();
            },
            { id: 0, la: 0, lo: 0 }
          );
          aoNo(n.id, coord(n.la, b.latOff), coord(n.lo, b.lngOff));
        } else if (tag === 3 && aoCaminho) {
          const w = r.readMessage(
            (t, x, rr) => {
              if (t === 1) x.id = rr.readVarint();
              else if (t === 2) rr.readPackedVarint(x.chaves);
              else if (t === 3) rr.readPackedVarint(x.valores);
              else if (t === 8) rr.readPackedSVarint(x.refs);
            },
            { id: 0, chaves: [], valores: [], refs: [] }
          );
          const tags = {};
          for (let i = 0; i < w.chaves.length; i++)
            tags[b.textos[w.chaves[i]]] = b.textos[w.valores[i]];
          let ref = 0;
          const refs = w.refs.map((dlt) => (ref += dlt));
          aoCaminho(w.id, tags, refs);
        }
        // O resto (relações, ou o que esta passagem não quer) não se lê: o
        // `readFields` do `pbf` salta sozinho um campo que ninguém leu.
      },
      null,
      fim
    );
  }
}

// ── Construção ─────────────────────────────────────────────────────────
const t0 = Date.now();
const buf = fs.readFileSync(ORIGEM);
console.log(`a ler ${path.basename(ORIGEM)} (${(buf.length / 1e6).toFixed(1)} MB)`);

// Passagem 1: as vias que servem, e quantas vezes cada nó aparece.
const vias = [];
const usos = new Map();
for (const dados of blocosDeDados(buf)) {
  lerBloco(dados, {
    aoCaminho(id, tags, refs) {
      const classe = classeDaVia(tags);
      if (!classe || refs.length < 2) return;
      vias.push({ classe, sentido: sentidoDaVia(tags), refs });
      for (let i = 0; i < refs.length; i++) {
        // As pontas contam a dobrar: são sempre vértices do grafo.
        const peso = i === 0 || i === refs.length - 1 ? 2 : 1;
        usos.set(refs[i], (usos.get(refs[i]) || 0) + peso);
      }
    },
  });
}
console.log(`  ${vias.length} vias para carro, ${usos.size} nós nelas`);

// Passagem 2: as coordenadas só desses nós.
const lat = new Map();
const lng = new Map();
for (const dados of blocosDeDados(buf)) {
  lerBloco(dados, {
    aoNo(id, la, lo) {
      if (usos.has(id)) {
        lat.set(id, la);
        lng.set(id, lo);
      }
    },
  });
}
console.log(`  ${lat.size} coordenadas encontradas`);

function metros(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLa = (lat.get(b) - lat.get(a)) * r;
  const dLo = (lng.get(b) - lng.get(a)) * r;
  const h =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(lat.get(a) * r) * Math.cos(lat.get(b) * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Pontos (todos os nós usados), vértices (cruzamentos e pontas) e arestas
// (troços entre vértices, com a geometria pelo meio).
const indicePonto = new Map();
const pontosLat = [];
const pontosLng = [];
const ponto = (id) => {
  let i = indicePonto.get(id);
  if (i === undefined) {
    i = pontosLat.length;
    indicePonto.set(id, i);
    pontosLat.push(Math.round(lat.get(id) * 1e7));
    pontosLng.push(Math.round(lng.get(id) * 1e7));
  }
  return i;
};
const indiceVertice = new Map();
const verticePonto = [];
const vertice = (id) => {
  let v = indiceVertice.get(id);
  if (v === undefined) {
    v = verticePonto.length;
    indiceVertice.set(id, v);
    verticePonto.push(ponto(id));
  }
  return v;
};

const arestaDe = [];
const arestaPara = [];
const arestaGeoIni = [];
const arestaGeoTam = [];
const arestaMetros = [];
const arestaClasse = [];
const arestaSentido = [];
const geometria = [];
let semCoordenada = 0;

for (const v of vias) {
  const refs = v.refs.filter((id) => lat.has(id));
  if (refs.length !== v.refs.length) semCoordenada++;
  if (refs.length < 2) continue;
  let ini = 0;
  for (let i = 1; i < refs.length; i++) {
    const ultimo = i === refs.length - 1;
    if (!ultimo && usos.get(refs[i]) < 2) continue;
    // Troço de refs[ini] a refs[i].
    const troco = refs.slice(ini, i + 1);
    let m = 0;
    for (let k = 1; k < troco.length; k++) m += metros(troco[k - 1], troco[k]);
    if (m > 0) {
      arestaDe.push(vertice(troco[0]));
      arestaPara.push(vertice(troco[troco.length - 1]));
      arestaGeoIni.push(geometria.length);
      arestaGeoTam.push(troco.length);
      for (const id of troco) geometria.push(ponto(id));
      arestaMetros.push(m);
      arestaClasse.push(CLASSES.indexOf(v.classe));
      arestaSentido.push(v.sentido);
    }
    ini = i;
  }
}

// ── Escrita ───────────────────────────────────────────────────────────
// Um cabeçalho JSON e depois as tabelas, cada uma alinhada a 4 bytes, para o
// servidor as ler como vistas sem copiar nada.
const tabelas = {
  pontosLat: Int32Array.from(pontosLat),
  pontosLng: Int32Array.from(pontosLng),
  verticePonto: Int32Array.from(verticePonto),
  arestaDe: Int32Array.from(arestaDe),
  arestaPara: Int32Array.from(arestaPara),
  arestaGeoIni: Int32Array.from(arestaGeoIni),
  arestaGeoTam: Int32Array.from(arestaGeoTam),
  arestaMetros: Float32Array.from(arestaMetros),
  arestaClasse: Uint8Array.from(arestaClasse),
  arestaSentido: Int8Array.from(arestaSentido),
  geometria: Int32Array.from(geometria),
};
const meta = {
  fonte: path.basename(ORIGEM),
  construidoEm: new Date().toISOString(),
  licenca: '© colaboradores do OpenStreetMap, ODbL',
  classes: CLASSES,
  velocidades: VELOCIDADE,
  tabelas: {},
};
let desloc = 0;
for (const [nome, t] of Object.entries(tabelas)) {
  meta.tabelas[nome] = { tipo: t.constructor.name, n: t.length, desloc };
  desloc += Math.ceil(t.byteLength / 4) * 4;
}
const cabeca = Buffer.from(JSON.stringify(meta));
const tamCabeca = Math.ceil((cabeca.length + 4) / 4) * 4;
const saida = Buffer.alloc(tamCabeca + desloc);
saida.writeUInt32LE(cabeca.length, 0);
cabeca.copy(saida, 4);
for (const [nome, t] of Object.entries(tabelas)) {
  Buffer.from(t.buffer, t.byteOffset, t.byteLength).copy(
    saida,
    tamCabeca + meta.tabelas[nome].desloc
  );
}
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, saida);

const km = arestaMetros.reduce((a, b) => a + b, 0) / 1000;
console.log(
  `  ${verticePonto.length} cruzamentos, ${arestaDe.length} troços, ` +
    `${km.toFixed(0)} km de estrada, ${pontosLat.length} pontos de desenho`
);
if (semCoordenada) console.log(`  (${semCoordenada} vias com nós fora do recorte, cortadas)`);
console.log(
  `escrito ${path.relative(process.cwd(), SAIDA)} — ${(saida.length / 1e6).toFixed(1)} MB em ${((Date.now() - t0) / 1000).toFixed(1)} s`
);
