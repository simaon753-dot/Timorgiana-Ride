// Prova quando os pontos de paragem aparecem e somem com o zoom, sem
// telemóvel. Ver `src/lib/visibilidadeParagens.js`.
//
//   node scripts/testar-visibilidade-paragens.mjs
import {
  zoomDaRegiao,
  paragensAVista,
  ZOOM_MIN_PARAGENS,
  FOLGA_ZOOM,
  paragensPertoDaMira,
  RAIO_PARAGENS_MIRA_M,
  FOLGA_RAIO_M,
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

// 6. SÓ AS PERTO DA MIRA. Três paragens ao longo de uma avenida, a 0, 200
//    e 600 m; a mira anda por ela.
const m = (norte) => ({ lat: -8.55 + norte / 110574, lng: 125.57 });
const avenida = [
  { id: 1, ...m(0) },
  { id: 2, ...m(200) },
  { id: 3, ...m(600) },
];
const vazio = new Set();
let perto = paragensPertoDaMira(m(0), avenida, vazio);
confirma(
  'mira na primeira: vêem-se a 1.ª e a 2.ª (200 m), não a 3.ª',
  perto.has(1) && perto.has(2) && !perto.has(3)
);
perto = paragensPertoDaMira(m(450), avenida, perto);
confirma(
  'mira arrastada para os 450 m: a 1.ª some, a 2.ª fica (250 m), a 3.ª aparece',
  !perto.has(1) && perto.has(2) && perto.has(3)
);
perto = paragensPertoDaMira(m(2000), avenida, perto);
confirma('mira noutra zona: nenhuma', perto.size === 0);

// 7. A folga do raio: quem estava dentro só sai além dela.
const naFronteira = m(RAIO_PARAGENS_MIRA_M + FOLGA_RAIO_M / 2);
const dentro = new Set([1]);
confirma(
  'um pouco além do raio, vinda de dentro: fica',
  paragensPertoDaMira(naFronteira, [avenida[0]], dentro) === dentro
);
confirma(
  'o mesmo sítio, vinda de fora: não entra',
  paragensPertoDaMira(naFronteira, [avenida[0]], vazio).size === 0
);

// 8. Nada mudou: o MESMO Set, para o mapa não redesenhar a cada fotograma.
const s1 = paragensPertoDaMira(m(0), avenida, vazio);
confirma('mira quieta: devolve o mesmo Set', paragensPertoDaMira(m(1), avenida, s1) === s1);

// 9. Sem mira (fora do modo de escolha): nenhuma.
confirma('sem centro: nenhuma', paragensPertoDaMira(null, avenida, vazio).size === 0);

// 10. Rápido com muitas: 1000 paragens, 1000 fotogramas.
const mil = Array.from({ length: 1000 }, (_, i) => ({ id: i, ...m(i * 7) }));
const t2 = performance.now();
let ps = new Set();
for (let i = 0; i < 1000; i++) ps = paragensPertoDaMira(m(i * 7), mil, ps);
const ms2 = performance.now() - t2;
confirma(`1000 paragens × 1000 fotogramas em ${ms2.toFixed(0)} ms (menos de 2 s)`, ms2 < 2000);

if (falhas) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\ntudo certo');
