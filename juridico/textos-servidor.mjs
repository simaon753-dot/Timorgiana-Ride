// Os textos do SERVIDOR em Word, para o Simão rever o tétum (29/09/2026).
//
// O Textos da App.docx tem o que está em mobile/src/i18n. Este tem o resto,
// tudo rascunho meu:
//   · as mensagens que o servidor manda à app (backend/src/mensagens.js,
//     MENSAGENS) — o texto português é a CHAVE, por isso não se muda aqui;
//   · as notificações (o mesmo ficheiro, NOTIFICACOES);
//   · o ecrã e a voz da navegação nossa (backend/mapa/publico/navegar/app.js).
//
// Ida:    cd juridico && node textos-servidor.mjs
//         → app/Textos do Servidor.docx
// Volta:  node textos-servidor.mjs --importar "app/Textos do Servidor.docx"
//         (mostra o que mudaria; com --escrever, escreve e passa o Prettier)
//
// SÓ VOLTAM O TÉTUM E O INGLÊS. O português das mensagens é a chave com que
// as rotas as encontram; mudá-lo aqui desligava a tradução em silêncio.
//
// A VOLTA MEXE SÓ NO TEXTO. Cada frase é encontrada na árvore do código
// (@babel/parser) e só aquela cadeia é trocada. Nas frases da navegação que
// levam partes variáveis — `Fila ba ${lado[l].tet}${ruaTet(r)}` — o Word
// mostra {lado} e {ligação + rua}; na volta, cada marcador volta a ser a
// expressão que era, e pode mudar de lugar na frase.
//
// A FORMA DA TABELA É O CONTRATO ENTRE A IDA E A VOLTA: primeiro parágrafo
// «Textos do Servidor»; linhas de quatro células (chave, português, tétum,
// inglês); o cabeçalho e as linhas de grupo (uma célula) não se lêem.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parse } = require('../backend/node_modules/@babel/parser');
const C = require('./comum.js');

const TITULO = 'Textos do Servidor';
const LINGUAS = ['pt', 'tet', 'en'];
const BACKEND = fileURLToPath(new URL('../backend/', import.meta.url));
const F_MENSAGENS = BACKEND + 'src/mensagens.js';
const F_NAVEGAR = BACKEND + 'mapa/publico/navegar/app.js';
const MARCADOR = /\{[^{}]+\}/g;

// ── Ler os textos do código ─────────────────────────────────────────────
//
// Cada texto: { id, grupo, pt, tet, en, nos: { pt, tet, en } }, em que `nos`
// são os nós da árvore (com o sítio exacto no ficheiro) de cada língua.

const arvore = (f) => {
  const fonte = readFileSync(f, 'utf8');
  return { fonte, ast: parse(fonte, { sourceType: 'module' }) };
};
const declaracoes = (ast) => {
  const out = {};
  for (let d of ast.program.body) {
    if (d.type === 'ExportNamedDeclaration') d = d.declaration;
    if (d?.type !== 'VariableDeclaration') continue;
    for (const v of d.declarations) if (v.id.type === 'Identifier') out[v.id.name] = v.init;
  }
  return out;
};
const nomeDe = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.value);
const propriedade = (obj, nome) => obj.properties.find((p) => nomeDe(p) === nome)?.value;

function lerMensagens() {
  const { fonte, ast } = arvore(F_MENSAGENS);
  const d = declaracoes(ast);
  const textos = [];
  let grupo = '';
  for (const p of d.MENSAGENS.properties) {
    for (const c of p.leadingComments || []) {
      const m = c.value.match(/^\s*──\s*(.+?)\s*$/);
      if (m) grupo = m[1].replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)$/, '');
    }
    const [tet, en] = p.value.elements;
    textos.push({
      id: 'm-' + createHash('sha1').update(p.key.value).digest('hex').slice(0, 8),
      grupo: `Mensagens · ${grupo}`,
      pt: p.key.value,
      tet: tet.value,
      en: en.value,
      nos: { tet, en },
      ficheiro: F_MENSAGENS,
    });
  }
  for (const p of d.NOTIFICACOES.properties) {
    const nos = Object.fromEntries(LINGUAS.map((l) => [l, propriedade(p.value, l)]));
    textos.push({
      id: 'n-' + nomeDe(p),
      grupo: 'Notificações',
      ...Object.fromEntries(LINGUAS.map((l) => [l, nos[l].value])),
      nos,
      ficheiro: F_MENSAGENS,
    });
  }
  return { fonte, textos };
}

