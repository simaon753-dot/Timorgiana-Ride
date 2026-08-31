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

    // Tintes: painéis coloridos de fundo suave. Estavam escritos à mão
    // em catorze ficheiros, o que fazia deles o único sítio da app que
    // não sabia que existe um segundo tema.
    tintaTeal: '#F0F5F4',
    tintaCoral: '#FFF8F0',
    tintaPerigo: '#FDECEA',
    contornoCoral: '#F0E2CF',
    contornoPerigo: '#F0CFCB',
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
    // Este destaca-se o suficiente para se ver onde acaba cada bloco.
    //
    // Era #202825, com um toque de verde da marca. Passou a cinzento
    // neutro a pedido do Simão, que mostrou o modelo que quer: fundo
    // preto, superfícies cinzentas, letra branca. Sem tom nenhum.
    white: '#1C1C1E',

    // As letras. Eram laranja e passaram a branco.
    //
    // O laranja tinha sido escolha minha. Além de ser o que ele prefere,
    // branco sobre preto dá o contraste máximo possível — e quem lê isto
    // está a conduzir de noite.
    text: '#FFFFFF',
    // Secundário em cinzento neutro, como no modelo. Dá 6,4:1 sobre preto:
    // passa com folga o mínimo de 4,5:1, portanto continua a ler-se como
    // texto e não como coisa desligada.
    textMuted: '#8E8E93',

    // O contorno faz metade do trabalho de separar os blocos, por isso é
    // mais claro do que a superfície onde assenta. Neutralizado também: um
    // contorno esverdeado à volta de cinzentos neutros dá-se a ver, e fazia
    // o preto parecer ter cor.
    border: '#38383A',
    inputBg: '#1C1C1E',

    // Vermelho afastado do laranja, senão o perigo confunde-se com texto
    // normal — que é o pior sítio para uma confusão.
    danger: '#FF5252',
    success: '#4FD4AC',
    star: '#F4B400',

    // Texto sobre o verde.
    onTeal: '#04120E',

    // Os mesmos painéis, de noite. Não são os claros com o brilho
    // baixado: são escuros com o MESMO desvio de matiz, para o painel de
    // perigo continuar a ler-se como perigo. Todos verificados a
    // destacar-se do preto — um tinte que se confunde com o fundo não é
    // um painel, é um erro de desenho que ninguém consegue apontar.
    tintaTeal: '#14201C',
    tintaCoral: '#2C1B14',
    tintaPerigo: '#2A1413',
    contornoCoral: '#4A3324',
    contornoPerigo: '#5A2A26',
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

// Espaçamento em passos de 4, com um passo extra em baixo: 2 px existe
// para separações finas onde 4 já é uma folga visível.
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// Raios menos arredondados do que antes. Cantos muito redondos lêem-se
// como aplicação de lazer; esta é uma app em que se confia dinheiro e
// segurança pessoal. `lg` desceu de 18 para 14 por essa razão.
export const radius = { xs: 6, sm: 10, md: 12, lg: 14, xl: 20, pill: 999 };

// Elevação. Três níveis e não mais — cada sombra extra é uma decisão que
// alguém tem de repetir noutro ecrã, e é assim que as interfaces perdem
// coerência. As sombras são MUITO subtis de propósito: a hierarquia faz-se
// com espaço e tipografia, e a sombra só confirma o que já se percebeu.
export const elevacao = {
  // Cartões pousados na página.
  plana: {
    shadowColor: '#0B1F1B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Elementos que flutuam sobre o mapa.
  flutuante: {
    shadowColor: '#0B1F1B',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  // Painéis que sobem do fundo do ecrã.
  painel: {
    shadowColor: '#0B1F1B',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
};

// Mantido enquanto os ecrãs migram para os papéis tipográficos.
export const fontSize = { xs: 12, sm: 13.5, md: 15, lg: 21, xl: 27, xxl: 34 };

export const theme = { colors, spacing, radius, fontSize };
export default theme;
