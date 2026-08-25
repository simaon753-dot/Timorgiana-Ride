// Gera src/components/leafletEmbutido.js a partir do pacote instalado.
// Correr de novo só quando se actualizar a versão do Leaflet.
import fs from 'fs';
const V = JSON.parse(fs.readFileSync('node_modules/leaflet/package.json', 'utf8')).version;
const js = fs.readFileSync('node_modules/leaflet/dist/leaflet.js', 'utf8');
const pm = fs.readFileSync('node_modules/protomaps-leaflet/dist/protomaps-leaflet.js', 'utf8');
const pmV = JSON.parse(fs.readFileSync('node_modules/protomaps-leaflet/package.json', 'utf8')).version;
const css = fs.readFileSync('node_modules/leaflet/dist/leaflet.css', 'utf8');

// O CSS refere imagens (marker-icon.png, etc.) por caminho relativo. Não
// as usamos — os marcadores são divIcon com emoji — e sem servidor de
// ficheiros esses caminhos dariam 404 dentro do WebView.
const cssLimpo = css.replace(/url\([^)]*\)/g, 'none');

const saida = `// GERADO — não editar à mão.
// Leaflet ${V}, embutido na aplicação em vez de ir buscá-lo ao unpkg.com.
//
// Antes o mapa carregava 44 KB do unpkg de CADA vez que abria. Em Díli
// isso não é só lento: se o unpkg estiver inacessível, o mapa NUNCA
// aparece, por mais que se espere — e não há forma de o utilizador
// perceber porquê.
//
// Embutido, custa zero bytes de rede para sempre, e o mapa abre mesmo
// sem internet nenhuma (fica só sem os mosaicos).
//
// Para actualizar: npm i leaflet@<versao> && node scripts/gerar-leaflet.mjs
//
// Leaflet é distribuído sob a licença BSD de 2 cláusulas.
// Copyright (c) 2010-2023, Volodymyr Agafonkin
// Copyright (c) 2010-2011, CloudMade

export const LEAFLET_VERSAO = ${JSON.stringify(V)};
export const LEAFLET_CSS = ${JSON.stringify(cssLimpo)};
export const LEAFLET_JS = ${JSON.stringify(js)};

// protomaps-leaflet ${pmV} — desenha mosaicos VECTORIAIS sobre o Leaflet.
//
// É o que permite o mapa de Díli funcionar sem rede: os mosaicos
// vectoriais descrevem as formas em vez de as desenhar, e por isso a
// cidade inteira até ao zoom 15 cabe em 2,9 MB em vez dos 40 MB que
// custaria em imagens.
//
// Este ficheiro traz o descodificador PMTiles lá dentro — não é preciso
// mais nada.
export const PROTOMAPS_JS = ${JSON.stringify(pm)};
`;
fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync('src/components/leafletEmbutido.js', saida);
console.log(`  gerado: src/components/leafletEmbutido.js  (${Math.round(saida.length/1024)} KB)`);
