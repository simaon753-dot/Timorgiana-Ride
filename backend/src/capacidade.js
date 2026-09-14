import { CARROCERIAS, CAPACIDADES } from './config.js';

// A carga cabe no veículo? Um só sítio para a regra, usado na lista de
// pedidos (em SQL, com a mesma ordem) e nas mensagens de recusa.
//
// SEM CAPACIDADE CONHECIDA, CABE (decisão do Simão, 14/09/26). Os motoristas
// de Carry que se registaram antes deste campo continuam a ver todos os
// pedidos até o indicarem — ninguém perde trabalho de um dia para o outro
// por causa de um campo novo. Sem volume (viagem de pessoas), também cabe.
const ORDEM_VOLUME = { pequeno: 1, medio: 2, grande: 3 };
const ORDEM_CAPACIDADE = { pequena: 1, media: 2, grande: 3 };

export function cabe(volume, capacidade) {
  if (!ORDEM_VOLUME[volume] || !ORDEM_CAPACIDADE[capacidade]) return true;
  return ORDEM_VOLUME[volume] <= ORDEM_CAPACIDADE[capacidade];
}

// Os dados de carga de um veículo, validados. Fora do Carry ficam nulos: uma
// berlina com "capacidade grande" seria um dado que nada usa e alguém lê mal.
export function dadosDeCarga(v, ehCarry) {
  if (!ehCarry) return { carroceria: null, capacidade: null, ano: null };
  const ano = Number(v?.ano);
  const esteAno = new Date().getFullYear();
  return {
    carroceria: CARROCERIAS.includes(v?.carroceria) ? v.carroceria : null,
    capacidade: CAPACIDADES.includes(v?.capacidade) ? v.capacidade : null,
    ano: Number.isInteger(ano) && ano >= 1970 && ano <= esteAno + 1 ? ano : null,
  };
}
