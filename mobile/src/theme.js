// Identidade visual TimorgianaRide
// Paleta: teal (primária), coral (ação/destaque), papel (fundo)
//
// DUAS PALETAS, não duas marcas. A escura é a mesma identidade vista de
// noite: o teal sobe de luminosidade para se ler sobre fundo escuro, o
// coral mantém-se porque já contrasta com os dois. Não é uma inversão
// automática — um preto invertido de um papel quente dá um azul frio que
// não se parece nada com esta marca.
//
// A razão de existir: os motoristas usam isto ao volante, de noite. Um
// ecrã branco a 100% no escuro cega quem conduz.

export const PALETAS = {
  claro: {
    teal: '#0E5C54',
    tealDark: '#0A463F',
    tealLight: '#1C7A70',
    coral: '#FF6B4A',
    coralDark: '#E85531',
    paper: '#F7F4EF',

    white: '#FFFFFF',
    text: '#1C2421',
    textMuted: '#6B756F',
    border: '#E2DDD4',
    inputBg: '#FFFFFF',

    danger: '#C0392B',
    success: '#2E7D5B',
    star: '#F4B400',

    onTeal: '#F2F8F6',
  },

  // Escolhida pelo Simão: letras laranja, fundo preto, e o verde da marca
  // em tudo o resto. Não é a paleta clara com o brilho baixado — é uma
  // identidade própria para a noite, que é quando os motoristas conduzem.
  escuro: {
    // O verde é o "resto": botões, crachás, contornos, destaques.
    teal: '#2E9E7E',
    tealDark: '#0E5C54',
    tealLight: '#4FD4AC',

    coral: '#FF8552',
    coralDark: '#FF6B2C',

    // Preto. Não um cinzento escuro — preto, como pedido.
    paper: '#000000',
    // `white` são as SUPERFÍCIES sobre o fundo: cartões, campos, listas.
    // O fundo é preto, por isso a superfície tem de ser um pouco mais
    // clara — com o primeiro valor que escolhi (#111614) os cartões
    // desapareciam no fundo e o ecrã ficava uma mancha sem estrutura.
    // Este destaca-se o suficiente para se ver onde acaba cada bloco, e
    // mantém o toque de verde da marca.
    white: '#202825',

    // As letras.
    text: '#FF8552',
    // O secundário é o mesmo laranja mais apagado, e não um cinzento: um
    // cinzento ao lado de laranja lê-se como texto desactivado.
    textMuted: '#C97F55',

    // O contorno faz metade do trabalho de separar os blocos, por isso é
    // mais claro do que a superfície onde assenta.
    border: '#3D4C45',
    inputBg: '#202825',

    // Vermelho afastado do laranja, senão o perigo confunde-se com texto
    // normal — que é o pior sítio para uma confusão.
    danger: '#FF5252',
    success: '#4FD4AC',
    star: '#F4B400',

    // Texto sobre o verde.
    onTeal: '#04120E',
  },
};

// Objecto vivo. As folhas de estilo são criadas a partir dele e recriadas
// quando ele muda — por isso mantém-se a MESMA referência e só se trocam
// as propriedades. Substituí-lo partia todos os `import { colors }`.
export const colors = { ...PALETAS.claro };

let paletaActual = 'claro';
const ouvintes = new Set();

// Cada ficheiro de ecrã regista aqui como reconstruir as suas folhas de
// estilo. Sem isto, o StyleSheet.create de cada módulo guardava as cores
// do arranque para sempre — é avaliado uma vez e nunca mais.
export function registarEstilos(reconstruir) {
  ouvintes.add(reconstruir);
  return () => ouvintes.delete(reconstruir);
}

export function aplicarPaleta(nome) {
  const p = PALETAS[nome] || PALETAS.claro;
  paletaActual = PALETAS[nome] ? nome : 'claro';
  Object.assign(colors, p);
  for (const reconstruir of ouvintes) reconstruir();
}

export function paletaEmUso() {
  return paletaActual;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34 };

export const theme = { colors, spacing, radius, fontSize };
export default theme;
