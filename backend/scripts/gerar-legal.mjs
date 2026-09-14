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
import { createRequire } from 'node:module';

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

// A casca comum a todas as páginas legais.
function casca({ titulo, sub, versao, corpo, rodape }) {
  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)} — TimorgianaRide</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #FBF7F0; color: #1C2421;
         font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 72px; }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; color: #0E5C54; }
  .sub { color: #5A6B66; margin: 0 0 4px; }
  .versao { color: #8A9793; font-size: 14px; margin: 0 0 32px; }
  h2 { font-size: 19px; margin: 32px 0 8px; color: #0E5C54; }
  h3 { font-size: 17px; margin: 20px 0 6px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin: 0 0 6px; }
  .nota { background: #F3F0EA; border-left: 4px solid #0E5C54; padding: 10px 14px; font-style: italic; }
  .tabela { overflow-x: auto; margin: 4px 0 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; }
  th { background: #0E5C54; color: #fff; text-align: left; padding: 8px 10px; }
  td { padding: 8px 10px; border-bottom: 1px solid #E2DDD4; vertical-align: top; }
  footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #E2DDD4;
           color: #8A9793; font-size: 14px; }
  a { color: #0E5C54; }
</style>
</head>
<body>
<main>
  <h1>${escapar(titulo)}</h1>
  <p class="sub">${escapar(sub || '')}</p>
  <p class="versao">${escapar(versao || '')}</p>
${corpo}
  <footer>
    TimorgianaRide · Díli, Timor-Leste<br>
    ${rodape}
  </footer>
</main>
</body>
</html>
`;
}

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
  return casca({
    titulo: doc.titulo,
    sub: doc.subtitulo || subtitulo || '',
    versao: doc.atualizado || '',
    corpo: seccoes,
    rodape: 'Esta página é gerada a partir do mesmo texto que a aplicação mostra.',
  });
}

// ── OS REGULAMENTOS DE juridico/, em página pública ────────────────────
//
// Só a Política de Segurança dos Passageiros (juridico/d5-seguranca.js) é
// pública — decisão do Simão a 14/09/2026. O texto vive nesse ficheiro, que
// monta o Word com as peças do comum.js: artigo, parágrafo, alínea, tabela.
// Aqui as MESMAS chamadas montam HTML. Um ficheiro dá o Word e a página, e
// os dois não podem divergir — a mesma regra dos termos.
//
// O comum.js verdadeiro não se carrega: traz a biblioteca do Word, que o
// backend não tem. Troca-se no require.cache por peças que devolvem HTML; as
// constantes (empresa, morada, versão, seguro) lêem-se do próprio comum.js,
// para não existirem em dois sítios.
const JURIDICO = fileURLToPath(new URL('../../juridico/', import.meta.url));

function constantesDoComum() {
  const texto = readFileSync(JURIDICO + 'comum.js', 'utf8');
  const c = {};
  for (const m of texto.matchAll(/^const ([A-Z_]+) =\s*'([^']*)';/gm)) c[m[1]] = m[2];
  return c;
}

function pecasHtml() {
  const celula = (tag, c) => `<${tag}>${escapar(c)}</${tag}>`;
  return {
    ...constantesDoComum(),
    artigo: (n, t) => `<h2>${escapar(n)}&nbsp; ${escapar(t)}</h2>`,
    sub: (t) => `<h3>${escapar(t)}</h3>`,
    p: (t) => (String(t).trim() ? `<p>${escapar(t)}</p>` : ''),
    rico: (partes) =>
      `<p>${partes
        .map((x) => (Array.isArray(x) ? `<strong>${escapar(x[0])}</strong>` : escapar(x)))
        .join('')}</p>`,
    item: (t) => `<li>${escapar(t)}</li>`,
    nota: (t) => `<p class="nota">${escapar(t)}</p>`,
    tabela: (cab, linhas) =>
      `<div class="tabela"><table><thead><tr>${cab.map((c) => celula('th', c)).join('')}</tr></thead>` +
      `<tbody>${linhas.map((l) => `<tr>${l.map((c) => celula('td', c)).join('')}</tr>`).join('')}</tbody></table></div>`,
    assinaturas: () => '',
    documento: (nome, subt, filhos) => ({ nome, subt, filhos }),
  };
}

function regulamento(ficheiro) {
  const require = createRequire(JURIDICO + ficheiro);
  const comum = require.resolve('./comum.js');
  const alvo = require.resolve('./' + ficheiro);
  require.cache[comum] = { id: comum, filename: comum, loaded: true, exports: pecasHtml(), children: [] };
  delete require.cache[alvo];
  try {
    const { nome, subt, filhos } = require(alvo);
    // Alíneas seguidas formam uma lista.
    const corpo = filhos.filter(Boolean).join('\n').replace(/(?:<li>.*<\/li>\n?)+/g, (m) => `<ul>\n${m}</ul>\n`);
    return casca({
      titulo: nome,
      sub: subt,
      versao: '',
      corpo,
      rodape: 'Esta página é gerada a partir do mesmo texto do documento oficial.',
    });
  } finally {
    delete require.cache[comum];
    delete require.cache[alvo];
  }
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
    // Público desde 14/09/2026: quem pensa em conduzir lê as condições e os
    // preços da assinatura ANTES de instalar a app e de se registar.
    'termos-motorista.html': pagina(extrair('pt.js', 'termosMotorista')),
    // Pública desde 14/09/2026: gerada do mesmo ficheiro que faz o Word.
    'seguranca.html': regulamento('d5-seguranca.js'),
  };
}

// Só escreve quando é chamado à mão, não quando é importado.
if (process.argv[1] && process.argv[1].endsWith('gerar-legal.mjs')) {
  for (const [nome, html] of Object.entries(gerarPaginas())) {
    writeFileSync(RAIZ + 'publico/' + nome, html);
  }
  console.log('  ✓ ' + Object.keys(gerarPaginas()).map((n) => 'publico/' + n).join(', ') + ' gerados da app');
}