// Os marcadores da navegação: o nome que o Simão lê no Word.
function marcador(expr) {
  if (expr.type === 'Identifier') return { r: 'rua', h: 'hora', d: 'distância' }[expr.name] || 'n';
  if (expr.type === 'MemberExpression') return 'lado';
  if (expr.type === 'CallExpression' && /^rua/.test(expr.callee.name)) return 'ligação + rua';
  return '?';
}
// Os pedaços de texto de um valor: uma cadeia, um modelo `…${x}…`, ou os dois
// ramos de um `r ? … : …`. Os vazios não contam — não há nada a traduzir.
function pedacos(no) {
  if (!no) return [];
  if (no.type === 'StringLiteral') return no.value ? [no] : [];
  if (no.type === 'TemplateLiteral') return [no];
  if (no.type === 'ArrowFunctionExpression') return pedacos(no.body);
  if (no.type === 'ConditionalExpression') return [...pedacos(no.consequent), ...pedacos(no.alternate)];
  return [];
}
function textoDe(no) {
  if (no.type === 'StringLiteral') return no.value;
  return no.quasis
    .map((q, i) => q.value.cooked + (i < no.expressions.length ? `{${marcador(no.expressions[i])}}` : ''))
    .join('');
}

function lerNavegacao() {
  const { fonte, ast } = arvore(F_NAVEGAR);
  const d = declaracoes(ast);
  const textos = [];
  const juntar = (id, grupo, porLingua) => {
    const partes = Object.fromEntries(LINGUAS.map((l) => [l, pedacos(porLingua[l])]));
    const n = partes.pt.length;
    if (!n || LINGUAS.some((l) => partes[l].length !== n)) return;
    for (let i = 0; i < n; i++) {
      const nos = Object.fromEntries(LINGUAS.map((l) => [l, partes[l][i]]));
      textos.push({
        id: n > 1 ? `${id}#${i + 1}` : id,
        grupo,
        ...Object.fromEntries(LINGUAS.map((l) => [l, textoDe(nos[l])])),
        nos,
        ficheiro: F_NAVEGAR,
      });
    }
  };
  for (const [obj, grupo] of [
    ['TEXTOS', 'Navegação · ecrã e voz'],
    ['TEXTOS_VIAGEM', 'Navegação · a viagem inteira'],
  ]) {
    const pt = propriedade(d[obj], 'pt');
    for (const p of pt.properties) {
      const k = nomeDe(p);
      if (k === 'decimal') continue;
      juntar(`v-${k}`, grupo, Object.fromEntries(LINGUAS.map((l) => [l, propriedade(propriedade(d[obj], l), k)])));
    }
  }
  for (const p of d.lado.properties) {
    juntar(`v-lado.${nomeDe(p)}`, 'Navegação · peças das frases', Object.fromEntries(LINGUAS.map((l) => [l, propriedade(p.value, l)])));
  }
  juntar('v-ligação + rua', 'Navegação · peças das frases', { pt: d.ruaPt, tet: d.ruaTet, en: d.ruaEn });
  return { fonte, textos };
}

// ── Ida: o Word ─────────────────────────────────────────────────────────

