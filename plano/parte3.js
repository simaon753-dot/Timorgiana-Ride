const B = require('./base.js');
const { CORAL, TEAL, TEXTO, SUAVE, CLARO, BRANCO } = B;

module.exports = function parte3(pres) {
  // ── 8. Fase 3 — recrutar ─────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Cinco a dez motoristas. Não mais.', 'FASE 3  ·  RECRUTAR');
    B.cartao(s, 0.7, 1.75, 5.75, 2.35);
    B.texto(s, 'Quem procurar', { x: 1.0, y: 1.98, w: 5.2, h: 0.35, fontSize: 16, bold: true, color: TEAL });
    B.texto(s, 'Motoristas que já fazem transporte em Díli e já usam Grab ou Maxim.\n\nSabem o trabalho, sabem o que os incomoda na concorrência, e conseguem comparar. Quem nunca fez isto não lhe sabe dizer se a app é boa.',
      { x: 1.0, y: 2.4, w: 5.2, h: 1.5, fontSize: 12.5, color: SUAVE });

    B.cartao(s, 6.85, 1.75, 5.75, 2.35, TEAL);
    B.texto(s, 'O que lhes dizer', { x: 7.15, y: 1.98, w: 5.2, h: 0.35, fontSize: 16, bold: true, color: BRANCO });
    B.texto(s, 'O argumento é um só, e é forte:', { x: 7.15, y: 2.4, w: 5.2, h: 0.3, fontSize: 12.5, color: CLARO });
    B.texto(s, 'Não há comissão.', { x: 7.15, y: 2.72, w: 5.2, h: 0.55, fontSize: 27, bold: true, color: CORAL, fontFace: 'Cambria' });
    B.texto(s, 'Numa viagem de $3, a Grab fica com cerca de 20 %. Aqui o motorista fica com os $3 inteiros — e assim é até 30 de Abril de 2027.',
      { x: 7.15, y: 3.32, w: 5.2, h: 0.7, fontSize: 12.5, color: CLARO });

    B.texto(s, 'Porque não vinte motoristas', { x: 0.7, y: 4.35, w: 11.9, h: 0.35,
      fontSize: 16, bold: true, color: TEXTO });
    const razoes = [
      'Um piloto grande esconde os problemas em vez de os mostrar',
      'Com poucos passageiros, vinte motoristas online é vinte pessoas a desistir',
      'Cinco motoristas conhecem-se pelo nome — e ligam-lhe a dizer o que está mal',
      'Aprovar vinte candidaturas antes de haver procura é gastar o seu tempo cedo demais',
    ];
    razoes.forEach((t, i) => {
      B.texto(s, '—', { x: 0.72, y: 4.82 + i * 0.44, w: 0.3, h: 0.3, fontSize: 13, color: CORAL, bold: true });
      B.texto(s, t, { x: 1.1, y: 4.8 + i * 0.44, w: 11.3, h: 0.35, fontSize: 12.5, color: SUAVE });
    });
  }

  // ── 9. Fase 4 — uma zona ─────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Uma zona só, e não Díli inteira', 'FASE 4  ·  ARRANCAR');
    B.texto(s, 'Cinco motoristas espalhados por Díli dão tempos de espera longos em todo o lado. Concentrados numa zona, dão um serviço que funciona nessa zona — e é isso que faz alguém voltar.',
      { x: 0.7, y: 1.7, w: 11.9, h: 0.65, fontSize: 14, color: TEXTO });
    const zonas = [
      ['Timor Plaza', 'Muito movimento, fácil de explicar a um passageiro, e ponto de encontro conhecido. Atenção à taxa de entrada de $1 para carros.'],
      ['Farol', 'Escritórios, embaixadas e restaurantes. Procura previsível às horas de almoço e ao fim do dia.'],
      ['Lecidere', 'Zona de hotéis e de gente que já paga transporte. Percursos curtos, viagens rápidas.'],
    ];
    zonas.forEach(([t, d], i) => {
      const x = 0.7 + i * 4.0;
      B.cartao(s, x, 2.55, 3.7, 2.25);
      B.texto(s, t, { x: x + 0.3, y: 2.8, w: 3.1, h: 0.4, fontSize: 18, bold: true,
        color: TEAL, fontFace: 'Cambria' });
      B.texto(s, d, { x: x + 0.3, y: 3.28, w: 3.1, h: 1.3, fontSize: 12, color: SUAVE });
    });
    B.cartao(s, 0.7, 5.05, 11.9, 1.35, TEAL);
    B.texto(s, 'A app já sabe fazer isto', { x: 1.0, y: 5.28, w: 11.3, h: 0.35,
      fontSize: 15, bold: true, color: CORAL });
    B.texto(s, 'Os pedidos são encaminhados por município: quem está em Díli vê Díli, quem está em Lospalos vê Lospalos. Escolher a zona é uma decisão de recrutamento, não de programação — basta dizer aos motoristas onde ficar.',
      { x: 1.0, y: 5.68, w: 11.3, h: 0.6, fontSize: 12.5, color: CLARO });
  }

  // ── 10. Fase 5 — passageiros ─────────────────────────────────────────
  {
    const s = B.claro(pres, 'O problema difícil', 'FASE 5  ·  PASSAGEIROS');
    B.cartao(s, 0.7, 1.7, 11.9, 1.15, TEAL);
    B.texto(s, 'Um motorista online sem pedidos desliga ao fim de duas horas — e não volta.',
      { x: 1.0, y: 1.95, w: 11.3, h: 0.65, fontSize: 20, bold: true, color: BRANCO, fontFace: 'Cambria' });
    B.texto(s, 'Tem a oferta construída. A procura não se constrói com código.',
      { x: 0.7, y: 3.05, w: 11.9, h: 0.35, fontSize: 14, color: TEXTO });
    const vias = [
      ['Os próprios motoristas', 'Cada um tem clientes habituais. Dar-lhes um cartão com o nome da app e dizer-lhes para instalarem é o caminho mais barato que existe.'],
      ['Um sítio de cada vez', 'Um hotel, um restaurante, um escritório na zona escolhida. Falar com quem lá está e deixar a app instalada em quem recebe.'],
      ['Grupos de WhatsApp', 'É onde Díli combina transporte hoje. Estar lá é mais eficaz do que qualquer anúncio.'],
      ['A sua própria rede', 'Colegas, clientes do escritório, família. Os primeiros cinquenta passageiros vêm de quem já confia em si.'],
    ];
    vias.forEach(([t, d], i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = 0.7 + col * 6.1, y = 3.55 + lin * 1.6;
      B.cartao(s, x, y, 5.8, 1.4);
      B.bolinha(s, i + 1, x + 0.28, y + 0.25, CORAL, 0.44);
      B.texto(s, t, { x: x + 0.9, y: y + 0.24, w: 4.7, h: 0.35, fontSize: 14.5, bold: true, color: TEAL });
      B.texto(s, d, { x: x + 0.9, y: y + 0.63, w: 4.65, h: 0.7, fontSize: 11.5, color: SUAVE });
    });
  }

  // ── 11. Fase 6 — lojas ───────────────────────────────────────────────
  {
    const s = B.claro(pres, 'As lojas vêm no fim, não no princípio', 'FASE 6  ·  DISTRIBUIÇÃO');
    const fases = [
      ['Hoje', 'Expo Go', 'Grátis', 'O motorista instala o Expo Go e lê um código. Serve para o piloto inteiro. Já funciona.'],
      ['Quando houver procura', 'Google Play', '$25 uma vez', 'Pagamento único, para sempre. É o passo que faz a app parecer real a quem a instala.'],
      ['Só depois', 'App Store', '$99 por ano', 'Em Díli a esmagadora maioria dos motoristas usa Android. Só quando aparecerem passageiros com iPhone.'],
    ];
    fases.forEach(([q, n, c, d], i) => {
      const y = 1.8 + i * 1.6;
      B.cartao(s, 0.7, y, 11.9, 1.35);
      B.texto(s, q, { x: 1.0, y: y + 0.22, w: 2.4, h: 0.3, fontSize: 11.5, bold: true, color: CORAL });
      B.texto(s, n, { x: 1.0, y: y + 0.55, w: 2.6, h: 0.45, fontSize: 19, bold: true,
        color: TEAL, fontFace: 'Cambria' });
      B.texto(s, c, { x: 3.9, y: y + 0.52, w: 1.9, h: 0.45, fontSize: 15, bold: true, color: TEXTO });
      B.texto(s, d, { x: 6.1, y: y + 0.35, w: 6.2, h: 0.8, fontSize: 12.5, color: SUAVE });
    });
    B.texto(s, 'Publicar nas lojas antes de haver passageiros é pagar por uma montra sem loja atrás.',
      { x: 0.7, y: 6.7, w: 11.9, h: 0.35, fontSize: 13, italic: true, color: CORAL });
  }
};
