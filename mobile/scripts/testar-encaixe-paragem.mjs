// Prova quando a mira encaixa numa paragem, sem telemóvel.
// Ver `src/lib/encaixeParagem.js`.
//
//   node scripts/testar-encaixe-paragem.mjs
import { paragemParaEncaixar, SOBRE_PX } from '../src/lib/encaixeParagem.js';

let falhas = 0;
function confirma(nome, cond) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nome}`);
  if (!cond) falhas++;
}

// Duas paragens a 40 m uma da outra, ao longo de uma rua.
const entrada = { id: 1, nome: 'Entrada', lat: -8.5248, lng: 125.60972 };
const saida = { id: 2, nome: 'Saída', lat: -8.5248 + 40 / 110574, lng: 125.60972 };
const paragens = [entrada, saida];
const ALTURA = 700; // pixéis do mapa
// Uma região com a mira `dNorteM` metros a norte da entrada.
const regiao = (dNorteM, delta = 0.006) => ({
  latitude: entrada.lat + dNorteM / 110574,
  longitude: entrada.lng,
  latitudeDelta: delta,
});
const mPorPx = (delta) => (delta * 111320) / ALTURA;
const encaixa = (r, o = {}) => paragemParaEncaixar({ regiao: r, altura: ALTURA, paragens, ...o });

// 1. A mira a 20 px da entrada: encaixa na entrada.
let r = encaixa(regiao(20 * mPorPx(0.006)));
confirma('mira a 20 px: encaixa na entrada', r?.id === 1 && Math.round(r.px) === 20);

// 2. Entre as duas, ganha a mais perto (a 15 m da entrada, 25 m da saída).
r = encaixa(regiao(15));
confirma('entre duas: a mais perto', r?.id === 1);
r = encaixa(regiao(28));
confirma('mais perto da saída: a saída', r?.id === 2);

// 3. A 50 px já não está debaixo do dedo.
r = encaixa(regiao(50 * mPorPx(0.006)));
confirma('mira a 50 px da entrada (e longe da saída): não encaixa', r === null || r.id === 2);
r = paragemParaEncaixar({ regiao: regiao(-50 * mPorPx(0.006)), altura: ALTURA, paragens });
confirma('mira a 50 px para o outro lado: não encaixa', r === null);

// 4. Com o mapa afastado, 44 px são muitos metros: o tecto de 60 m manda.
const longe = 0.03; // ~4,8 m por pixel: 20 px são ~95 m
r = paragemParaEncaixar({ regiao: regiao(-20 * mPorPx(longe), longe), altura: ALTURA, paragens });
confirma('mapa afastado, 20 px mas ~95 m: não encaixa', r === null);

// 5. Em cima: px ~0, e é aí que o ponto escolhido passa a ser a paragem.
r = encaixa(regiao(0));
confirma('mira exactamente em cima: px abaixo de SOBRE_PX', r?.id === 1 && r.px < SOBRE_PX);

// 6. Sem paragens, sem altura ou sem região: não rebenta.
confirma('sem paragens: null', encaixa(regiao(0), { paragens: [] }) === null);
confirma('sem altura: null', encaixa(regiao(0), { altura: 0 }) === null);
confirma(
  'sem região: null',
  paragemParaEncaixar({ regiao: null, altura: ALTURA, paragens }) === null
);

if (falhas) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\ntudo certo');
