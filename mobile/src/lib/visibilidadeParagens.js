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
