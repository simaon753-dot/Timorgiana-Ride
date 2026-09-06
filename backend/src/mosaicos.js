import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
// `PbfReader` e não `Pbf`: a versão nova da biblioteca separou a leitura da
// escrita e deixou de ter exportação por omissão.
import { PbfReader } from 'pbf';

// Servir os mosaicos do mapa próprio, um a um.
//
// PORQUE EXISTE, e é um erro meu corrigido. O ficheiro .pmtiles é servido
// inteiro noutra rota, e no browser isso chega: o MapLibre de JavaScript sabe
// ler `pmtiles://` porque se lhe acrescenta um pedaço de código.
//
// O MAPLIBRE NATIVO DO TELEMÓVEL NÃO SABE. Vê um endereço que não entende e
// não desenha nada. Eu testei o mapa no browser, onde funciona, e não na app,
// onde não podia funcionar — e o Simão instalou um APK para descobrir isso.
//
// Aqui o servidor lê o mosaico de dentro do ficheiro e devolve-o num endereço
// que qualquer motor de mapas entende: /mapa/{z}/{x}/{y}.mvt
//
// UM SÓ LEITOR PARA TODA A VIDA DO PROCESSO. O PMTiles guarda o índice em
// memória depois da primeira leitura; abrir um leitor por pedido deitava esse
// índice fora a cada mosaico e lia o cabeçalho do ficheiro dezenas de vezes
// por ecrã.
class FicheiroLocal {
  constructor(caminho) {
    this.caminho = caminho;
  }

  getKey() {
    return this.caminho;
  }

  async getBytes(posicao, tamanho) {
    const f = await open(this.caminho, 'r');
    try {
      const buf = Buffer.alloc(tamanho);
      await f.read(buf, 0, tamanho, posicao);
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    } finally {
      await f.close();
    }
  }
}

let leitor = null;

function obter() {
  if (!leitor) {
    const caminho = fileURLToPath(new URL('../publico/timor-leste.pmtiles', import.meta.url));
    leitor = new PMTiles(new FicheiroLocal(caminho));
  }
  return leitor;
}

export async function mosaico(z, x, y) {
  const t = await obter().getZxy(z, x, y);
  return t?.data ? Buffer.from(t.data) : null;
}

// ── Este ponto está dentro de água? ────────────────────────────────
//
// PORQUE VIVE AQUI. Ontem eu disse ao Simão que apontar dez metros para
// dentro do mar não fazia mal: a estrada está a cinquenta metros e o pino
// encostava-se a ela. Ele discordou, e tem razão — mover o pino em silêncio é
// decidir por quem apontou; dizer "indisponível" é responder-lhe.
//
// Só que nem o Nominatim nem o OSRM sabem dizer "isto é água". O Nominatim
// encosta ao que estiver perto (devolveu-me "Avenida de Portugal" para um
// ponto no mar) e o OSRM só sabe a distância à estrada, que perto da costa é
// pequena.
//
// QUEM SABE É O NOSSO MAPA. O ficheiro de Timor-Leste tem uma camada `water`
// com o mar e as lagoas desenhados, e está no disco deste servidor. Abre-se o
// mosaico daquele ponto e vê-se se ele cai dentro de um polígono de água.
//
// Sem chamada a ninguém, sem limite de pedidos, sem depender de serviço
// nenhum. O mapa que fizemos passa a ser o instrumento que responde.
// O NÍVEL MAIS DETALHADO QUE O FICHEIRO TEM.
//
// Ao nível 14 a linha da costa vem simplificada e o mar só começa umas
// dezenas de metros ao largo — um ponto a dez metros da praia ficava de fora.
// O 15 é o máximo que extraímos, e é onde a costa está desenhada com o
// detalhe que a pergunta exige.
const ZOOM_AGUA = 15;

function paraMosaico(lat, lng, z) {
  const n = 2 ** z;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    ),
  };
}

// Lançamento de raio: conta quantas vezes uma linha que sai do ponto para o
// infinito atravessa a fronteira. Ímpar = está dentro.
function dentroDoAnel(ponto, anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > ponto[1] !== yj > ponto[1]) {
      const corte = ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi;
      if (ponto[0] < corte) dentro = !dentro;
    }
  }
  return dentro;
}

function dentroDoPoligono(ponto, coordenadas, tipo) {
  const partes = tipo === 'MultiPolygon' ? coordenadas : [coordenadas];
  for (const poligono of partes) {
    // O primeiro anel é o contorno; os seguintes são buracos — uma ilha
    // dentro de uma lagoa é terra, e quem lá aponta não está na água.
    if (!poligono.length || !dentroDoAnel(ponto, poligono[0])) continue;
    let emBuraco = false;
    for (let i = 1; i < poligono.length; i++) {
      if (dentroDoAnel(ponto, poligono[i])) {
        emBuraco = true;
        break;
      }
    }
    if (!emBuraco) return true;
  }
  return false;
}

export async function estaNaAgua(lat, lng) {
  try {
    const { x, y } = paraMosaico(lat, lng, ZOOM_AGUA);
    const bruto = await mosaico(ZOOM_AGUA, x, y);
    if (!bruto) return false;
    const tile = new VectorTile(new PbfReader(bruto));
    const camada = tile.layers?.water;
    if (!camada) return false;
    for (let i = 0; i < camada.length; i++) {
      const g = camada.feature(i).toGeoJSON(x, y, ZOOM_AGUA).geometry;
      if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
      if (dentroDoPoligono([lng, lat], g.coordinates, g.type)) return true;
    }
    return false;
  } catch {
    // Sem resposta, não se bloqueia. Não saber que é água não é razão para
    // impedir alguém de pedir uma viagem à esquina.
    return false;
  }
}
