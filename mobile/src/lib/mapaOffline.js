import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Mapa de Díli guardado no telemóvel.
//
// 2,9 MB cobrem a cidade inteira até ao zoom 15 — do Tibar a Hera, com
// ruas, edifícios, água e pontos de interesse. Cabe nesse tamanho porque
// os mosaicos são VECTORIAIS: descrevem as formas em vez de as desenhar.
// Em imagens, a mesma área custaria uns 40 MB.
//
// O ficheiro viaja como recurso, não dentro do pacote de código. As
// actualizações pelo ar reaproveitam recursos pelo seu resumo, por isso
// descarrega-se uma vez e nunca mais — mesmo com dezenas de
// actualizações a seguir.
//
// Origem: Protomaps Basemap v4, derivado do OpenStreetMap (ODbL).
// Regenerar com: node scripts/gerar-mapa-dili.mjs

// Área coberta. Serve para a app saber quando NÃO tem dados — fora disto
// não vale a pena mostrar um mapa vazio a fingir que está tudo bem.
export const AREA_DILI = { oeste: 125.45, sul: -8.66, este: 125.72, norte: -8.46 };

export function dentroDeDili(lat, lng) {
  return (
    lat >= AREA_DILI.sul &&
    lat <= AREA_DILI.norte &&
    lng >= AREA_DILI.oeste &&
    lng <= AREA_DILI.este
  );
}

// Lido em pedaços, e não de uma vez.
//
// O WebView do Android recebe o JavaScript injectado por uma chamada
// nativa que não gosta de cadeias enormes: com os 3,9 MB de base64 de
// uma assentada, falha — e falha em SILÊNCIO, sem erro nenhum, o que
// daria um mapa vazio sem explicação possível.
const PEDACO_BYTES = 384 * 1024;

let localCache = null;

async function ficheiroLocal() {
  if (localCache) return localCache;
  const asset = Asset.fromModule(require('../../assets/mapa/dili.pmtiles'));
  if (!asset.localUri) await asset.downloadAsync();
  localCache = { uri: asset.localUri || asset.uri };
  const info = await FileSystem.getInfoAsync(localCache.uri);
  localCache.tamanho = info.size || 0;
  return localCache;
}

// Chama `aoPedaco(base64, indice, total)` por cada pedaço, pela ordem.
export async function lerMapaEmPedacos(aoPedaco) {
  const { uri, tamanho } = await ficheiroLocal();
  if (!tamanho) throw new Error('Mapa de Díli não encontrado.');

  const total = Math.ceil(tamanho / PEDACO_BYTES);
  for (let i = 0; i < total; i++) {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
      position: i * PEDACO_BYTES,
      length: Math.min(PEDACO_BYTES, tamanho - i * PEDACO_BYTES),
    });
    await aoPedaco(b64, i, total);
  }
  return { tamanho, pedacos: total };
}
