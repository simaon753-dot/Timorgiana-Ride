// Todas as mensagens que o servidor manda à app têm tétum e inglês?
//
// Desde 15/09/2026 o servidor traduz as mensagens à saída (src/mensagens.js),
// usando o texto português como chave. Isso tem uma fraqueza: uma mensagem
// nova, ou uma vírgula mudada numa antiga, deixa de ter tradução e chega em
// português — sem erro nenhum, porque o português é a reserva. Este
// verificador lê o código como o código é escrito (a árvore sintáctica, com
// o @babel/parser) e confirma que cada mensagem tem as duas traduções.
//
// Lê:  { error: '…' }, erro('…') e new Error('…') — incluindo os dois ramos
// de um `cond ? '…' : '…'` e as partes variáveis de `…${x}…`, que viram {0}.
import { parse } from '@babel/parser';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENSAGENS, NOTIFICACOES, LINGUAS } from '../src/mensagens.js';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const ficheiros = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? ficheiros(p) : p.endsWith('.js') ? [p] : [];
  });

function textos(n) {
  if (!n) return [];
  if (n.type === 'StringLiteral') return [n.value];
  if (n.type === 'TemplateLiteral') {
    return [
      n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i}}` : '')).join(''),
    ];
  }
  if (n.type === 'ConditionalExpression') return [...textos(n.consequent), ...textos(n.alternate)];
  if (n.type === 'LogicalExpression') return [...textos(n.left), ...textos(n.right)];
  return [];
}

const noCodigo = new Map();
for (const f of ficheiros(SRC)) {
  if (f.endsWith('mensagens.js')) continue;
  const ast = parse(readFileSync(f, 'utf8'), { sourceType: 'module' });
  (function v(n) {
    if (!n || typeof n.type !== 'string') return;
    let alvo = null;
    if (n.type === 'ObjectProperty' && (n.key.name === 'error' || n.key.value === 'error'))
      alvo = n.value;
    if (n.type === 'CallExpression' && n.callee.name === 'erro') alvo = n.arguments[0];
    if (n.type === 'NewExpression' && n.callee.name === 'Error') alvo = n.arguments[0];
    for (const t of textos(alvo)) {
      if (/[a-zá-ú]/i.test(t) && !noCodigo.has(t)) noCodigo.set(t, relative(SRC, f));
    }
    for (const k of Object.keys(n)) {
      const x = n[k];
      if (Array.isArray(x)) x.forEach(v);
      else if (x && typeof x.type === 'string') v(x);
    }
  })(ast.program);
}

const problemas = [];
const marcadores = (s) => (String(s).match(/\{[a-zA-Z0-9]+\}/g) || []).sort().join(',');

for (const [t, f] of noCodigo) {
  if (!MENSAGENS[t]) problemas.push(`sem tradução [${f}]: «${t}»`);
}
for (const [k, v] of Object.entries(MENSAGENS)) {
  if (!Array.isArray(v) || v.length !== 2 || v.some((x) => typeof x !== 'string' || !x.trim())) {
    problemas.push(`tradução incompleta: «${k}»`);
  } else if (v.some((x) => marcadores(x) !== marcadores(k))) {
    problemas.push(`marcadores diferentes da chave: «${k}»`);
  }
}
for (const [k, v] of Object.entries(NOTIFICACOES)) {
  for (const l of LINGUAS) {
    if (typeof v[l] !== 'string' || !v[l].trim()) problemas.push(`notificação ${k}: falta ${l}`);
  }
  if (LINGUAS.some((l) => marcadores(v[l]) !== marcadores(v.pt))) {
    problemas.push(`notificação ${k}: marcadores diferentes entre línguas`);
  }
}

if (problemas.length) {
  console.error(`  ✗ mensagens do servidor (${problemas.length}):\n`);
  for (const p of problemas) console.error('    ' + p);
  process.exit(1);
}
const semUso = Object.keys(MENSAGENS).filter((k) => !noCodigo.has(k)).length;
console.log(
  `  ✓ ${noCodigo.size} mensagens do servidor e ${Object.keys(NOTIFICACOES).length} textos de notificação, todos em três línguas` +
    (semUso ? ` (${semUso} traduções já sem uso no código)` : '')
);
