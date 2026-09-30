// Todas as palavras da app em Word, para o Simão corrigir (15/09/26).
//
// Os termos e a privacidade já têm o seu Word (termos-app.mjs). Este é o
// resto: os 900 e tal textos dos ecrãs — botões, títulos, avisos, mensagens —
// em mobile/src/i18n, nas três línguas. Tabela de quatro colunas: a chave, o
// português, o tétum e o inglês, agrupada pelo ECRÃ onde o texto aparece, que
// é como quem corrige pensa neles ("o botão do registo"), e não pela ordem em
// que estão no ficheiro.
//
// O ecrã descobre-se procurando a chave no código: o primeiro ficheiro que a
// usa dá o grupo. As chaves montadas em tempo de execução (cor_*, doc*,
// tipo*…) não aparecem escritas e vão pelo prefixo.
//
// O caminho de volta é o importar-textos.py. A FORMA DA TABELA É O CONTRATO
// ENTRE OS DOIS:
//   · o primeiro parágrafo do documento é "Textos da App";
//   · a primeira linha da tabela é o cabeçalho, e não se lê;
//   · as linhas de grupo têm UMA célula (a ocupar as quatro colunas) e não se
//     lêem;
//   · as outras têm quatro células: a chave, e os três valores. Cada parágrafo
//     de uma célula é uma linha do texto.
//
// Correr:  cd juridico && node textos-app.mjs
// Escreve: juridico/app/Textos da App.docx
//
// SÓ O QUE FALTA REVER (29/09/2026):  node textos-app.mjs --por-rever
// Escreve: juridico/app/Textos da App - por rever.docx
// Os textos cujo tétum não é um que o Simão já leu: os novos e os mudados
// depois das revisões dele (REVISOES, em baixo). O importar-textos.py lê este
// Word igual ao outro — os textos que não vêm ficam como estão. DEPOIS DE
// IMPORTAR UMA REVISÃO, juntar o commit da importação a REVISOES; senão os
// mesmos textos voltam a sair como por rever.

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, PageOrientation, AlignmentType, Header, Footer, PageNumber,
} = require('docx');
const C = require('./comum.js');

const LINGUAS = ['pt', 'tet', 'en'];
const SRC = fileURLToPath(new URL('../mobile/src/', import.meta.url));
const textos = {};
for (const l of LINGUAS) textos[l] = (await import(new URL(`../mobile/src/i18n/${l}.js`, import.meta.url))).default;

// ── O que o Simão já leu ────────────────────────────────────────────────
// `tudo`: leu o ficheiro inteiro, e cada texto dele conta como lido. Senão só
// contam os que aquele commit mudou.
const POR_REVER = process.argv.includes('--por-rever');
const REVISOES = [
  { commit: '4b5bcb9', tudo: true }, // 15/09/2026: os 900 textos, 247 corrigidos
  { commit: '3062b52', tudo: false }, // 22/09/2026: o tétum das etiquetas do mapa
  { commit: '42a091d', tudo: true }, // 29/09/2026: os 146 que faltavam — com isto, tudo lido
  { commit: 'f8901e9', tudo: false }, // 30/09/2026: o texto da lista do «escolher no mapa»
  { commit: 'cf7c18d', tudo: true }, // 30/09/2026: os 3 que faltavam (motoristas perto, código da viagem) — tudo lido
];
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
async function tetEm(commit) {
  const js = execFileSync('git', ['show', `${commit}:mobile/src/i18n/tet.js`], { cwd: RAIZ, encoding: 'utf8' });
  return (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))).default;
}
const lidos = new Map(); // chave → os tétuns que ele leu para ela
if (POR_REVER) {
  for (const r of REVISOES) {
    const depois = await tetEm(r.commit);
    const antes = r.tudo ? null : await tetEm(`${r.commit}^`);
    for (const [k, v] of Object.entries(depois)) {
      if (antes && antes[k] === v) continue;
      if (!lidos.has(k)) lidos.set(k, new Set());
      lidos.get(k).add(v);
    }
  }
}
const CHAVES = Object.keys(textos.pt).filter((k) => !POR_REVER || !lidos.get(k)?.has(textos.tet[k]));

