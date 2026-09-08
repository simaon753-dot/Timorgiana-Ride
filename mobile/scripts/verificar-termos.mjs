// Confere que cada documento de termos tem os campos todos que os ecrãs lêem.
//
// Porquê: os verificadores de nomes e de importações olham para o CÓDIGO. Este
// erro não estava no código — estava na FORMA DOS DADOS. O `import` resolvia,
// o objecto existia, só lhe faltava um campo. E o campo em falta só rebentava
// quando alguém abria o ecrã de registo.
//
// Foi assim que `aceitarCurto` se perdeu ao regenerar os termos a partir do
// documento revisto pelo Simão, e o registo ficou partido sem ninguém dar por
// isso — nem o Metro, nem os outros verificadores.
//
// A LISTA DE CAMPOS É LIDA DO ECRÃ, e não escrita aqui à mão.
//
// Estava à mão, e afastou-se: o ecrã passou a ler `doc.aceitar`, campo que
// documento nenhum tem, e a lista daqui nunca soube dele. O botão de aceitar
// os termos desenhava-se cor de laranja e vazio — sem uma palavra lá dentro —
// e os cinco verificadores davam verde.
//
// O cabeçalho já dizia "os campos todos que os ecrãs lêem". Passa a ser
// verdade: quem manda é o ecrã, e acrescentar lá um `doc.qualquerCoisa` novo
// obriga os seis documentos a tê-lo.
import { readFileSync } from 'node:fs';
import { textoTermos } from '../src/termos/index.js';
import { textoPrivacidade } from '../src/termos/privacidade.js';
import {
  VERSAO_TERMOS,
  VERSAO_TERMOS_MOTORISTA,
  VERSAO_PRIVACIDADE,
} from '../src/termos/versao.js';

const LINGUAS = ['pt', 'tet', 'en'];
const QUEM = ['passenger', 'driver'];

// TODOS os sítios que lêem um documento legal, e não só o ecrã que o mostra.
//
// São dois e fazem coisas diferentes: o ecrã mostra o documento inteiro
// (`titulo`, `seccoes`…), e a caixa do registo mostra a frase curta com a
// parte clicável (`aceitarCurto`). Olhar só para um deixava o campo do outro
// sem guarda — e `aceitarCurto` é justamente o que já se perdeu uma vez.
const QUEM_LE = ['src/screens/TermosScreen.js', 'src/components/AceitarTermos.js'];

// Comentários fora antes de procurar. Sem isto, um `doc.aceitar` mencionado
// num comentário a explicar o erro antigo exigiria o campo de volta — o
// verificador passaria a defender exactamente o que devia impedir.
const semComentarios = (f) =>
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const OBRIGATORIOS = [
  ...new Set(
    QUEM_LE.flatMap((f) =>
      [...semComentarios(f).matchAll(/\bdoc\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
    )
  ),
];

if (!OBRIGATORIOS.length) {
  // Um resultado vazio aqui não é "está tudo bem" — é o verificador a ter
  // deixado de encontrar o ecrã, e a passar a aprovar seja o que for.
  console.error('  ✗ não encontrei campo nenhum lido nos ecrãs — verificador cego');
  process.exit(1);
}

const faltas = [];

for (const lang of LINGUAS) {
  for (const quem of QUEM) {
    const doc = textoTermos(lang, quem);
    const onde = `termos ${lang}/${quem}`;
    for (const campo of OBRIGATORIOS) {
      if (doc?.[campo] == null || doc[campo] === '') faltas.push(`${onde}: falta "${campo}"`);
    }
    if (!doc?.seccoes?.length) faltas.push(`${onde}: sem secções`);
    for (const [i, s] of (doc?.seccoes ?? []).entries()) {
      if (!s?.titulo) faltas.push(`${onde}: secção ${i} sem título`);
      if (!s?.texto) faltas.push(`${onde}: secção ${i} sem texto`);
    }
    // O ** marca o pedaço clicável. Sem o par, o texto aparece mas não há
    // ligação nenhuma para abrir o documento — e ninguém repara.
    const marcas = (doc?.aceitarCurto ?? '').split('**').length - 1;
    if (marcas !== 2) faltas.push(`${onde}: "aceitarCurto" devia ter um par de ** (tem ${marcas})`);
  }

  const priv = textoPrivacidade(lang);
  if (!priv?.seccoes?.length) faltas.push(`privacidade ${lang}: sem secções`);
  if (!priv?.titulo) faltas.push(`privacidade ${lang}: falta "titulo"`);
  // A privacidade passou a ter caixa de aceitação própria no registo, e por
  // isso passa a precisar do mesmo campo que os termos. Verificado aqui pela
  // razão exacta que fez nascer este ficheiro: um campo em falta não dá erro
  // nenhum, só parte o ecrã de registo — e ninguém repara durante semanas.
  if (!priv?.aceitarCurto) faltas.push(`privacidade ${lang}: falta "aceitarCurto"`);
  const marcasPriv = (priv?.aceitarCurto ?? '').split('**').length - 1;
  if (marcasPriv !== 2) {
    faltas.push(`privacidade ${lang}: "aceitarCurto" devia ter um par de ** (tem ${marcasPriv})`);
  }
}

// AS VERSÕES TÊM DE SER DATAS BEM FORMADAS.
//
// Estas cadeias ficam gravadas na conta de quem aceita e são a prova de QUE
// versão foi aceite. Uma delas era '2026-08-3' — um zero perdido a escrever,
// que ninguém vê porque nada a lê como data: é só texto comparado com texto.
//
// Passava despercebida para sempre, e aparecia no painel, ao lado de um nome,
// como a versão do documento que aquela pessoa aceitou.
const VERSOES = { VERSAO_TERMOS, VERSAO_TERMOS_MOTORISTA, VERSAO_PRIVACIDADE };
for (const [nome, v] of Object.entries(VERSOES)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v ?? '')) {
    faltas.push(`${nome}: "${v}" não é uma data AAAA-MM-DD`);
  } else if (Number.isNaN(Date.parse(v))) {
    faltas.push(`${nome}: "${v}" não é uma data que exista`);
  }
}

if (faltas.length) {
  console.error('  ✗ documentos incompletos:\n');
  for (const l of faltas) console.error('    ' + l);
  process.exit(1);
}
console.log('  ✓ documentos legais completos');
