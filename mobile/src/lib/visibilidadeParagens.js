// OS PONTOS DE PARAGEM SÓ APARECEM COM O MAPA PERTO (29/09/2026).
//
// Pedido do Simão: com o mapa afastado — a cidade inteira — os pontos de
// paragem somem, e o mapa fica limpo; ao nível das ruas aparecem sozinhos,
// no sítio de sempre. Não se apaga nada: é só o desenho. Os pinos da
// recolha, do destino e do veículo não entram nesta regra.
//
// Aqui está só a decisão, sem telemóvel, para se poder provar com
// `node scripts/testar-visibilidade-paragens.mjs`. `MapaGoogle.js` chama-a a
// cada fotograma do gesto e só redesenha quando a resposta muda.

// O LIMITE, num sítio só. Nível de zoom do Google (o mesmo dos mapas: 0 é o
// mundo, cada nível mais é o dobro de perto). 16 é o nível em que se lêem os
// nomes das ruas — uns 950 m de largura num telemóvel; a vista de escolher um
// ponto (0,006 graus) anda pelos 16,5, e um nível para fora já os esconde.
export const ZOOM_MIN_PARAGENS = 16;

// Quem já os estava a ver só os perde um pouco abaixo do limite. Sem esta
// folga, parar o mapa em cima da fronteira fazia-os piscar.
export const FOLGA_ZOOM = 0.3;

// O nível de zoom de uma região do react-native-maps, pela LARGURA: na
// projecção do mapa um grau de longitude tem sempre o mesmo tamanho em
// pixéis, e um de latitude não. `largura` em pontos do ecrã; `null` se ainda
// não se souber.
export function zoomDaRegiao(regiao, largura) {
  if (!regiao || !(largura > 0) || !(regiao.longitudeDelta > 0)) return null;
  return Math.log2((360 * largura) / (256 * regiao.longitudeDelta));
}

// Se os pontos de paragem se vêem neste zoom, sabendo se se viam antes.
export function paragensAVista(zoom, viamSe) {
  if (zoom == null) return false;
  return zoom >= (viamSe ? ZOOM_MIN_PARAGENS - FOLGA_ZOOM : ZOOM_MIN_PARAGENS);
}

// SÓ AS QUE ESTÃO PERTO DA MIRA (29/09/2026, pedido seguinte do Simão).
//
// Com o zoom certo, ainda se viam todas as paragens da vista. Agora só as que
// estão à volta da ponta da mira — as da rua para onde se está a apontar — e,
// ao arrastar, as que ficam para trás somem e as da zona nova aparecem. As
// duas regras somam-se: zoom perto E paragem perto da mira.
//
// O RAIO, num sítio só: 250 metros à volta da ponta da mira, as
// proximidades de uma rua. Entra-se a 250 e sai-se a 280, para uma paragem
// na fronteira não acender e apagar enquanto o mapa desliza.
export const RAIO_PARAGENS_MIRA_M = 250;
export const FOLGA_RAIO_M = 30;

function metros(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Os `id` das paragens à volta de `centro` (a ponta da mira). `antes` é o Set
// devolvido da última vez: quem lá estava só sai além da folga. Devolve O
// MESMO Set quando nada mudou — quem chama compara por identidade e, a cada
// fotograma do arrasto, só redesenha quando uma paragem entra ou sai.
export function paragensPertoDaMira(centro, paragens, antes) {
  const novas = new Set();
  if (centro) {
    for (const p of paragens) {
      const limite = antes.has(p.id) ? RAIO_PARAGENS_MIRA_M + FOLGA_RAIO_M : RAIO_PARAGENS_MIRA_M;
      if (metros(centro, p) <= limite) novas.add(p.id);
    }
  }
  const igual = novas.size === antes.size && [...novas].every((id) => antes.has(id));
  return igual ? antes : novas;
}
