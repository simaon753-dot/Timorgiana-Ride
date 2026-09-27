// ONDE CABE CADA ETIQUETA (27/09/2026).
//
// PORQUE EXISTE. O mapa tem quatro famílias de texto desenhado por nós por
// cima do Google: os cartões com o nome ao lado dos pinos, a etiqueta
// «Fatin tula / Fatin hatun» no ponto onde o carro encosta, as pastilhas de
// preço dos caminhos alternativos, e os nossos lugares que o Google não
// conhece. Cada família era desenhada sem saber das outras. Um nome nosso
// podia cair em cima de um pino, uma pastilha de preço em cima de um cartão,
// e tudo podia ficar debaixo da coluna de botões.
//
// O Google resolve isto para os nomes dele, dentro do mapa nativo. Para os
// nossos, ninguém resolvia.
//
// COMO. Colocação gulosa por prioridade: ordena-se tudo, do mais importante
// para o menos, e cada etiqueta fica no primeiro sítio livre que lhe for
// permitido — ou não fica. É o método dos mapas a sério, e tem a propriedade
// que aqui interessa: uma etiqueta importante nunca é empurrada por uma
// secundária, porque é colocada antes dela.
//
// O que é obstáculo nunca se tapa: os pinos (desenhados pelo mapa nativo,
// nunca se escondem), a mira de «escolher no mapa», e os botões.
//
// ESTABILIDADE. Uma etiqueta que já estava à vista ganha um bónus de
// prioridade (`INCUMBENCIA`) e tenta primeiro o lado em que já estava. Sem
// isto, duas etiquetas de prioridade parecida trocavam de lugar a cada
// pequeno ajuste do mapa — uma aparece, a outra some, e na paragem seguinte
// ao contrário. É o «pisca-pisca» que se quer evitar, e resolve-se dando
// razão a quem já lá estava.
//
// Pura de propósito: não sabe de React nem de mapas. Recebe rectângulos em
// pontos de ecrã e devolve quais ficam e onde. É assim que se testa sem
// telemóvel — ver `scripts/testar-etiquetas.mjs`.

// Quanto vale ter estado à vista na paragem anterior. Chega para ganhar a
// uma recém-chegada da mesma família; não chega para passar à frente de uma
// família mais importante — uma pastilha de preço (80) nunca perde para um
// nome de lugar (50) só por o nome já lá estar.
export const INCUMBENCIA = 15;

// Folga entre etiquetas, em pontos. Duas caixas encostadas lêem-se como uma
// só; quatro pontos de ar chegam para as separar sem gastar espaço.
const FOLGA = 4;

// Distância mínima às bordas do mapa.
const MARGEM = 4;

export function rect(x, y, w, h) {
  return { x1: x, y1: y, x2: x + w, y2: y + h };
}

function sobrepoe(a, b) {
  return a.x1 < b.x2 + FOLGA && a.x2 + FOLGA > b.x1 && a.y1 < b.y2 + FOLGA && a.y2 + FOLGA > b.y1;
}

function dentro(r, vista) {
  return (
    r.x1 >= MARGEM &&
    r.y1 >= MARGEM &&
    r.x2 <= vista.largura - MARGEM &&
    r.y2 <= vista.altura - MARGEM
  );
}

