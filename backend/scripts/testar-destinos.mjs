// Testes da tabela de destinos do Pickup (ver src/destinosCarry.js).
import {
  destinoFixo,
  aplicarDestinos,
  validarDestinos,
  DESTINOS_PADRAO,
} from '../src/destinosCarry.js';
import { preco } from '../src/routing.js';

let falhas = 0;
const ok = (c, m) => {
  console.log(`  ${c ? '✓' : '✗'} ${m}`);
  if (!c) falhas++;
};
const DILI = { lat: -8.5536, lng: 125.5783 }; // Colmera
const COMORO = { lat: -8.548, lng: 125.53 };
const BAUCAU = { lat: -8.47, lng: 126.455 };
const AILEU = { lat: -8.73, lng: 125.567 };
const HERA = { lat: -8.53, lng: 125.688 };
const SAME = { lat: -9.001, lng: 125.65 };

aplicarDestinos(null);
ok(destinoFixo(DILI, BAUCAU)?.precoUsd === 80, 'Díli → Baucau: $80 da tabela');
ok(destinoFixo(BAUCAU, DILI)?.precoUsd === 80, 'Baucau → Díli: o mesmo preço no outro sentido');
ok(destinoFixo(COMORO, HERA)?.precoUsd === 15, 'Comoro → Hera: $15');
ok(destinoFixo(DILI, COMORO) === null, 'dentro de Díli: fica a fórmula (Díli Laran vem desligado)');
ok(destinoFixo(AILEU, BAUCAU) === null, 'Aileu → Baucau: nenhuma ponta em Díli, fica a fórmula');
ok(destinoFixo(DILI, SAME) === null, 'Same: proposta desligada, fica a fórmula');

// AS VILAS REAIS, onde o nosso mapa escreve o nome (29/09/2026). Os casos de
// cima usam pontos escolhidos à mão perto do ponto da tabela, e por isso não
// apanhavam um ponto da tabela posto no sítio errado: Metinaro estava 7,2 km
// ao lado da vila e cobrava-se a fórmula a quem ia para lá.
const VILAS = [
  ['Aileu', -8.7254, 125.566, 50],
  ['Manatutu', -8.5108, 126.012, 60],
  ['Gleno', -8.723, 125.436, 50],
  ['Likisá', -8.5898, 125.3409, 40],
  ['Hera', -8.5383, 125.6866, 15],
  ['Metinaro', -8.5297, 125.741, 20],
  ['Baucau', -8.4789, 126.4527, 80],
  ['Batugade', -8.9472, 124.9726, 70],
  ['Motaain (fronteira)', -8.9574, 124.9549, 70],
  ['Maubisse', -8.8377, 125.5978, 70],
];
for (const [nome, lat, lng, esperado] of VILAS) {
  const r = destinoFixo(DILI, { lat, lng });
  ok(r?.precoUsd === esperado, `vila real: Díli → ${nome} = $${esperado} (deu ${r ? '$' + r.precoUsd : 'fórmula'})`);
}

const pontas = { origem: DILI, destino: BAUCAU };
ok(
  preco('carry', 122, 210, null, { volume: 'grande', ajuda: 'nenhuma' }, pontas) === 80,
  'o volume não multiplica o preço fixo'
);
ok(
  preco('carry', 122, 210, null, { volume: 'pequeno', ajuda: 'carregar' }, pontas) > 80,
  'a ajuda a carregar soma-se ao preço fixo'
);
ok(
  preco('carry', 122, 210, null, { volume: 'pequeno' }, null) > 100,
  'sem pontas (com paragens): fica a fórmula'
);
ok(preco('car', 122, 210, null, null, pontas) > 80, 'só o Carry usa a tabela');

// Ligar a proposta de Same pelo painel.
aplicarDestinos(DESTINOS_PADRAO.map((d) => (d.id === 'same' ? { ...d, ativo: true } : d)));
ok(destinoFixo(DILI, SAME)?.precoUsd === 100, 'ligada no painel, Same passa a $100');

// Díli Laran ligado: as duas pontas dentro.
aplicarDestinos(DESTINOS_PADRAO.map((d) => (d.id === 'dili-laran' ? { ...d, ativo: true } : d)));
ok(destinoFixo(DILI, COMORO)?.precoUsd === 10, 'Díli Laran ligado: dentro de Díli, $10');
ok(destinoFixo(COMORO, HERA)?.precoUsd === 15, 'mas Hera continua a $15');

ok(
  !!validarDestinos([{ nome: 'X', lat: -8.5, lng: 125.5, raioKm: 5, precoUsd: 10 }]).erro,
  'recusa nome de uma letra'
);
ok(
  !!validarDestinos([{ nome: 'Longe', lat: 1, lng: 125.5, raioKm: 5, precoUsd: 10 }]).erro,
  'recusa coordenadas fora de Timor-Leste'
);
ok(
  !!validarDestinos([{ nome: 'Caro', lat: -8.5, lng: 125.5, raioKm: 5, precoUsd: 800 }]).erro,
  'recusa $800'
);
aplicarDestinos(null);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
