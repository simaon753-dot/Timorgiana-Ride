// Modelos de veículos para escolher em vez de escrever à mão.
//
// ⚠️ ESTA LISTA NÃO VEM DE UM REGISTO OFICIAL. Foi montada a partir do
// mercado indonésio, que é de onde vem a esmagadora maioria dos veículos
// que circulam em Díli, mais os modelos que o Simão indicou. Precisa de
// ser corrigida por quem conhece a rua — o que falta e o que sobra.
//
// Há sempre "Outro", com escrita livre. Uma lista que não tem a mota de
// alguém é pior do que campo nenhum: obriga a pessoa a mentir ou a
// desistir do registo.

export const MOTORIZADAS = [
  {
    marca: 'Honda',
    modelos: [
      'Beat',
      'Beat Street',
      'Beat Deluxe',
      'Vario 125',
      'Vario 160',
      'Scoopy',
      'Supra X 125',
      'Revo',
      'PCX 160',
      'CB150 Verza',
      'CRF150',
    ],
  },
  {
    marca: 'Yamaha',
    modelos: [
      'Mio J',
      'Mio Z',
      'Mio M3',
      'Mio Sporty',
      'NMAX',
      'Aerox',
      'Vega Force',
      'Jupiter Z',
      'X-Ride',
      'Fino',
    ],
  },
  {
    marca: 'Suzuki',
    modelos: ['Nex II', 'Address', 'Satria F150', 'Smash'],
  },
  {
    marca: 'Kawasaki',
    modelos: ['KLX 150', 'Ninja 250'],
  },
  {
    marca: 'TVS',
    modelos: ['Dazz', 'Rockz'],
  },
];

// Só marcas e modelos. Os lugares NÃO estão aqui de propósito: quantos
// passageiros cabem depende da versão e do estado do carro, e um número
// meu a preencher o campo sozinho gravaria um palpite como se fosse
// resposta do motorista. É ele que responde.
export const CARROS = [
  {
    marca: 'Toyota',
    modelos: [
      'Avanza',
      'Innova',
      'Rush',
      'Kijang',
      'Fortuner',
      'Land Cruiser',
      'Hilux',
      'Vios',
      'Corolla',
      'Yaris',
    ],
  },
  {
    marca: 'Mitsubishi',
    modelos: ['Xpander', 'Pajero Sport', 'Triton', 'L300'],
  },
  {
    marca: 'Suzuki',
    modelos: ['Ertiga', 'APV', 'Carry', 'Jimny'],
  },
  {
    marca: 'Daihatsu',
    modelos: ['Xenia', 'Terios', 'Gran Max', 'Ayla'],
  },
  {
    marca: 'Nissan',
    modelos: ['Grand Livina', 'X-Trail', 'Navara'],
  },
  {
    marca: 'Isuzu',
    modelos: ['D-Max', 'MU-X', 'Panther'],
  },
  {
    marca: 'Mazda',
    modelos: ['Mazda 2', 'Mazda 3', 'CX-5', 'BT-50'],
  },
  {
    marca: 'Hyundai',
    modelos: ['Accent', 'Tucson', 'Starex'],
  },
  {
    marca: 'Ford',
    modelos: ['Ranger', 'Everest'],
  },
  {
    marca: 'Kia',
    modelos: ['Picanto', 'Sportage', 'Carnival'],
  },
];

// Cores com amostra. O nome traduz-se; o quadrado não precisa de língua
// nenhuma, e é por ele que a maioria vai escolher.
export const CORES = [
  { id: 'branco', hex: '#FFFFFF' },
  { id: 'preto', hex: '#1A1A1A' },
  { id: 'prateado', hex: '#C4C8CB' },
  { id: 'cinzento', hex: '#6E7477' },
  { id: 'vermelho', hex: '#C62828' },
  { id: 'azul', hex: '#1565C0' },
  { id: 'verde', hex: '#2E7D32' },
  { id: 'amarelo', hex: '#F9A825' },
  { id: 'laranja', hex: '#EF6C00' },
  { id: 'castanho', hex: '#6D4C41' },
];

// AS OUTRAS CORES, atrás do botão "Outra" (14/09/26, pedido do Simão).
//
// As dez de cima são as que a maioria dos veículos tem, e ficam à vista. Estas
// cobrem o resto — dourado, pérola, bordô, dois azuis, dois verdes… — para o
// motorista ESCOLHER a sua em vez de a escrever: o que se escreve não se
// traduz nem tem amostra, e o passageiro procura pela cor.
//
// Ids só com letras minúsculas: a chave de tradução é `cor_<id>`, e o
// verificar-tipos confirma que todas existem nas três línguas.
export const CORES_OUTRAS = [
  { id: 'perola', hex: '#F2EEE3' },
  { id: 'creme', hex: '#EFE3C2' },
  { id: 'bege', hex: '#CDB891' },
  { id: 'champanhe', hex: '#D8C8A8' },
  { id: 'dourado', hex: '#C9A23F' },
  { id: 'bronze', hex: '#8C6239' },
  { id: 'cobre', hex: '#B5653A' },
  { id: 'bordo', hex: '#6E1F2E' },
  { id: 'rosa', hex: '#EC8FB2' },
  { id: 'lilas', hex: '#B79FDA' },
  { id: 'roxo', hex: '#6A3D9A' },
  { id: 'azulclaro', hex: '#6CB4EE' },
  { id: 'azulescuro', hex: '#1B2B5C' },
  { id: 'turquesa', hex: '#1FA6A0' },
  { id: 'verdeclaro', hex: '#8DC45A' },
  { id: 'verdeescuro', hex: '#1D4B2F' },
  { id: 'oliva', hex: '#6F6A2F' },
  { id: 'grafite', hex: '#3B3F42' },
];

