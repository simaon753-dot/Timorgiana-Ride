// A MIRA ENCAIXA NA PARAGEM (29/09/2026).
//
// Pedido do Simão, com a referência do Grab («Telkom Kuta Entrance»): as
// paragens definidas no painel aparecem no mapa como marcadores pequenos e
// fixos, e quando a pessoa larga o mapa com a mira perto de uma, a mira
// alinha-se exactamente com ela — a ponta sobre o centro do marcador. O
// marcador é a paragem, que existe e fica; a mira é só a ferramenta de
// apontar.
//
// Aqui está só a decisão, sem telemóvel, para se poder provar com
// `node scripts/testar-encaixe-paragem.mjs`. O desenho e o movimento estão
// em `MapaGoogle.js`.
import { metrosEntre } from './filtroPosicao.js';

// Perto quer dizer DEBAIXO DO DEDO: 44 pixéis do ecrã, o tamanho da mira.
// Em pixéis e não em metros, porque é o que a pessoa vê que decide se a
// mira «está em cima» da paragem.
export const ENCAIXE_PX = 44;

// Mas nunca mais longe do que isto. Com o mapa afastado, 44 pixéis são
// centenas de metros, e saltar para uma paragem a meio quarteirão do sítio
// apontado era mudar o destino a quem não pediu.
export const ENCAIXE_MAX_M = 60;

// Abaixo disto a mira já está sobre a paragem: não há nada a mover, e o
// ponto escolhido É a paragem (com o nome dela).
export const SOBRE_PX = 1.5;

// A paragem mais perto da ponta da mira que esteja dentro do alcance, com a
// distância em pixéis (`px`) e em metros (`m`); `null` se nenhuma estiver.
// `regiao`: a do mapa (o centro é a ponta da mira); `altura`: a do mapa em
// pixéis; `paragens`: [{ id, nome, lat, lng }].
export function paragemParaEncaixar({ regiao, altura, paragens }) {
  if (!regiao || !(altura > 0) || !paragens?.length) return null;
  const mPorPx = (regiao.latitudeDelta * 111320) / altura;
  if (!(mPorPx > 0)) return null;
  const centro = { lat: regiao.latitude, lng: regiao.longitude };
  let melhor = null;
  for (const p of paragens) {
    const m = metrosEntre(centro, p);
    const px = m / mPorPx;
    if (px <= ENCAIXE_PX && m <= ENCAIXE_MAX_M && (!melhor || px < melhor.px)) {
      melhor = { ...p, px, m };
    }
  }
  return melhor;
}
