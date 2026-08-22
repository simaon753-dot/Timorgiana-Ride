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

// `lugares` = passageiros que cabem, SEM contar o motorista. É esse o
// número que interessa a quem pede: "somos quatro" quer dizer quatro a
// entrar, não três mais o condutor.
export const CARROS = [
  {
    marca: 'Toyota',
    modelos: [
      { nome: 'Avanza', lugares: 6 },
      { nome: 'Innova', lugares: 6 },
      { nome: 'Rush', lugares: 6 },
      { nome: 'Kijang', lugares: 6 },
      { nome: 'Fortuner', lugares: 6 },
      { nome: 'Land Cruiser', lugares: 6 },
      { nome: 'Hilux', lugares: 4 },
      { nome: 'Vios', lugares: 4 },
      { nome: 'Corolla', lugares: 4 },
      { nome: 'Yaris', lugares: 4 },
    ],
  },
  {
    marca: 'Mitsubishi',
    modelos: [
      { nome: 'Xpander', lugares: 6 },
      { nome: 'Pajero Sport', lugares: 6 },
      { nome: 'Triton', lugares: 4 },
      { nome: 'L300', lugares: 6 },
    ],
  },
  {
    marca: 'Suzuki',
    modelos: [
      { nome: 'Ertiga', lugares: 6 },
      { nome: 'APV', lugares: 6 },
      { nome: 'Carry', lugares: 4 },
      { nome: 'Jimny', lugares: 3 },
    ],
  },
  {
    marca: 'Daihatsu',
    modelos: [
      { nome: 'Xenia', lugares: 6 },
      { nome: 'Terios', lugares: 6 },
      { nome: 'Gran Max', lugares: 6 },
      { nome: 'Ayla', lugares: 4 },
    ],
  },
  {
    marca: 'Nissan',
    modelos: [
      { nome: 'Grand Livina', lugares: 6 },
      { nome: 'X-Trail', lugares: 4 },
      { nome: 'Navara', lugares: 4 },
    ],
  },
  {
    marca: 'Isuzu',
    modelos: [
      { nome: 'D-Max', lugares: 4 },
      { nome: 'MU-X', lugares: 6 },
      { nome: 'Panther', lugares: 6 },
    ],
  },
  {
    marca: 'Mazda',
    modelos: [
      { nome: 'Mazda 2', lugares: 4 },
      { nome: 'Mazda 3', lugares: 4 },
      { nome: 'CX-5', lugares: 4 },
      { nome: 'BT-50', lugares: 4 },
    ],
  },
  {
    marca: 'Hyundai',
    modelos: [
      { nome: 'Accent', lugares: 4 },
      { nome: 'Tucson', lugares: 4 },
      { nome: 'Starex', lugares: 8 },
    ],
  },
  {
    marca: 'Ford',
    modelos: [
      { nome: 'Ranger', lugares: 4 },
      { nome: 'Everest', lugares: 6 },
    ],
  },
  {
    marca: 'Kia',
    modelos: [
      { nome: 'Picanto', lugares: 4 },
      { nome: 'Sportage', lugares: 4 },
      { nome: 'Carnival', lugares: 6 },
    ],
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

// Achar quantos lugares tem um modelo escolhido da lista, para não obrigar
// o motorista a responder ao que já sabemos.
export function lugaresDoModelo(nome) {
  for (const marca of CARROS) {
    const m = marca.modelos.find((x) => x.nome === nome);
    if (m) return m.lugares;
  }
  return null;
}

// Lista plana para a pesquisa, com a marca à frente do modelo: escrever
// "avanza" ou "toyota" tem de encontrar a mesma coisa.
export function listaPlana(tipo) {
  const fonte = tipo === 'motorbike' ? MOTORIZADAS : CARROS;
  const saida = [];
  for (const { marca, modelos } of fonte) {
    for (const m of modelos) {
      const nome = typeof m === 'string' ? m : m.nome;
      saida.push({
        nome,
        marca,
        etiqueta: `${marca} ${nome}`,
        lugares: typeof m === 'string' ? null : m.lugares,
      });
    }
  }
  return saida;
}
