// ATUALIZAR O MAPA DE TIMOR-LESTE com o OpenStreetMap mais recente
// (06/10/2026, pedido do Simão: «uma vez por mês»).
//
//   npm run atualizar-mapa          (em backend/)
//
// PORQUE EXISTE. O nosso mapa (o desenho que o painel mostra) e a rede de
// estradas (as rotas sem Google) são FOTOGRAFIAS do OpenStreetMap: o desenho
// de 07/09, a rede de 29/09. Uma rua corrigida no OpenStreetMap só chega aqui
// quando se refazem os dois — e eram seis passos à mão em dois LEIA-ME.
//
// O QUE FAZ, por esta ordem:
//   1. a ferramenta `pmtiles` (oficial da Protomaps), descarregada uma vez e
//      conferida pelo sha256 que o GitHub publica;
//   2. o desenho: recorta Timor-Leste do planeta que a Protomaps constrói
//      todos os dias (mesma caixa e zoom de 07/09, ver receita/LEIA-ME.md);
//   3. a rede: descarrega o recorte da Geofabrik e corre construir-rede.mjs;
//   4. CONFERE antes de trocar: um ficheiro que encolheu muito quer dizer um
//      download partido ou um recorte errado, e trocá-lo era estragar o mapa
//      que está a funcionar. Nesse caso pára e não toca em nada;
//   5. troca os dois ficheiros, guardando os antigos em receita/anterior/.
//
// NÃO PUBLICA. No fim diz o que mudou; publicar é commit + push (o Render
// atualiza sozinho). Dados © colaboradores do OpenStreetMap, ODbL.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const MAPA = path.join(AQUI, '..');
const FERRAMENTAS = path.join(MAPA, 'receita', 'ferramentas');
const ANTERIOR = path.join(MAPA, 'receita', 'anterior');
const OSM = path.join(MAPA, 'receita', 'osm');
const TMP = fs.mkdtempSync(path.join(MAPA, 'receita', '.novo-'));

const DESENHO = path.join(MAPA, 'publico', 'timor-leste.pmtiles');
const REDE = path.join(MAPA, 'rede', 'estradas-tl.bin');

// A caixa inclui Oecusse e Ataúro de propósito (receita/LEIA-ME.md).
const CAIXA = '123.85,-9.60,127.40,-8.05';
const ZOOM_MAXIMO = 15;

// Quanto um ficheiro novo pode encolher antes de se desconfiar dele. O
// OpenStreetMap de Timor-Leste cresce devagar; uma queda destas é avaria.
const ENCOLHE_NO_MAXIMO = { desenho: 0.85, rede: 0.9 };

const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
const hoje = new Date();
const aammdd = (d) => d.toISOString().slice(2, 10).replaceAll('-', '');
const aaaammdd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');

async function descarregar(url, destino) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(destino).size;
}

// 1. A ferramenta, conferida pelo sha256 que o GitHub dá de cada ficheiro.
async function ferramentaPmtiles() {
  const binario = path.join(FERRAMENTAS, 'pmtiles');
  if (fs.existsSync(binario)) return binario;
  console.log('· a descarregar a ferramenta pmtiles (só da primeira vez)…');
  const sistema = { darwin: 'Darwin', linux: 'Linux' }[process.platform];
  const cpu = { arm64: 'arm64', x64: 'x86_64' }[process.arch];
  if (!sistema || !cpu) throw new Error(`Sistema não previsto: ${process.platform}/${process.arch}`);
  const r = await fetch('https://api.github.com/repos/protomaps/go-pmtiles/releases/latest');
  if (!r.ok) throw new Error(`GitHub respondeu ${r.status} ao pedir a versão do pmtiles`);
  const versao = await r.json();
  const ficheiro = versao.assets.find((a) => a.name.includes(`_${sistema}_${cpu}.`));
  if (!ficheiro) throw new Error(`Não há pmtiles para ${sistema}/${cpu} na versão ${versao.tag_name}`);
  if (!/^sha256:[a-f0-9]{64}$/.test(ficheiro.digest ?? '')) {
    throw new Error('O GitHub não deu o sha256 do pmtiles; sem ele não se executa o ficheiro.');
  }
  fs.mkdirSync(FERRAMENTAS, { recursive: true });
  const arquivo = path.join(TMP, ficheiro.name);
  await descarregar(ficheiro.browser_download_url, arquivo);
  const soma = crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
  if (`sha256:${soma}` !== ficheiro.digest) throw new Error('O pmtiles descarregado não confere com o sha256 do GitHub.');
  if (arquivo.endsWith('.zip')) execFileSync('unzip', ['-o', '-q', arquivo, 'pmtiles', '-d', FERRAMENTAS]);
  else execFileSync('tar', ['-xzf', arquivo, '-C', FERRAMENTAS, 'pmtiles']);
  fs.chmodSync(binario, 0o755);
  console.log(`  ✓ pmtiles ${versao.tag_name}, sha256 conferido`);
  return binario;
}

