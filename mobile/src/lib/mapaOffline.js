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

let localCache = null;
let base64Cache = null;

async function ficheiroLocal() {
  if (localCache) return localCache;
  const asset = Asset.fromModule(require('../../assets/mapa/dili.pmtiles'));
  if (!asset.localUri) await asset.downloadAsync();
  localCache = { uri: asset.localUri || asset.uri };
  const info = await FileSystem.getInfoAsync(localCache.uri);
  localCache.tamanho = info.size || 0;
  return localCache;
}

// O mapa inteiro em base64, para ir dentro do HTML do WebView.
//
// Primeira tentativa: entregar por pedaços, com injectJavaScript. Não
// resultou, e a razão é a mesma para o injectJavaScript e para o
// postMessage — ambos passam pelo evaluateJavascript do Android, que
// serve para EXECUTAR código, não para transportar megabytes. O que
// falhava falhava em silêncio, e o mapa ficava cinzento sem pista
// nenhuma.
//
// O HTML, esse, viaja como PROPRIEDADE nativa do componente. É o mesmo
// caminho por onde já passa o Leaflet inteiro (144 KB) e o desenhador de
// vectores (125 KB), e aguenta os 3,9 MB do mapa sem se queixar.
//
// Lido uma vez por sessão e guardado aqui: dois mapas abertos ao mesmo
// tempo — o do pedido e o expandido — partilham a mesma leitura.
export async function lerMapaBase64() {
  if (base64Cache) return base64Cache;
  const { uri, tamanho } = await ficheiroLocal();
  if (!tamanho) throw new Error('Mapa de Díli não encontrado.');
  base64Cache = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return base64Cache;
}
