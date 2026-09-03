// Emitir um código de recuperação a partir deste computador.
//
// PARA QUEM ISTO EXISTE: para o próprio Simão.
//
// A recuperação normal passa pelo painel: alguém com acesso de administrador
// emite um código e di-lo ao telefone. Mas se for O ADMINISTRADOR a esquecer
// a palavra-passe, não há ninguém acima dele — e enquanto for o único, a
// conta que aprova toda a gente ficaria perdida sem remédio.
//
// A saída é esta: quem tem o computador com o `.env` tem a ligação à base de
// dados, e quem tem a ligação à base de dados pode sempre repor o acesso. Não
// é uma porta nova — é a porta que já existia, com um nome.
//
//   node scripts/codigo-recuperacao.mjs 74192857
//
// Usa-se depois na app: Entrar → "Esqueci a palavra-passe".
import 'dotenv/config';
import { pool, one } from '../src/db.js';
import { emitirCodigo } from '../src/recuperacao.js';

const telefone = String(process.argv[2] || '').replace(/[\s()-]/g, '');
if (!telefone) {
  console.error(`
  Falta o número de telemóvel.

    node scripts/codigo-recuperacao.mjs 74192857
`);
  await pool.end();
  process.exit(1);
}

const u = await one('SELECT id, name FROM users WHERE phone = $1', [telefone]);
if (!u) {
  console.error(`\n  Não há nenhuma conta com o número ${telefone}.\n`);
  await pool.end();
  process.exit(1);
}

const r = await emitirCodigo(u.id);
console.log(`
  ${u.name}   ·   ${telefone}

      código:  ${r.codigo}

  Válido ${r.minutos} minutos, e serve uma vez só.

  Na app: Entrar → "Esqueci a palavra-passe".
  Escreve o número, este código, e escolhe a palavra-passe nova.
`);
await pool.end();
