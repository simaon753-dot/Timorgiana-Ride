// Ensaio da política de cancelamentos (src/cancelamentos.js), 10/10/2026.
import assert from 'node:assert/strict';
import { eTardio, minutosDeEsperaEmFalta, consequencia, horaDeDili } from '../src/cancelamentos.js';
import { traduzir } from '../src/mensagens.js';

const agora = new Date('2026-10-10T03:00:00Z');
const antes = (min) => new Date(agora.getTime() - min * 60000);
const casos = [
  ['passageiro a 1 min da aceitação: grátis', () => assert.equal(eTardio(antes(1), agora), false)],
  ['passageiro a 2 min exactos: ainda grátis', () => assert.equal(eTardio(antes(2), agora), false)],
  ['passageiro a 3 min: tardio', () => assert.equal(eTardio(antes(3), agora), true)],
  [
    'viagem antiga sem hora de aceitação: não é tardio',
    () => assert.equal(eTardio(null, agora), false),
  ],
  [
    'motorista sem «Cheguei»: não há espera a contar',
    () => assert.equal(minutosDeEsperaEmFalta(null, agora), null),
  ],
  [
    'motorista chegou há 1 min: faltam 4',
    () => assert.equal(minutosDeEsperaEmFalta(antes(1), agora), 4),
  ],
  [
    'motorista chegou há 5 min: já pode',
    () => assert.equal(minutosDeEsperaEmFalta(antes(5), agora), 0),
  ],
  ['2 tardios: nada', () => assert.equal(consequencia(2), null)],
  ['3 tardios: aviso', () => assert.equal(consequencia(3), 'demasiados')],
  ['5 tardios: suspenso', () => assert.equal(consequencia(5), 'suspenso')],
  ['hora de Díli é UTC+9', () => assert.equal(horaDeDili('2026-10-10T03:05:00Z'), '12:05, 10/10')],
  [
    'a mensagem da suspensão traduz-se com a hora no sítio',
    () =>
      assert.equal(
        traduzir(
          'Os seus pedidos estão suspensos até às 12:05, 10/10 (hora de Díli), por cancelamentos tardios repetidos.',
          'en'
        ),
        'Your requests are suspended until 12:05, 10/10 (Díli time), because of repeated late cancellations.'
      ),
  ],
];
for (const [nome, f] of casos) {
  f();
  console.log(`  ✓ ${nome}`);
}
console.log('política de cancelamentos: tudo certo');
