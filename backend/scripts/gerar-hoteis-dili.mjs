// OS HOTÉIS DE DÍLI, PARA MARCAR A PARAGEM NO LOBBY (10/10/2026).
//
// Pedido do Simão: há hotéis com muro e lobby, e sítios atrás de um morro,
// onde a estrada mais perto não é onde o carro pode parar. A paragem certa
// conhece-a quem conhece o terreno — mas marcá-la de raiz, uma a uma, era
// trabalho a mais. Este guião tira do OpenStreetMap os hotéis de Díli e
// propõe para cada um o sítio, o raio e uma paragem; no painel (Paragens →
// Hotéis por marcar) confirma-se ou arrasta-se o pino para o lobby.
//
// A PARAGEM PROPOSTA, por ordem:
//   1. uma ENTRADA marcada no OSM (entrance=*) até 80 m do hotel — há poucas;
//   2. o ponto mais perto do hotel numa VIA DE SERVIÇO (o acesso, a entrada
//      do parque) até 80 m — é por onde o carro entra no muro;
//   3. senão, o próprio centro do hotel, e o painel avisa que é para afinar.
//
// ENTRADA  backend/mapa/receita/osm/*.osm.pbf  (o mesmo do mapa próprio)
// SAÍDA    painel/src/lib/hoteisDili.json
//
// Correr:  node scripts/gerar-hoteis-dili.mjs   (depois de `npm run atualizar-mapa`)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PbfReader } from 'pbf';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PASTA_OSM = path.join(AQUI, '..', 'mapa', 'receita', 'osm');
const ORIGEM =
  process.argv[2] ||
  path.join(
    PASTA_OSM,
    fs
      .readdirSync(PASTA_OSM)
      .filter((f) => f.endsWith('.osm.pbf'))
      .sort()
      .at(-1)
  );
const SAIDA = path.join(AQUI, '..', '..', 'painel', 'src', 'lib', 'hoteisDili.json');

// Díli e arredores (Hera a Tasitolu, Becora a Fatuhada e o Cristo Rei).
const DILI = { latMin: -8.62, latMax: -8.5, lngMin: 125.45, lngMax: 125.7 };
const emDili = (la, lo) => la > DILI.latMin && la < DILI.latMax && lo > DILI.lngMin && lo < DILI.lngMax;
const TIPOS = new Set(['hotel', 'guest_house', 'hostel', 'motel', 'resort', 'apartment']);
const PERTO_M = 80;

function* blocos(buf) {
  let pos = 0;
  while (pos < buf.length) {
    const t = buf.readUInt32BE(pos);
    pos += 4;
    const c = new PbfReader(buf.subarray(pos, pos + t)).readFields(
      (g, o, p) => {
        if (g === 1) o.tipo = p.readString();
        else if (g === 3) o.tam = p.readVarint();
      },
      { tipo: '', tam: 0 }
    );
    pos += t;
    const b = new PbfReader(buf.subarray(pos, pos + c.tam)).readFields((g, o, p) => {
      if (g === 1) o.cru = p.readBytes();
      else if (g === 3) o.z = p.readBytes();
    }, {});
    pos += c.tam;
    if (c.tipo === 'OSMData') yield b.cru ? Buffer.from(b.cru) : zlib.inflateSync(b.z);
  }
}

// Uma passagem: todos os nós (com as etiquetas, ao contrário do construir-
// rede, que não as lê) e as vias que interessam.
function ler(buf) {
  const nos = new Map();
  const nosComTags = [];
  const vias = [];
  for (const d of blocos(buf)) {
    const p = new PbfReader(d);
    const b = { tx: [], gr: [], esc: 100, la: 0, lo: 0 };
    p.readFields((t, o, r) => {
      if (t === 1)
        r.readMessage((tt, l, rr) => {
          if (tt === 1) l.push(rr.readString());
        }, o.tx);
      else if (t === 2) {
        const n = r.readVarint();
        o.gr.push([r.pos, r.pos + n]);
        r.pos += n;
      } else if (t === 17) o.esc = r.readVarint();
      else if (t === 19) o.la = r.readVarint(true);
      else if (t === 20) o.lo = r.readVarint(true);
    }, b);
    const co = (v, off) => (off + b.esc * v) * 1e-9;
    for (const [ini, fim] of b.gr) {
      p.pos = ini;
      p.readFields(
        (t, _o, r) => {
          if (t === 2) {
            const x = r.readMessage(
              (tt, x, rr) => {
                if (tt === 1) rr.readPackedSVarint(x.ids);
                else if (tt === 8) rr.readPackedSVarint(x.la);
                else if (tt === 9) rr.readPackedSVarint(x.lo);
                else if (tt === 10) rr.readPackedVarint(x.kv);
              },
              { ids: [], la: [], lo: [], kv: [] }
            );
            let id = 0;
            let la = 0;
            let lo = 0;
            let k = 0;
            for (let j = 0; j < x.ids.length; j++) {
              id += x.ids[j];
              la += x.la[j];
              lo += x.lo[j];
              const A = co(la, b.la);
              const O = co(lo, b.lo);
              nos.set(id, [A, O]);
              const tags = {};
              while (k < x.kv.length && x.kv[k] !== 0) {
                tags[b.tx[x.kv[k]]] = b.tx[x.kv[k + 1]];
                k += 2;
              }
              k++;
              if (tags.tourism || tags.entrance) nosComTags.push({ lat: A, lng: O, tags });
            }
          } else if (t === 3) {
            const w = r.readMessage(
              (tt, x, rr) => {
                if (tt === 2) rr.readPackedVarint(x.k);
                else if (tt === 3) rr.readPackedVarint(x.v);
                else if (tt === 8) rr.readPackedSVarint(x.r);
              },
              { k: [], v: [], r: [] }
            );
            const tags = {};
            for (let j = 0; j < w.k.length; j++) tags[b.tx[w.k[j]]] = b.tx[w.v[j]];
            if (!TIPOS.has(tags.tourism) && tags.highway !== 'service') return;
            let ref = 0;
            vias.push({ tags, refs: w.r.map((dl) => (ref += dl)) });
          }
        },
        null,
        fim
      );
    }
  }
  return { nos, nosComTags, vias };
}

