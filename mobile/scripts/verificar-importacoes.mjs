// Confere que cada nome importado de um ficheiro nosso existe mesmo lá.
//
// Porquê um verificador só para isto: importar um nome que não existe NÃO
// é erro em JavaScript. O nome fica `undefined` e só rebenta na linha que
// o usa — que pode ser dentro de um ecrã que só se abre a clicar num
// botão. Foi assim que o registo parou: o ecrã de entrada carregava bem e
// a app só caía ao navegar.
//
// O `verificar-nomes.mjs` não apanha isto: ali o nome ESTÁ declarado (é um
// import). O que falta é confirmar o outro lado do fio.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { parse } from '@babel/parser';

const RAIZ = 'src';
const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js')) ficheiros.push(p);
  }
})(RAIZ);

const arvore = (p) =>
  parse(readFileSync(p, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'objectRestSpread'],
  });

// O que cada ficheiro exporta, seguindo `export * from` até ao fim.
const cacheExp = new Map();
function exportados(p, vistos = new Set()) {
  if (cacheExp.has(p)) return cacheExp.get(p);
  if (vistos.has(p)) return new Set();
  vistos.add(p);
  const nomes = new Set();
  let corpo;
  try {
    corpo = arvore(p).program.body;
  } catch {
    return nomes; // ficheiro que não parseia: o parser normal já se queixa
  }
  for (const n of corpo) {
    if (n.type === 'ExportDefaultDeclaration') nomes.add('default');
    else if (n.type === 'ExportNamedDeclaration') {
      for (const e of n.specifiers) nomes.add(e.exported.name);
      const d = n.declaration;
      if (!d) continue;
      if (d.id) nomes.add(d.id.name);
      for (const dec of d.declarations ?? []) {
        if (dec.id.type === 'Identifier') nomes.add(dec.id.name);
        // export const { a, b } = ...
        for (const pr of dec.id.properties ?? []) if (pr.key) nomes.add(pr.key.name);
      }
    } else if (n.type === 'ExportAllDeclaration' && n.source.value.startsWith('.')) {
      for (const x of exportados(resolve(dirname(p), n.source.value), vistos)) nomes.add(x);
    }
  }
  cacheExp.set(p, nomes);
  return nomes;
}

const faltas = [];
for (const f of ficheiros) {
  let corpo;
  try {
    corpo = arvore(f).program.body;
  } catch (e) {
    faltas.push(`${f}: não parseia — ${e.message}`);
    continue;
  }
  for (const n of corpo) {
    if (n.type !== 'ImportDeclaration') continue;
    const orig = n.source.value;
    if (!orig.startsWith('.')) continue; // pacotes: fora do nosso alcance
    const alvo = resolve(dirname(f), orig);
    let tem;
    try {
      statSync(alvo);
      tem = exportados(alvo);
    } catch {
      faltas.push(`${relative('.', f)} importa de "${orig}" — ficheiro não existe`);
      continue;
    }
    for (const e of n.specifiers) {
      const nome =
        e.type === 'ImportDefaultSpecifier'
          ? 'default'
          : e.type === 'ImportNamespaceSpecifier'
            ? null
            : e.imported.name;
      if (nome && !tem.has(nome))
        faltas.push(`${relative('.', f)}: "${nome}" não é exportado por ${orig}`);
    }
  }
}

if (faltas.length) {
  console.error('  ✗ importações por resolver:\n');
  for (const l of faltas) console.error('    ' + l);
  process.exit(1);
}
console.log('  ✓ todas as importações resolvem');
