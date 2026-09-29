// Prova como se escolhe a paragem para a mira, sem base de dados nem mapa.
// Ver `src/escolherParagem.js`.
//
//   node scripts/testar-escolha-paragem.mjs
import { escolherParagem, RAIO_PARAGENS_PERTO_M } from '../src/escolherParagem.js';

let falhas = 0;
function confirma(nome, cond) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nome}`);
  if (!cond) falhas++;
}

// Tudo ao longo de uma linha norte-sul; `m(x)` fica x metros a norte da mira.
const mira = { lat: -8.55, lng: 125.57 };
const m = (x) => ({ lat: mira.lat + x / 110574, lng: mira.lng });
const estrada = (x, tipo = 'residential') => ({ ...m(x), metros: x, rua: 'Rua', tipo });
const painel = (id, x) => ({ id, nome: `Paragem ${id}`, ...m(x) });

// 1. Uma do painel que cobre o sítio ganha sempre, mesmo com estrada ao lado.
let r = escolherParagem({ ponto: mira, cobrem: [painel(9, 400)], estrada: estrada(5) });
confirma('a que cobre ganha a tudo', r?.tipo === 'painel' && r.principal.id === 9);

// 2. Sem nada: nenhuma. Não se inventa um ponto.
confirma('sem candidatos: nenhuma', escolherParagem({ ponto: mira }) === null);

// 3. Só a estrada.
r = escolherParagem({ ponto: mira, estrada: estrada(30) });
confirma('só a estrada: a estrada', r?.tipo === 'estrada' && r.estrada.metros === 30);

// 4. Do painel ligeiramente mais longe do que a estrada: ganha o painel
//    (40 × 0,7 = 28 contra 35). Muito mais longe: ganha a estrada.
r = escolherParagem({ ponto: mira, perto: [painel(1, 40)], estrada: estrada(35) });
confirma(
  'painel a 40 m contra estrada a 35 m: o painel',
  r?.tipo === 'painel' && r.principal.id === 1
);
r = escolherParagem({ ponto: mira, perto: [painel(1, 100)], estrada: estrada(30) });
confirma('painel a 100 m contra estrada a 30 m: a estrada', r?.tipo === 'estrada');

// 5. Um trilho pesa mais: painel a 50 m (35) contra trilho a 30 m (42).
r = escolherParagem({ ponto: mira, perto: [painel(2, 50)], estrada: estrada(30, 'track') });
confirma('painel a 50 m contra trilho a 30 m: o painel', r?.tipo === 'painel');

// 6. Fora do raio não conta, mesmo sem mais nada.
r = escolherParagem({ ponto: mira, perto: [painel(3, RAIO_PARAGENS_PERTO_M + 20)] });
confirma(`painel a ${RAIO_PARAGENS_PERTO_M + 20} m e nada mais: nenhuma`, r === null);

// 7. Entre duas do painel, a mais perto.
r = escolherParagem({ ponto: mira, perto: [painel(4, 80), painel(5, 20)] });
confirma('duas do painel: a mais perto', r?.principal.id === 5);

// 8. ESTABILIDADE: a que está à vista fica se a nova for só um pouco melhor…
r = escolherParagem({ ponto: mira, perto: [painel(6, 30)], estrada: estrada(18), atual: m(30) });
confirma(
  'à vista a 30 m (21) contra estrada a 18 m: fica a que estava',
  r?.tipo === 'painel' && r.principal.id === 6
);
// …e sai se a nova for claramente melhor.
r = escolherParagem({ ponto: mira, perto: [painel(6, 120)], estrada: estrada(10), atual: m(120) });
confirma('à vista a 120 m (84) contra estrada a 10 m: troca', r?.tipo === 'estrada');
// Uma «atual» que já não é candidata (ficou longe) não prende nada.
r = escolherParagem({ ponto: mira, estrada: estrada(25), atual: m(400) });
confirma('a antiga ficou longe: a nova', r?.tipo === 'estrada');

if (falhas) {
  console.log(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\ntudo certo');
