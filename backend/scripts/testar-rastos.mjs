// Testes dos rastos anónimos (ver src/rastos.js). Sem base de dados: a
// escrita é substituída e o que se testa é o que ficaria guardado.
import { juntarPonto, descodificar, _paraTeste } from '../src/rastos.js';

let falhas = 0;
const ok = (c, m) => {
  console.log(`  ${c ? '✓' : '✗'} ${m}`);
  if (!c) falhas++;
};

// 1. Desligado, nada se junta. (Ligado por omissão desde 28/09/2026, com a
// política a dizê-lo; o interruptor tem de continuar a desligar tudo.)
_paraTeste.ligar(false);
juntarPonto({ id: 1, status: 'in_progress' }, -8.55, 125.57, 5);
ok(_paraTeste.emCurso.size === 0, 'desligado, não junta nada');

_paraTeste.ligar(true);

// 2. Só com passageiro a bordo.
juntarPonto({ id: 2, status: 'arriving' }, -8.55, 125.57, 5);
ok(!_paraTeste.emCurso.has(2), 'a caminho da recolha não conta (casa do motorista)');

// 3. Leituras imprecisas e pontos colados ficam de fora.
const v = { id: 3, status: 'in_progress', vehicle_type: 'car' };
juntarPonto(v, -8.55, 125.57, 80);
ok(!_paraTeste.emCurso.has(3), 'leitura com 80 m de erro não entra');
juntarPonto(v, -8.55, 125.57, 5);
juntarPonto(v, -8.55001, 125.57, 5); // ~1 m
ok(_paraTeste.emCurso.get(3).pontos.length === 1, 'ponto a 1 m do anterior não entra');

// 4. A codificação vai e volta.
const pts = [
  [-8.55123, 125.57456, 0],
  [-8.5501, 125.576, 12],
  [-8.54, 125.6, 400],
];
const volta = descodificar(_paraTeste.codificar(pts));
ok(
  volta.every((p, i) => p.every((x, k) => Math.abs(x - pts[i][k]) < 1e-9)),
  'codificar e descodificar dão os mesmos pontos'
);

_paraTeste.ligar(false);

// 5. O percurso da viagem (percursos.js): a fronteira entre ir buscar e levar.
const { juntarAoPercurso, _paraTestePercurso } = await import('../src/percursos.js');
const w = { id: 50, status: 'accepted' };
juntarAoPercurso(w, -8.55, 125.57, 10);
juntarAoPercurso({ ...w, status: 'arriving' }, -8.551, 125.57, 10); // ~110 m
juntarAoPercurso({ ...w, status: 'in_progress' }, -8.552, 125.57, 10);
juntarAoPercurso({ ...w, status: 'in_progress' }, -8.553, 125.57, 10);
const pr = _paraTestePercurso.emCurso.get(50);
ok(pr.pontos.length === 4, 'o percurso junta a ida à recolha e a viagem');
ok(pr.recolha === 2, 'a parte com passageiro começa no primeiro ponto em viagem');
juntarAoPercurso({ id: 51, status: 'requested' }, -8.55, 125.57, 10);
ok(!_paraTestePercurso.emCurso.has(51), 'um pedido por aceitar não tem percurso');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
