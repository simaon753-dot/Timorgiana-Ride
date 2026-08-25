// Procura ganchos do React usados sem serem importados.
//
// Existe porque este erro NÃO é apanhado por nada do que eu usava:
// o `expo export` empacota sem se queixar e o Babel analisa sem erro —
// um nome que não existe só rebenta quando a linha corre. O ecrã do
// passageiro foi publicado assim, e só apareceu quando alguém o abriu.
//
//   node scripts/verificar-ganchos.mjs
import fs from 'node:fs';
import path from 'node:path';

const GANCHOS = ['useEffect','useState','useCallback','useMemo','useRef','useContext','useReducer','useLayoutEffect'];

function ficheiros(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? ficheiros(p) : p.endsWith('.js') ? [p] : [];
  });
}

let mau = 0;
for (const f of ficheiros('src').concat(['App.js'])) {
  const s = fs.readFileSync(f, 'utf8');
  const bloco = (s.match(/import React,?\s*\{([^}]*)\}\s*from 'react'/) || [])[1] || '';
  const importados = new Set(bloco.split(',').map((x) => x.trim()));
  for (const g of GANCHOS) {
    // A negativa atrás evita apanhar `React.useEffect(` e nomes maiores.
    if (new RegExp(`(?<![.\\w])${g}\\s*\\(`).test(s) && !importados.has(g)) {
      console.log(`  ✗ ${f}: usa ${g} sem o importar`);
      mau++;
    }
  }
}
console.log(mau ? `\n  ${mau} problema(s)` : '  ✓ nenhum gancho por importar');
process.exit(mau ? 1 : 0);
