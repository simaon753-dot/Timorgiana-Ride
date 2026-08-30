// Confere que cada t('chave') usada no código existe nas TRÊS línguas.
//
// Porquê: uma chave que não existe não dá erro. O `t()` devolve a própria
// chave, e o ecrã mostra "admFechar" em vez de "Fechar". Não rebenta, não
// aparece nos registos, e só se descobre quando alguém olha para o ecrã na
// língua certa — que no caso do tétum posso ser eu a nunca olhar.
//
// É a mesma família do campo que faltava nos termos: os dados existem, só
// lhes falta uma entrada. Nenhum verificador de código apanha isto.
import { readFileSync, readdirSync, statSync } from 'node:fs';

const LINGUAS = ['pt', 'tet', 'en'];

const dicionarios = {};
for (const l of LINGUAS) {
  const m = await import(`../src/i18n/${l}.js`);
  dicionarios[l] = m.default ?? m[Object.keys(m)[0]];
}

const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js') && !p.includes('/i18n/')) ficheiros.push(p);
  }
})('src');

// Só chaves escritas à mão. `t(variavel)` e `t('a' + b)` não se conseguem
// resolver aqui, e fingir que sim daria falsos positivos em catadupa.
const usadas = new Map();
for (const f of ficheiros) {
  const texto = readFileSync(f, 'utf8');
  for (const m of texto.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*[,)]/g)) {
    if (!usadas.has(m[1])) usadas.set(m[1], f);
  }
}

const faltas = [];
for (const [chave, ficheiro] of usadas) {
  const semChave = LINGUAS.filter((l) => dicionarios[l][chave] == null);
  if (semChave.length) faltas.push(`${chave} — falta em ${semChave.join(', ')}  (${ficheiro})`);
}

if (faltas.length) {
  console.error('  ✗ traduções em falta:\n');
  for (const l of faltas) console.error('    ' + l);
  process.exit(1);
}
console.log(`  ✓ ${usadas.size} chaves de tradução, todas nas três línguas`);
