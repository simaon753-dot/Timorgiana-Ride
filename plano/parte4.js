const B = require('./base.js');
const { CORAL, TEAL, TEXTO, SUAVE, CLARO, BRANCO } = B;

module.exports = function parte4(pres) {
  // ── 12. Custos ───────────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Quanto custa manter isto', 'ORÇAMENTO');
    const linhas = [
      ['Servidor (Render)', 'Grátis', '$7 / mês', 'Adormece após 15 min sem uso; o pedido seguinte demora ~30 s'],
      ['Base de dados (Neon)', 'Grátis', 'Grátis', 'O plano gratuito chega folgadamente para o movimento de Díli'],
      ['Repositório e cópias (GitHub)', 'Grátis', 'Grátis', '2.000 minutos por mês de execuções; a cópia diária usa cerca de 60'],
      ['Actualizações da app (EAS)', 'Grátis', 'Grátis', 'O escalão gratuito cobre publicações muito acima deste ritmo'],
      ['Google Play', '—', '$25 uma vez', 'Pagamento único, sem renovação'],
      ['App Store', '—', '$99 / ano', 'Só quando houver iPhones do outro lado'],
    ];
    B.cartao(s, 0.7, 1.7, 11.9, 3.55);
    B.texto(s, 'Serviço', { x: 1.0, y: 1.92, w: 3.2, h: 0.3, fontSize: 11, bold: true, color: CORAL });
    B.texto(s, 'Hoje', { x: 4.3, y: 1.92, w: 1.2, h: 0.3, fontSize: 11, bold: true, color: CORAL });
    B.texto(s, 'A sério', { x: 5.6, y: 1.92, w: 1.5, h: 0.3, fontSize: 11, bold: true, color: CORAL });
    B.texto(s, 'Nota', { x: 7.3, y: 1.92, w: 5.0, h: 0.3, fontSize: 11, bold: true, color: CORAL });
    linhas.forEach(([a, b, c, d], i) => {
      const y = 2.35 + i * 0.48;
      B.texto(s, a, { x: 1.0, y, w: 3.2, h: 0.35, fontSize: 12.5, color: TEXTO, bold: true });
      B.texto(s, b, { x: 4.3, y, w: 1.2, h: 0.35, fontSize: 12.5, color: SUAVE });
      B.texto(s, c, { x: 5.6, y, w: 1.6, h: 0.35, fontSize: 12.5, color: TEAL, bold: true });
      B.texto(s, d, { x: 7.3, y, w: 5.0, h: 0.35, fontSize: 11, color: SUAVE });
    });
    B.cartao(s, 0.7, 5.45, 5.8, 1.15, TEAL);
    B.texto(s, 'Hoje', { x: 1.0, y: 5.62, w: 2.0, h: 0.3, fontSize: 11.5, bold: true, color: CORAL });
    B.texto(s, '$0 por mês', { x: 1.0, y: 5.92, w: 5.2, h: 0.5, fontSize: 26, bold: true,
      color: BRANCO, fontFace: 'Cambria' });
    B.cartao(s, 6.8, 5.45, 5.8, 1.15);
    B.texto(s, 'Com Play Store e servidor pago', { x: 7.1, y: 5.62, w: 5.2, h: 0.3,
      fontSize: 11.5, bold: true, color: CORAL });
    B.texto(s, '$84 no primeiro ano  ·  $84 nos seguintes', { x: 7.1, y: 5.92, w: 5.3, h: 0.5,
      fontSize: 17, bold: true, color: TEAL, fontFace: 'Cambria' });
  }

  // ── 13. Divisor ──────────────────────────────────────────────────────
  {
    const s = B.escuro(pres);
    B.texto(s, 'PARTE II', { x: 0.9, y: 2.5, w: 11.5, h: 0.4, fontSize: 14,
      bold: true, color: CORAL, charSpacing: 3 });
    B.texto(s, 'Desenvolver', { x: 0.9, y: 2.95, w: 11.5, h: 1.0,
      fontSize: 46, bold: true, color: BRANCO, fontFace: 'Cambria' });
    B.texto(s, 'O que vem a seguir, e o que é para deixar em paz', {
      x: 0.9, y: 3.95, w: 11.5, h: 0.45, fontSize: 18, color: CLARO });
  }

  // ── 14. Os tectos ────────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Quatro tectos, e quando os vai bater', 'LIMITES CONHECIDOS');
    const tectos = [
      ['Nominatim', '~30 viagens em simultâneo', 'A pesquisa de sítios e o nome da rua usam o serviço gratuito do OpenStreetMap, que aceita cerca de um pedido por segundo no total. Acima disso, é preciso alojar um Nominatim próprio.'],
      ['Servidor adormecido', 'Primeiro passageiro do dia', 'O plano grátis do Render adormece após 15 minutos sem uso. Quem abrir a app a seguir espera ~30 segundos. Resolve-se com $7 por mês.'],
      ['O seu tempo', 'A partir de ~20 motoristas', 'Aprovar um a um deixa de caber num dia de escritório. A resposta é o nível "Operador" — já desenhado, ainda não construído.'],
      ['iPhone', 'Quando aparecer o primeiro', 'Fora do piloto por decisão tomada. A Apple não permite instalação fora da loja, e $99/ano antes de haver procura não se justifica.'],
    ];
    tectos.forEach(([t, q, d], i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = 0.7 + col * 6.1, y = 1.75 + lin * 2.45;
      B.cartao(s, x, y, 5.8, 2.2);
      B.texto(s, t, { x: x + 0.3, y: y + 0.25, w: 5.2, h: 0.4, fontSize: 18, bold: true,
        color: TEAL, fontFace: 'Cambria' });
      B.texto(s, q, { x: x + 0.3, y: y + 0.68, w: 5.2, h: 0.3, fontSize: 12, bold: true, color: CORAL });
      B.texto(s, d, { x: x + 0.3, y: y + 1.02, w: 5.2, h: 1.05, fontSize: 11.5, color: SUAVE });
    });
  }

  // ── 15. O que construir a seguir ─────────────────────────────────────
  {
    const s = B.claro(pres, 'Por esta ordem, e não por outra', 'O QUE CONSTRUIR');
    const itens = [
      ['Nível "Operador"', 'Delegar aprovações sem entregar o dinheiro, os alertas de socorro e as contas todas. Hoje o acesso é tudo ou nada — é isso que o impede de delegar mesmo tendo em quem confiar.', 'Quando tiver a pessoa'],
      ['Os doze sucos novos', 'A divisão administrativa tem 442 sucos; faltam os criados pelo diploma de 2023. É meia hora de trabalho, mas precisa dos nomes e do posto de cada um.', 'Quando confirmar os nomes'],
      ['Notificar o passageiro', 'Hoje o motorista recebe aviso e o passageiro não. Quem pediu uma viagem fica a olhar para o ecrã à espera de ver o carro aparecer.', 'Depois dos primeiros pedidos'],
      ['Nominatim próprio', 'Só acima de ~30 viagens em simultâneo. Antes disso é resolver um problema que ainda não existe.', 'Só se e quando'],
    ];
    itens.forEach(([t, d, q], i) => {
      const y = 1.75 + i * 1.28;
      B.bolinha(s, i + 1, 0.72, y + 0.1, i < 2 ? CORAL : TEAL, 0.46);
      B.texto(s, t, { x: 1.45, y: y, w: 7.6, h: 0.35, fontSize: 16, bold: true, color: TEXTO });
      B.texto(s, d, { x: 1.45, y: y + 0.4, w: 8.4, h: 0.7, fontSize: 12, color: SUAVE });
      B.texto(s, q, { x: 10.0, y: y + 0.02, w: 2.5, h: 0.6, fontSize: 11.5, bold: true,
        color: CORAL, align: 'right' });
    });
  }

  // ── 16. O que NÃO construir ──────────────────────────────────────────
  {
    const s = B.claro(pres, 'E o que é para deixar em paz', 'O QUE NÃO CONSTRUIR');
    const nao = [
      ['Pagamentos dentro da app', 'O dinheiro funciona, e não tocar em dinheiro alheio é metade da simplicidade jurídica deste negócio. No dia em que a app receber pagamentos, passa a ser outra coisa — com outras licenças.'],
      ['Google Maps', 'Custa dinheiro e exige um cartão vivo. O OpenStreetMap chega, e a camada de lugares que os passageiros baptizam vai enchendo o que falta. A conta de facturação fechada já mostrou o risco.'],
      ['Códigos por SMS', 'US$0,26 por mensagem para Timor-Leste, e mais um cartão para manter vivo. Quem esquece a senha telefona — e quem atende já sabe com quem fala, o que é melhor verificação do que um SMS.'],
      ['Outra cidade antes de Díli funcionar', 'A app já sabe separar municípios. Isso não é razão para abrir Baucau: dois pilotos a meio-gás não fazem um piloto.'],
    ];
    nao.forEach(([t, d], i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = 0.7 + col * 6.1, y = 1.75 + lin * 2.45;
      B.cartao(s, x, y, 5.8, 2.2);
      B.texto(s, '✕', { x: x + 0.3, y: y + 0.26, w: 0.4, h: 0.35, fontSize: 17, bold: true, color: CORAL });
      B.texto(s, t, { x: x + 0.78, y: y + 0.24, w: 4.75, h: 0.4, fontSize: 15.5, bold: true, color: TEAL });
      B.texto(s, d, { x: x + 0.3, y: y + 0.78, w: 5.2, h: 1.3, fontSize: 11.5, color: SUAVE });
    });
  }
};
