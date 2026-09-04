// Elementos comuns da apresentação. As cores são as da própria app —
// teal #0E5C54 e coral #FF6B4A — porque a paleta de uma apresentação sobre
// um produto deve ser a do produto.
const TEAL = '0E5C54';
const TEAL_ESC = '08403A';
const CORAL = 'FF6B4A';
const PAPEL = 'FAF7F2';
const TEXTO = '14201D';
const SUAVE = '6A7671';
const CLARO = 'E7F0EE';
const BRANCO = 'FFFFFF';

const H = 7.5, W = 13.3;

// Slide escuro: capa e divisores. A alternância escuro/claro dá ritmo e
// marca onde uma parte acaba e outra começa.
function escuro(pres) {
  const s = pres.addSlide();
  s.background = { color: TEAL };
  return s;
}

function claro(pres, titulo, sobretitulo) {
  const s = pres.addSlide();
  s.background = { color: PAPEL };
  if (sobretitulo) {
    s.addText(sobretitulo, {
      x: 0.7, y: 0.42, w: 11.9, h: 0.3, isTextBox: true, margin: 0,
      fontSize: 12, bold: true, color: CORAL, charSpacing: 2, fontFace: 'Calibri',
    });
  }
  s.addText(titulo, {
    x: 0.7, y: sobretitulo ? 0.72 : 0.55, w: 11.9, h: 0.85, isTextBox: true, margin: 0,
    fontSize: 34, bold: true, color: TEAL, fontFace: 'Cambria',
  });
  return s;
}

// Número dentro de um círculo coral. É o motivo visual que se repete —
// as fases, os passos, os tectos. Um só, repetido, em vez de vários.
function bolinha(s, n, x, y, cor = CORAL, d = 0.52) {
  s.addShape('ellipse', { x, y, w: d, h: d, fill: { color: cor } });
  s.addText(String(n), {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontSize: 17, bold: true, color: cor === CORAL ? '22100A' : BRANCO,
    align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
}

// Cartão com um tom de fundo e sombra — sem barras nem riscos de cor.
function cartao(s, x, y, w, h, cor = BRANCO) {
  s.addShape('roundRect', {
    x, y, w, h, rectRadius: 0.09, fill: { color: cor },
    shadow: { type: 'outer', color: '000000', opacity: 0.10, blur: 8, offset: 2, angle: 90 },
  });
}

function texto(s, t, o) {
  s.addText(t, { isTextBox: true, margin: 0, fontFace: 'Calibri', ...o });
}

module.exports = { TEAL, TEAL_ESC, CORAL, PAPEL, TEXTO, SUAVE, CLARO, BRANCO, W, H,
                   escuro, claro, bolinha, cartao, texto };
