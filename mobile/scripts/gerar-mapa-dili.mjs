// Gera assets/mapa/dili.pmtiles — o mapa de Díli que vai dentro da app.
//
// Correr quando o mapa estiver desactualizado (ruas novas, sítios novos).
// Precisa da ferramenta pmtiles: https://github.com/protomaps/go-pmtiles
//
//   node scripts/gerar-mapa-dili.mjs /caminho/para/pmtiles
//
// De onde vêm os dados:
//   Protomaps Basemap v4, derivado do OpenStreetMap, licença ODbL.
//   A atribuição "© OpenStreetMap" é OBRIGATÓRIA e está no canto do mapa
//   (ver .credito em OSMMap.js). Não a tirar.
//
// Porquê extrair em vez de descarregar tudo:
//   O ficheiro global tem 137 GB. A ferramenta lê só os pedaços da área
//   pedida, por intervalos de bytes, e produz 2,9 MB em menos de 20 s.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// Grande Díli: de Tibar (oeste) a Hera (este), do mar à serra.
const AREA = '125.45,-8.66,125.72,-8.46';

// 15 é o máximo que o mapa base tem. Cada nível a mais duplicaria o
// tamanho, e o desenho vectorial amplia para lá disso sem perder nitidez.
const ZOOM_MAX = 15;

const pmtiles = process.argv[2] || 'pmtiles';
const builds = await (await fetch('https://build-metadata.protomaps.dev/builds.json')).json();
const lista = Array.isArray(builds) ? builds : builds.builds;
const ultima = lista[lista.length - 1];
console.log(`versão global: ${ultima.key}  (${ultima.version}, ${(ultima.size / 1e9).toFixed(0)} GB)`);

fs.mkdirSync('assets/mapa', { recursive: true });
execFileSync(
  pmtiles,
  ['extract', `https://build.protomaps.com/${ultima.key}`, 'assets/mapa/dili.pmtiles',
   `--bbox=${AREA}`, `--maxzoom=${ZOOM_MAX}`],
  { stdio: 'inherit' }
);
const { size } = fs.statSync('assets/mapa/dili.pmtiles');
console.log(`\nassets/mapa/dili.pmtiles — ${(size / 1024 / 1024).toFixed(1)} MB`);
