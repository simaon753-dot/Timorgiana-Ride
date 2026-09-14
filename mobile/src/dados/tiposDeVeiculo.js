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

export const TIPOS_VEICULO = ['motorbike', 'car', 'carry'];

export const VEICULOS = {
  motorbike: {
    id: 'motorbike',
    // Cores do sistema TGA — nomes de token, definidos em theme.js.
    tinta: 'tintaMota',
    acento: 'acentoMota',
    chaveNome: 'vehicleMotorbike',
    chaveNota: 'motoMaisBarato',
    chaveMatricula: 'vehiclePlatePlaceholderMoto',
    icone: 'mota',
    emoji: '🏍️',
    // As ilustrações do Simão, uma por tema: fundo branco puro de dia, preto
    // puro de noite. Ver veiculoFotoCaixa no ecrã inicial.
    //
    // TROCADAS a 14/09/26 pelas que o Simão fez com as cores e o logótipo da
    // TimorgianaRide: as de 13/09 tinham sido tiradas da Internet, e o direito
    // de autor não é nosso. As novas vinham com o texto em espelho; entram
    // viradas na horizontal, para "Timorgiana Ride" se ler. Os originais ficam
    // em desenho/imagens (fora do repositório).
    imagens: {
      claro: require('../../assets/veiculos/mota-claro.jpg'),
      escuro: require('../../assets/veiculos/mota-escuro.jpg'),
    },
    // Numa motorizada vai sempre uma pessoa: não se pergunta quantas são.
    perguntaLugares: false,
    levaPessoas: true,
  },
  car: {
    id: 'car',
    // Cores do sistema TGA — nomes de token, definidos em theme.js.
    tinta: 'tintaCarro',
    acento: 'acentoCarro',
    chaveNome: 'vehicleCar',
    chaveNota: 'carroMaisAbrigado',
    chaveMatricula: 'vehiclePlatePlaceholderCar',
    icone: 'carro',
    emoji: '🚗',
    // As ilustrações do Simão, uma por tema: fundo branco puro de dia, preto
    // puro de noite. Ver veiculoFotoCaixa no ecrã inicial.
    //
    // TROCADAS a 14/09/26 pelas que o Simão fez com as cores e o logótipo da
    // TimorgianaRide: as de 13/09 tinham sido tiradas da Internet, e o direito
    // de autor não é nosso. As novas vinham com o texto em espelho; entram
    // viradas na horizontal, para "Timorgiana Ride" se ler. Os originais ficam
    // em desenho/imagens (fora do repositório).
    imagens: {
      claro: require('../../assets/veiculos/carro-claro.jpg'),
      escuro: require('../../assets/veiculos/carro-escuro.jpg'),
    },
    perguntaLugares: true,
    levaPessoas: true,
  },
  carry: {
    id: 'carry',
    // Cores do sistema TGA — nomes de token, definidos em theme.js.
    tinta: 'tintaCarry',
    acento: 'acentoCarry',
    chaveNome: 'vehicleCarry',
    chaveNota: 'carryNota',
    // O PRIMEIRO PASSO DO CARRY é perguntar o que vai (bens ou pessoas), e só
    // depois o destino — pedido do Simão (14/09/26). Os outros dois tipos não
    // têm este campo e vão directos ao "Para onde vai?".
    primeiroPasso: 'EscolherCarry',
    // O Carry diz a carroçaria e a capacidade no registo (14/09/26).
    perguntaCarga: true,
    chaveBotaoPedir: 'pedirCarryPreco',
    chaveMatricula: 'vehiclePlatePlaceholderCar',
    icone: 'carry',
    emoji: '🛻',
    // As ilustrações do Simão, uma por tema: fundo branco puro de dia, preto
    // puro de noite. Ver veiculoFotoCaixa no ecrã inicial.
    //
    // TROCADAS a 14/09/26 pelas que o Simão fez com as cores e o logótipo da
    // TimorgianaRide: as de 13/09 tinham sido tiradas da Internet, e o direito
    // de autor não é nosso. As novas vinham com o texto em espelho; entram
    // viradas na horizontal, para "Timorgiana Ride" se ler. Os originais ficam
    // em desenho/imagens (fora do repositório).
    imagens: {
      claro: require('../../assets/veiculos/carry-claro.jpg'),
      escuro: require('../../assets/veiculos/carry-escuro.jpg'),
    },
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
