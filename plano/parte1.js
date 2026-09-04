const B = require('./base.js');
const { CORAL, TEAL, TEXTO, SUAVE, CLARO, BRANCO, PAPEL } = B;

module.exports = function parte1(pres) {
  // ── 1. Capa ──────────────────────────────────────────────────────────
  {
    const s = B.escuro(pres);
    B.texto(s, 'TimorgianaRide', {
      x: 0.9, y: 2.15, w: 11.5, h: 1.1, fontSize: 54, bold: true,
      color: BRANCO, fontFace: 'Cambria',
    });
    B.texto(s, 'Da aplicação para a rua', {
      x: 0.9, y: 3.25, w: 11.5, h: 0.6, fontSize: 26, color: CORAL, fontFace: 'Cambria',
    });
    B.texto(s, 'Plano de implementação e caminho de desenvolvimento', {
      x: 0.9, y: 3.95, w: 11.5, h: 0.4, fontSize: 15, color: CLARO,
    });
    B.texto(s, 'Timorgiana, Lda  ·  Díli, Timor-Leste  ·  Setembro de 2026', {
      x: 0.9, y: 6.4, w: 11.5, h: 0.35, fontSize: 12, color: '9DB0AA',
    });
  }

  // ── 2. Onde estamos ──────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'A aplicação está construída', 'ONDE ESTAMOS HOJE');
    const stats = [
      ['5', 'documentos exigidos\na cada motorista'],
      ['3', 'línguas — português,\ntétum e inglês'],
      ['442', 'sucos de Timor-Leste\nna base de dados'],
      ['0', 'dólares por mês\nde custo, hoje'],
    ];
    stats.forEach(([n, t], i) => {
      const x = 0.7 + i * 3.05;
      B.cartao(s, x, 1.85, 2.75, 1.85);
      B.texto(s, n, { x: x + 0.25, y: 2.0, w: 2.25, h: 0.75, fontSize: 44, bold: true,
        color: TEAL, fontFace: 'Cambria' });
      B.texto(s, t, { x: x + 0.25, y: 2.78, w: 2.3, h: 0.8, fontSize: 12, color: SUAVE });
    });
    B.texto(s, 'O que já funciona', { x: 0.7, y: 4.05, w: 11.9, h: 0.35,
      fontSize: 17, bold: true, color: TEXTO });
    const feitos = [
      'Pedido de viagem em tempo real, mapa, conversa, tarifa e avaliação',
      'Botão de socorro, código de recolha e fotografia de turno diária',
      'Painel de aprovações no browser, com verificação automática dos documentos',
      'Cópia de segurança cifrada todas as noites — e um restauro já ensaiado',
      'Recuperação de conta sem SMS, por código dado ao telefone',
      'Sete documentos jurídicos, escritos a partir das regras que a app aplica',
    ];
    feitos.forEach((t, i) => {
      const col = i % 2, lin = Math.floor(i / 2);
      B.texto(s, '✓', { x: 0.72 + col * 6.0, y: 4.5 + lin * 0.52, w: 0.3, h: 0.3,
        fontSize: 14, bold: true, color: CORAL });
      B.texto(s, t, { x: 1.05 + col * 6.0, y: 4.48 + lin * 0.52, w: 5.5, h: 0.45,
        fontSize: 12.5, color: TEXTO });
    });
  }

  // ── 3. O que falta ───────────────────────────────────────────────────
  {
    const s = B.claro(pres, 'Três coisas antes do primeiro motorista', 'O QUE FALTA');
    const itens = [
      ['Testar o socorro numa viagem a decorrer',
       'O botão que grava o alerta só existe DURANTE uma viagem. Precisa de dois telemóveis: um a pedir, outro a aceitar. É o único item técnico por fechar.',
       'Uma tarde'],
      ['Rever os sete documentos jurídicos',
       'Estão escritos e fundamentados, mas quem os assina é o senhor. Três pontos ficaram marcados a precisar da sua decisão — entre eles, se a Instrução Pública n.º 07/2010 se mantém em vigor.',
       'Seu'],
      ['Resolver a tensão do estatuto',
       'O estatuto registado no SERVE inclui "transportes terrestres de passageiros". Os termos dizem que a plataforma não é transportadora. Num litígio, a outra parte aponta para o estatuto.',
       'Seu'],
    ];
    itens.forEach(([tit, txt, quando], i) => {
      const y = 1.75 + i * 1.72;
      B.cartao(s, 0.7, y, 11.9, 1.5);
      B.bolinha(s, i + 1, 1.0, y + 0.28);
      B.texto(s, tit, { x: 1.72, y: y + 0.24, w: 8.3, h: 0.35, fontSize: 16, bold: true, color: TEAL });
      B.texto(s, txt, { x: 1.72, y: y + 0.63, w: 8.5, h: 0.75, fontSize: 12, color: SUAVE });
      B.texto(s, quando, { x: 10.4, y: y + 0.28, w: 1.9, h: 0.35, fontSize: 12.5,
        bold: true, color: CORAL, align: 'right' });
    });
  }
};
