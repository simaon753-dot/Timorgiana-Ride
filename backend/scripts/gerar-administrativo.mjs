// Transforma a folha oficial das fronteiras administrativas num ficheiro
// que o servidor lê.
//
// A FONTE: tls_admin_boundaries.xlsx, publicado pelas Nações Unidas
// (Humanitarian Data Exchange, conjunto COD-AB de Timor-Leste). É a lista
// oficial, com códigos.
//
// PORQUE NÃO VEIO DO DIPLOMA. O Jornal da República de 3 de Maio de 2023
// tem a lista completa, incluindo aldeias — mas 97 das suas 104 páginas são
// digitalizadas, e cada página está guardada como umas seiscentas imagens
// de menos de 1 KB. Não há forma fiável de a ler.
//
// UMA CORRECÇÃO É FEITA AQUI: Ataúro aparece na folha como posto
// administrativo de Díli. Passou a município em 1 de Janeiro de 2022, e a
// folha é anterior. Corrige-se na geração para não haver duas verdades.
//
// Correr com:  node scripts/gerar-administrativo.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';

const XLSX = new URL('../dados/tls_admin_boundaries.xlsx', import.meta.url);
const SAIDA = new URL('../dados/administrativo.json', import.meta.url);

// Leitor mínimo de XLSX. Um .xlsx é um zip com XML lá dentro; ler assim
// evita uma dependência inteira para uma tarefa que se faz uma vez.
function lerXlsx(caminho) {
  const buf = fs.readFileSync(caminho);
  const ficheiros = new Map();
  // Percorre o directório central do zip, do fim para o princípio.
  let fim = buf.length - 22;
  while (fim > 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  let p = buf.readUInt32LE(fim + 16);
  const n = buf.readUInt16LE(fim + 10);
  for (let i = 0; i < n; i++) {
    const nomeLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentLen = buf.readUInt16LE(p + 32);
    const nome = buf.toString('utf8', p + 46, p + 46 + nomeLen);
    const inicio = buf.readUInt32LE(p + 42);
    const metodo = buf.readUInt16LE(p + 10);
    const compLen = buf.readUInt32LE(p + 20);
    const localExtra = buf.readUInt16LE(inicio + 28);
    const localNome = buf.readUInt16LE(inicio + 26);
    const dados = buf.subarray(
      inicio + 30 + localNome + localExtra,
      inicio + 30 + localNome + localExtra + compLen
    );
    ficheiros.set(nome, metodo === 8 ? zlib.inflateRawSync(dados) : dados);
    p += 46 + nomeLen + extraLen + comentLen;
  }
  return ficheiros;
}

const z = lerXlsx(XLSX);
const texto = (nome) => z.get(nome).toString('utf8');

// Cadeias partilhadas: o XLSX guarda cada texto repetido uma vez só.
const partilhadas = [...texto('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((x) => x[1])
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
);

function folha(n) {
  const xml = texto(`xl/worksheets/sheet${n}.xml`);
  const linhas = [];
  for (const m of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    // A coluna vem no atributo `r` — "C7" quer dizer coluna C. É preciso
    // lê-lo: um XLSX OMITE as células vazias, e sem isto tudo o que vem
    // depois de um vazio escorrega uma casa para a esquerda.
    //
    // Foi o que aconteceu à primeira: o nome do suco caía na coluna do
    // posto e a árvore saía trocada, sem dar erro nenhum.
    const celulas = [];
    for (const c of m[1].matchAll(
      /<c\s+r="([A-Z]+)\d+"([^>]*)>\s*(?:<v>([\s\S]*?)<\/v>)?\s*<\/c>/g
    )) {
      let i = 0;
      for (const letra of c[1]) i = i * 26 + (letra.charCodeAt(0) - 64);
      celulas[i - 1] = c[3] == null ? '' : /\st="s"/.test(c[2]) ? partilhadas[Number(c[3])] : c[3];
    }
    for (let i = 0; i < celulas.length; i++) if (celulas[i] === undefined) celulas[i] = '';
    linhas.push(celulas);
  }
  const cab = linhas[0];
  return linhas.slice(1).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}

const municipios = folha(2);
const postos = folha(3);
const sucos = folha(4);

// ── Montar a árvore ─────────────────────────────────────────────────
//
// A ligação faz-se pelo CÓDIGO e não pelo nome, porque os códigos são
// hierárquicos: TL03 é Baucau, TL0303 é o posto de Quelicai dentro dele, e
// TL030315 é um suco dentro desse posto. O prefixo diz sempre quem é o pai.
//
// Ligar por nome seria frágil — há postos e sucos com o mesmo nome em
// municípios diferentes, e bastava um acento diferente para partir tudo.
const arvore = new Map();
for (const m of municipios) {
  arvore.set(m.adm1_pcode, { id: m.adm1_pcode, nome: m.adm1_name, postos: new Map() });
}
for (const p of postos) {
  const mun = arvore.get(p.adm2_pcode.slice(0, 4));
  if (mun) mun.postos.set(p.adm2_pcode, { id: p.adm2_pcode, nome: p.adm2_name, sucos: [] });
}
let orfaos = 0;
for (const s of sucos) {
  const mun = arvore.get(s.adm3_pcode.slice(0, 4));
  const posto = mun?.postos.get(s.adm3_pcode.slice(0, 6));
  if (posto) posto.sucos.push({ id: s.adm3_pcode, nome: s.adm3_name });
  else orfaos++;
}
if (orfaos) console.log(`  ⚠ ${orfaos} sucos sem posto correspondente`);

// ── Ataúro passa a município ────────────────────────────────────────
const dili = [...arvore.values()].find((m) => m.nome === 'Dili');
const atauro = [...(dili?.postos.values() ?? [])].find((p) => p.nome === 'Atauro');
if (atauro) {
  dili.postos.delete(atauro.id);
  arvore.set('TL14', {
    id: 'TL14',
    nome: 'Ataúro',
    // Como município, Ataúro tem um posto administrativo com o mesmo nome.
    postos: new Map([[atauro.id, { ...atauro, nome: 'Ataúro' }]]),
  });
}

const saida = {
  fonte: 'Humanitarian Data Exchange, COD-AB Timor-Leste (Nações Unidas)',
  gerado: new Date().toISOString().slice(0, 10),
  nota: 'Ataúro corrigido para município (Lei de 2022). Sucos do diploma de 2023 por acrescentar.',
  municipios: [...arvore.values()]
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      postos: [...m.postos.values()]
        .map((p) => ({ ...p, sucos: p.sucos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt')) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
};

fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 2) + '\n');

const nPostos = saida.municipios.reduce((s, m) => s + m.postos.length, 0);
const nSucos = saida.municipios.reduce((s, m) => s + m.postos.reduce((x, p) => x + p.sucos.length, 0), 0);
console.log(`  ✓ ${saida.municipios.length} municípios, ${nPostos} postos, ${nSucos} sucos`);
console.log(`  ✓ escrito em dados/administrativo.json`);
