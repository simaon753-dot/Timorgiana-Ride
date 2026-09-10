// USAR UM VALOR ANTES DA LINHA QUE O CRIA.
//
// PORQUE EXISTE. Um motorista aceitou uma viagem e o ecrã dele continuou a
// dizer "Sem pedidos de momento". O passageiro via tudo — nome, matrícula,
// código —; o motorista não via nada e não sabia para onde ir.
//
// A causa: no DriverHomeScreen, o `useRides()` estava DEPOIS das linhas que
// usavam o que ele devolve. Em JavaScript, ler uma `const` antes da linha que
// a cria é um erro que rebenta — mas o empacotador do React Native converte
// `const` em `var` ao compilar, e aí não rebenta: passa a valer `undefined`,
// em silêncio.
//
// O ecrã desenhava-se na perfeição. A viagem valia sempre `undefined`, logo a
// viagem activa era sempre nula, em todos os desenhos. Não era intermitente
// nem dependia da rede: nunca podia funcionar. E nada no ecrã dizia que havia
// um erro, porque para o JavaScript não havia — `undefined && x` é uma
// expressão perfeitamente válida.
//
// Foi preciso um motorista a sério, a olhar para um ecrã vazio, para
// aparecer. É exactamente o tipo de defeito que um verificador deve apanhar:
// invisível a ler, invisível a correr, e só visível a quem está a trabalhar.
//
// PORQUE COM UM ANALISADOR E NÃO COM PROCURA DE TEXTO. A primeira tentativa
// foi procurar nomes linha a linha, e marcou dezenas de falsos alarmes: o `t`
// de cada sub-componente do mesmo ficheiro parecia estar a ser usado antes de
// existir, quando na verdade cada função tem o seu. Sem perceber onde começa
// e acaba cada função, a resposta é ruído — e um verificador que grita por
// tudo ensina-se a ignorar.
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
// fileURLToPath e não url.pathname: o projecto vive numa pasta com um
// espaço no nome ("Claude Code"), e o pathname devolve-o como %20.
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

async function ficheiros(dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) saida.push(...(await ficheiros(caminho)));
    else if (e.name.endsWith('.js')) saida.push(caminho);
  }
  return saida;
}

const problemas = [];

for (const caminho of await ficheiros(RAIZ)) {
  const codigo = readFileSync(caminho, 'utf8');
  let ast;
  try {
    ast = parse(codigo, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (e) {
    problemas.push({ caminho, msg: `não foi possível analisar: ${e.message}` });
    continue;
  }

  traverse(ast, {
    // Cada referência a um nome: o Babel diz-nos a que declaração pertence,
    // e é isso que resolve o problema dos âmbitos. Duas funções com um `t`
    // cada uma têm duas ligações diferentes, e nunca se confundem.
    ReferencedIdentifier(caminhoNo) {
      const nome = caminhoNo.node.name;
      const ligacao = caminhoNo.scope.getBinding(nome);
      if (!ligacao) return;
      // Só const/let (que têm zona morta). `var` e funções são içados de
      // propósito pela linguagem e usá-los antes é legítimo.
      if (ligacao.kind !== 'const' && ligacao.kind !== 'let') return;

      const linhaDecl = ligacao.path.node.loc?.start.line;
      const linhaUso = caminhoNo.node.loc?.start.line;
      if (!linhaDecl || !linhaUso || linhaUso >= linhaDecl) return;

      // Dentro de uma função criada ANTES mas chamada DEPOIS não há problema:
      // quando ela correr, o valor já existe. É o caso normal de um
      // `useCallback` ou de um manipulador de evento.
      const funcaoDoUso = caminhoNo.getFunctionParent();
      const funcaoDaDecl = ligacao.path.getFunctionParent();
      if (funcaoDoUso !== funcaoDaDecl) return;

      problemas.push({
        caminho,
        msg: `"${nome}" é usado na linha ${linhaUso}, mas só é criado na linha ${linhaDecl}`,
      });
    },
  });
}

if (problemas.length) {
  console.error('  ✗ valores usados antes da linha que os cria:\n');
  for (const p of problemas) {
    console.error(`    ${relative(process.cwd(), p.caminho)}: ${p.msg}`);
  }
  console.error(
    '\n    Isto não rebenta: o empacotador transforma `const` em `var` e o valor\n' +
      '    fica `undefined` em silêncio. Mova a declaração para antes de quem a usa.'
  );
  process.exit(1);
}

console.log('  ✓ nenhum valor usado antes de existir');
