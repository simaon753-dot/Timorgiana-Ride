// SÓ AS PALAVRAS NOVAS, num Word para o Simão corrigir (05/10/2026).
//
//   node novas-palavras.mjs [commit-de-partida]
//
// Junta numa tabela português | tétum | inglês:
//   1. o RASCUNHO da cláusula dos 15% (ainda não está na app);
//   2. os textos da app acrescentados desde o commit de partida;
//   3. as mensagens e notificações do servidor acrescentadas desde então.
//
// A primeira coluna leva a CHAVE de cada texto, a cinzento: é por ela que as
// correções voltam ao sítio certo. Escreve app/Novas palavras.docx.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const DESDE = process.argv[2] || '321458b';
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const LINGUAS = ['pt', 'tet', 'en'];
const C = { TEAL: '0E5C54', CINZA: '68726C', CLARO: 'F3F0EA', CORAL: 'FFE9E3' };

// ── 1. A cláusula dos 15% — rascunho meu, a corrigir ────────────────────
const CLAUSULA = {
  pt: {
    titulo: 'Desconto para quem ganha pouco',
    texto: [
      'Este desconto aplica-se a quem compra o pacote de 30 dias de atividade.',
      'No fim de cada pacote de 30 dias — quando o último dos 30 dias de atividade é usado —, a TimorgianaRide calcula 15% do rendimento registado na aplicação durante esses 30 dias. O rendimento registado é a soma do preço das viagens concluídas na aplicação, tal como ficou registado em cada viagem.',
      'Se esses 15% forem inferiores ao preço que pagou pelo pacote, a compra seguinte do pacote de 30 dias custa apenas esses 15%. Exemplo: um motorista de carro paga $25 e regista $90 de viagens; 15% de $90 são $13,50; o pacote seguinte custa $13,50. Se os 15% forem iguais ou superiores ao preço do pacote, o pacote seguinte custa o preço normal.',
      'O desconto:',
      '• vale apenas para a compra seguinte do pacote de 30 dias, e não para os pacotes de 3 ou de 10 dias;',
      '• não é devolvido em dinheiro, não se acumula e não passa para outra conta;',
      '• é mostrado na aplicação, com o cálculo, antes de comprar.',
      'Perda do desconto. O motorista perde o desconto desse pacote se, durante os 30 dias de atividade, cancelar mais de [3] viagens depois de as ter aceitado, ou mais de [20%] das viagens que aceitou. Perde-o também se se provar que combinou com um passageiro fazer a viagem fora da aplicação. Isto não afasta a suspensão ou a desativação previstas nestes Termos.',
      'Natureza. O desconto é uma redução do preço do acesso à plataforma, e não uma comissão: a TimorgianaRide não recebe, nem retém, qualquer parte do valor das viagens, que continua a ser pago diretamente pelo passageiro ao motorista.',
      'Os registos da aplicação servem de prova do rendimento registado e dos cancelamentos. As condições deste desconto podem ser alteradas com aviso de, pelo menos, 30 dias, e a alteração aplica-se apenas aos pacotes comprados depois dela.',
    ],
  },
  tet: {
    titulo: 'Deskontu ba sira ne’ebé hetan rendimentu ki’ik',
    texto: [
      'Deskontu ida-ne’e aplika ba sira ne’ebé sosa pakote loron atividade 30.',
      'Iha pakote loron 30 nia rohan — bainhira uza ona loron atividade ikus husi loron 30 —, TimorgianaRide sura 15% husi rendimentu ne’ebé rejistu iha aplikasaun durante loron 30 ne’e. Rendimentu rejistadu mak soma husi folin viajen sira ne’ebé remata iha aplikasaun, tuir saida mak rejistu iha viajen ida-idak.',
      'Se 15% ne’e ki’ik liu folin ne’ebé ita selu ba pakote, sosa pakote loron 30 tuir mai sei kusta de’it 15% ne’e. Ezemplu: motorista kareta selu $25 no rejistu viajen $90; 15% husi $90 mak $13,50; pakote tuir mai kusta $13,50. Se 15% hanesan ka boot liu folin pakote nian, pakote tuir mai kusta folin normál.',
      'Deskontu ne’e:',
      '• vale de’it ba sosa tuir mai husi pakote loron 30, la vale ba pakote loron 3 ka loron 10;',
      '• la fó fila fali hanesan osan, la akumula no la muda ba konta seluk;',
      '• hatudu iha aplikasaun, ho kálkulu, antes sosa.',
      'Lakon deskontu. Motorista lakon deskontu husi pakote ne’e se, durante loron atividade 30, nia kansela viajen liu [3] depois simu tiha, ka liu [20%] husi viajen ne’ebé nia simu. Nia mós lakon se prova katak nia koordena ho pasajeiru atu halo viajen iha aplikasaun nia li’ur. Ida-ne’e la hasai suspensaun ka desativasaun ne’ebé previstu iha Termu sira-ne’e.',
      'Natureza. Deskontu ne’e mak redusaun ba folin asesu ba plataforma, la’ós komisaun: TimorgianaRide la simu no la retein parte ruma husi viajen nia valór, ne’ebé pasajeiru kontinua selu direta ba motorista.',
      'Aplikasaun nia rejistu sira serve hanesan prova ba rendimentu rejistadu no ba kanselamentu sira. Kondisaun deskontu nian bele muda ho avizu pelumenus loron 30 molok, no mudansa aplika de’it ba pakote sira ne’ebé sosa depois.',
    ],
  },
  en: {
    titulo: 'Discount for low earners',
    texto: [
      'This discount applies to those who buy the 30 activity-day package.',
      'At the end of each 30-day package — when the last of the 30 activity days is used — TimorgianaRide calculates 15% of the earnings recorded in the application during those 30 days. Recorded earnings are the sum of the prices of the rides completed in the application, as recorded for each ride.',
      'If that 15% is less than the price you paid for the package, your next purchase of the 30-day package costs only that 15%. Example: a car driver pays $25 and records $90 of rides; 15% of $90 is $13.50; the next package costs $13.50. If the 15% is equal to or higher than the package price, the next package costs the normal price.',
      'The discount:',
      '• applies only to the next purchase of the 30-day package, not to the 3-day or 10-day packages;',
      '• is not refunded in cash, does not accumulate and cannot be transferred to another account;',
      '• is shown in the application, with the calculation, before you buy.',
      'Loss of the discount. The driver loses the discount for that package if, during the 30 activity days, they cancel more than [3] rides after accepting them, or more than [20%] of the rides they accepted. It is also lost if it is proven that they arranged with a passenger to make the ride outside the application. This does not exclude the suspension or deactivation provided for in these Terms.',
      'Nature. The discount is a reduction in the price of access to the platform, not a commission: TimorgianaRide does not receive or withhold any part of the ride fare, which continues to be paid directly by the passenger to the driver.',
      'The application’s records serve as proof of recorded earnings and cancellations. The conditions of this discount may be changed with at least 30 days’ notice, and the change applies only to packages bought afterwards.',
    ],
  },
};