// 2. O planeta mais recente da Protomaps (constroem um por dia; o de hoje
// pode ainda não existir).
async function planetaMaisRecente() {
  for (let dias = 0; dias < 10; dias++) {
    const d = new Date(hoje.getTime() - dias * 86_400_000);
    const url = `https://build.protomaps.com/${aaaammdd(d)}.pmtiles`;
    const r = await fetch(url, { method: 'HEAD' });
    if (r.ok) return { url, dia: aaaammdd(d) };
  }
  throw new Error('Nenhum planeta da Protomaps nos últimos 10 dias.');
}

function conferir(nome, novo, atual, limite) {
  const n = fs.statSync(novo).size;
  const a = fs.existsSync(atual) ? fs.statSync(atual).size : 0;
  const razao = a ? n / a : 1;
  console.log(`  ${nome}: ${mb(a)} → ${mb(n)} (${razao >= 1 ? '+' : ''}${((razao - 1) * 100).toFixed(1)}%)`);
  if (razao < limite) {
    throw new Error(`${nome} novo encolheu demasiado (${mb(n)} contra ${mb(a)}). Nada foi trocado.`);
  }
  return { antes: a, depois: n };
}

try {
  const pmtiles = await ferramentaPmtiles();

  const planeta = await planetaMaisRecente();
  console.log(`· a recortar Timor-Leste do planeta de ${planeta.dia}…`);
  const desenhoNovo = path.join(TMP, 'timor-leste.pmtiles');
  execFileSync(pmtiles, ['extract', planeta.url, desenhoNovo, `--bbox=${CAIXA}`, `--maxzoom=${ZOOM_MAXIMO}`], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  // Um recorte meio descarregado tem o tamanho certo mas não abre.
  execFileSync(pmtiles, ['verify', desenhoNovo], { stdio: 'ignore' });

  console.log('· a descarregar o recorte da Geofabrik…');
  fs.mkdirSync(OSM, { recursive: true });
  const pbf = path.join(OSM, `east-timor-${aammdd(hoje)}.osm.pbf`);
  console.log(`  ${mb(await descarregar('https://download.geofabrik.de/asia/east-timor-latest.osm.pbf', pbf))}`);

  console.log('· a construir a rede de estradas…');
  const redeNova = path.join(TMP, 'estradas-tl.bin');
  execFileSync(process.execPath, [path.join(AQUI, 'construir-rede.mjs'), pbf, redeNova], {
    stdio: 'inherit',
    cwd: path.join(MAPA, '..'),
  });

  console.log('· a conferir antes de trocar…');
  conferir('desenho', desenhoNovo, DESENHO, ENCOLHE_NO_MAXIMO.desenho);
  conferir('rede', redeNova, REDE, ENCOLHE_NO_MAXIMO.rede);

  // 5. Trocar, guardando os anteriores (fora do git) para voltar atrás.
  fs.mkdirSync(ANTERIOR, { recursive: true });
  for (const [novo, atual] of [[desenhoNovo, DESENHO], [redeNova, REDE]]) {
    if (fs.existsSync(atual)) fs.copyFileSync(atual, path.join(ANTERIOR, path.basename(atual)));
    fs.copyFileSync(novo, atual);
  }
  // Só o recorte mais recente fica: os antigos não servem para nada.
  for (const f of fs.readdirSync(OSM)) {
    if (f.endsWith('.osm.pbf') && path.join(OSM, f) !== pbf) fs.rmSync(path.join(OSM, f));
  }

  console.log(`
✓ Mapa atualizado: desenho do planeta de ${planeta.dia}, rede da Geofabrik de hoje.
  Os anteriores ficaram em backend/mapa/receita/anterior/.

  Para publicar (o Render atualiza sozinho):
    git add backend/mapa/publico/timor-leste.pmtiles backend/mapa/rede/estradas-tl.bin
    git commit -m "Mapa atualizado com o OpenStreetMap de ${planeta.dia}"
    git push
`);
} catch (erro) {
  console.error(`\n✗ ${erro.message}\n  O mapa que está a funcionar não foi tocado.`);
  process.exitCode = 1;
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
