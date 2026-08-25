// Procura nomes usados sem existirem no ficheiro.
//
// Existe porque publiquei DUAS vezes seguidas um erro deste tipo —
// `useEffect` e depois `token` — e nenhuma das minhas verificações o
// apanhou: o Babel analisa sem erro e o `expo export` empacota sem se
// queixar, porque sintacticamente está tudo certo. Um nome que não
// existe só rebenta quando a linha corre.
//
//   node scripts/verificar-nomes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parseSync, traverse } from '@babel/core';

function ficheiros(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? ficheiros(p) : p.endsWith('.js') ? [p] : [];
  });
}

// Nomes que existem sem serem declarados no ficheiro.
const AMBIENTE = new Set([
  'console','setTimeout','clearTimeout','setInterval','clearInterval','fetch','Promise',
  'JSON','Math','Date','Number','String','Boolean','Array','Object','Error','Map','Set',
  'RegExp','Intl','URL','URLSearchParams','AbortController','Response','Request','Headers',
  'globalThis','process','require','module','exports','__DEV__','isNaN','parseInt','parseFloat',
  'encodeURIComponent','decodeURIComponent','Uint8Array','ArrayBuffer','FileReader','Blob','atob','btoa',
  'undefined','NaN','Infinity','isFinite','TextEncoder','TextDecoder','WeakMap','Symbol','Proxy','Reflect','BigInt',
]);

let mau = 0;
for (const f of ficheiros('src').concat(['App.js'])) {
  const ast = parseSync(fs.readFileSync(f, 'utf8'), {
    filename: f, babelrc: false, configFile: false, sourceType: 'module',
    plugins: [(await import('@babel/plugin-syntax-jsx')).default],
  });
  traverse(ast, {
    Program(caminho) {
      // `globals` do âmbito de topo lista tudo o que é usado sem ter sido
      // declarado nem importado neste ficheiro.
      for (const nome of Object.keys(caminho.scope.globals)) {
        if (!AMBIENTE.has(nome)) { console.log(`  ✗ ${f}: "${nome}" não está declarado nem importado`); mau++; }
      }
    },
  });
}
console.log(mau ? `\n  ${mau} nome(s) por resolver` : '  ✓ nenhum nome por resolver');
process.exit(mau ? 1 : 0);