// ── Em que ecrã aparece cada chave ──────────────────────────────────────
const ECRAS = {
  'screens/WelcomeScreen.js': 'Entrada',
  'screens/LoginScreen.js': 'Iniciar sessão',
  'screens/RecuperarScreen.js': 'Recuperar acesso',
  'screens/RegisterScreen.js': 'Registo',
  'components/CampoTelefone.js': 'Registo',
  'components/ConfirmarEmail.js': 'Registo',
  'components/AceitarTermos.js': 'Registo',
  'design/CabecalhoRegisto.js': 'Registo',
  'design/SeletorConta.js': 'Registo',
  'components/FormularioVeiculo.js': 'Veículo do motorista',
  'components/EscolherCor.js': 'Veículo do motorista',
  'components/EscolherLugares.js': 'Veículo do motorista',
  'design/EscolherTipoVeiculo.js': 'Veículo do motorista',
  'design/EscolherMarcaModelo.js': 'Veículo do motorista',
  'design/DadosCarga.js': 'Veículo do motorista',
  'design/CartaoVeiculo.js': 'Veículo do motorista',
  'screens/PassengerHomeScreen.js': 'Início do passageiro',
  'screens/EscolherDestinoScreen.js': 'Escolher destino',
  'components/PlaceSearch.js': 'Escolher destino',
  'components/NomearLugar.js': 'Escolher destino',
  'components/EscolherPonto.js': 'Escolher destino',
  'components/EscolherDaLista.js': 'Escolher destino',
  'screens/EscolherCarryScreen.js': 'Carro Pickup',
  'components/CargaDoPedido.js': 'Carro Pickup',
  'screens/RequestRideScreen.js': 'Pedir viagem',
  'components/ParaOutraPessoa.js': 'Pedir viagem',
  'components/ViagemPassageiro.js': 'Viagem em curso',
  'components/CodigoRecolha.js': 'Viagem em curso',
  'components/ShareTripButton.js': 'Viagem em curso',
  'design/EtapasViagem.js': 'Viagem em curso',
  'components/SosButton.js': 'Emergência',
  'components/EscolherEmergencia.js': 'Emergência',
  'components/MotivoCancelamento.js': 'Cancelamentos',
  'components/RatingPanel.js': 'Avaliação',
  'screens/ChatScreen.js': 'Conversa',
  'screens/HistoryScreen.js': 'Histórico',
  'screens/DetalheViagemScreen.js': 'Histórico',
  'screens/ReportarScreen.js': 'Ocorrências',
  'screens/EncomendaScreen.js': 'Encomenda',
  'components/Encomenda.js': 'Encomenda',
  'screens/NavegarScreen.js': 'Navegação',
  'lib/mapaLink.js': 'Navegação',
  'components/MapaGoogle.js': 'Viagem em curso',
  'components/EsperaPedido.js': 'Pedir viagem',
  'components/AvisoSessao.js': 'Iniciar sessão',
  'components/EditarNome.js': 'Perfil',
  'dados/servicos.js': 'Início do passageiro',
  'screens/DriverHomeScreen.js': 'Início do motorista',
  'components/FotoDeTurno.js': 'Início do motorista',
  'components/BotaoPower.js': 'Início do motorista',
  'components/PedirCodigo.js': 'Início do motorista',
  'design/EtapasEntrega.js': 'Início do motorista',
  'screens/DriverPendingScreen.js': 'Documentos do motorista',
  'screens/GanhosScreen.js': 'Ganhos',
  'screens/AssinaturaScreen.js': 'Assinatura',
  'screens/PerfilScreen.js': 'Perfil',
  'screens/OpcoesScreen.js': 'Opções',
  'screens/TermosScreen.js': 'Termos',
  'screens/ServerScreen.js': 'Servidor',
  'screens/AdminScreen.js': 'Painel de administração',
  'screens/AdminDetalheScreen.js': 'Painel de administração',
  'components/GestaoCarry.js': 'Painel de administração',
  'components/GestaoPagamentos.js': 'Painel de administração',
};
const COMUNS = 'Peças comuns a vários ecrãs';
const SEM_USO = 'Não encontrados no código (talvez sem uso)';
const ORDEM = [
  'Entrada', 'Iniciar sessão', 'Recuperar acesso', 'Registo', 'Veículo do motorista',
  'Início do passageiro', 'Escolher destino', 'Carro Pickup', 'Pedir viagem',
  'Encomenda', 'Viagem em curso', 'Navegação', 'Emergência', 'Cancelamentos', 'Avaliação',
  'Conversa', 'Histórico', 'Ocorrências',
  'Mensagens automáticas', 'Início do motorista', 'Documentos do motorista', 'Ganhos',
  'Assinatura', 'Perfil', 'Opções', 'Termos', 'Servidor', 'Painel de administração',
  COMUNS, SEM_USO,
];
// As que o código monta em tempo de execução, e por isso não aparecem escritas.
const PREFIXOS = [
  ['cor_', 'Veículo do motorista'],
  ['sysMsg_', 'Mensagens automáticas'],
  ['cancelReason_', 'Cancelamentos'],
  ['admNotif', 'Painel de administração'],
  ['adm', 'Painel de administração'],
  ['doc', 'Documentos do motorista'],
  ['motivo', 'Documentos do motorista'],
  ['tipo', 'Escolher destino'],
  ['carga', 'Carro Pickup'],
  ['assin', 'Assinatura'],
  ['aval', 'Avaliação'],
  ['ocor', 'Ocorrências'],
];

