// NOMES USADOS SEM EXISTIREM, no servidor.
//
// PORQUE ISTO EXISTE (13/09/2026): a cotação usava `TIPOS_VEICULO` sem o
// importar desde a fase 1 do Carry. Cada pedido de preço rebentava com
// ReferenceError, o servidor respondia 500, e a app ficava sem preço — o
// valor só era calculado ao criar a viagem, noutro ficheiro que importava a
// lista. Horas antes eu tinha corrigido o MESMO erro no admin.js, sem procurar
// nos outros ficheiros.
//
// Nada o apanhava: o `node --check` só vê sintaxe; o carregamento dos módulos
// não corre o corpo das funções; o verificador de importações confere que o
// que se importa existe do outro lado, não que o que se USA foi importado.
//
// Usa a análise de âmbito do Babel (`scope.globals`): tudo o que um ficheiro
// usa sem declarar nem importar. É o mesmo método do verificar-nomes da app,
// que existe pela mesma razão desde que publiquei `useEffect` e `token` sem
// existirem.
//
// Correr: node scripts/verificar-nomes.mjs [pasta]   (por omissão: src)

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { parse } = await import('@babel/parser');
const mod = await import('@babel/traverse');
const traverse = mod.default?.default ?? mod.default ?? mod.traverse;

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', process.argv[2] || 'src');

// O que o Node põe à disposição sem importar.
const AMBIENTE = new Set([
  'console', 'process', 'Buffer', 'globalThis', 'setTimeout', 'clearTimeout', 'setInterval',
  'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'structuredClone',
  'fetch', 'Request', 'Response', 'Headers', 'FormData', 'AbortController', 'AbortSignal',
  'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'Blob',
  'atob', 'btoa', 'Event', 'EventTarget', 'Promise', 'JSON', 'Math', 'Date', 'Number',
  'String', 'Boolean', 'Array', 'Object', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'BigInt', 'RegExp',
  'Intl', 'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'undefined', 'NaN', 'Infinity',
  'Uint8Array', 'ArrayBuffer', 'DataView', 'Int32Array', 'Float64Array',
]);

function naoDeclarados(codigo) {
  const ast = parse(codigo, { sourceType: 'module' });
  let nomes = [];
  traverse(ast, {
    Program(caminho) {
      nomes = Object.keys(caminho.scope.globals).filter((n) => !AMBIENTE.has(n));
    },
  });
  return nomes;
}

// O VERIFICADOR VERIFICA-SE A SI PRÓPRIO: um nome plantado tem de ser visto.
if (!naoDeclarados('export function f() { return NOME_PLANTADO.map((x) => x); }').includes('NOME_PLANTADO')) {
  console.error('  ✗ a análise de âmbito não viu um nome plantado — este verificador não está a funcionar');
  process.exit(1);
}

const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js')) ficheiros.push(p);
  }
})(raiz);

const problemas = [];
for (const f of ficheiros) {
  for (const nome of naoDeclarados(readFileSync(f, 'utf8'))) {
    problemas.push(`${relative(raiz, f)}: "${nome}" é usado mas não está declarado nem importado`);
  }
}
if (problemas.length) {
  console.error(`  ✗ ${problemas.length} nome(s) por resolver:`);
  for (const p of problemas) console.error('     ' + p);
  process.exit(1);
}
console.log(`  ✓ ${ficheiros.length} ficheiros sem nomes por resolver`);
