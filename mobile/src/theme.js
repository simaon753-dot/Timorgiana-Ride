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

  escuro: {
    // O teal claro passa a ser a cor de destaque; o escuro fica para os
    // fundos que antes eram claros.
    teal: '#4FB3A5',
    tealDark: '#0E1F1C',
    tealLight: '#2F7D72',
    coral: '#FF7E5E',
    coralDark: '#FF9C82',
    paper: '#101A18',

    // `white` deixou de ser branco: é o que se usa para SUPERFÍCIES sobre
    // o fundo — cartões, campos, listas. No escuro, uma superfície é mais
    // clara que o fundo, não branca.
    white: '#182522',
    text: '#ECF2EF',
    textMuted: '#93A39D',
    border: '#27352F',
    inputBg: '#182522',

    danger: '#FF6B5E',
    success: '#4FBF8B',
    star: '#F4B400',

    onTeal: '#0B1513',
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
