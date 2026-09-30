// ONDE O CARRO PODE MESMO ENCOSTAR (27/09/2026).
//
// PORQUE EXISTE. O ponto da estrada — onde fica a etiqueta «Fatin hatun» e
// onde o carro vai parar — era pedido ao OSRM público, que usa o mapa do
// OpenStreetMap. Para ele, «estrada por onde passa um carro» inclui caminhos
// de serviço e trilhos: o acesso a um pátio, o caminho de terra dentro de um
// estaleiro. O Simão escolheu um destino num terreno em Hudi Laran e a
// etiqueta caiu dentro do estaleiro ao lado, com as duas estradas a sério — a
// de cima e a de baixo — à vista na fotografia de satélite.
//
// A regra dele: a etiqueta aparece sempre numa estrada por onde passam
// motorizada, carro e pick-up.
//
// COMO. O nosso próprio mapa de Timor-Leste (`publico/timor-leste.pmtiles`,
// o mesmo que já diz ao servidor onde é água) sabe o TIPO de cada estrada.
// Procura-se a mais próxima só entre as que servem: principais, secundárias,
// terciárias, residenciais, sem classificação e de coexistência. Os trilhos
// só contam se não houver nenhuma destas no raio (ver `eTrilho`). Ficam
// sempre de fora os caminhos de serviço, os carreiros e os passeios.
//
// Um acesso privado a um hotel ou a um mercado é caminho de serviço, e fica
// de fora também — e está certo: é o que o Grab faz, deixa à porta, na
// estrada, e não lá dentro.
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { mosaico } from './mosaicos.js';

// O zoom com o desenho mais fino que o mapa tem. Mais abaixo as linhas vêm
// simplificadas e o ponto encontrado pode cair uns metros ao lado da estrada.
const ZOOM = 15;

// Até onde se procura — o mesmo limite da app (`lib/estrada.js`). Mais longe
// do que isto, o que se encontra está do outro lado de um muro, de um
// ribeiro ou de uma vedação, e encostar lá era mandar o carro para um sítio a
// que a pessoa não chega a pé.
export const RAIO_M = 120;

// Os tipos que servem, pelo esquema do mapa (Protomaps): `kind` e
// `kind_detail`. Por inclusão e não por exclusão — um tipo novo que apareça
// numa versão futura do mapa fica de fora até alguém decidir que serve, em
// vez de entrar sem ninguém dar por isso.
const SERVE = {
  highway: null, // autoestradas e vias rápidas: todas
  major_road: null, // principais, secundárias, terciárias: todas
  minor_road: new Set(['residential', 'unclassified']),
  other: new Set(['living_street']),
};

function serveParaCarro(p) {
  if (!(p.kind in SERVE)) return false;
  const detalhes = SERVE[p.kind];
  return !detalhes || detalhes.has(p.kind_detail);
}

// O TRILHO É ÚLTIMO RECURSO, e não proibido. Medido numa grelha em Díli: em
// algumas zonas só há trilhos num raio de 120 m, e é por eles que a mota e a
// pick-up entram de facto no bairro. Proibi-los deixava essas zonas sem ponto
// nenhum. Mas havendo uma estrada a sério no raio, ganha sempre ela — mesmo
// que o trilho esteja mais perto. Caminhos de serviço, carreiros e passeios
// nunca contam: são pátios, acessos privados, sítios por onde se anda a pé.
function eTrilho(p) {
  return p.kind === 'path' && p.kind_detail === 'track';
}

function mosaicoDe(lat, lng, z) {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n),
  };
}

// O ponto de estrada que serve mais perto de (lat, lng), ou `null` se não
// houver nenhum no raio. Lança se o mapa não puder ser lido — e quem chama
// tem de distinguir as duas coisas: «não há estrada» não é «não sei».
export async function estradaMaisPerto(lat, lng, raioM = RAIO_M) {
  // Contas em metros, num plano à volta do ponto. A 120 m a curvatura da
  // Terra não se nota, e é muito mais simples do que a esfera.
  const mLat = 110574;
  const mLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const dLat = raioM / mLat;
  const dLng = raioM / mLng;

  // Os mosaicos que o raio toca. Quase sempre um só; junto a uma borda,
  // dois ou quatro.
  const a = mosaicoDe(lat + dLat, lng - dLng, ZOOM);
  const b = mosaicoDe(lat - dLat, lng + dLng, ZOOM);

  let melhor = null;
  let melhorTrilho = null;
  // A RUA COM NOME mais perto (30/09/2026). Muitas travessas de Díli não
  // têm nome no mapa; quando o carro encosta a uma delas, é esta que diz à
  // pessoa onde está («Rua de Caicoli»). Só para mostrar — o sítio onde o
  // carro pára continua a ser o de cima.
  let comNome = null;
  for (let x = a.x; x <= b.x; x++) {
    for (let y = a.y; y <= b.y; y++) {
      const bruto = await mosaico(ZOOM, x, y);
      if (!bruto) continue;
      const camada = new VectorTile(new PbfReader(bruto)).layers?.roads;
      if (!camada) continue;
      for (let i = 0; i < camada.length; i++) {
        const f = camada.feature(i);
        const trilho = eTrilho(f.properties);
        if (!trilho && !serveParaCarro(f.properties)) continue;
        const g = f.toGeoJSON(x, y, ZOOM).geometry;
        const linhas =
          g.type === 'LineString'
            ? [g.coordinates]
            : g.type === 'MultiLineString'
              ? g.coordinates
              : [];
        for (const linha of linhas) {
          for (let k = 1; k < linha.length; k++) {
            // O segmento em metros, com o ponto pedido na origem.
            const ax = (linha[k - 1][0] - lng) * mLng;
            const ay = (linha[k - 1][1] - lat) * mLat;
            const bx = (linha[k][0] - lng) * mLng;
            const by = (linha[k][1] - lat) * mLat;
            const vx = bx - ax;
            const vy = by - ay;
            const comp2 = vx * vx + vy * vy;
            const t = comp2 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / comp2)) : 0;
            const qx = ax + t * vx;
            const qy = ay + t * vy;
            const d = Math.hypot(qx, qy);
            if (f.properties.name && d <= raioM && (!comNome || d < comNome.metros)) {
              comNome = { rua: f.properties.name, metros: Math.round(d) };
            }
            const actual = trilho ? melhorTrilho : melhor;
            if (d <= raioM && (!actual || d < actual.metros)) {
              const ponto = {
                lat: lat + qy / mLat,
                lng: lng + qx / mLng,
                metros: Math.round(d),
                rua: f.properties.name || null,
                tipo: f.properties.kind_detail || f.properties.kind,
              };
              if (trilho) melhorTrilho = ponto;
              else melhor = ponto;
            }
          }
        }
      }
    }
  }
  const escolhido = melhor || melhorTrilho;
  return escolhido ? { ...escolhido, ruaPerto: comNome?.rua || null } : null;
}
