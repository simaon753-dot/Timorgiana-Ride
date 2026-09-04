// Base comum dos documentos jurídicos da TimorgianaRide.
//
// Sete documentos com o mesmo cabeçalho, a mesma tipografia e a mesma
// numeração. Escritos num sítio só para não divergirem: sete ficheiros com
// sete versões do mesmo rodapé é como se perdem as versões.
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, Header, Footer, PageNumber,
  LevelFormat, convertInchesToTwip,
} = require('docx');

const TEAL = '0E5C54';
const CINZA = '6A7671';
const CORAL = 'C0392B';

const EMPRESA = 'Timorgiana, Lda';
const MORADA = 'Bidau Toko-Baru, Cristo Rei, Díli, Timor-Leste';
const CONTACTOS = '+670 74192857  ·  +670 75684566';
const APP = 'TimorgianaRide';

// Data de emissão. Muda aqui e muda nos sete.
const VERSAO = '3 de Setembro de 2026';

// A base legal do seguro obrigatório, escrita uma vez e citada nos cinco
// documentos que dela falam. Num sítio só para não divergirem — e porque
// uma citação legal errada repetida em cinco documentos é cinco erros.
const SEGURO_LEI =
  'Instrução Pública n.º 07/2010, aprovada pela Resolução do Conselho n.º 12/2010, de 17 de Dezembro';
const SEGURO_ART = 'artigo 3.º, n.º 1';
const SEGURO_TETOS = 'artigo 7.º, n.º 3';

const bullets = {
  config: [
    {
      reference: 'lista',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.65), hanging: convertInchesToTwip(0.2) } } } },
      ],
    },
  ],
};

const titulo = (t) => new Paragraph({
  heading: HeadingLevel.TITLE, spacing: { after: 80 },
  children: [new TextRun({ text: t, bold: true, size: 32, color: TEAL, font: 'Calibri' })],
});

const subtitulo = (t) => new Paragraph({
  spacing: { after: 260 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D8D2C8', space: 8 } },
  children: [new TextRun({ text: t, size: 19, color: CINZA, font: 'Calibri' })],
});

const artigo = (n, t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 },
  children: [new TextRun({ text: `${n}  ${t}`, bold: true, size: 23, color: TEAL, font: 'Calibri' })],
});

const sub = (t) => new Paragraph({
  spacing: { before: 180, after: 90 },
  children: [new TextRun({ text: t, bold: true, size: 21, font: 'Calibri' })],
});

const p = (t, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  alignment: o.centro ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, size: 21, font: 'Calibri', bold: !!o.forte, italics: !!o.italico,
    color: o.cor })],
});

// Parágrafo com pedaços a negrito: pedaco('texto ', ['negrito'], ' resto')
const rico = (partes, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  alignment: AlignmentType.JUSTIFIED,
  children: partes.map((x) =>
    Array.isArray(x)
      ? new TextRun({ text: x[0], size: 21, font: 'Calibri', bold: true })
      : new TextRun({ text: x, size: 21, font: 'Calibri' })
  ),
});

const item = (t, nivel = 0) => new Paragraph({
  numbering: { reference: 'lista', level: nivel },
  spacing: { after: 70, line: 276 },
  children: [new TextRun({ text: t, size: 21, font: 'Calibri' })],
});

const nota = (t) => new Paragraph({
  spacing: { before: 140, after: 140, line: 276 },
  shading: { type: ShadingType.CLEAR, fill: 'F3F0EA' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: TEAL, space: 8 } },
  indent: { left: 160, right: 160 },
  children: [new TextRun({ text: t, size: 20, font: 'Calibri', italics: true, color: '3A4441' })],
});

// Tabela. `larguras` em DXA e a somar à largura da tabela.
function tabela(cabecalho, linhas, larguras) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const celula = (texto, i, cab) => new TableCell({
    width: { size: larguras[i], type: WidthType.DXA },
    shading: cab ? { type: ShadingType.CLEAR, fill: TEAL } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 264 },
      children: [new TextRun({ text: String(texto), size: 19, font: 'Calibri',
        bold: !!cab, color: cab ? 'FFFFFF' : '14201D' })],
    })],
  });
  return new Table({
    columnWidths: larguras,
    width: { size: total, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((c, i) => celula(c, i, true)) }),
      ...linhas.map((l, n) => new TableRow({
        children: l.map((c, i) => new TableCell({
          width: { size: larguras[i], type: WidthType.DXA },
          // Linhas alternadas com um cinzento muito claro. Numa tabela de
          // infracções com quatro colunas, é o que impede o olho de saltar
          // de linha a meio e ler a sanção errada.
          shading: n % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'F7F5F1' } : undefined,
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          children: [new Paragraph({
            spacing: { after: 0, line: 264 },
            children: [new TextRun({ text: String(c), size: 19, font: 'Calibri', color: '14201D' })],
          })],
        })),
      })),
    ],
  });
}

const assinaturas = (esquerda, direita) => new Table({
  columnWidths: [4400, 4400],
  width: { size: 8800, type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  },
  rows: [new TableRow({
    children: [esquerda, direita].map((lado) => new TableCell({
      width: { size: 4400, type: WidthType.DXA },
      margins: { top: 500, right: 200 },
      children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '14201D', space: 4 } },
          spacing: { after: 60 }, children: [new TextRun({ text: ' ', size: 21 })],
        }),
        new Paragraph({ spacing: { after: 0 },
          children: [new TextRun({ text: lado, size: 19, font: 'Calibri', color: CINZA })] }),
      ],
    })),
  })],
});

function documento(nome, subt, filhos) {
  return new Document({
    numbering: bullets,
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT, spacing: { after: 0 },
          children: [new TextRun({ text: `${APP}  ·  ${EMPRESA}`, size: 16, color: CINZA, font: 'Calibri' })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 60 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D8D2C8', space: 6 } },
          children: [
            new TextRun({ text: `${nome}  ·  ${VERSAO}  ·  página `, size: 15, color: CINZA, font: 'Calibri' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 15, color: CINZA, font: 'Calibri' }),
            new TextRun({ text: ' de ', size: 15, color: CINZA, font: 'Calibri' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: CINZA, font: 'Calibri' }),
          ],
        })] }),
      },
      children: [titulo(nome), subtitulo(subt), ...filhos],
    }],
  });
}

module.exports = {
  Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ShadingType,
  TEAL, CINZA, CORAL, EMPRESA, MORADA, CONTACTOS, APP, VERSAO,
  SEGURO_LEI, SEGURO_ART, SEGURO_TETOS,
  titulo, subtitulo, artigo, sub, p, rico, item, nota, tabela, assinaturas, documento,
};
