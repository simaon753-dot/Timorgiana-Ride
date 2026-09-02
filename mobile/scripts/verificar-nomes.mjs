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
// ── e as cores do tema, que são nomes na mesma ──
//
// `colors.bg` não existe. O Babel não se queixa — é só o acesso a uma
// propriedade — e o React Native também não: `backgroundColor: undefined`
// desenha transparente e segue. Um fundo que devia ser cinzento fica
// invisível, e só se descobre olhando para o ecrã certo no telemóvel certo.
//
// Foi escrito depois de eu ter posto exactamente isso no painel, em
// 02/09/2026, e de nada nesta suite o ter apanhado.
//
// Importa o tema em vez de o ler como texto. A primeira tentativa fatiava o
// ficheiro à procura do objecto e encontrou duas cores em vez de vinte —
// deu uma lista de trezentos falsos positivos que quase me convenceu de que
// a app estava partida.
const { colors, PALETAS } = await import('../src/theme.js');
const CORES = new Set(Object.keys(colors));
for (const paleta of Object.values(PALETAS)) for (const c of Object.keys(paleta)) CORES.add(c);

for (const f of ficheiros('src').concat(['App.js'])) {
  if (f.endsWith('theme.js')) continue;
  const visto = new Set();
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bcolors\.([a-zA-Z][a-zA-Z0-9]*)/g)) {
    if (!CORES.has(m[1]) && !visto.has(m[1])) {
      visto.add(m[1]);
      console.log(`  ✗ ${f}: "colors.${m[1]}" não existe no tema — ficaria transparente`);
      mau++;
    }
  }
}

console.log(mau ? `\n  ${mau} nome(s) por resolver` : '  ✓ nenhum nome por resolver');
process.exit(mau ? 1 : 0);
