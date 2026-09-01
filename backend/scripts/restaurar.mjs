// Restaurar uma cópia de segurança, sem instalar nada.
//
// Usa o `node` e o pacote `pg` que já estão no projecto. Não precisa do
// psql, que não vem com o macOS — uma cópia que obriga a instalar
// ferramentas não serve para o dia em que fizer falta.
//
// COMO SE USA:
//
//   1. Decifrar a cópia descarregada do GitHub:
//
//        openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
//          -in timorgianaride-AAAA-MM-DD.sql.gz.enc | gunzip > copia.sql
//
//   2. Restaurar para um branch NOVO do Neon (nunca por cima do que está a
//      funcionar):
//
//        node scripts/restaurar.mjs copia.sql "LIGACAO_DO_BRANCH_NOVO"
//
// Sem o segundo argumento, o script recusa-se a correr. É de propósito: a
// falha mais cara possível aqui é restaurar por cima da base verdadeira por
// ter esquecido um parâmetro.

import fs from 'node:fs';
import pg from 'pg';

const [, , ficheiro, ligacao] = process.argv;

if (!ficheiro || !ligacao) {
  console.error(`
  Faltam argumentos.

    node scripts/restaurar.mjs <ficheiro.sql> <ligação-do-branch-novo>

  A ligação TEM de ser escrita à mão, e tem de ser a de um branch novo do
  Neon. Não se lê do .env de propósito: o .env aponta para a base a
  funcionar, e restaurar por cima dela apagava-a.
`);
  process.exit(1);
}

if (!fs.existsSync(ficheiro)) {
  console.error(`  O ficheiro ${ficheiro} não existe.`);
  process.exit(1);
}

const sql = fs.readFileSync(ficheiro, 'utf8');

// Um ficheiro decifrado com a senha errada não dá erro no openssl em todos
// os casos — pode sair lixo. Se não parecer SQL do pg_dump, é melhor parar
// aqui do que atirá-lo contra uma base de dados.
if (!/CREATE TABLE|SET statement_timeout|PostgreSQL database dump/i.test(sql.slice(0, 4000))) {
  console.error(`
  Isto não parece uma cópia do pg_dump.

  Ou a senha usada para decifrar estava errada, ou o ficheiro está
  incompleto. Não vale a pena continuar.
`);
  process.exit(1);
}

console.log(`  Ficheiro: ${ficheiro}  (${(sql.length / 1024 / 1024).toFixed(1)} MB)`);
console.log(`  Destino:  ${ligacao.replace(/:\/\/([^:]+):[^@]+@/, '://$1:•••••@')}`);
console.log();

const cliente = new pg.Client({ connectionString: ligacao, ssl: { rejectUnauthorized: false } });
await cliente.connect();

// Recusa-se a restaurar para uma base que já tenha dados. A ideia é sempre
// um branch novo e vazio; se houver lá alguma coisa, é sinal de que a
// ligação está errada — provavelmente a de produção.
const { rows } = await cliente.query(`
  SELECT COUNT(*)::int AS n FROM information_schema.tables
   WHERE table_schema = 'public'
`);
if (rows[0].n > 0) {
  console.error(`
  A base de destino JÁ TEM ${rows[0].n} tabelas.

  Este script só restaura para uma base vazia. Se puseste aqui a ligação da
  base a funcionar, foi por pouco.

  Cria um branch novo no Neon (Branches → Create branch) e usa a ligação
  desse.
`);
  await cliente.end();
  process.exit(1);
}

console.log('  A restaurar...');
const inicio = Date.now();
try {
  await cliente.query(sql);
} catch (e) {
  console.error(`\n  Falhou: ${e.message}\n`);
  await cliente.end();
  process.exit(1);
}
console.log(`  ✓ restaurado em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
console.log();

// O que interessa contar. Os dias em saldo vêm primeiro porque são o número
// que representa dinheiro: o que as pessoas pagaram e ainda não usaram.
const contas = [
  ['dias em saldo (pagos e por usar)', 'SELECT COALESCE(SUM(dias_saldo),0)::int AS n FROM users'],
  ['carregamentos', 'SELECT COUNT(*)::int AS n FROM carregamentos'],
  ['dias contados', 'SELECT COUNT(*)::int AS n FROM dias_contados'],
  ['contas', 'SELECT COUNT(*)::int AS n FROM users'],
  ['viagens', 'SELECT COUNT(*)::int AS n FROM rides'],
  ['documentos de motorista', 'SELECT COUNT(*)::int AS n FROM driver_documents'],
];
console.log('  ── o que ficou na base restaurada ──');
for (const [nome, q] of contas) {
  try {
    const r = await cliente.query(q);
    console.log(`  ${String(r.rows[0].n).padStart(6)}  ${nome}`);
  } catch {
    console.log(`       ?  ${nome}  (tabela não existe nesta cópia)`);
  }
}

await cliente.end();
console.log();
console.log('  Compara estes números com os da base a funcionar. Se baterem,');
console.log('  a cópia presta e o ensaio está feito.');
