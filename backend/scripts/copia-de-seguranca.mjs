// CÓPIA DE SEGURANÇA DA BASE DE DADOS, num ficheiro que a empresa guarda.
//
// PORQUE EXISTE. As contas, as viagens, os documentos dos motoristas e o
// registo de eventos vivem num sítio só — um projecto do Neon numa conta
// pessoal. O código não corre esse risco: está no GitHub, no Mac, e o
// repositório é público. Os dados não têm segunda cópia em lado nenhum.
//
// Transferir a titularidade da conta protege contra UM cenário: o dono sair.
// Um ficheiro guardado pela empresa protege contra TODOS — a conta perdida, o
// Neon a fechar, um comando errado numa madrugada.
//
// SÓ OS DADOS, NÃO O ESQUEMA. As tabelas são criadas pelo `initSchema()` no
// arranque do servidor, e é ele a fonte da verdade da forma delas. Guardar
// aqui uma segunda descrição do esquema seria criar duas versões que um dia
// divergem — e no dia do restauro ninguém sabe qual vale.
//
// A ORDEM DAS TABELAS é calculada das chaves estrangeiras, não escrita à mão.
// Uma lista à mão fica errada na primeira tabela nova que alguém acrescentar,
// e o erro só aparece no dia em que for preciso restaurar.
//
// Correr:  node scripts/copia-de-seguranca.mjs [ficheiro.sql]
// Restaurar: correr o servidor uma vez para criar as tabelas, depois
//            aplicar este ficheiro.

import 'dotenv/config';
import pg from 'pg';
import { writeFileSync } from 'node:fs';

const destino = process.argv[2] || `copia-${new Date().toISOString().slice(0, 10)}.sql`;

function valor(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  // Os documentos e as fotografias de turno. Hexadecimal é o que o PostgreSQL
  // aceita de volta sem interpretação nenhuma — texto seria adivinhar a
  // codificação de uma imagem.
  if (Buffer.isBuffer(v)) return `'\\x${v.toString('hex')}'`;
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `'${t.replace(/'/g, "''")}'`;
}

// A ordem em que as tabelas podem ser inseridas sem violar chaves
// estrangeiras: pais antes de filhos.
export async function ordemDasTabelas(c) {
  const tabelas = (
    await c.query(`SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)
  ).rows.map((r) => r.table_name);

  const ligacoes = (
    await c.query(`SELECT tc.table_name AS filho, ccu.table_name AS pai
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'`)
  ).rows;

  const pais = Object.fromEntries(tabelas.map((t) => [t, new Set()]));
  // Uma tabela que aponta para si própria (o `cancelled_by` das viagens) não
  // conta como dependência: ela é o seu próprio pai e nunca ficaria pronta.
  for (const { filho, pai } of ligacoes) if (filho !== pai) pais[filho].add(pai);

  const ordem = [];
  const feito = new Set();
  while (ordem.length < tabelas.length) {
    const antes = ordem.length;
    for (const t of tabelas) {
      if (!feito.has(t) && [...pais[t]].every((p) => feito.has(p))) {
        ordem.push(t);
        feito.add(t);
      }
    }
    // Um ciclo entre tabelas travaria isto para sempre. Não temos nenhum, mas
    // se um dia houver, é melhor uma cópia com ordem imperfeita do que um
    // guião que nunca acaba e ninguém percebe porquê.
    if (ordem.length === antes) {
      for (const t of tabelas) if (!feito.has(t)) ordem.push(t);
      break;
    }
  }
  return ordem;
}

export async function gerarCopia(c) {
  const ordem = await ordemDasTabelas(c);
  const linhas = [
    '-- Cópia de segurança da TimorgianaRide',
    `-- ${new Date().toISOString()}`,
    '--',
    '-- Só dados. As tabelas são criadas pelo servidor ao arrancar (initSchema).',
    '-- Para restaurar: arrancar o servidor uma vez contra a base vazia, e',
    '-- depois aplicar este ficheiro.',
    '',
    'BEGIN;',
    '',
  ];
  const contagem = {};

  for (const tabela of ordem) {
    const { rows, fields } = await c.query(`SELECT * FROM "${tabela}"`);
    contagem[tabela] = rows.length;
    if (!rows.length) continue;
    const colunas = fields.map((f) => `"${f.name}"`).join(', ');
    linhas.push(`-- ${tabela}: ${rows.length} linha(s)`);
    for (const r of rows) {
      const vals = fields.map((f) => valor(r[f.name])).join(', ');
      linhas.push(`INSERT INTO "${tabela}" (${colunas}) VALUES (${vals});`);
    }
    linhas.push('');
  }

  // OS CONTADORES DAS CHAVES, e sem isto o restauro parece bem e parte a
  // seguir: as tabelas voltam com as linhas todas, mas o contador do `id`
  // fica em 1 — e o primeiro registo novo choca com um id que já existe.
  linhas.push('-- Repor os contadores das chaves automáticas');
  for (const tabela of ordem) {
    if (!contagem[tabela]) continue;
    const seq = (
      await c.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1
            AND column_default LIKE 'nextval%'`,
        [tabela]
      )
    ).rows;
    for (const { column_name } of seq) {
      linhas.push(
        `SELECT setval(pg_get_serial_sequence('${tabela}', '${column_name}'),` +
          ` COALESCE((SELECT MAX("${column_name}") FROM "${tabela}"), 1));`
      );
    }
  }

  linhas.push('', 'COMMIT;', '');
  return { sql: linhas.join('\n'), contagem, ordem };
}

if (process.argv[1] && process.argv[1].endsWith('copia-de-seguranca.mjs')) {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const { sql, contagem } = await gerarCopia(c);
  writeFileSync(destino, sql);
  await c.end();
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  console.log(`  ✓ ${destino}`);
  console.log(`    ${total} linhas em ${Object.keys(contagem).length} tabelas`);
  console.log(`    ${(sql.length / 1024 / 1024).toFixed(1)} MB`);
}
