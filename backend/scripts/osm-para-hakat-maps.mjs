// OS SÍTIOS COM NOME DO OPENSTREETMAP PARA O HAKAT MAPS (10/10/2026).
//
//   node scripts/osm-para-hakat-maps.mjs            → só mostra o que faria
//   node scripts/osm-para-hakat-maps.mjs --registar → escreve os CSV e regista
//
// DECISÃO DO SIMÃO (opção B, 10/10/2026): importar os sítios com nome de Díli
// do OpenStreetMap, GUARDADOS À PARTE dos nossos. A licença do OSM (ODbL)
// obriga a oferecer a quem pedir a base derivada da parte que vem do OSM; os
// lugares próprios da HAKAT (lugares-para-giara.mjs, origem «TimorgianaRide»)
// ficam fora disso desde que não se misturem. Daí as regras:
//   · cada sítio leva source «OpenStreetMap» e o id «osm:n123» / «osm:w123»
//     (fica no HAKAT Maps como importedExternalId);
//   · um sítio do OSM que já exista como lugar nosso (mesmo nome a menos de
//     80 m) FICA DE FORA — nenhum se escreve por cima do outro;
//   · NUNCA DE NOVO: os ids já importados ficam em osm-hakat-maps-registo.json
//     (no repositório). Uma importação futura salta-os, e assim um sítio que o
//     Simão corrigiu ou arquivou no editor não volta nem é reescrito.
//
// O editor importa até 500 elementos por rascunho: os CSV saem em partes de
// 450, de oeste para leste. Importar cada parte num rascunho próprio
// (Importar › CSV), rever e publicar.
//
// ENTRADA  backend/mapa/receita/osm/*.osm.pbf (a fotografia mensal do OSM)
//          lugares_propostos aceites (só leitura, para os repetidos)
// SAÍDA    TimorgianaRide/importar-hakat-maps/hakat-maps-osm-N-de-M.csv
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PbfReader } from 'pbf';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PASTA_OSM = path.join(AQUI, '..', 'mapa', 'receita', 'osm');
const ORIGEM = path.join(
  PASTA_OSM,
  fs
    .readdirSync(PASTA_OSM)
    .filter((f) => f.endsWith('.osm.pbf'))
    .sort()
    .at(-1)
);
const REGISTO = path.join(AQUI, 'osm-hakat-maps-registo.json');
const SAIDA = path.join(AQUI, '..', '..', 'importar-hakat-maps');
const REGISTAR = process.argv.includes('--registar');
const POR_PARTE = 450;

const DILI = { latMin: -8.62, latMax: -8.5, lngMin: 125.45, lngMax: 125.7 };
const emDili = (la, lo) =>
  la > DILI.latMin && la < DILI.latMax && lo > DILI.lngMin && lo < DILI.lngMax;

