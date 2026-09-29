import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { getBaseUrl } from '../serverUrl.js';
import { linguaDaApp } from '../api/client.js';
import { navegacao } from '../navigation/navegacao.js';

// Link de mapa para ABRIR NOUTRA APLICAÇÃO — não é o mapa da nossa app.
//
// A app continua a desenhar tudo com OpenStreetMap, sem contas nem custos.
// Mas um link do site do OSM abre uma página pesada no browser, e numa rede
// como a de Díli isso demora e frustra. Estes links abrem o mapa nativo do
// telemóvel (Google Maps no Android, Apple Maps no iPhone), que já lá está
// instalado, funciona depressa e faz navegação.
//
// É só um endereço dentro de uma mensagem: não traz biblioteca, nem chave,
// nem dependência nova ao projecto.
export function linkMapa(lat, lng) {
  if (lat == null || lng == null) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Para abrir no próprio telemóvel de quem toca. O esquema `geo:` deixa a
// pessoa escolher a aplicação que prefere; se o telemóvel não souber o que
// fazer com ele, cai no endereço normal.
export function abrirNoMapa(Linking, lat, lng) {
  if (lat == null || lng == null) return Promise.resolve(false);
  const nativo = `geo:${lat},${lng}?q=${lat},${lng}`;
  return Linking.openURL(nativo).catch(() => Linking.openURL(linkMapa(lat, lng)));
}

// ── NAVEGAR SEM GOOGLE: o primeiro passo (29/09/2026) ─────────────────
//
// O Simão quer que os motoristas naveguem sem o Google. O caminho escolhido
// é por passos, e este é o primeiro: oferecer o ORGANIC MAPS ao lado do
// Google Maps. É uma aplicação de navegação gratuita, feita sobre os dados
// do OpenStreetMap — os mesmos do nosso mapa próprio — e que funciona SEM
// INTERNET depois de descarregado o mapa de Timor-Leste. Serve para
// sabermos, com motoristas reais, se esses dados chegam para conduzir em
// Díli e nos municípios, antes de construir navegação nossa.
//
// Pergunta-se de cada vez, de propósito, durante o ensaio: o que se quer
// saber é qual os motoristas escolhem.
//
// A ROTA PRECISA DO PONTO DE PARTIDA. A API documentada do Organic Maps
// (omaps.app/api, `om://route`) traz sempre `sll`; dá-se a última posição
// que o telemóvel conhece, que é instantânea. Sem posição nenhuma, abre-se o
// destino com `geo:`, que o Organic Maps também sabe ler.
const ORGANIC_MAPS_LOJA = 'market://details?id=app.organicmaps';
const ORGANIC_MAPS_LOJA_WEB = 'https://play.google.com/store/apps/details?id=app.organicmaps';

// `opcoes`: `rideId` (a navegação nossa mostra a viagem inteira) e `via`
// (as paragens do Pickup que faltam, por ordem — ver lib/paragensFeitas.js).
export function navegarAte(Linking, lat, lng, t, nome = '', opcoes = {}) {
  if (lat == null || lng == null) return;
  const via = (opcoes.via || []).filter((p) => p?.lat != null && p?.lng != null);
  // O Google leva as paragens como pontos de passagem; o Organic Maps só
  // sabe ir a um sítio, por isso vai à PRÓXIMA paragem e, dela, ao destino.
  const pontosGoogle = via.length
    ? `&waypoints=${encodeURIComponent(via.map((p) => `${p.lat},${p.lng}`).join('|'))}`
    : '';
  const primeiro = via[0] || { lat, lng, label: nome };
  // TRÊS BOTÕES, que é o máximo de um aviso no Android; cancelar é tocar
  // fora dele. A nossa em último, que no Android é o lugar do botão principal.
  Alert.alert(
    t('navegarCom'),
    t('navegarComNota'),
    [
      {
        text: 'Google Maps',
        onPress: () =>
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${pontosGoogle}&travelmode=driving`
          ).catch(() => abrirNoMapa(Linking, lat, lng)),
      },
      {
        text: 'Organic Maps',
        onPress: () =>
          abrirOrganicMaps(Linking, primeiro.lat, primeiro.lng, t, primeiro.label || ''),
      },
      {
        text: t('navegarNossa'),
        onPress: () => abrirNavegacaoNossa(Linking, lat, lng, nome, opcoes.rideId),
      },
    ],
    { cancelable: true }
  );
}

// A NAVEGAÇÃO NOSSA (29/09/2026, passo 3): uma página do nosso servidor, com
// o nosso mapa, as rotas nossas e a voz do telemóvel. Abre no navegador —
// não precisa de APK — e na língua da app. Ver backend/mapa/servidor.js.
function abrirNavegacaoNossa(Linking, lat, lng, nome, rideId) {
  // DENTRO DA APP desde a versão 1.5.0 (ecrã Navegar, com voz e ecrã
  // ligado). O navegador fica como reserva, se a navegação da app ainda não
  // estiver pronta.
  const nav = navegacao.current;
  if (nav?.isReady()) {
    nav.navigate('Navegar', { lat, lng, nome, rideId });
    return Promise.resolve(true);
  }
  const lingua = ['pt', 'tet', 'en'].includes(linguaDaApp()) ? linguaDaApp() : 'tet';
  const url =
    `${getBaseUrl()}/navegar?para=${lat},${lng}` +
    `&nome=${encodeURIComponent(nome || '')}&lingua=${lingua}`;
  return Linking.openURL(url);
}

async function abrirOrganicMaps(Linking, lat, lng, t, nome) {
  let partida = null;
  try {
    const p = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (p) partida = { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch {
    // Sem posição, segue-se sem ela (ver em baixo).
  }
  const url = partida
    ? `om://route?sll=${partida.lat},${partida.lng}&saddr=&dll=${lat},${lng}` +
      `&daddr=${encodeURIComponent(nome || '')}&type=vehicle`
    : `geo:${lat},${lng}?q=${lat},${lng}`;
  try {
    await Linking.openURL(url);
  } catch {
    // NÃO ESTÁ INSTALADO. Diz-se, e oferece-se a loja — em vez de o toque
    // não fazer nada, que é o que parece uma app avariada.
    Alert.alert(t('organicFalta'), t('organicFaltaNota'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('organicInstalar'),
        onPress: () =>
          Linking.openURL(ORGANIC_MAPS_LOJA).catch(() => Linking.openURL(ORGANIC_MAPS_LOJA_WEB)),
      },
    ]);
  }
}
