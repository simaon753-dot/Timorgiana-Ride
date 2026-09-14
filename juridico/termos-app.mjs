// Os três documentos da APP em Word, para o Simão corrigir à mão (14/09/26).
//
// O texto que vale é o da app (mobile/src/termos). Isto tira-o para Word numa
// tabela de três colunas — português, tétum, inglês — com uma linha por
// cláusula: as três línguas corrigem-se lado a lado, e uma cláusula nova
// entra nas três ao mesmo tempo ou fica visivelmente vazia numa delas.
//
// O caminho de volta é o importar-termos.py, que lê a mesma tabela e põe o
// texto de novo na app.
//
// A FORMA DA TABELA É O CONTRATO ENTRE OS DOIS:
//   · o título do documento é o primeiro parágrafo da página;
//   · a primeira linha da tabela é o cabeçalho das línguas, e não se lê;
//   · uma linha cuja célula começa por "▸ " é um dado do documento (título,
//     subtítulo, data, caixa de aceitação), e o valor vem no parágrafo seguinte;
//   · qualquer outra linha é uma cláusula: o primeiro parágrafo da célula é o
//     título, os seguintes são as linhas do texto — um parágrafo vazio é uma
//     linha em branco, exactamente como o "\n\n" do texto da app.
// Mudar esta forma aqui obriga a mudá-la lá.
//
// Correr:  cd juridico && node termos-app.mjs
// Escreve: juridico/app/*.docx

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, PageOrientation, AlignmentType, Header, Footer, PageNumber,
} = require('docx');
const C = require('./comum.js');

const LINGUAS = ['pt', 'tet', 'en'];
const CABECALHO = ['Português — prevalece', 'Tétum', 'English'];

// Os dados do documento, pela ordem em que aparecem. O importador reconhece-os
// pelo início do rótulo ("▸ TÍTULO", "▸ SUBTÍTULO", "▸ DATA", "▸ CAIXA").
export const CAMPOS = [
  ['titulo', '▸ TÍTULO DO DOCUMENTO'],
  ['subtitulo', '▸ SUBTÍTULO'],
  ['atualizado', '▸ DATA DA VERSÃO'],
  ['aceitarCurto', '▸ CAIXA DE ACEITAÇÃO — o que está entre ** é a parte em que se toca'],
];

const termos = {};
for (const l of LINGUAS) termos[l] = await import(new URL(`../mobile/src/termos/${l}.js`, import.meta.url));
const { textoPrivacidade } = await import(new URL('../mobile/src/termos/privacidade.js', import.meta.url));
const versoes = await import(new URL('../mobile/src/termos/versao.js', import.meta.url));

export const DOCUMENTOS = [
  {
    nome: 'Termos do Passageiro',
    ficheiro: 'Termos do Passageiro.docx',
    versao: versoes.VERSAO_TERMOS,
    texto: (l) => termos[l].termosPassageiro,
  },
  {
    nome: 'Termos do Motorista',
    ficheiro: 'Termos do Motorista.docx',
    versao: versoes.VERSAO_TERMOS_MOTORISTA,
    texto: (l) => termos[l].termosMotorista,
  },
  {
    nome: 'Aviso de Privacidade',
    ficheiro: 'Aviso de Privacidade.docx',
    versao: versoes.VERSAO_PRIVACIDADE,
    texto: (l) => textoPrivacidade(l),
  },
];

// A4 ao alto é 11906 × 16838; deitada, sobram 14838 de largura com margens de
// 1000 — três colunas iguais.
const LARGURAS = [4946, 4946, 4946];

const letra = (text, o = {}) =>
  new TextRun({
    text,
    size: o.size ?? 19,
    font: 'Calibri',
    bold: !!o.bold,
    color: o.color ?? '14201D',
  });
const linha = (text, o = {}) =>
  new Paragraph({
    spacing: { after: o.after ?? 40, line: 264 },
    children: text ? [letra(text, o)] : [],
  });