// ── As categorias: o catálogo do HAKAT Maps (cópia em src/categoriasGiara.json).
const CODIGOS = new Set(
  JSON.parse(fs.readFileSync(path.join(AQUI, '..', 'src', 'categoriasGiara.json'), 'utf8')).flatMap(
    (g) => g.categorias.map(([c]) => c)
  )
);
// As etiquetas do OSM cujo nome não é igual ao código do catálogo.
const TRADUZ = {
  amenity: {
    college: 'instituto',
    doctors: 'consultorio_medico',
    townhall: 'administracao_municipal',
    marketplace: 'market',
    bus_station: 'terminal_de_autocarros',
    community_centre: 'community_centre',
    social_facility: 'shelter',
    money_transfer: 'servico_de_transferencia_de_dinheiro',
    bureau_de_change: 'casa_de_cambio',
    car_rental: 'car_rental',
    motorcycle_rental: 'aluguer_de_motorizadas',
    grave_yard: 'cemetery',
    events_venue: 'centro_de_eventos',
    conference_centre: 'centro_de_convencoes',
    arts_centre: 'centro_cultural',
    internet_cafe: 'internet',
    childcare: 'creche',
    language_school: 'escola_de_linguas',
    training: 'centro_de_formacao',
    prep_school: 'centro_de_explicacoes',
    public_building: 'public_building',
    waste_disposal: 'contentor_de_lixo',
  },
  shop: {
    convenience: 'loja_de_conveniencia',
    general: 'minimercado',
    variety_store: 'loja_de_desconto_obral',
    beauty: 'salao_de_beleza',
    hairdresser: 'hairdresser',
    electronics: 'eletronica',
    computer: 'computadores',
    car_parts: 'spare_parts',
    motorcycle: 'concessionario_de_motorizadas',
    car: 'car_dealer',
    car_repair: 'workshop',
    tyres: 'loja_de_pneus',
    books: 'livraria',
    cosmetics: 'cosmeticos',
    bag: 'bolsas_e_acessorios',
    toys: 'brinquedos',
    second_hand: 'loja_de_produtos_usados',
    wholesale: 'grossista',
    mall: 'centro_comercial',
    department_store: 'centro_comercial',
    greengrocer: 'frutas_e_legumes',
    seafood: 'fish_market',
    tailor: 'alfaiate',
    laundry: 'laundry',
    pet: 'produtos_para_animais',
    craft: 'artesanato',
    houseware: 'artigos_para_casa',
    doityourself: 'hardware',
    building_materials: 'materiais_de_construcao',
    agrarian: 'produtos_agricolas',
    sports: 'artigos_desportivos',
    gift: 'gift',
    telecommunication: 'operadora_movel',
    copyshop: 'stationery',
    photo: 'fotografo',
  },
  tourism: {
    guest_house: 'guesthouse',
    apartment: 'apart_hotel',
    camp_site: 'campsite',
    artwork: 'monument',
    gallery: 'art_gallery',
  },
  office: {
    government: 'servico_publico',
    ngo: 'ngo',
    company: 'company',
    diplomatic: 'embassy',
    lawyer: 'law_office',
    accountant: 'contabilista',
    insurance: 'seguradora',
    estate_agent: 'agencia_imobiliaria',
    travel_agent: 'travel_agency',
    association: 'associacao',
    educational_institution: 'instituto',
    telecommunication: 'operadora_movel',
    financial: 'empresa_financeira',
    religion: 'place_of_worship',
    political_party: 'associacao',
    international_organization: 'organizacao_internacional',
    notary: 'notario',
    employment_agency: 'agencia_de_emprego',
  },
  leisure: {
    sports_centre: 'complexo_desportivo',
    pitch: 'sports_pitch',
    fitness_centre: 'gym',
    resort: 'resort',
    nature_reserve: 'nature_reserve',
    marina: 'cais',
  },
  healthcare: {
    centre: 'centro_de_saude',
    laboratory: 'laboratorio',
    physiotherapist: 'fisioterapia',
  },
  building: {
    church: 'church',
    mosque: 'mosque',
    school: 'edificio_escolar',
    hospital: 'edificio_hospitalar',
    commercial: 'edificio_comercial',
    office: 'edificio_de_escritorios',
    government: 'public_building',
    public: 'public_building',
    apartments: 'edificio_residencial',
    hotel: 'hotel',
    retail: 'edificio_comercial',
    industrial: 'edificio_industrial',
    warehouse: 'warehouse',
  },
};
// O que fica quando nada serve, por família.
const RESERVA = {
  amenity: 'outro_servico',
  shop: 'outro_comercio',
  tourism: 'outro_ponto_de_interesse',
  office: 'escritorio',
  leisure: 'outro_ponto_de_interesse',
  healthcare: 'clinic',
  craft: 'outro_servico',
  historic: 'historic',
  building: 'building',
};
const FAMILIAS = [
  'amenity',
  'healthcare',
  'tourism',
  'shop',
  'office',
  'leisure',
  'craft',
  'historic',
  'building',
];

function categoria(t) {
  if (t.amenity === 'place_of_worship') {
    const r = t.religion;
    return r === 'muslim'
      ? 'mosque'
      : r === 'buddhist'
        ? 'buddhist_temple'
        : r === 'hindu'
          ? 'templo_hindu'
          : r === 'christian'
            ? 'church'
            : 'place_of_worship';
  }
  for (const f of FAMILIAS) {
    const v = t[f];
    if (!v || v === 'no') continue;
    if (TRADUZ[f]?.[v] && CODIGOS.has(TRADUZ[f][v])) return TRADUZ[f][v];
    if (v !== 'yes' && CODIGOS.has(v)) return v;
    return RESERVA[f];
  }
  return null;
}

// ── Leitura do .osm.pbf (o mesmo leitor do gerar-hoteis-dili.mjs).
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

function ler(buf) {
  const nos = new Map();
  const sitios = [];
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
              if (tags.name && emDili(A, O))
                sitios.push({ id: `osm:n${id}`, tags, lat: A, lng: O });
            }
          } else if (t === 3) {
            const w = r.readMessage(
              (tt, x, rr) => {
                if (tt === 1) x.id = rr.readVarint();
                else if (tt === 2) rr.readPackedVarint(x.k);
                else if (tt === 3) rr.readPackedVarint(x.v);
                else if (tt === 8) rr.readPackedSVarint(x.r);
              },
              { id: 0, k: [], v: [], r: [] }
            );
            const tags = {};
            for (let j = 0; j < w.k.length; j++) tags[b.tx[w.k[j]]] = b.tx[w.v[j]];
            if (
              !tags.name ||
              tags.highway ||
              tags.waterway ||
              tags.natural ||
              tags.boundary ||
              tags.landuse
            )
              return;
            let ref = 0;
            vias.push({ id: `osm:w${w.id}`, tags, refs: w.r.map((dl) => (ref += dl)) });
          }
        },
        null,
        fim
      );
    }
  }
  for (const v of vias) {
    const pts = v.refs.map((r) => nos.get(r)).filter(Boolean);
    if (!pts.length) continue;
    const lat = pts.reduce((s, q) => s + q[0], 0) / pts.length;
    const lng = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    if (emDili(lat, lng)) sitios.push({ id: v.id, tags: v.tags, lat, lng });
  }
  return sitios;
}