const RAIO_TERRA = 6371000;
function metros([a1, o1], [a2, o2]) {
  const r = Math.PI / 180;
  const x = (o2 - o1) * r * Math.cos(((a1 + a2) / 2) * r);
  return Math.hypot(x, (a2 - a1) * r) * RAIO_TERRA;
}
// O ponto de um segmento mais perto de p (em graus, chega para 80 m).
function pertoNoSegmento(p, a, b) {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * k;
  const bx = b[1] * k;
  const px = p[1] * k;
  const dx = bx - ax;
  const dy = b[0] - a[0];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (p[0] - a[0]) * dy) / l2)) : 0;
  return [a[0] + t * dy, a[1] + t * (b[1] - a[1])];
}
const seis = (n) => Number(n.toFixed(6));

const buf = fs.readFileSync(ORIGEM);
const { nos, nosComTags, vias } = ler(buf);

const hoteis = [];
for (const n of nosComTags)
  if (TIPOS.has(n.tags.tourism) && emDili(n.lat, n.lng))
    hoteis.push({ nome: n.tags.name || '', tipo: n.tags.tourism, centro: [n.lat, n.lng], contorno: null });
for (const w of vias) {
  if (!TIPOS.has(w.tags.tourism)) continue;
  const pts = w.refs.map((r) => nos.get(r)).filter(Boolean);
  if (!pts.length) continue;
  const c = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
  if (emDili(...c)) hoteis.push({ nome: w.tags.name || '', tipo: w.tags.tourism, centro: c, contorno: pts });
}

const entradas = nosComTags.filter((n) => n.tags.entrance && emDili(n.lat, n.lng)).map((n) => [n.lat, n.lng]);
const servico = vias
  .filter((w) => w.tags.highway === 'service' && w.tags.service !== 'parking_aisle')
  .map((w) => w.refs.map((r) => nos.get(r)).filter(Boolean))
  .filter((pts) => pts.length > 1 && pts.some((q) => emDili(...q)));

const saida = [];
const vistos = new Set();
for (const h of hoteis) {
  if (!h.nome) continue; // sem nome não se encontra na lista
  const chave = `${h.nome.toLowerCase()}|${h.centro[0].toFixed(3)}|${h.centro[1].toFixed(3)}`;
  if (vistos.has(chave)) continue; // o mesmo hotel desenhado como ponto e como edifício
  vistos.add(chave);

  // O raio cobre o edifício desenhado e um pouco do terreno à volta; um hotel
  // que é só um ponto leva 80 m.
  const raio = h.contorno
    ? Math.min(300, Math.max(60, Math.round(Math.max(...h.contorno.map((q) => metros(h.centro, q))) + 30)))
    : 80;

  let paragem = null;
  let origem = 'centro';
  let melhor = PERTO_M;
  for (const e of entradas) {
    const d = metros(h.centro, e);
    if (d < melhor) {
      melhor = d;
      paragem = e;
      origem = 'entrada';
    }
  }
  if (!paragem) {
    for (const pts of servico)
      for (let i = 1; i < pts.length; i++) {
        const q = pertoNoSegmento(h.centro, pts[i - 1], pts[i]);
        const d = metros(h.centro, q);
        if (d < melhor) {
          melhor = d;
          paragem = q;
          origem = 'acesso';
        }
      }
  }
  if (!paragem) paragem = h.centro;
  saida.push({
    nome: h.nome,
    tipo: h.tipo,
    lat: seis(h.centro[0]),
    lng: seis(h.centro[1]),
    paradaLat: seis(paragem[0]),
    paradaLng: seis(paragem[1]),
    raio,
    origem,
  });
}
saida.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
fs.writeFileSync(SAIDA, JSON.stringify({ fonte: path.basename(ORIGEM), hoteis: saida }, null, 1) + '\n');
const conta = (o) => saida.filter((h) => h.origem === o).length;
console.log(
  `${saida.length} hotéis em Díli → ${path.relative(process.cwd(), SAIDA)}\n` +
    `  paragem numa entrada do OSM: ${conta('entrada')} · num acesso: ${conta('acesso')} · por afinar: ${conta('centro')}`
);
