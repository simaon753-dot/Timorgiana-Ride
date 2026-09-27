// Prova o motor de colocação das etiquetas sem telemóvel nenhum.
// Ver `src/lib/disporEtiquetas.js`.
//
//   node scripts/testar-etiquetas.mjs
import {
  disporEtiquetas,
  rect,
  abaixoComHisterese,
  escalaoComHisterese,
} from '../src/lib/disporEtiquetas.js';

const vista = { largura: 400, altura: 600 };
let falhas = 0;
function confirma(nome, cond) {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nome}`);
  if (!cond) falhas++;
}

// Uma etiqueta com dois lados possíveis, à direita e à esquerda de (x, y).
const dosDoisLados = (id, prioridade, x, y, w = 100, h = 20) => ({
  id,
  prioridade,
  opcoes: [
    { lado: 'dir', caixa: rect(x + 8, y - h / 2, w, h) },
    { lado: 'esq', caixa: rect(x - 8 - w, y - h / 2, w, h) },
  ],
});

// 1. A mais importante fica; a de menor prioridade no mesmo sítio procura o
//    outro lado.
{
  const r = disporEtiquetas(
    [dosDoisLados('nome', 50, 200, 300), dosDoisLados('cartao', 100, 200, 300)],
    [],
    vista
  );
  confirma('o cartão (100) fica à direita, que era a preferência dele', r.get('cartao') === 'dir');
  confirma('o nome (50) não desaparece: passa para a esquerda', r.get('nome') === 'esq');
}

// 2. Um pino nunca é tapado.
{
  const pino = rect(200, 250, 40, 50);
  const r = disporEtiquetas(
    [{ id: 'x', prioridade: 100, opcoes: [{ lado: 'c', caixa: rect(190, 260, 60, 20) }] }],
    [pino],
    vista
  );
  confirma('uma etiqueta em cima de um pino não aparece', !r.has('x'));
}

// 3. Nada sai do ecrã.
{
  const r = disporEtiquetas([dosDoisLados('borda', 50, 390, 300)], [], vista);
  confirma('junto à borda direita, vai para a esquerda', r.get('borda') === 'esq');
}

// 4. ESTABILIDADE: quem já lá estava ganha o empate e mantém o lado.
{
  const cands = [dosDoisLados('a', 50, 200, 300), dosDoisLados('b', 50, 200, 300)];
  // Os dois só cabem um de cada lado; sem memória, o desempate é pelo id.
  const primeira = disporEtiquetas(cands, [], vista);
  // Agora 'b' estava à direita na paragem anterior: tem de continuar lá.
  const antes = new Map([['b', 'dir']]);
  const segunda = disporEtiquetas(cands, [], vista, antes);
  confirma('sem memória, desempata pelo id (a à direita)', primeira.get('a') === 'dir');
  confirma('com memória, b mantém a direita onde estava', segunda.get('b') === 'dir');
  confirma('e a vai para a esquerda em vez de o empurrar', segunda.get('a') === 'esq');
}

// 5. A incumbência NÃO passa uma família mais importante para trás.
{
  const pastilha = {
    id: 'preco',
    prioridade: 80,
    opcoes: [{ lado: 'c', caixa: rect(150, 290, 100, 24) }],
  };
  const nome = {
    id: 'nome',
    prioridade: 50,
    opcoes: [{ lado: 'c', caixa: rect(160, 295, 80, 16) }],
  };
  const r = disporEtiquetas([pastilha, nome], [], vista, new Map([['nome', 'c']]));
  confirma(
    'um nome que já estava (50+15) perde para um preço (80)',
    r.has('preco') && !r.has('nome')
  );
}

// 6. Histerese simples: entrar abaixo de 0,0015, sair só acima de 0,0018.
{
  confirma('fora, a 0,0016: continua fora', abaixoComHisterese(0.0016, 0.0015, false) === false);
  confirma('fora, a 0,0014: entra', abaixoComHisterese(0.0014, 0.0015, false) === true);
  confirma('dentro, a 0,0016: continua dentro', abaixoComHisterese(0.0016, 0.0015, true) === true);
  confirma('dentro, a 0,0019: sai', abaixoComHisterese(0.0019, 0.0015, true) === false);
}

// 7. Escalões com histerese (raio em metros → quantos nomes nossos).
{
  const E = [{ ate: 700 }, { ate: 1500 }, { ate: 3000 }];
  confirma('primeira vez, 800 m: escalão 1', escalaoComHisterese(800, E, null) === 1);
  confirma(
    'no 0, a 750 m (acima de 700 mas dentro da folga): fica no 0',
    escalaoComHisterese(750, E, 0) === 0
  );
  confirma('no 0, a 800 m (passou os 784): sobe para 1', escalaoComHisterese(800, E, 0) === 1);
  confirma(
    'no 1, a 650 m (abaixo de 700 mas dentro da folga): fica no 1',
    escalaoComHisterese(650, E, 1) === 1
  );
  confirma('no 1, a 600 m: desce para 0', escalaoComHisterese(600, E, 1) === 0);
  confirma(
    'no 3 (fora), salto grande para 300 m: vai directo ao 0',
    escalaoComHisterese(300, E, 3) === 0
  );
  confirma('no 0, salto grande para 5 km: vai directo ao 3', escalaoComHisterese(5000, E, 0) === 3);
}

// 7b. O cartão não colide com o SEU pino, mas colide com o dos outros.
{
  const meu = { id: 'pino:A', ...rect(180, 250, 40, 50) };
  const alheio = { id: 'pino:B', ...rect(240, 250, 40, 50) };
  const cartao = (rel) => ({
    id: 'cartao:A',
    prioridade: 100,
    relacionados: rel,
    opcoes: [{ lado: 'c', caixa: rect(195, 255, 30, 20) }],
  });
  const r1 = disporEtiquetas([cartao(['pino:A'])], [meu, alheio], vista);
  confirma('encostado ao próprio pino, o cartão aparece', r1.has('cartao:A'));
  const r2 = disporEtiquetas([cartao([])], [meu, alheio], vista);
  confirma('sem saber de quem é o pino, seria escondido', !r2.has('cartao:A'));
  const longe = { ...cartao(['pino:A']), opcoes: [{ lado: 'c', caixa: rect(245, 255, 30, 20) }] };
  const r3 = disporEtiquetas([longe], [meu, alheio], vista);
  confirma('em cima do pino de OUTRO, continua escondido', !r3.has('cartao:A'));
}

// 8. A mesma entrada dá sempre a mesma saída.
{
  const cands = [3, 1, 2, 5, 4].map((i) => dosDoisLados(`n${i}`, 50, 100 + i * 30, 300));
  const a = JSON.stringify([...disporEtiquetas(cands, [], vista)]);
  const b = JSON.stringify([...disporEtiquetas([...cands].reverse(), [], vista)]);
  confirma('a ordem de chegada não muda o resultado', a === b);
}

console.log(falhas ? `\n${falhas} falhas` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