const simples = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
function metros(a1, o1, a2, o2) {
  const r = Math.PI / 180;
  return Math.hypot((o2 - o1) * r * Math.cos(((a1 + a2) / 2) * r), (a2 - a1) * r) * 6371000;
}
const seis = (n) => Number(n.toFixed(6));
const cel = (v) => {
  let t = v == null ? '' : String(v);
  if (/^[\s]*[=+\-@]/.test(t) && typeof v !== 'number') t = `'${t}`;
  return `"${t.replaceAll('"', '""')}"`;
};

// ── Os nossos lugares (para não repetir) e o que já foi importado.
let nossos = [];
if (process.env.DATABASE_URL) {
  const { query } = await import('../src/db.js');
  nossos = await query(`SELECT nome, lat, lng FROM lugares_propostos WHERE estado = 'aceite'`);
}
const registo = fs.existsSync(REGISTO) ? JSON.parse(fs.readFileSync(REGISTO, 'utf8')) : { ids: [] };
const jaImportados = new Set(registo.ids);

const sitios = ler(fs.readFileSync(ORIGEM));
const vistos = new Set();
const saida = [];
const fora = { semCategoria: 0, repetidoNosso: 0, jaImportado: 0, duplicadoOsm: 0 };
for (const s of sitios) {
  const cat = categoria(s.tags);
  if (!cat) {
    fora.semCategoria++;
    continue;
  }
  if (jaImportados.has(s.id)) {
    fora.jaImportado++;
    continue;
  }
  const n = simples(s.tags.name);
  // O mesmo sítio desenhado como ponto E como edifício no OSM: fica um.
  const chave = `${n}|${s.lat.toFixed(3)}|${s.lng.toFixed(3)}`;
  if (vistos.has(chave)) {
    fora.duplicadoOsm++;
    continue;
  }
  vistos.add(chave);
  if (
    nossos.some(
      (l) => simples(l.nome) === n && metros(s.lat, s.lng, Number(l.lat), Number(l.lng)) < 80
    )
  ) {
    fora.repetidoNosso++;
    continue;
  }
  saida.push({ ...s, cat });
}

saida.sort((a, b) => a.lng - b.lng);
const partes = Math.ceil(saida.length / POR_PARTE);
console.log(`${path.basename(ORIGEM)}: ${saida.length} sítios para importar em ${partes} parte(s)`);
console.log(`  de fora: ${JSON.stringify(fora)}`);
const porCat = {};
for (const s of saida) porCat[s.cat] = (porCat[s.cat] || 0) + 1;
console.log(
  '  categorias mais comuns:',
  Object.entries(porCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([c, n]) => `${c} ${n}`)
    .join(', ')
);

if (!REGISTAR) {
  console.log('\n  (ensaio: nada escrito. Correr com --registar para escrever os CSV.)');
  process.exit(0);
}

fs.mkdirSync(SAIDA, { recursive: true });
for (let i = 0; i < partes; i++) {
  const lote = saida.slice(i * POR_PARTE, (i + 1) * POR_PARTE);
  const linhas = [
    [
      'id',
      'kind',
      'name',
      'source',
      'category',
      'nameTetum',
      'namePortuguese',
      'nameEnglish',
      'longitude',
      'latitude',
    ]
      .map(cel)
      .join(','),
  ];
  for (const s of lote)
    linhas.push(
      [
        s.id,
        'place',
        s.tags.name,
        'OpenStreetMap',
        s.cat,
        s.tags['name:tet'] || '',
        s.tags['name:pt'] || '',
        s.tags['name:en'] || '',
        seis(s.lng),
        seis(s.lat),
      ]
        .map(cel)
        .join(',')
    );
  const f = path.join(SAIDA, `hakat-maps-osm-${i + 1}-de-${partes}.csv`);
  fs.writeFileSync(f, '﻿' + linhas.join('\r\n') + '\r\n');
  console.log(`  ✓ ${path.relative(process.cwd(), f)}  (${lote.length})`);
}
fs.writeFileSync(
  REGISTO,
  JSON.stringify(
    {
      nota: 'Ids do OpenStreetMap já enviados para o HAKAT Maps. Não voltam a ser importados (scripts/osm-para-hakat-maps.mjs).',
      fonte: path.basename(ORIGEM),
      ids: [...jaImportados, ...saida.map((s) => s.id)].sort(),
    },
    null,
    0
  ) + '\n'
);
console.log(`  ✓ registo: ${jaImportados.size + saida.length} ids`);
process.exit(0);