async function escreverWord() {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
    ShadingType, BorderStyle, PageOrientation, AlignmentType, Header, Footer, PageNumber,
  } = require('docx');
  const textos = [...lerMensagens().textos, ...lerNavegacao().textos];
  const LARGURAS = [1500, 4450, 4450, 4450];
  const letra = (text, o = {}) =>
    new TextRun({ text, size: o.size ?? 18, font: 'Calibri', bold: !!o.bold, color: o.color ?? '14201D' });
  const linha = (text, o = {}) =>
    new Paragraph({ spacing: { after: o.after ?? 20, line: 252 }, children: text ? [letra(text, o)] : [] });
  const celula = (paragrafos, i, fundo, extra = {}) =>
    new TableCell({
      width: { size: LARGURAS[i], type: WidthType.DXA },
      shading: fundo ? { type: ShadingType.CLEAR, fill: fundo } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: paragrafos,
      ...extra,
    });
  const linhas = [
    new TableRow({
      tableHeader: true,
      children: ['Chave — não mexer', 'Português — só referência', 'Tétum', 'English'].map((c, i) =>
        celula([linha(c, { bold: true, color: 'FFFFFF', after: 0 })], i, C.TEAL)
      ),
    }),
  ];
  const grupos = new Map();
  for (const t of textos) (grupos.get(t.grupo) ?? grupos.set(t.grupo, []).get(t.grupo)).push(t);
  for (const [nome, ts] of grupos) {
    linhas.push(
      new TableRow({
        cantSplit: true,
        children: [
          celula([linha(`${nome}  ·  ${ts.length}`, { bold: true, color: C.TEAL, size: 20, after: 0 })], 0, 'E3EFEC', {
            columnSpan: 4,
            width: { size: LARGURAS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          }),
        ],
      })
    );
    for (const t of ts) {
      linhas.push(
        new TableRow({
          cantSplit: true,
          children: [
            celula([linha(t.id, { size: 14, color: C.CINZA })], 0),
            celula(String(t.pt).split('\n').map((s) => linha(s, { color: '55605C' })), 1, 'F7F5F1'),
            ...['tet', 'en'].map((l, i) => celula(String(t[l]).split('\n').map((s) => linha(s)), i + 2)),
          ],
        })
      );
    }
  }
  const INSTRUCOES = [
    'Estes são os textos que o SERVIDOR escreve: as mensagens que aparecem na app (erros, avisos, confirmações), as notificações, e o ecrã e a voz da navegação. O tétum é todo rascunho meu.',
    'Corrija o Tétum e, se quiser, o English. A coluna Português é só referência: nas mensagens é por ela que o servidor encontra a tradução, e uma mudança ali não é importada. Se um português estiver mal, escreva um comentário do Word.',
    'Não mexa na coluna Chave. Mantenha os marcadores entre chavetas — {0}, {valor}, {rua}, {lado}… — escritos da mesma maneira; pode mudá-los de lugar na frase. {0} e {1} são números ou nomes que o servidor põe no sítio.',
    'Na navegação: {lado} é «liman karuk» ou «liman los» (linhas «lado» no fim); {ligação + rua} é a linha «ligação + rua» (ex.: «ba Avenida Nicolau Lobato») e só aparece quando a rua tem nome. As frases da voz são lidas com a voz portuguesa do telemóvel — convém que soem bem assim.',
    'Quando terminar, guarde em .docx e envie-o. Antes de publicar, recebe a lista do que mudou, texto a texto.',
  ];
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 18 } } } },
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
                  letra(`${TITULO}  ·  página `, { size: 15, color: C.CINZA }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.CINZA, font: 'Calibri' }),
                  letra(' de ', { size: 15, color: C.CINZA }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.CINZA, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // O primeiro parágrafo é o NOME: é por ele que a volta reconhece o
          // documento. Não mudar.
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: TITULO, bold: true, size: 32, color: C.TEAL, font: 'Calibri' })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D8D2C8', space: 8 } },
            children: [letra(`${textos.length} textos  ·  o tétum é rascunho, para revisão`, { size: 17, color: C.CINZA })],
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
          new Table({
            columnWidths: LARGURAS,
            width: { size: LARGURAS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            rows: linhas,
          }),
        ],
      },
    ],
  });
  mkdirSync(new URL('./app/', import.meta.url), { recursive: true });
  const b = await Packer.toBuffer(doc);
  writeFileSync(new URL(`./app/${TITULO}.docx`, import.meta.url), b);
  console.log(`  ✓ app/${TITULO}.docx  (${(b.length / 1024).toFixed(0)} KB, ${textos.length} textos)`);
  for (const [nome, ts] of grupos) console.log(`     ${String(ts.length).padStart(4)}  ${nome}`);
}

// ── Volta: do Word para o código ────────────────────────────────────────

// Um .docx é um zip com XML. Lê-se só a primeira tabela; o texto riscado com o
// controlo de alterações está em <w:delText> e não conta, o inserido conta.
async function lerWord(caminho) {
  const JSZip = require('jszip');
  const xml = await (await JSZip.loadAsync(readFileSync(caminho))).file('word/document.xml').async('string');
  const ent = (s) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const paragrafo = (p) =>
    [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)]
      .map((m) => (m[1] !== undefined ? ent(m[1]) : m[0] === '<w:tab/>' ? '\t' : '\n'))
      .join('');
  const paragrafos = (s) => [...s.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((m) => paragrafo(m[1]));
  const corpo = xml.slice(xml.indexOf('<w:body'));
  const nome = paragrafos(corpo.slice(0, corpo.indexOf('<w:tbl'))).find((t) => t.trim()) || '';
  if (nome.trim() !== TITULO) throw new Error(`${caminho}: o primeiro parágrafo devia ser «${TITULO}», e é «${nome}»`);
  const tabela = corpo.slice(corpo.indexOf('<w:tbl'), corpo.indexOf('</w:tbl>'));
  const doc = new Map();
  for (const [n, tr] of [...tabela.matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)].entries()) {
    const celulas = [...tr[1].matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g)].map((m) =>
      paragrafos(m[1]).join('\n').replace(/^\s*\n|\n\s*$/g, '')
    );
    if (n === 0 || celulas.length !== 4 || !celulas[0].trim()) continue;
    doc.set(celulas[0].trim(), { tet: celulas[2], en: celulas[3] });
  }
  return doc;
}

