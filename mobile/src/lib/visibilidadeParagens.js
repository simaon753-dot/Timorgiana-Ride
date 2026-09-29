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
// mundo, cada nível mais é o dobro de perto).
//
// 18, e não 16 (29/09/2026, corrigido pelo Simão no telemóvel dele). A vista
// com que o mapa abre um ponto (0,008 graus; 0,006 no botão da localização)
// fica no nível 17 a 17,3 num telemóvel — e com o limite em 16 a etiqueta já
// lá estava sem ninguém aproximar. Não era isso: no vídeo do Grab o ponto
// só aparece com o mapa BEM aproximado e some ao afastar. 18 fica acima da
// vista normal e chega-se lá com um aperto de dedos. (Antes de 29/09 a
// etiqueta aparecia aos 0,0015 graus, uns 19.)
export const ZOOM_MIN_PARAGENS = 18;

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
