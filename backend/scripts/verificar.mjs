// O backend analisa e carrega?
//
// PORQUE ISTO EXISTE, e a data importa: em 02/09/2026 publiquei uma correcção
// com uma crase dentro de um template literal —
//
//     `UPDATE users
//        -- filtram por `role = 'driver'`     ← esta crase fecha a string
//
// O comentário SQL parecia inofensivo. Fechou a string de JavaScript, o
// ficheiro deixou de analisar, e a construção do Render FALHOU.
//
// E o pior não foi a falha: foi a maneira como ela se apresentou. O Render
// mantém a versão anterior a correr quando a construção falha, por isso o
// serviço continuou a responder, com saúde `ok`, na versão velha. Do lado de
// fora estava tudo bem. Só olhando para o número do commit no /api/health é
// que se via que a correcção não tinha chegado — e eu ia dizer ao Simão que
// estava publicada.
//
// O lado da app tinha cinco verificadores e o servidor não tinha nenhum.
// Corre antes de cada envio.
import { readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js') || n.endsWith('.mjs')) ficheiros.push(p);
  }
})('src');

const problemas = [];

// 1. Analisa? É o que apanha a crase perdida.
for (const f of ficheiros) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    const diz =
      String(e.stderr || e.message)
        .split('\n')
        .find((l) => l.includes('Error')) || 'erro de sintaxe';
    problemas.push(`${f} — ${diz.trim()}`);
  }
}

// 2. Carrega? Apanha importações para ficheiros que não existem e ciclos que
//    rebentam mesmo. Só se tenta se tudo analisar: importar um ficheiro
//    partido dá o mesmo erro outra vez, com mais ruído.
if (!problemas.length) {
  for (const f of ficheiros) {
    // O server.js abre porta e liga-se à base. Não é para importar aqui —
    // este verificador tem de correr sem rede e sem segredos.
    if (f.endsWith('/server.js') || f.endsWith('/db.js')) continue;
    try {
      await import(`../${f}`);
    } catch (e) {
      problemas.push(`${f} — não carrega: ${e.message.split('\n')[0]}`);
    }
  }
}

if (problemas.length) {
  console.error('  ✗ o servidor não está bom:\n');
  for (const p of problemas) console.error('    ' + p);
  process.exit(1);
}
console.log(`  ✓ ${ficheiros.length} ficheiros do servidor analisam e carregam`);