// ── 2 e 3. O que entrou no código desde DESDE ───────────────────────────
function chavesNovas(ficheiro) {
  const diff = execSync(`git diff ${DESDE} -U0 -- "${ficheiro}"`, { cwd: RAIZ, encoding: 'utf8' });
  const chaves = new Set();
  for (const l of diff.split('\n')) {
    const m = l.match(/^\+\s{2}([A-Za-z_][\w]*):/);
    if (m) chaves.add(m[1]);
  }
  return chaves;
}

async function textosDaApp() {
  const ling = {};
  for (const l of LINGUAS) {
    ling[l] = (await import(`${RAIZ}mobile/src/i18n/${l}.js`)).default;
  }
  // Uma chave conta se o texto português mudou (nova, ou reescrita).
  const novas = [...chavesNovas('mobile/src/i18n/pt.js')].filter((k) => ling.pt[k] !== undefined);
  return novas.map((k) => ({ chave: k, pt: ling.pt[k], tet: ling.tet[k], en: ling.en[k] }));
}

async function textosDoServidor() {
  const { MENSAGENS, NOTIFICACOES } = await import(`${RAIZ}backend/src/mensagens.js`);
  const diff = execSync(`git diff ${DESDE} -U0 -- backend/src/mensagens.js`, {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  const saida = [];
  for (const k of Object.keys(MENSAGENS)) {
    if (diff.includes(`+  '${k.replace(/'/g, "\\'")}': [`) || diff.includes(`+  '${k}': [`)) {
      saida.push({ chave: 'mensagem', pt: k, tet: MENSAGENS[k][0], en: MENSAGENS[k][1] });
    }
  }
  const novasNotif = new Set();
  for (const l of diff.split('\n')) {
    const m = l.match(/^\+\s{2}([A-Za-z_][\w]*): \{/);
    if (m) novasNotif.add(m[1]);
  }
  for (const k of novasNotif) {
    const n = NOTIFICACOES[k];
    if (n) saida.push({ chave: k, pt: n.pt, tet: n.tet, en: n.en });
  }
  return saida;
}

// ── O Word ──────────────────────────────────────────────────────────────
const LARGURAS = [1500, 4300, 4300, 4300];
const run = (text, o = {}) =>
  new TextRun({ text, size: o.size ?? 19, font: 'Calibri', bold: !!o.bold, color: o.color ?? '14201D' });
const par = (text, o = {}) =>
  new Paragraph({ spacing: { after: o.after ?? 40, line: 264 }, children: text ? [run(text, o)] : [] });
const cel = (paragrafos, i, fundo) =>
  new TableCell({
    width: { size: LARGURAS[i], type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: paragrafos,
  });
const cabecalho = () =>
  new TableRow({
    tableHeader: true,
    children: ['Chave', 'Português', 'Tétum', 'English'].map((c, i) =>
      cel([par(c, { bold: true, color: 'FFFFFF', after: 0 })], i, C.TEAL)
    ),
  });
const tabela = (linhas) =>
  new Table({
    columnWidths: LARGURAS,
    width: { size: LARGURAS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      cabecalho(),
      ...linhas.map(
        (x) =>
          new TableRow({
            children: [
              cel([par(x.chave, { size: 14, color: C.CINZA })], 0, C.CLARO),
              ...LINGUAS.map((l, i) =>
                cel(String(x[l] ?? '').split('\n').map((t) => par(t)), i + 1)
              ),
            ],
          })
      ),
    ],
  });
const titulo = (t) =>
  new Paragraph({ spacing: { before: 240, after: 120 }, children: [run(t, { size: 28, bold: true, color: C.TEAL })] });

const app = await textosDaApp();
const servidor = await textosDoServidor();
const linhasClausula = [
  { chave: 'título', pt: CLAUSULA.pt.titulo, tet: CLAUSULA.tet.titulo, en: CLAUSULA.en.titulo },
  ...CLAUSULA.pt.texto.map((_, i) => ({
    chave: `parágrafo ${i + 1}`,
    pt: CLAUSULA.pt.texto[i],
    tet: CLAUSULA.tet.texto[i],
    en: CLAUSULA.en.texto[i],
  })),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 19 } } } },
  sections: [
    {
      properties: { page: { size: { orientation: 'landscape' }, margin: { top: 700, bottom: 700, left: 700, right: 700 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [run('TimorgianaRide — Palavras novas para rever', { size: 34, bold: true, color: C.TEAL })],
        }),
        par(`Textos acrescentados de 04 a 05/10/2026 (desde o commit ${DESDE}). Corrija nas células; não mexa na coluna «Chave», que é por onde as correções voltam à aplicação. Em caso de divergência prevalece o português.`, { color: C.CINZA }),
        titulo('1. Rascunho da cláusula «Desconto para quem ganha pouco» (Termos do motorista)'),
        par('Proposta minha, ainda não está na aplicação. Os números entre [ ] são a confirmar por si: o limite de cancelamentos. Entraria a seguir à cláusula dos preços.', { color: C.CINZA }),
        tabela(linhasClausula),
        titulo(`2. Textos novos da aplicação (${app.length})`),
        tabela(app),
        titulo(`3. Mensagens e notificações novas do servidor (${servidor.length})`),
        par('As notificações vão para o telemóvel e, se o email estiver confirmado, também por email. {nome}, {motivo}, {documento}, {data} e {dias} são substituídos automaticamente: mantenha-os.', { color: C.CINZA }),
        tabela(servidor),
      ],
    },
  ],
});

mkdirSync(`${RAIZ}juridico/app`, { recursive: true });
const destino = `${RAIZ}juridico/app/Novas palavras.docx`;
writeFileSync(destino, await Packer.toBuffer(doc));
console.log(`  ✓ app/Novas palavras.docx — cláusula (${linhasClausula.length} linhas), app (${app.length}), servidor (${servidor.length})`);
