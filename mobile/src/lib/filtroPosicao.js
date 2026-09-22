// EM QUE LEITURAS DE GPS SE PODE ACREDITAR (22/09/2026).
//
// PORQUE EXISTE. O lado do passageiro já não acredita na primeira leitura —
// o `lib/posicao.js` lê várias vezes e fica com a melhor, e nasceu de o Simão
// ter comparado o pino da app com o ponto azul do Google e os encontrar em
// edifícios diferentes. O lado do MOTORISTA não tinha nada disso: a posição
// que ele transmite ia como vinha, e é essa que o passageiro vê a mexer.
//
// Duas coisas correm mal num GPS, e são diferentes:
//
//   1. O ERRO DECLARADO. O receptor diz, em cada leitura, de quantos metros
//      pode estar enganado. Com 80 metros de erro num bairro de Díli, o carro
//      salta para outra rua. Ninguém perguntava.
//
//   2. O SALTO IMPOSSÍVEL. Às vezes a leitura erra muito E declara-se boa —
//      é o que acontece entre prédios, com o sinal a chegar reflectido. Essa
//      não se apanha pelo erro declarado; apanha-se pela VELOCIDADE que
//      implicaria. Se o carro «andou» 400 metros em dois segundos, não andou.
//
// ONDE ISTO SE APLICA, E ONDE NÃO. No DESENHO, nunca no envio. A posição de
// um motorista à espera de pedidos é também a batida que diz ao servidor que
// ele continua ao serviço — e à espera a precisão é «equilibrada», que dá uns
// cem metros. Um filtro no envio punha um motorista parado à sombra a sair de
// serviço sozinho, que é precisamente o defeito que a batida de quatro
// minutos existe para evitar. Manda-se sempre; acredita-se com critério.

// Acima disto não se desenha. Cinquenta metros é mais do que a largura de
// qualquer rua de Díli: se o erro é maior do que isso, o ponto não diz em
// que rua o carro está, que é a única coisa que interessa a quem espera.
export const ERRO_MAXIMO_M = 50;

// 150 km/h. Não é o limite legal — é o limite do plausível em Timor-Leste,
// onde a estrada de Díli a Baucau se faz a 40 de média. Acima disto a leitura
// está errada, mesmo que se declare boa.
const VELOCIDADE_IMPOSSIVEL_MS = 150 / 3.6;

// Metros entre dois pontos. Haversine, que é exacto que chegue a esta escala
// e não precisa de biblioteca nenhuma.
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

// Devolve uma função que decide, LEMBRANDO-SE da última aceite — é isso que
// permite apanhar o salto impossível, que só existe em relação a algo.
//
// Um filtro por cada sítio que desenha: o do passageiro e o do motorista são
// fluxos diferentes e não podem partilhar memória.
export function criarFiltroPosicao() {
  let ultima = null;

  return function aceitar(p) {
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;

    // SEM PRECISÃO DECLARADA, ACEITA-SE. Nem todos os aparelhos a dão, e uma
    // app antiga não a envia de todo — recusar por falta de informação seria
    // congelar o carro no mapa de quem espera, que é pior do que o desenhar
    // com um erro que não conhecemos.
    if (typeof p.precisao === 'number' && p.precisao > ERRO_MAXIMO_M) return false;

    if (ultima) {
      const segundos = Math.max(1, ((p.quando ?? Date.now()) - ultima.quando) / 1000);
      if (metros(ultima, p) / segundos > VELOCIDADE_IMPOSSIVEL_MS) return false;
    }

    ultima = { lat: p.lat, lng: p.lng, quando: p.quando ?? Date.now() };
    return true;
  };
}
