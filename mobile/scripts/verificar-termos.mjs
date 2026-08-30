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
import { textoTermos } from '../src/termos/index.js';
import { textoPrivacidade } from '../src/termos/privacidade.js';

const LINGUAS = ['pt', 'tet', 'en'];
const QUEM = ['passenger', 'driver'];
const OBRIGATORIOS = ['titulo', 'subtitulo', 'atualizado', 'aceitarCurto', 'seccoes'];

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
}

if (faltas.length) {
  console.error('  ✗ documentos incompletos:\n');
  for (const l of faltas) console.error('    ' + l);
  process.exit(1);
}
console.log('  ✓ documentos legais completos');
