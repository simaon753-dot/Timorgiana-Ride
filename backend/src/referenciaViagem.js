import { randomInt } from 'node:crypto';

// O CÓDIGO DA VIAGEM — o «Booking ID» (30/09/2026, pedido do Simão).
//
// Para quem liga ou escreve por causa de uma viagem: diz o código, e no painel
// encontra-se a viagem numa pesquisa. O número interno (#43) não serve para
// isto — diria a qualquer passageiro quantas viagens a Timorgiana já fez.
//
// «TR-» e seis caracteres de um alfabeto SEM os que se confundem ao ditar
// ou a ler num ecrã pequeno: nem 0/O, nem 1/I/L. São 31 símbolos, 31⁶ ≈ 887
// milhões de códigos: ao acaso, e não a partir do número, para não se poder
// deduzir um do outro. A unicidade garante-a um índice na base (db.js).
export const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const TAMANHO = 6;

export function novaReferencia() {
  let s = '';
  for (let i = 0; i < TAMANHO; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `TR-${s}`;
}

// O que alguém escreve ou dita, na forma guardada — ou `null` se não for um
// código. Aceita minúsculas, espaços, com ou sem «TR-». As letras que o
// alfabeto não tem, mas que se confundem com as que tem, não se adivinham:
// um código trocado encontra outra viagem, e é pior do que não encontrar.
export function normalizarReferencia(texto) {
  const s = String(texto || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/^TR/, '');
  if (s.length !== TAMANHO) return null;
  for (const c of s) if (!ALFABETO.includes(c)) return null;
  return `TR-${s}`;
}
