// OS TRÊS TIPOS DE VEÍCULO, descritos num sítio só.
//
// PORQUE EXISTE. Antes do Carry havia dois tipos, e a app perguntava qual era
// com um ternário — `tipo === 'motorbike' ? A : B` — repetido em DEZOITO
// sítios: o nome, o ícone, o emoji, a fotografia, o exemplo da matrícula, a
// lista de modelos. Cada um deles teria de virar um ternário de três, e o
// quarto tipo obrigaria a repetir tudo pela terceira vez.
//
// Pior do que o trabalho: dezoito sítios divergem. Bastava esquecer um para o
// Carry aparecer como "Carro" num ecrã e como "Carry" noutro, e ninguém
// saberia dizer qual estava certo.
//
// Aqui cada tipo diz tudo sobre si uma vez. Acrescentar um quarto passa a ser
// uma entrada nesta tabela.
//
// A ORDEM é a que o passageiro vê na Home: do mais barato ao mais especial.

const IMG = {
  motorbike: require('../../assets/veiculos/mota.png'),
  car: require('../../assets/veiculos/carro.png'),
  carry: require('../../assets/veiculos/carry.png'),
};

export const TIPOS_VEICULO = ['motorbike', 'car', 'carry'];

export const VEICULOS = {
  motorbike: {
    id: 'motorbike',
    chaveNome: 'vehicleMotorbike',
    chaveNota: 'motoMaisBarato',
    chaveMatricula: 'vehiclePlatePlaceholderMoto',
    icone: 'mota',
    emoji: '🏍️',
    imagem: IMG.motorbike,
    // Numa motorizada vai sempre uma pessoa: não se pergunta quantas são.
    perguntaLugares: false,
    levaPessoas: true,
  },
  car: {
    id: 'car',
    chaveNome: 'vehicleCar',
    chaveNota: 'carroMaisAbrigado',
    chaveMatricula: 'vehiclePlatePlaceholderCar',
    icone: 'carro',
    emoji: '🚗',
    imagem: IMG.car,
    perguntaLugares: true,
    levaPessoas: true,
  },
  carry: {
    id: 'carry',
    chaveNome: 'vehicleCarry',
    chaveNota: 'carryNota',
    chaveMatricula: 'vehiclePlatePlaceholderCar',
    icone: 'carry',
    emoji: '🛻',
    imagem: IMG.carry,
    perguntaLugares: false,
    // O QUE SEPARA O CARRY DOS OUTROS DOIS, e é a única diferença que os
    // ecrãs precisam de consultar: este não transporta pessoas, transporta
    // bens. Tudo o que só faz sentido com gente dentro — quantas pessoas vão,
    // pedir para outra pessoa, o código de recolha dito ao motorista — olha
    // para aqui em vez de perguntar `tipo === 'carry'` em cada sítio.
    levaPessoas: false,
  },
};

// O nome traduzido de um tipo. Com reserva no carro: um tipo desconhecido
// vindo de um servidor mais novo do que a app não deve deixar o ecrã em
// branco.
export function nomeDoVeiculo(t, tipo) {
  return t(VEICULOS[tipo]?.chaveNome || VEICULOS.car.chaveNome);
}

export function veiculo(tipo) {
  return VEICULOS[tipo] || VEICULOS.car;
}