export const TODAS_AS_CORES = [...CORES, ...CORES_OUTRAS];

// Lugares que um passageiro pode pedir. Só faz sentido em carro — numa
// motorizada vai sempre uma pessoa.
export const LUGARES = [1, 2, 3, 4, 5, 6];

// Carry com pessoas: até 15, decisão do Simão (13/09/26). O MESMO número de
// MAX_PESSOAS_CARRY em backend/src/config.js — se um mudar, o outro também.
export const LUGARES_CARRY = Array.from({ length: 15 }, (_, i) => i + 1);

// Lista plana para a pesquisa, com a marca à frente do modelo: escrever
// "avanza" ou "toyota" tem de encontrar a mesma coisa.
// VEÍCULOS DE CARGA que circulam em Díli.
//
// Mesma ressalva das outras duas listas: não vem de registo oficial nenhum. A
// esmagadora maioria são veículos indonésios de cabina avançada — o "carry" a
// que o serviço deve o nome é literalmente o Suzuki Carry, tão comum aqui que
// virou o nome da categoria, como "gilete" para lâmina.
//
// ESTA LISTA VEIO DO SIMÃO, a 11/09/2026, e substituiu a minha.
//
// A minha tinha dezoito modelos montados do mercado indonésio — L300, Triton,
// Dyna, Hiace, Navara, Elf, Traga, Hijet, Luxio, APV, Mega Carry. Plausíveis
// todos, verificados nenhum: eu não conheço a rua de Díli.
//
// A dele tem sete, um por marca, e é o que ele vê a trabalhar. Uma lista curta
// e certa vale mais do que uma comprida e adivinhada: o registo faz-se uma vez
// e a pessoa procura o SEU veículo, não uma amostra do mercado.
//
// E há sempre "Outro", com escrita livre: uma lista que não tem o veículo de
// alguém obriga essa pessoa a mentir ou a desistir do registo.
export const CARGA = [
  { marca: 'Suzuki', modelos: ['Carry'] },
  { marca: 'Daihatsu', modelos: ['Gran Max Pickup'] },
  { marca: 'Mitsubishi', modelos: ['Colt', 'L200'] },
  { marca: 'Toyota', modelos: ['Hilux'] },
  { marca: 'Isuzu', modelos: ['D-Max'] },
  { marca: 'Mazda', modelos: ['BT-50'] },
  { marca: 'Ford', modelos: ['Ranger'] },
];

// A CARROÇARIA E A CAPACIDADE do Carry (14/09/26) — as mesmas listas do
// servidor (config.js). A capacidade decide que pedidos de bens chegam a cada
// veículo; as notas dizem-no em coisas que se vêem, não em quilos.
export const CARROCERIAS = [
  { id: 'aberta', chave: 'carroceriaAberta' },
  { id: 'coberta', chave: 'carroceriaCoberta' },
  { id: 'fechada', chave: 'carroceriaFechada' },
  { id: 'caixa', chave: 'carroceriaCaixa' },
];
export const CAPACIDADES = [
  { id: 'pequena', chave: 'capacidadePequena', nota: 'capacidadePequenaNota' },
  { id: 'media', chave: 'capacidadeMedia', nota: 'capacidadeMediaNota' },
  { id: 'grande', chave: 'capacidadeGrande', nota: 'capacidadeGrandeNota' },
];

// A carga cabe no veículo? A mesma regra do servidor (capacidade.js): sem
// capacidade conhecida, cabe — quem se registou antes deste campo continua a
// ver tudo até o indicar.
const ORDEM_VOLUME = { pequeno: 1, medio: 2, grande: 3 };
const ORDEM_CAPACIDADE = { pequena: 1, media: 2, grande: 3 };
export function cargaCabe(volume, capacidade) {
  if (!ORDEM_VOLUME[volume] || !ORDEM_CAPACIDADE[capacidade]) return true;
  return ORDEM_VOLUME[volume] <= ORDEM_CAPACIDADE[capacidade];
}

export function listaPlana(tipo) {
  // Três listas e não duas. Antes era um ternário — tudo o que não fosse mota
  // caía nos carros de passageiros, e um Suzuki Carry aparecia numa lista de
  // berlinas onde nunca esteve.
  const fonte = tipo === 'motorbike' ? MOTORIZADAS : tipo === 'carry' ? CARGA : CARROS;
  const saida = [];
  for (const { marca, modelos } of fonte) {
    for (const nome of modelos) {
      saida.push({ nome, marca, etiqueta: `${marca} ${nome}` });
    }
  }
  return saida;
}
