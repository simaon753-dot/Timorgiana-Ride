// Gera src/components/leafletEmbutido.js a partir do pacote instalado.
// Correr de novo só quando se actualizar a versão do Leaflet.
import fs from 'fs';
const V = JSON.parse(fs.readFileSync('node_modules/leaflet/package.json', 'utf8')).version;
const js = fs.readFileSync('node_modules/leaflet/dist/leaflet.js', 'utf8');
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
`;
fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync('src/components/leafletEmbutido.js', saida);
console.log(`  gerado: src/components/leafletEmbutido.js  (${Math.round(saida.length/1024)} KB)`);