const celula = (paragrafos, i, fundo) =>
  new TableCell({
    width: { size: LARGURAS[i], type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: paragrafos,
  });

function tabela(doc) {
  const porLingua = Object.fromEntries(LINGUAS.map((l) => [l, doc.texto(l)]));
  const n = porLingua.pt.seccoes.length;
  for (const l of LINGUAS) {
    if (porLingua[l].seccoes.length !== n) {
      throw new Error(`${doc.nome}: ${l} tem ${porLingua[l].seccoes.length} cláusulas e pt tem ${n}`);
    }
  }

  const cabecalho = new TableRow({
    tableHeader: true,
    children: CABECALHO.map((c, i) =>
      celula([linha(c, { bold: true, color: 'FFFFFF', after: 0 })], i, C.TEAL)
    ),
  });

  const dados = CAMPOS.filter(([k]) => porLingua.pt[k] !== undefined).map(
    ([k, rotulo]) =>
      new TableRow({
        children: LINGUAS.map((l, i) =>
          celula(
            [linha(rotulo, { size: 14, bold: true, color: C.CINZA }), linha(porLingua[l][k] ?? '')],
            i,
            'F3F0EA'
          )
        ),
      })
  );

  const clausulas = porLingua.pt.seccoes.map(
    (_, s) =>
      new TableRow({
        cantSplit: false,
        children: LINGUAS.map((l, i) => {
          const sec = porLingua[l].seccoes[s];
          return celula(
            [
              linha(sec.titulo, { bold: true, color: C.TEAL, after: 80 }),
              ...sec.texto.split('\n').map((t) => linha(t)),
            ],
            i
          );
        }),
      })
  );

  return new Table({
    columnWidths: LARGURAS,
    width: { size: LARGURAS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [cabecalho, ...dados, ...clausulas],
  });
}

const INSTRUCOES = [
  'Corrija o texto directamente nas células. Cada linha da tabela é uma cláusula, com as três línguas lado a lado; em caso de divergência, prevalece o português.',
  'Em cada célula, a primeira linha (a verde) é o título da cláusula e o resto é o texto. Uma linha em branco separa parágrafos; uma linha começada por • é uma alínea.',
  'Para acrescentar uma cláusula, insira uma linha nova na tabela, no sítio onde a quer; para a retirar, apague a linha inteira. Não junte nem divida colunas.',
  'As linhas a cinzento, marcadas com ▸, são os dados do documento. Altere o valor, mas mantenha o rótulo que começa por ▸.',
  'Quando terminar, guarde no mesmo formato (.docx) e envie-o. O texto volta para a aplicação tal como ficar aqui; a versão do documento é actualizada nessa altura.',
];

function documento(doc) {
  return new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 19 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 900, bottom: 900, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [letra(`${C.APP}  ·  ${C.EMPRESA}`, { size: 15, color: C.CINZA })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D8D2C8', space: 6 } },
                children: [
                  letra(`${doc.nome}  ·  versão na app ${doc.versao}  ·  página `, { size: 15, color: C.CINZA }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.CINZA, font: 'Calibri' }),
                  letra(' de ', { size: 15, color: C.CINZA }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.CINZA, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // O primeiro parágrafo é o NOME do documento: é por ele que o
          // importador sabe para onde vai o texto. Não mudar.
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: doc.nome, bold: true, size: 32, color: C.TEAL, font: 'Calibri' })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D8D2C8', space: 8 } },
            children: [
              letra(`Texto em vigor na aplicação, versão ${doc.versao}  ·  para revisão`, {
                size: 17,
                color: C.CINZA,
              }),
            ],
          }),
          ...INSTRUCOES.map(
            (t) =>
              new Paragraph({
                spacing: { after: 60, line: 264 },
                shading: { type: ShadingType.CLEAR, fill: 'F3F0EA' },
                border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.TEAL, space: 8 } },
                indent: { left: 160, right: 160 },
                children: [letra(t, { size: 17, color: '3A4441' })],
              })
          ),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          tabela(doc),
        ],
      },
    ],
  });
}

mkdirSync(new URL('./app/', import.meta.url), { recursive: true });
for (const doc of DOCUMENTOS) {
  const b = await Packer.toBuffer(documento(doc));
  writeFileSync(new URL(`./app/${doc.ficheiro}`, import.meta.url), b);
  console.log(`  ✓ app/${doc.ficheiro}  (${(b.length / 1024).toFixed(0)} KB)`);
}
