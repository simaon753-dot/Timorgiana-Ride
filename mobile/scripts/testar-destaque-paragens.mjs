// Prova quando as paragens alternativas passam de ponto a pino, sem telemóvel.
// Ver `src/lib/destaqueParagens.js`.
//
//   node scripts/testar-destaque-paragens.mjs
import { paragensADestacar, chaveParagem, DESTAQUE_ZOOM } from '../src/lib/destaqueParagens.js';

let falhas = 0;
function confirma(nome, cond) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nome}`);
  if (!cond) falhas++;
}

// O Cristo Rei com duas paragens: as escadas em baixo e o acesso de cima.
const escadas = { qual: 'destino', lat: -8.5248, lng: 125.60972 };
const cima = { qual: 'destino', lat: -8.5221, lng: 125.60924 };
const paragens = [escadas, cima];
const ALTURA = 700; // pixéis do mapa
// Uma região centrada num ponto, com uma altura de ecrã em graus.
const regiao = (p, delta, dNorteM = 0) => ({
  latitude: p.lat + dNorteM / 110574,
  longitude: p.lng,
  latitudeDelta: delta,
});
const vazio = new Set();
const decide = (r, o = {}) =>
  paragensADestacar({
    regiao: r,
    altura: ALTURA,
    paragens,
    modoEscolha: true,
    antes: vazio,
    estavaPerto: false,
    ...o,
  });
// A 0,006 (o enquadramento de um ponto) cada pixel são ~0,95 m.
const mPorPx = (0.006 * 111320) / ALTURA;

// 1. Longe, e com a mira longe: tudo discreto.
let r = decide(regiao({ lat: -8.53, lng: 125.6 }, 0.006));
confirma('longe e sem mira: nenhuma destacada', r.destacadas.size === 0 && !r.perto);

// 2. Aproximar o mapa destaca todas.
r = decide(regiao({ lat: -8.53, lng: 125.6 }, DESTAQUE_ZOOM * 0.9));
confirma('com o mapa perto: as duas destacadas', r.destacadas.size === 2 && r.perto);

// 3. A histerese do zoom: quem já estava perto só sai 20% acima do limiar.
r = decide(regiao({ lat: -8.53, lng: 125.6 }, DESTAQUE_ZOOM * 1.1), { estavaPerto: true });
confirma('zoom um pouco acima do limiar, vindo de perto: continua perto', r.perto);
r = decide(regiao({ lat: -8.53, lng: 125.6 }, DESTAQUE_ZOOM * 1.1), { estavaPerto: false });
confirma('o mesmo zoom, vindo de longe: não entra', !r.perto && r.destacadas.size === 0);

// 4. A mira encostada a uma destaca só essa.
r = decide(regiao(escadas, 0.006, 20 * mPorPx));
confirma(
  'mira a 20 px das escadas: só as escadas',
  r.destacadas.size === 1 && r.destacadas.has(chaveParagem(escadas))
);

// 5. A mira a 50 px: fora para quem vem de fora, dentro para quem já lá estava.
r = decide(regiao(escadas, 0.006, 50 * mPorPx));
confirma('mira a 50 px, vinda de fora: não destaca', r.destacadas.size === 0);
const jaDentro = new Set([chaveParagem(escadas)]);
r = decide(regiao(escadas, 0.006, 50 * mPorPx), { antes: jaDentro });
confirma('mira a 50 px, já destacada: fica destacada (histerese)', r.destacadas === jaDentro);
r = decide(regiao(escadas, 0.006, 60 * mPorPx), { antes: jaDentro });
confirma('mira a 60 px: deixa de estar', r.destacadas.size === 0);

// 6. Sem modo de escolha não há mira: a proximidade não conta.
r = decide(regiao(escadas, 0.006, 5 * mPorPx), { modoEscolha: false });
confirma('fora do modo de escolha, mira em cima: continua discreta', r.destacadas.size === 0);

// 7. Nada mudou: devolve o MESMO Set, para o mapa não redesenhar.
const antes = new Set([chaveParagem(escadas)]);
r = decide(regiao(escadas, 0.006, 10 * mPorPx), { antes });
confirma('sem mudança: devolve o mesmo Set', r.destacadas === antes);

// 8. Mapa ainda sem altura medida: sem zoom perto, nada se destaca pela mira.
r = decide(regiao(escadas, 0.006, 0), { altura: 0 });
confirma('sem altura do mapa: não rebenta, não destaca', r.destacadas.size === 0);

if (falhas) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\ntudo certo');
