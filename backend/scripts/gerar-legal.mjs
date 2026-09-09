// Gera as páginas públicas dos documentos legais, a partir do texto DA APP.
//
// PORQUE EXISTE. O Google Play exige um endereço público para a política de
// privacidade — o texto dentro da aplicação não serve. É um requisito de
// publicação, e sem ele a submissão é recusada.
//
// O TEXTO NÃO SE COPIA, GERA-SE. Escrever uma segunda cópia das cláusulas num
// ficheiro HTML era garantir que um dia divergiam: alterava-se a app e a
// página pública ficava a dizer outra coisa — e num documento legal duas
// versões diferentes são piores do que uma só, porque ninguém sabe qual vale.
//
// Já aconteceu neste projecto por menos: o campo `aceitarCurto` desapareceu
// dos termos ao regenerá-los e partiu o ecrã de registo durante semanas.
//
// Correr:  node scripts/gerar-legal.mjs
// Escreve: publico/privacidade.html, publico/termos.html
//
// O `npm run verificar` confere que o que está escrito corresponde ao texto
// actual da app. Se alguém mudar as cláusulas e não correr isto, a publicação
// pára — que é melhor do que publicar uma versão velha.

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const APP = fileURLToPath(new URL('../../mobile/src/termos/', import.meta.url));

// Lê os documentos sem importar os módulos: o backend não partilha as
// dependências da app, e um `import` traria React atrás.
function extrair(ficheiro, nome) {
  const texto = readFileSync(APP + ficheiro, 'utf8');
  // Com ou sem `export`: os termos exportam o objecto, a privacidade guarda-o
  // num `const` interno e exporta só a função que escolhe a língua.
  const marca = new RegExp(`^(?:export )?const ${nome} = \\{`, 'm');
  const achado = marca.exec(texto);
  if (!achado) throw new Error(`não encontrei ${nome} em ${ficheiro}`);
  const inicio = achado.index;
  // Do início do objecto até à chaveta que o fecha na coluna zero.
  const abre = texto.indexOf('{', inicio);
  const fecha = texto.indexOf('\n};', abre);
  if (fecha < 0) throw new Error(`${nome} não fecha em ${ficheiro}`);
  const corpo = texto.slice(abre, fecha + 2);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${corpo}`)();
}

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// O ** do texto marca a parte clicável na app. Aqui vira negrito.
const negrito = (t) => escapar(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function pagina(doc, subtitulo) {
  const seccoes = doc.seccoes
    .map(
      (s) =>
        `<section><h2>${escapar(s.titulo)}</h2>` +
        s.texto
          .split('\n\n')
          .map((p) => `<p>${negrito(p).replace(/\n/g, '<br>')}</p>`)
          .join('\n') +
        `</section>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(doc.titulo)} — TimorgianaRide</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #FBF7F0; color: #1C2421;
         font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 72px; }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; color: #0E5C54; }
  .sub { color: #5A6B66; margin: 0 0 4px; }
  .versao { color: #8A9793; font-size: 14px; margin: 0 0 32px; }
  h2 { font-size: 19px; margin: 32px 0 8px; color: #0E5C54; }
  p { margin: 0 0 12px; }
  footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #E2DDD4;
           color: #8A9793; font-size: 14px; }
  a { color: #0E5C54; }
</style>
</head>
<body>
<main>
  <h1>${escapar(doc.titulo)}</h1>
  <p class="sub">${escapar(doc.subtitulo || subtitulo || '')}</p>
  <p class="versao">${escapar(doc.atualizado || '')}</p>
${seccoes}
  <footer>
    TimorgianaRide · Díli, Timor-Leste<br>
    Esta página é gerada a partir do mesmo texto que a aplicação mostra.
  </footer>
</main>
</body>
</html>
`;
}

// A privacidade tem os três idiomas em `const pt/tet/en`; publicamos o
// português, que é a língua oficial dos documentos legais em Timor-Leste.
// Exportada para o verificador poder gerar SEM escrever, e comparar com o
// que está no disco. Sem isto, alterar as cláusulas na app e esquecer de
// correr este guião deixava a página pública a dizer outra coisa — e num
// documento legal duas versões são piores do que uma.
export function gerarPaginas() {
  return {
    'privacidade.html': pagina(extrair('privacidade.js', 'pt')),
    'termos.html': pagina(extrair('pt.js', 'termosPassageiro')),
  };
}

// Só escreve quando é chamado à mão, não quando é importado.
if (process.argv[1] && process.argv[1].endsWith('gerar-legal.mjs')) {
  for (const [nome, html] of Object.entries(gerarPaginas())) {
    writeFileSync(RAIZ + 'publico/' + nome, html);
  }
  console.log('  ✓ publico/privacidade.html e publico/termos.html gerados da app');
}