// candidatos: [{ id, prioridade, opcoes: [{ lado, caixa }], relacionados? }]
//   `opcoes` por ordem de preferência; `caixa` é o rectângulo que a etiqueta
//   ocuparia desse lado.
//   `relacionados`: ids dos obstáculos que são DELA e que por isso não a
//   impedem. Um cartão vive encostado ao seu pino — e tapar um bocadinho do
//   próprio pino não é tapar um marcador alheio, que é o que se quer evitar.
//   Sem isto, o cartão colidia com o pino a que pertence e nunca aparecia.
// obstaculos: [rect], cada um com `id` opcional
// vista: { largura, altura }
// anteriores: Map(id -> lado) da colocação anterior.
//
// Devolve Map(id -> lado) das que ficam à vista.
export function disporEtiquetas(candidatos, obstaculos, vista, anteriores = new Map()) {
  if (!vista?.largura || !vista?.altura) return new Map();

  const ordenados = candidatos
    .map((c) => ({
      ...c,
      peso: c.prioridade + (anteriores.has(c.id) ? INCUMBENCIA : 0),
    }))
    // Desempate pelo id: a mesma entrada dá sempre a mesma saída. Sem isto,
    // a ordem de chegada das respostas do mapa nativo decidia quem ganhava.
    .sort((a, b) => b.peso - a.peso || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ocupados = [...obstaculos];
  const saida = new Map();

  for (const c of ordenados) {
    const antes = anteriores.get(c.id);
    const opcoes = antes
      ? [...c.opcoes.filter((o) => o.lado === antes), ...c.opcoes.filter((o) => o.lado !== antes)]
      : c.opcoes;
    for (const o of opcoes) {
      if (!dentro(o.caixa, vista)) continue;
      const deles = c.relacionados;
      if (ocupados.some((r) => !(r.id && deles?.includes(r.id)) && sobrepoe(o.caixa, r))) continue;
      ocupados.push(o.caixa);
      saida.set(c.id, o.lado);
      break;
    }
  }
  return saida;
}

// ── HISTERESE ─────────────────────────────────────────────────────────
//
// Um limite de zoom com um só número pisca na fronteira: quem pára o mapa
// mesmo em cima dele vê a etiqueta aparecer, mexe um nada, e ela some. Com
// dois números — um para entrar, outro, mais largo, para sair — o que está à
// vista só muda quando o zoom mudou A SÉRIO.

// `limiar`: entra-se quando o valor fica abaixo dele.
// `folga`: fração a mais que é preciso ultrapassar para sair.
export function abaixoComHisterese(valor, limiar, estavaDentro, folga = 0.2) {
  if (valor == null) return false;
  return estavaDentro ? valor < limiar * (1 + folga) : valor < limiar;
}

// Escalões por ordem crescente de `ate`: [{ ate, n }]. Devolve o ÍNDICE do
// escalão em que o valor cai (`escaloes.length` quando passa de todos), com
// histerese contra o escalão anterior — para sair dele é preciso atravessar
// a fronteira DELE com folga, e não apenas tocar-lhe.
//
// A fronteira que conta é sempre a do escalão de onde se sai, e não a do
// escalão para onde se vai. Parece o mesmo e não é: num salto grande de zoom
// — de Díli inteira para uma rua, com um gesto só — a fronteira do escalão de
// chegada pode nem ter sido atravessada com folga, e ficava-se preso no
// escalão de partida, sem etiqueta nenhuma, até mexer outra vez.
export function escalaoComHisterese(valor, escaloes, anterior, folga = 0.12) {
  if (valor == null) return escaloes.length;
  const bruto = escaloes.findIndex((e) => valor <= e.ate);
  const idx = bruto === -1 ? escaloes.length : bruto;
  if (anterior == null || anterior === idx) return idx;
  if (idx > anterior) {
    // A subir: a fronteira de cima do escalão de onde se sai.
    const fronteira = escaloes[anterior].ate;
    return valor > fronteira * (1 + folga) ? idx : anterior;
  }
  // A descer: a fronteira de baixo do escalão de onde se sai.
  const fronteira = escaloes[anterior - 1].ate;
  return valor < fronteira * (1 - folga) ? idx : anterior;
}

// Largura aproximada de um texto, sem o medir. Medir obrigaria a desenhar
// primeiro e colocar depois — e isso é exactamente um frame com a etiqueta no
// sítio errado. Uma estimativa um pouco larga custa, no pior dos casos, uma
// etiqueta que não aparece quando talvez coubesse; uma estimativa curta
// deixava duas sobrepostas.
export function larguraTexto(texto, pxPorLetra) {
  return Math.ceil(String(texto || '').length * pxPorLetra);
}
