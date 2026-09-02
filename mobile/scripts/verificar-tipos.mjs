// Confere os tipos de lugar: nas três línguas, e iguais dos dois lados.
//
// PORQUE É QUE PRECISA DE VERIFICADOR PRÓPRIO. Os nomes dos tipos não são
// escritos à letra em lado nenhum — a app faz
// `t('tipo' + x.charAt(0).toUpperCase() + x.slice(1))`. O
// verificar-traducoes.mjs diz-lhe isso na cara: só resolve chaves literais,
// porque adivinhar as outras daria falsos positivos em catadupa. Resultado:
// os onze tipos de sítio eram o único sítio da app onde uma tradução podia
// faltar sem ninguém dar por ela. O botão mostraria "tipoPoi".
//
// E VERIFICA TAMBÉM QUE AS DUAS LISTAS COINCIDEM. O servidor recusa um tipo
// que não conheça, mas quem chama esse pedido engole o erro de propósito —
// um aviso sobre o mapa no meio de um pedido de transporte é ruído no pior
// momento. Ou seja: acrescentar um tipo só na app fazia com que a
// contribuição fosse deitada fora EM SILÊNCIO. É a mesma família do campo
// que faltava nos termos.
import { readFileSync } from 'node:fs';

const LINGUAS = ['pt', 'tet', 'en'];

function idsDe(caminho, marcador) {
  const texto = readFileSync(caminho, 'utf8');
  const bloco = texto.slice(texto.indexOf(marcador));
  return [...bloco.slice(0, bloco.indexOf('];')).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
}

const naApp = idsDe('src/components/NomearLugar.js', 'const LISTA_TIPOS = [');
const noServidor = idsDe('../backend/src/tiposDeLugar.js', 'export const TIPOS_DE_LUGAR = [');

const problemas = [];

if (!naApp.length) problemas.push('não encontrei a LISTA_TIPOS na app');

const soNaApp = naApp.filter((x) => !noServidor.includes(x));
const soNoServidor = noServidor.filter((x) => !naApp.includes(x));
for (const x of soNaApp) {
  problemas.push(
    `'${x}' está na app mas não no servidor — a contribuição seria recusada em silêncio`
  );
}
for (const x of soNoServidor) {
  problemas.push(`'${x}' está no servidor mas não na app — ninguém o consegue escolher`);
}

const dicionarios = {};
for (const l of LINGUAS) {
  const m = await import(`../src/i18n/${l}.js`);
  dicionarios[l] = m.default ?? m[Object.keys(m)[0]];
}
for (const id of naApp) {
  const chave = 'tipo' + id.charAt(0).toUpperCase() + id.slice(1);
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

// ── e os documentos do motorista, pela mesma razão ──
//
// A app chama `t(tp.label)` e `t(NOME_DO_DOC[qual])`. São chaves montadas em
// tempo de execução tal como as dos tipos de lugar, e portanto invisíveis ao
// verificar-traducoes.mjs. Um documento novo sem tétum mostraria
// "docInspection" no ecrã de quem o tem de enviar.
//
// Confere também que as duas listas coincidem: se o servidor exigir um
// documento que a app não pede, o motorista fica bloqueado sem ter onde
// carregar para se desbloquear — e não há ecrã nenhum que lhe explique isso.
const noServidorDocs = idsDe('../backend/src/documents.js', 'export const OBRIGATORIOS = [');
const naAppDocs = [
  ...readFileSync('src/screens/DriverPendingScreen.js', 'utf8').matchAll(
    /\{\s*kind:\s*'([a-z]+)'/g
  ),
].map((m) => m[1]);

for (const x of noServidorDocs) {
  if (!naAppDocs.includes(x)) {
    problemas.push(
      `documento '${x}' é exigido pelo servidor mas a app não o pede — bloqueio sem saída`
    );
  }
}
for (const x of naAppDocs) {
  if (!noServidorDocs.includes(x)) {
    problemas.push(`documento '${x}' é pedido pela app mas o servidor não o conhece`);
  }
}
for (const id of naAppDocs) {
  const chave = 'doc' + id.charAt(0).toUpperCase() + id.slice(1);
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

if (problemas.length) {
  console.error('  ✗ tipos de lugar:\n');
  for (const p of problemas) console.error('    ' + p);
  process.exit(1);
}
console.log(
  `  ✓ ${naApp.length} tipos de lugar e ${naAppDocs.length} documentos, ` +
    `traduzidos e iguais nos dois lados`
);