function ficheiros(dir, base = '') {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = dir + n;
    if (statSync(p).isDirectory()) {
      if (n !== 'i18n' && n !== 'termos') out.push(...ficheiros(p + '/', base + n + '/'));
    } else if (n.endsWith('.js')) out.push(base + n);
  }
  return out;
}
const conjunto = new Set(CHAVES);
const usos = {};
for (const f of ficheiros(SRC)) {
  const texto = readFileSync(SRC + f, 'utf8');
  for (const m of texto.matchAll(/['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g)) {
    if (conjunto.has(m[1])) (usos[m[1]] ??= new Set()).add(f);
  }
}
function grupoDe(k) {
  const fs = [...(usos[k] || [])].sort(
    (a, b) => (ECRAS[a] ? 0 : 1) - (ECRAS[b] ? 0 : 1) || a.localeCompare(b)
  );
  if (fs.length) return ECRAS[fs[0]] || COMUNS;
  return PREFIXOS.find(([p]) => k.startsWith(p))?.[1] || SEM_USO;
}
const grupos = new Map(ORDEM.map((g) => [g, []]));
for (const k of CHAVES) grupos.get(grupoDe(k)).push(k);
// Por rever, um texto que ninguém vê não vale o tempo de quem revê.
const deFora = POR_REVER ? grupos.get(SEM_USO).splice(0) : [];

// ── O Word ───────────────────────────────────────────────────────────────
const LARGURAS = [2200, 4212, 4212, 4212];
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
    children: ['Chave — não mexer', 'Português — prevalece', 'Tétum', 'English'].map((c, i) =>
      celula([linha(c, { bold: true, color: 'FFFFFF', after: 0 })], i, C.TEAL)
    ),
  }),
];
let total = 0;
for (const [nome, ks] of grupos) {
  if (!ks.length) continue;
  linhas.push(
    new TableRow({
      cantSplit: true,
      children: [
        celula([linha(`${nome}  ·  ${ks.length} textos`, { bold: true, color: C.TEAL, size: 20, after: 0 })], 0, 'E3EFEC', {
          columnSpan: 4,
          width: { size: LARGURAS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
        }),
      ],
    })
  );
  for (const k of ks) {
    total++;
    linhas.push(
      new TableRow({
        cantSplit: true,
        children: [
          celula([linha(k, { size: 14, color: C.CINZA })], 0),
          ...LINGUAS.map((l, i) => celula(String(textos[l][k]).split('\n').map((t) => linha(t)), i + 1)),
        ],
      })
    );
  }
}

const INSTRUCOES = [
  ...(POR_REVER
    ? [
        'Estes são só os textos escritos ou mudados depois da sua revisão de 15/09/2026 (e da das etiquetas do mapa, a 22/09). O tétum é rascunho meu; o português e o inglês também são novos. Os outros textos da aplicação ficam como estão.',
      ]
    : []),
  'Corrija o texto nas colunas Português, Tétum e English. NÃO mexa na coluna Chave: é por ela que cada texto volta ao sítio certo da aplicação.',
  'Os marcadores entre chavetas — {nome}, {h}, {valor}, {dias} — são trocados pela aplicação por um nome ou um número. Mantenha-os escritos da mesma maneira; pode mudá-los de lugar na frase. Um texto a que falte ou sobre um marcador não é importado, e fica na lista de avisos.',
  'O que está entre ** e ** aparece a negrito ou como ligação. Mantenha os asteriscos aos pares.',
  'Cada parágrafo dentro de uma célula é uma linha na aplicação. Os textos estão agrupados pelo ecrã onde aparecem; as linhas verdes são esses títulos e não se lêem de volta.',
  'Não acrescente nem apague linhas: um texto novo só aparece se houver código que o mostre. Se achar que falta um texto, escreva-o num comentário do Word.',
  'Quando terminar, guarde no mesmo formato (.docx) e envie-o. Antes de publicar, recebe a lista do que mudou, texto a texto.',
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
                letra('Textos da App  ·  página ', { size: 15, color: C.CINZA }),
                new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.CINZA, font: 'Calibri' }),
                letra(' de ', { size: 15, color: C.CINZA }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.CINZA, font: 'Calibri' }),
              ],
            }),
          ],
        }),
      },
      children: [
        // O primeiro parágrafo é o NOME: é por ele que o importador reconhece o
        // documento. Não mudar.
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Textos da App', bold: true, size: 32, color: C.TEAL, font: 'Calibri' })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D8D2C8', space: 8 } },
          children: [
            letra(
              POR_REVER
                ? `Só os textos novos ou mudados desde a sua última revisão: ${total} textos  ·  o tétum é rascunho`
                : `Todas as palavras que a aplicação mostra: ${total} textos, em três línguas  ·  para revisão`,
              { size: 17, color: C.CINZA }
            ),
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
const NOME = POR_REVER ? 'Textos da App - por rever.docx' : 'Textos da App.docx';
writeFileSync(new URL(`./app/${NOME}`, import.meta.url), b);
console.log(`  ✓ app/${NOME}  (${(b.length / 1024).toFixed(0)} KB, ${total} textos)`);
for (const [nome, ks] of grupos) if (ks.length) console.log(`     ${String(ks.length).padStart(4)}  ${nome}`);
if (deFora.length) console.log(`  (de fora, sem uso no código: ${deFora.join(', ')})`);
