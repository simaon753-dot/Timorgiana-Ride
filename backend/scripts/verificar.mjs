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
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const ficheiros = [];
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) andar(p);
    else if (n.endsWith('.js') || n.endsWith('.mjs')) ficheiros.push(p);
  }
})('src');

// OS GUIÕES TAMBÉM. Ficaram de fora até 06/09/2026, e a falta apareceu no
// pior momento possível: a meio de um ensaio com o Simão à espera, a mexer
// no guião do motorista de teste. Só não rebentou porque me lembrei de
// correr o `node --check` à mão — e lembrar-se não é um verificador.
//
// Um guião partido não estraga a produção, mas estraga o ensaio; e o ensaio
// é o que nos diz se a produção está boa.
(function andar(d) {
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) continue;
    if (n === 'verificar.mjs') continue; // é este
    if (n.endsWith('.js') || n.endsWith('.mjs')) ficheiros.push(p);
  }
})('scripts');

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
    // Os guiões, ao serem importados, CORREM: abrem sockets, ligam-se à
    // base, entram ao serviço. Para eles a análise chega — é o que apanha a
    // crase perdida, que foi o defeito que criou este verificador.
    if (f.startsWith('scripts/')) continue;
    try {
      await import(`../${f}`);
    } catch (e) {
      problemas.push(`${f} — não carrega: ${e.message.split('\n')[0]}`);
    }
  }
}

// 3. Os nomes importados existem mesmo do outro lado?
//
//    Isto existe por causa dos ficheiros que o passo 2 salta. O `server.js`
//    liga-se à base e abre porta, por isso não pode ser importado aqui — e é
//    justamente o ficheiro que mais se mexe. Já passou por aqui um
//    `findUserById` importado de um sítio que não o exportava: 38 ficheiros
//    deram verde e o servidor rebentou no arranque.
//
//    Não substitui o carregamento a sério; lê o texto. Mas apanha o erro que o
//    carregamento apanharia se pudesse correr, que é o que interessa.
if (!problemas.length) {
  const conteudo = new Map(ficheiros.map((f) => [f, readFileSync(f, 'utf8')]));
  const IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g;

  for (const [f, texto] of conteudo) {
    for (const m of texto.matchAll(IMPORT)) {
      const alvo = resolve(dirname(f), m[2]).replace(process.cwd() + '/', '');
      const dele = conteudo.get(alvo);
      if (!dele) continue; // fora do projecto, ou já apanhado pelo passo 2

      for (const bruto of m[1].split(',')) {
        // `x as y` — o que tem de existir do outro lado é o x.
        const nome = bruto
          .trim()
          .split(/\s+as\s+/)[0]
          .trim();
        if (!nome) continue;
        const exporta = new RegExp(
          `export\\s+(async\\s+)?(function|const|let|var|class)\\s+${nome}\\b` +
            `|export\\s*\\{[^}]*\\b${nome}\\b`
        );
        if (!exporta.test(dele)) {
          problemas.push(`${f} — importa "${nome}" de ${m[2]}, que não o exporta`);
        }
      }
    }
  }
}

// 4. As páginas legais públicas dizem o mesmo que a app?
//
//    O Google Play exige um endereço público para a política de privacidade, e
//    essas páginas são geradas do texto da aplicação. Se alguém alterar uma
//    cláusula e não voltar a gerar, o público fica a ler uma versão e quem
//    instala a app lê outra — e num documento legal duas versões diferentes
//    são piores do que uma só, porque ninguém sabe qual vale.
if (!problemas.length) {
  try {
    const { gerarPaginas } = await import('./gerar-legal.mjs');
    for (const [nome, esperado] of Object.entries(gerarPaginas())) {
      const caminho = 'publico/' + nome;
      const actual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null;
      if (actual !== esperado) {
        problemas.push(`${caminho} está desactualizado — corre \`node scripts/gerar-legal.mjs\``);
      }
    }
  } catch (e) {
    problemas.push(`não foi possível conferir as páginas legais: ${e.message}`);
  }
}

if (problemas.length) {
  console.error('  ✗ o servidor não está bom:\n');
  for (const p of problemas) console.error('    ' + p);
  process.exit(1);
}
console.log(
  `  ✓ ${ficheiros.length} ficheiros analisam, os de src/ carregam,` +
    ` e os nomes importados existem do outro lado`
);
