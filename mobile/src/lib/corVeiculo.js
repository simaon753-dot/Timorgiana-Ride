import { CORES } from '../dados/veiculos.js';

const CODIGOS = new Set(CORES.map((c) => c.id));

// Nome da cor na língua de quem lê.
//
// Os motoristas registados ANTES da lista têm texto livre gravado
// ("Branco", "mutin", "putih"). Esses mostram-se como estão: traduzir só o
// que é código, e deixar passar o resto, evita apagar informação verdadeira
// só porque não cabe no formato novo.
export function nomeDaCor(valor, t) {
  if (!valor) return null;
  return CODIGOS.has(valor) ? t(`cor_${valor}`) : valor;
}

export function hexDaCor(valor) {
  return CORES.find((c) => c.id === valor)?.hex || null;
}
