// ESCOLHER A PARAGEM: A MELHOR, E NÃO SÓ A MAIS PERTO (29/09/2026).
//
// Pedido do Simão, com um vídeo do Grab a escolher um destino: enquanto a
// mira anda, aparece UMA paragem — o «Drop-off point» — onde o carro pode
// mesmo parar, ligada à mira por uma linha aos pontinhos. Não todas as da
// zona, e não a coordenada mais perto só por ser a mais perto.
//
// A mira é onde a pessoa quer ir; a paragem é onde o carro pára. Esta função
// escolhe a paragem. Os candidatos:
//
//   1. uma paragem do painel que COBRE o sítio (o raio dela) — ganha sempre.
//      É o Simão a dizer «aqui, pára ali», e saber a terra não se discute
//      com uma conta de distâncias. Foi assim desde o princípio (Cristo Rei).
//   2. paragens do painel PERTO da mira, até `RAIO_PARAGENS_PERTO_M`;
//   3. a estrada mais perto por onde passam mota, carro e pick-up (o nosso
//      mapa, `mapa/estradas.js`, que já deixa de fora pátios, carreiros e
//      passeios, e só aceita trilhos como último recurso).
//
// Entre 2 e 3 decide o CUSTO: os metros a pé da mira até lá, pesados. Uma
// paragem do painel pesa menos — foi escolhida por quem conhece o sítio
// como um bom lugar para parar, o que já responde a segurança, acesso e a
// «o carro consegue mesmo parar aqui». Um trilho pesa mais.
//
// O QUE NÃO ENTRA, porque os nossos dados não o têm: o sentido do trânsito
// na recolha (a app trata-o à parte, no aviso do outro lado da avenida), as
// proibições de parar e o trânsito ao vivo.

// Até onde uma paragem do painel conta como candidata sem cobrir o sítio.
// 150 m a pé são dois minutos: mais do que isso já é outra viagem.
export const RAIO_PARAGENS_PERTO_M = 150;

// O peso de cada tipo sobre os metros a pé. Menos é melhor.
export const PESO = { painel: 0.7, estrada: 1, trilho: 1.4 };

// ESTABILIDADE: a paragem que já está à vista só é trocada se a nova for
// claramente melhor — mais de 25% e mais de 10 m de custo. Sem isto, duas
// paragens quase iguais alternavam a cada arrasto de meio metro.
export const MANTER_FOLGA = 0.25;
export const MANTER_FOLGA_M = 10;

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

// `ponto`: a mira. `cobrem`: as paragens do painel que cobrem o ponto, já por
// ordem (`paragensQueCobrem`). `perto`: as do painel à volta
// (`paradasPerto`), com a coordenada onde o carro PÁRA. `estrada`: o
// resultado de `estradaMaisPerto` ou `null`. `atual`: a paragem que está à
// vista, `{ lat, lng }`, ou `null`.
//
// Devolve `{ tipo: 'painel', principal, lista }`, `{ tipo: 'estrada',
// estrada }` ou `null` — e `null` quer dizer «nenhuma»: não se inventa uma.
export function escolherParagem({ ponto, cobrem = [], perto = [], estrada = null, atual = null }) {
  if (cobrem.length) return { tipo: 'painel', principal: cobrem[0], lista: cobrem };

  const candidatos = [];
  for (const p of perto) {
    const m = metros(ponto, p);
    if (m <= RAIO_PARAGENS_PERTO_M) candidatos.push({ tipo: 'painel', p, custo: m * PESO.painel });
  }
  if (estrada) {
    const peso = estrada.tipo === 'track' ? PESO.trilho : PESO.estrada;
    candidatos.push({ tipo: 'estrada', p: estrada, custo: Number(estrada.metros) * peso });
  }
  if (!candidatos.length) return null;

  candidatos.sort((a, b) => a.custo - b.custo);
  let melhor = candidatos[0];
  if (atual) {
    const mesma = candidatos.find((c) => metros(c.p, atual) <= 3);
    if (mesma && mesma.custo <= melhor.custo * (1 + MANTER_FOLGA) + MANTER_FOLGA_M) melhor = mesma;
  }
  return melhor.tipo === 'painel'
    ? { tipo: 'painel', principal: melhor.p, lista: [melhor.p] }
    : { tipo: 'estrada', estrada: melhor.p };
}
