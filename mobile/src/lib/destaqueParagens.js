// QUE PARAGENS ALTERNATIVAS SE DESTACAM NO MAPA (29/09/2026).
//
// Pedido do Simão: as alternativas ficam no mapa com o menor tamanho
// possível — um ponto — e só ficam mais visíveis quando a pessoa aproxima o
// mapa ou encosta a mira a uma delas. O desenho está em `MapaGoogle.js`
// (`DISCRETO`); aqui está só a decisão, sem telemóvel, para se poder provar
// com `node scripts/testar-destaque-paragens.mjs`.
import { abaixoComHisterese } from './disporEtiquetas.js';
import { metrosEntre } from './filtroPosicao.js';

// A partir de que zoom se destacam todas. 0,003 graus são uns 330 m de
// altura de ecrã: um aperto de dedos a partir do enquadramento de um ponto
// (0,006). Com histerese, como o `PERTO` das etiquetas.
export const DESTAQUE_ZOOM = 0.003;

// A que distância da ponta da mira uma alternativa se destaca, em PIXÉIS do
// ecrã e não em metros: a mira é do tamanho de um dedo em qualquer zoom, e é
// contra o dedo que «encostar» se decide. Sai-se mais longe do que se entra,
// para não piscar a quem pára o mapa em cima da fronteira.
export const DESTAQUE_MIRA_PX = 44;
export const DESTAQUE_MIRA_SAIR_PX = 56;

export const chaveParagem = (p) => `${p.qual}-${p.lat},${p.lng}`;

// `regiao`: a do mapa (latitude, longitude, latitudeDelta) — o centro é a
// ponta da mira. `altura`: a do mapa em pixéis. `antes`: o Set devolvido da
// última vez, e `estavaPerto` o `perto` de então (as duas histereses).
//
// Devolve `{ perto, destacadas }`, e `destacadas` é O MESMO Set de `antes`
// quando nada mudou — quem chama compara por identidade e não redesenha.
export function paragensADestacar({ regiao, altura, paragens, modoEscolha, antes, estavaPerto }) {
  const perto = abaixoComHisterese(regiao?.latitudeDelta, DESTAQUE_ZOOM, estavaPerto);
  // Metros por pixel: a altura do mapa em metros sobre a altura em pixéis.
  const mPorPx = regiao && altura > 0 ? (regiao.latitudeDelta * 111320) / altura : 0;
  const centro = regiao ? { lat: regiao.latitude, lng: regiao.longitude } : null;
  const novas = new Set();
  for (const p of paragens) {
    const k = chaveParagem(p);
    if (perto) {
      novas.add(k);
    } else if (modoEscolha && mPorPx) {
      const px = metrosEntre(centro, p) / mPorPx;
      if (px <= (antes.has(k) ? DESTAQUE_MIRA_SAIR_PX : DESTAQUE_MIRA_PX)) novas.add(k);
    }
  }
  const igual = novas.size === antes.size && [...novas].every((k) => antes.has(k));
  return { perto, destacadas: igual ? antes : novas };
}