const marcadores = (s) => (s.match(MARCADOR) || []).sort().join(' ');
function problema(novo, velho) {
  if (!novo.trim() && velho.trim()) return 'ficou vazio';
  if (marcadores(novo) !== marcadores(velho)) return `marcadores diferentes: ${marcadores(velho) || '—'} → ${marcadores(novo) || '—'}`;
  return null;
}
// O espaço à volta de um pedaço («ba {rua}» começa com espaço) não se vê no
// Word; fica o do código.
const comEspacos = (novo, velho) => velho.match(/^\s*/)[0] + novo.trim() + velho.match(/\s*$/)[0];

// A cadeia nova, escrita no mesmo tipo de nó que lá estava.
function codigoDe(no, texto, fonte) {
  if (no.type === 'StringLiteral') {
    return "'" + texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  const expr = new Map(no.expressions.map((e) => [marcador(e), fonte.slice(e.start, e.end)]));
  const partes = texto.split(/(\{[^{}]+\})/);
  return (
    '`' +
    partes
      .map((p, i) =>
        i % 2 ? '${' + expr.get(p.slice(1, -1)) + '}' : p.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
      )
      .join('') +
    '`'
  );
}

async function importar(caminho, escrever) {
  const doc = await lerWord(caminho);
  const fontes = { [F_MENSAGENS]: lerMensagens(), [F_NAVEGAR]: lerNavegacao() };
  const edicoes = new Map(); // ficheiro → [{ start, end, codigo }]
  const vistas = new Set();
  const avisos = [];
  let n = 0;
  for (const [ficheiro, { fonte, textos }] of Object.entries(fontes)) {
    for (const t of textos) {
      const w = doc.get(t.id);
      if (!w) continue;
      vistas.add(t.id);
      for (const l of ['tet', 'en']) {
        const novo = comEspacos(w[l], t[l]);
        if (novo === t[l]) continue;
        const p = problema(novo, t[l]);
        if (p) {
          avisos.push(`${t.id} (${l}): ${p} — fica como estava`);
          continue;
        }
        const no = t.nos[l];
        n++;
        console.log(`  ${t.id} · ${l}\n     antes: ${t[l]}\n     agora: ${novo}`);
        (edicoes.get(ficheiro) ?? edicoes.set(ficheiro, []).get(ficheiro)).push({
          start: no.start,
          end: no.end,
          codigo: codigoDe(no, novo, fonte),
        });
      }
    }
  }
  const desconhecidas = [...doc.keys()].filter((k) => !vistas.has(k));
  if (desconhecidas.length) avisos.push(`${desconhecidas.length} chave(s) do Word que o código já não tem (ignoradas): ${desconhecidas.join(', ')}`);
  console.log(n ? `\n── ${n} texto(s) mudado(s)` : '\n── sem alterações');
  for (const a of avisos) console.log('  ! ' + a);
  if (!escrever || !n) return;
  for (const [ficheiro, es] of edicoes) {
    let s = fontes[ficheiro].fonte;
    for (const e of es.sort((a, b) => b.start - a.start)) s = s.slice(0, e.start) + e.codigo + s.slice(e.end);
    writeFileSync(ficheiro, s);
    console.log(`  ✓ ${es.length} escrito(s) em ${ficheiro.slice(BACKEND.length - 'backend/'.length)}`);
  }
  execFileSync('npx', ['prettier', '--write', ...edicoes.keys()], { cwd: BACKEND, stdio: 'ignore' });
  console.log('  ✓ Prettier. A seguir: cd backend && npm run verificar');
}

const i = process.argv.indexOf('--importar');
if (i > 0) await importar(process.argv[i + 1], process.argv.includes('--escrever'));
else await escreverWord();
