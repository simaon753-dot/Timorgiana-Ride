const B = require('./base.js');
const { CORAL, TEAL, TEXTO, SUAVE, CLARO, BRANCO } = B;

module.exports = function parte2(pres) {
  // ── 4. Divisor ───────────────────────────────────────────────────────
  {
    const s = B.escuro(pres);
    B.texto(s, 'PARTE I', { x: 0.9, y: 2.5, w: 11.5, h: 0.4, fontSize: 14,
      bold: true, color: CORAL, charSpacing: 3 });
    B.texto(s, 'Pôr na rua', { x: 0.9, y: 2.95, w: 11.5, h: 1.0,
      fontSize: 46, bold: true, color: BRANCO, fontFace: 'Cambria' });
    B.texto(s, 'Seis fases, e a mais difícil não é técnica', {
      x: 0.9, y: 3.95, w: 11.5, h: 0.45, fontSize: 18, color: CLARO });
  }

  // ── 5. As seis fases ─────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'O caminho, em seis fases', 'VISÃO GERAL');
    const fases = [
      ['Fechar o que falta', 'semanas 1–2'],
      ['Montar a rotina', 'semana 2'],
      ['Recrutar 5 a 10', 'semanas 3–5'],
      ['Arrancar numa zona', 'semana 6'],
      ['Trazer passageiros', 'contínuo'],
      ['Entrar nas lojas', 'quando houver procura'],
    ];
    fases.forEach(([t, q], i) => {
      const col = i % 3, lin = Math.floor(i / 3);
      const x = 0.7 + col * 4.0, y = 1.95 + lin * 2.25;
      B.cartao(s, x, y, 3.7, 1.9);
      B.bolinha(s, i + 1, x + 0.28, y + 0.3, i < 4 ? CORAL : TEAL);
      B.texto(s, t, { x: x + 0.28, y: y + 1.0, w: 3.15, h: 0.45, fontSize: 16,
        bold: true, color: TEAL });
      B.texto(s, q, { x: x + 0.28, y: y + 1.42, w: 3.15, h: 0.3, fontSize: 11.5, color: SUAVE });
    });
    B.texto(s, 'As fases 1 a 4 dependem de si. A 5 depende da cidade — e é a que decide se isto vive.',
      { x: 0.7, y: 6.6, w: 11.9, h: 0.35, fontSize: 13, italic: true, color: CORAL });
  }

  // ── 6. Fase 1 ────────────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Fechar o que falta', 'FASE 1  ·  SEMANAS 1–2');
    const passos = [
      ['Arranjar um segundo telemóvel', 'Não precisa de cartão SIM novo — a app não verifica o número. Basta Wi-Fi e o Expo Go. Um telemóvel de casa serve.'],
      ['Fazer uma viagem de teste completa', 'Pedir num, aceitar no outro, dizer o código, carregar no socorro a meio, e confirmar que o alerta aparece no painel.'],
      ['Ler os sete documentos e decidir os três pontos', 'A aprovação automática já ficou decidida: não. Faltam o seguro e o estatuto do SERVE.'],
      ['Enviar os documentos que faltarem na sua própria conta', 'Serve de ensaio: passa pelo mesmo caminho que um motorista vai passar, e vê o que ele vê.'],
    ];
    passos.forEach(([t, d], i) => {
      const y = 1.75 + i * 1.28;
      B.bolinha(s, i + 1, 0.72, y + 0.05, TEAL, 0.46);
      B.texto(s, t, { x: 1.45, y: y, w: 11.0, h: 0.35, fontSize: 16, bold: true, color: TEXTO });
      B.texto(s, d, { x: 1.45, y: y + 0.4, w: 11.0, h: 0.6, fontSize: 12.5, color: SUAVE });
    });
    B.texto(s, 'Nada nesta fase custa dinheiro. Custa uma tarde e duas decisões suas.',
      { x: 0.7, y: 6.7, w: 11.9, h: 0.35, fontSize: 13, italic: true, color: CORAL });
  }

  // ── 7. Fase 2 — rotina ───────────────────────────────────────────────
  {
    const s = B.claro(pres, 'A rotina que sustenta isto', 'FASE 2  ·  A OPERAÇÃO DIÁRIA');
    const linhas = [
      ['Todos os dias', 'Abrir o painel no computador do escritório', '2 minutos'],
      ['Quando chegar candidato', 'Aprovar ou recusar — cinco documentos num ecrã', '30 segundos'],
      ['Todas as noites, 02:00', 'A cópia de segurança corre e verifica-se sozinha', 'nada'],
      ['Se ficar vermelha', 'O GitHub avisa. É o único alarme que tem de ver', 'raro'],
      ['Quando alguém esquecer a senha', 'Gerar código no painel e dizê-lo ao telefone', '1 minuto'],
    ];
    B.cartao(s, 0.7, 1.8, 11.9, 3.4);
    linhas.forEach(([q, o, t], i) => {
      const y = 2.05 + i * 0.62;
      B.texto(s, q, { x: 1.0, y, w: 3.1, h: 0.4, fontSize: 12.5, bold: true, color: CORAL });
      B.texto(s, o, { x: 4.2, y, w: 6.6, h: 0.4, fontSize: 13, color: TEXTO });
      B.texto(s, t, { x: 10.9, y, w: 1.5, h: 0.4, fontSize: 12, color: SUAVE, align: 'right' });
    });
    B.texto(s, 'timorgiana-ride.onrender.com/painel', { x: 0.7, y: 5.5, w: 11.9, h: 0.4,
      fontSize: 18, bold: true, color: TEAL, fontFace: 'Courier New' });
    B.texto(s, 'Entra com o mesmo telemóvel e a mesma palavra-passe da aplicação. Guarde nos favoritos.',
      { x: 0.7, y: 5.95, w: 11.9, h: 0.35, fontSize: 12.5, color: SUAVE });
  }
};
