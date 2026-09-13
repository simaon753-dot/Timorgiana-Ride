// O SQL DO SERVIDOR, ANALISADO PELO PRÓPRIO POSTGRES.
//
// PORQUE ISTO EXISTE, e a data importa: de 11 a 13/09/2026 nenhuma viagem se
// pedia, se via ou se aceitava. O RIDE_SELECT — a consulta de criar, da
// viagem activa, do histórico e da lista dos motoristas — tinha perdido uma
// vírgula e ganho outra. O /api/health não usa essa consulta e continuou
// verde; o Simão descobriu-o a testar, com "Erro no servidor. Tenta de novo."
//
// Nenhum verificador o podia apanhar: o SQL vive em template literals, e para
// o `node --check` é só texto. Este passo tira cada consulta da árvore
// sintáctica do JavaScript e entrega-a ao analisador do Postgres (libpg-query,
// o mesmo código C do servidor de base de dados, compilado para WASM).
//
// Correr: node scripts/verificar-sql.mjs [pasta]   (por omissão: src)

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const babel = require('@babel/parser');
const pg = require('libpg-query');

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', process.argv[2] || 'src');

if (pg.loadModule) await pg.loadModule();
const erroDe = async (sql) => {
  try {
    await pg.parse(sql);
    return null;
  } catch (e) {
    return e.message;
  }
};

// 0. O VERIFICADOR VERIFICA-SE A SI PRÓPRIO, em cada execução.
//
// Um verificador que dá vazio não prova nada enquanto não falhar num erro
// plantado. Este é o de 13/09, reduzido ao essencial: se o analisador o
// aceitar, o que diz sobre o resto não vale nada.
const plantado = 'SELECT a, b AS c\n  (SELECT 1) AS d,\n  FROM t';
if (!(await erroDe(plantado))) {
  console.error('  ✗ o analisador aceitou SQL partido — este verificador não está a funcionar');
  process.exit(1);
}

const EH_SQL = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\b/i;

// Um `${…}` pode estar no lugar de um valor, de um nome, de um número de
// parâmetro ou de uma cláusula inteira — e nenhuma substituição única serve a
// todos. Deduz-se pelo contexto quando se pode; o resto experimenta-se.
function variantes(no, consts) {
  const partes = [];
  const incognitas = [];
  no.quasis.forEach((q, i) => {
    partes.push(q.value.cooked);
    if (i >= no.expressions.length) return;
    const e = no.expressions[i];
    if (e.type === 'Identifier' && consts[e.name] != null) partes.push(consts[e.name]);
    else if (q.value.cooked.endsWith('$')) partes.push('1'); // $${n} — número de parâmetro
    else {
      incognitas.push(partes.length);
      partes.push(null);
    }
  });
  const k = incognitas.length;
  const opcoes = ['x_interp', ''];
  const combos = k <= 4 ? 2 ** k : 2;
  const saida = [];
  for (let c = 0; c < combos; c++) {
    const p = [...partes];
    incognitas.forEach((pos, j) => {
      p[pos] = k <= 4 ? opcoes[(c >> j) & 1] : opcoes[c];
    });
    saida.push(p.join(''));
  }
  return saida;
}

const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js')) ficheiros.push(p);
  }
})(raiz);

let total = 0;
const problemas = [];
for (const f of ficheiros) {
  const ast = babel.parse(readFileSync(f, 'utf8'), { sourceType: 'module' });
  const consts = {};
  const nos = [];
  (function visitar(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init?.type === 'TemplateLiteral') {
      consts[n.id.name] = variantes(n.init, consts)[0];
    }
    if (n.type === 'TemplateLiteral' || n.type === 'StringLiteral') nos.push(n);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visitar);
      else if (v && typeof v.type === 'string') visitar(v);
    }
  })(ast.program);

  for (const n of nos) {
    const vs = n.type === 'StringLiteral' ? [n.value] : variantes(n, consts);
    if (!EH_SQL.test(vs[0])) continue;
    total++;
    let primeiro = null;
    let alguma = false;
    for (const sql of vs) {
      const e = await erroDe(sql);
      if (!e) {
        alguma = true;
        break;
      }
      primeiro ??= e;
    }
    if (!alguma) problemas.push(`${relative(raiz, f)}:${n.loc.start.line} — ${primeiro}`);
  }
}

if (problemas.length) {
  console.error(`  ✗ ${problemas.length} consulta(s) SQL inválida(s):`);
  for (const p of problemas) console.error('     ' + p);
  process.exit(1);
}
console.log(`  ✓ ${total} consultas SQL analisam com o analisador do próprio Postgres`);
