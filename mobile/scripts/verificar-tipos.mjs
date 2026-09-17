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
// Os que o servidor CONHECE (aceita receber), obrigatórios ou não. Um documento
// opcional — a fotografia do Carry — é conhecido sem ser exigido.
const conhecidosDocs = idsDe('../backend/src/documents.js', 'const TIPOS = [');
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
  if (!conhecidosDocs.includes(x)) {
    problemas.push(`documento '${x}' é pedido pela app mas o servidor não o conhece`);
  }
}
for (const id of naAppDocs) {
  const chave = 'doc' + id.charAt(0).toUpperCase() + id.slice(1);
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

// ── e os motivos de substituição de documento, pela terceira vez ──
//
// `t('motivo' + m.charAt(0).toUpperCase() + m.slice(1))`. É a terceira lista
// do projecto montada assim, e as três só estão verificadas porque alguém se
// lembrou de as trazer para aqui. Se aparecer uma quarta, o sítio é este.
const noServidorMotivos = idsDe(
  '../backend/src/documents.js',
  'export const MOTIVOS_ATUALIZACAO = ['
);
const naAppMotivos = idsDe('src/screens/DriverPendingScreen.js', 'const MOTIVOS = [');

for (const x of noServidorMotivos) {
  if (!naAppMotivos.includes(x)) problemas.push(`motivo '${x}' está no servidor mas não na app`);
}
for (const x of naAppMotivos) {
  if (!noServidorMotivos.includes(x)) {
    problemas.push(`motivo '${x}' está na app mas o servidor recusa-o — a substituição falharia`);
  }
  const chave = 'motivo' + x.charAt(0).toUpperCase() + x.slice(1);
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

// ── e os tipos de carga, pela quarta vez ──
//
// Vivem em QUATRO sítios: o servidor (config.js), o ecrã do pedido
// (CargaDoPedido), o cartão do motorista (CHAVE_CARGA) e o painel (as chaves
// 'carga.*' do dicionário em painel/src/i18n/pt/comum.ts desde 17/09/26, quando
// o painel passou a React; antes era a tabela CARGA do painel.html). A
// "Mudança" entrou nos quatro a 13/09/26. Se um dia entrar só num, o servidor
// recusa-a em silêncio ou o motorista lê "Outro" — e o `t(o.chave)` dos
// mosaicos é invisível ao verificar-traducoes, como os tipos de lugar.
function chavesDe(caminho, marcador) {
  const texto = readFileSync(caminho, 'utf8');
  const bloco = texto.slice(texto.indexOf(marcador));
  return [...bloco.slice(0, bloco.indexOf('};')).matchAll(/([a-z]+):\s*'/g)].map((m) => m[1]);
}
const noServidorCarga = idsDe('../backend/src/config.js', 'export const TIPOS_CARGA = [');
const textoCarga = readFileSync('src/components/CargaDoPedido.js', 'utf8');
const blocoCarga = textoCarga.slice(textoCarga.indexOf('const TIPOS = ['));
const blocoCargaFim = blocoCarga.slice(0, blocoCarga.indexOf('];'));
const naAppCarga = [...blocoCargaFim.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
const chavesCarga = [...blocoCargaFim.matchAll(/chave: '(\w+)'/g)].map((m) => m[1]);
const listasCarga = {
  'ecrã do pedido': naAppCarga,
  'cartão do motorista': chavesDe('src/screens/DriverHomeScreen.js', 'const CHAVE_CARGA = {'),
  painel: [
    ...readFileSync('../painel/src/i18n/pt/comum.ts', 'utf8').matchAll(/'carga\.([a-z]+)':/g),
  ].map((m) => m[1]),
};
if (!noServidorCarga.length || !naAppCarga.length)
  problemas.push('não encontrei as listas de tipos de carga');
for (const [onde, lista] of Object.entries(listasCarga)) {
  for (const x of noServidorCarga.filter((y) => !lista.includes(y))) {
    problemas.push(`carga '${x}' está no servidor mas não no ${onde}`);
  }
  for (const x of lista.filter((y) => !noServidorCarga.includes(y))) {
    problemas.push(`carga '${x}' está no ${onde} mas o servidor recusa-a`);
  }
}
for (const chave of chavesCarga) {
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

// ── e as cores do veículo, pela quinta vez ──
//
// O EscolherCor chama t('cor_' + id), montada como as outras. As dezoito
// cores atrás do botão "Outra" entraram a 14/09/26 — uma sem tétum mostraria
// "cor_bordo" ao motorista, e o passageiro leria o mesmo no cartão do veículo.
const naAppCores = [
  ...idsDe('src/dados/veiculos.js', 'export const CORES = ['),
  ...idsDe('src/dados/veiculos.js', 'export const CORES_OUTRAS = ['),
];
if (!naAppCores.length) problemas.push('não encontrei as listas de cores');
for (const x of naAppCores.filter((y, i) => naAppCores.indexOf(y) !== i)) {
  problemas.push(`cor '${x}' aparece duas vezes`);
}
for (const id of naAppCores) {
  const chave = `cor_${id}`;
  const faltam = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (faltam.length) problemas.push(`${chave} — falta em ${faltam.join(', ')}`);
}

// ── e os preços da assinatura, escritos nos termos do motorista ──
//
// Desde 14/09/26 os termos citam a tabela de pacotes, e o servidor cobra pela
// PACOTES de assinatura.js. Se um mudar sem o outro, o motorista aceitou um
// preço e paga outro — e o que vale é o texto que ele aceitou.
const textoAssin = readFileSync('../backend/src/assinatura.js', 'utf8');
const blocoPacotes = textoAssin.slice(textoAssin.indexOf('export const PACOTES = {'));
const pacotes = {};
for (const m of blocoPacotes
  .slice(0, blocoPacotes.indexOf('\n};'))
  .matchAll(/(\w+): \[([^\]]*)\]/g)) {
  pacotes[m[1]] = [...m[2].matchAll(/dias:\s*(\d+),\s*usd:\s*([\d.]+)/g)].map((p) => [p[1], p[2]]);
}
const LINHA_PRECO = {
  pt: (d, u) => `${d} dias – $${u}`,
  tet: (d, u) => `loron ${d} – $${u}`,
  en: (d, u) => `${d} days – $${u}`,
};
if (!pacotes.car?.length || !pacotes.motorbike?.length) {
  problemas.push('não encontrei os PACOTES da assinatura');
}
// Os termos juntam o carro e o Carro Pickup numa linha só.
if (JSON.stringify(pacotes.carry) !== JSON.stringify(pacotes.car)) {
  problemas.push('o Carry deixou de ter os preços do carro — os termos juntam-nos numa linha');
}
for (const l of LINGUAS) {
  const termos = await import(`../src/termos/${l}.js`);
  const texto = termos.termosMotorista.seccoes.map((s) => s.texto).join('\n');
  for (const tipo of ['motorbike', 'car']) {
    const linha = (pacotes[tipo] || []).map(([d, u]) => LINHA_PRECO[l](d, u)).join('; ');
    if (!texto.includes(linha)) {
      problemas.push(`termos do motorista (${l}) sem os preços de ${tipo}: "${linha}"`);
    }
  }
}

// ── e a versão dos termos do motorista, igual nos dois lados (15/09/26) ──
//
// O servidor recusa "disponível" a quem não aceitou a versão EM VIGOR, que
// vive em backend/src/termosVersao.js; a app pede a aceitação da de
// src/termos/versao.js. Se divergirem, ninguém consegue ficar disponível.
const versaoDe = (f) => readFileSync(f, 'utf8').match(/VERSAO_TERMOS_MOTORISTA = '([^']+)'/)?.[1];
const vApp = versaoDe('src/termos/versao.js');
const vServidor = versaoDe('../backend/src/termosVersao.js');
if (!vApp || vApp !== vServidor) {
  problemas.push(`versão dos termos do motorista: app ${vApp} ≠ servidor ${vServidor}`);
}

if (problemas.length) {
  console.error('  ✗ tipos de lugar:\n');
  for (const p of problemas) console.error('    ' + p);
  process.exit(1);
}
console.log(
  `  ✓ ${naApp.length} tipos de lugar, ${naAppDocs.length} documentos e ` +
    `${naAppMotivos.length} motivos, ${naAppCarga.length} tipos de carga e ${naAppCores.length} cores, traduzidos e iguais nos dois lados`
);
