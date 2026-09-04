const B = require('./base.js');
const { CORAL, TEAL, TEXTO, SUAVE, CLARO, BRANCO } = B;

module.exports = function parte5(pres) {
  // ── 17. Decisões que se aproximam ────────────────────────────────────
  {
    const s = B.claro(pres, 'Quatro decisões que se aproximam', 'O QUE VAI TER DE DECIDIR');
    const dec = [
      ['Comissão, depois de Abril de 2027', 'A gratuitidade acaba em 30/04/2027 e passa a haver pacotes de dias — $15 por 30 dias numa motorizada, $30 num carro. Manter "zero comissão" como argumento obriga a que o pacote seja mais barato do que os 20 % que a Grab leva. Nas contas de hoje, é.'],
      ['Quem atende o telefone às 21h', 'Um motorista com um problema à noite liga a alguém. Se for sempre a si, isto não escala para além de dez motoristas — e é a mesma pergunta que fez sobre as aprovações.'],
      ['O estatuto do SERVE', 'Ou o estatuto distingue a intermediação do transporte, ou os termos deixam de negar o que ele afirma. A segunda via já foi tomada uma vez; a primeira continua por decidir.'],
      ['Se e quando entra no iPhone', 'Não é uma decisão técnica: é saber se aparecem passageiros com iPhone que valham $99 por ano.'],
    ];
    dec.forEach(([t, d], i) => {
      const y = 1.75 + i * 1.28;
      B.bolinha(s, i + 1, 0.72, y + 0.1, TEAL, 0.46);
      B.texto(s, t, { x: 1.45, y: y, w: 11.0, h: 0.35, fontSize: 16, bold: true, color: TEXTO });
      B.texto(s, d, { x: 1.45, y: y + 0.4, w: 11.0, h: 0.75, fontSize: 12, color: SUAVE });
    });
  }

  // ── 18. Como manter isto ─────────────────────────────────────────────
  {
    const s = B.escuro(pres);
    B.texto(s, 'Como manter isto sem parar o escritório', {
      x: 0.9, y: 1.5, w: 11.5, h: 0.9, fontSize: 34, bold: true, color: BRANCO, fontFace: 'Cambria' });
    const regras = [
      ['Uma coisa de cada vez', 'Uma alteração, publicada e vista a funcionar, antes da seguinte. Foi assim que este projecto chegou aqui.'],
      ['Publicar é um comando', '`npm run publicar` corre os seis verificadores antes de enviar. Se algum ficar vermelho, não publica — e isso já evitou duas avarias em produção.'],
      ['O painel é o alarme', 'Dois minutos por dia. Se não houver nada por tratar, não há nada a fazer.'],
      ['Escrever porquê, e não o quê', 'Cada alteração deste projecto tem escrito o motivo. Daqui a um ano, é isso que lhe vai dizer se pode mexer numa linha.'],
    ];
    regras.forEach(([t, d], i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      const x = 0.9 + col * 5.9, y = 2.75 + lin * 1.75;
      B.bolinha(s, i + 1, x, y, CORAL, 0.44);
      B.texto(s, t, { x: x + 0.62, y: y - 0.02, w: 4.9, h: 0.35, fontSize: 15, bold: true, color: BRANCO });
      B.texto(s, d, { x: x + 0.62, y: y + 0.36, w: 4.9, h: 0.95, fontSize: 11.5, color: CLARO });
    });
    B.texto(s, 'A parte difícil daqui para a frente não é o código. É Díli.', {
      x: 0.9, y: 6.45, w: 11.5, h: 0.4, fontSize: 15, italic: true, color: CORAL });
  }
};
