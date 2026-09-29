// Prova quando os pontos de paragem aparecem e somem com o zoom, sem
// telemóvel. Ver `src/lib/visibilidadeParagens.js`.
//
//   node scripts/testar-visibilidade-paragens.mjs
import {
  zoomDaRegiao,
  paragensAVista,
  ZOOM_MIN_PARAGENS,
  FOLGA_ZOOM,
} from '../src/lib/visibilidadeParagens.js';

let falhas = 0;
function confirma(nome, cond) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nome}`);
  if (!cond) falhas++;
}

const LARGURA = 402; // pontos: o iPhone 17 do simulador
// A região que dá um certo zoom com esta largura.
const regiaoNoZoom = (z) => ({
  latitude: -8.55,
  longitude: 125.57,
  latitudeDelta: (360 * LARGURA) / (256 * 2 ** z),
  longitudeDelta: (360 * LARGURA) / (256 * 2 ** z),
});

// 1. A conta do zoom é a do Google.
const z = zoomDaRegiao(regiaoNoZoom(15.5), LARGURA);
confirma('zoomDaRegiao devolve o zoom de que a região foi feita', Math.abs(z - 15.5) < 1e-9);
confirma(
  'a vista de escolher um ponto (0,006 graus) fica por volta de 16,5',
  Math.abs(zoomDaRegiao({ longitudeDelta: 0.006 }, LARGURA) - 16.5) < 0.6
);

// 2. Cidade inteira: sem pontos. Ruas: com pontos.
confirma('zoom 13 (a cidade): escondidos', !paragensAVista(13, false));
confirma('zoom 15 (intermédio): continuam escondidos', !paragensAVista(15, false));
confirma(
  `zoom ${ZOOM_MIN_PARAGENS} (o limite): aparecem`,
  paragensAVista(ZOOM_MIN_PARAGENS, false)
);
confirma('zoom 18 (as ruas): aparecem', paragensAVista(18, false));

// 3. A folga: quem os estava a ver não os perde logo abaixo do limite.
const quase = ZOOM_MIN_PARAGENS - FOLGA_ZOOM / 2;
confirma('um pouco abaixo do limite, vindo de perto: continuam', paragensAVista(quase, true));
confirma('o mesmo zoom, vindo de longe: não aparecem', !paragensAVista(quase, false));
confirma(
  'abaixo da folga, vindo de perto: somem',
  !paragensAVista(ZOOM_MIN_PARAGENS - FOLGA_ZOOM - 0.01, true)
);

// 4. Sem medida não se inventa: escondidos, e sem rebentar.
confirma('sem largura: zoom null', zoomDaRegiao(regiaoNoZoom(17), 0) === null);
confirma('sem região: zoom null', zoomDaRegiao(null, LARGURA) === null);
confirma('zoom null: escondidos', !paragensAVista(null, true));

// 5. Rápido: um milhão de decisões, que é muito mais do que um gesto pede.
const t = performance.now();
let v = false;
for (let i = 0; i < 1e6; i++)
  v = paragensAVista(zoomDaRegiao(regiaoNoZoom(14 + (i % 5)), LARGURA), v);
const ms = performance.now() - t;
confirma(`um milhão de decisões em ${ms.toFixed(0)} ms (menos de 1 s)`, ms < 1000);

if (falhas) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\ntudo certo');
