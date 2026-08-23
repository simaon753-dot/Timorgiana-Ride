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

// Lugares que um passageiro pode pedir. Só faz sentido em carro — numa
// motorizada vai sempre uma pessoa.
export const LUGARES = [1, 2, 3, 4, 5, 6];

// Lista plana para a pesquisa, com a marca à frente do modelo: escrever
// "avanza" ou "toyota" tem de encontrar a mesma coisa.
export function listaPlana(tipo) {
  const fonte = tipo === 'motorbike' ? MOTORIZADAS : CARROS;
  const saida = [];
  for (const { marca, modelos } of fonte) {
    for (const nome of modelos) {
      saida.push({ nome, marca, etiqueta: `${marca} ${nome}` });
    }
  }
  return saida;
}
