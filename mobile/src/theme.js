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
  // A PALETA VEIO DAS MAQUETAS, e foi MEDIDA e não escolhida a olho.
  //
  // O Simão trouxe quatro maquetas da app e pediu para as seguir com rigor.
  // Em vez de aproximar as cores por semelhança, li os pixéis dos ficheiros:
  // o fundo da página, os dois extremos de cada degradé, o verde dos ícones,
  // as três cores de texto. Os valores abaixo são o que lá está.
  //
  // O QUE MUDOU MAIS não foi o verde — foi o FUNDO. Era um creme quente
  // (#F7F4EF), escolhido quando a app não tinha maquetas; passa a um branco
  // frio (#F2F6F9). É o que faz os cartões brancos destacarem-se em vez de
  // se confundirem com a página, e é metade da razão pela qual as maquetas
  // parecem mais limpas.
  //
  // O verde também se afastou do azul: #0E5C54 tinha um toque de turquesa,
  // #05604A é verde puro. E ganhou um irmão claro (#049455) que a paleta
  // antiga não tinha — é o verde dos ícones e dos valores em destaque, e sem
  // ele tudo o que era "verde" tinha de ser o mesmo verde escuro.
  claro: {
    teal: '#05604A',
    tealDark: '#04543F',
    // O VERDE CLARO É PARA ÍCONES, NÃO PARA TEXTO.
    //
    // Medido nas maquetas, onde pinta os ícones. Como texto sobre branco dá
    // 3,91:1 — abaixo do mínimo de 4,5 —, e as maquetas até concordam: os
    // valores em destaque ("1 min · 14:52") lá estão num verde bem mais
    // escuro (#075942), não neste. Para texto verde usa-se `teal`, que dá
    // 7,56:1. Um ícone é uma figura e basta-lhe 3:1; uma palavra tem de se
    // ler.
    tealLight: '#049455',
    // BRANCO SOBRE ESTE LARANJA SÓ EM TEXTO GRANDE.
    //
    // Dá 3,13:1 — passa a regra do texto grande (>=18,66px a negrito, que é
    // o caso do botão "Iniciar sessão" das maquetas) e falha a do texto
    // normal, que exige 4,5. Num rótulo pequeno sobre laranja usa-se texto
    // escuro, que dá 5,71:1.
    coral: '#FE5A22',
    coralDark: '#E04A16',
    paper: '#F2F6F9',

    white: '#FFFFFF',
    text: '#0B1E28',
    textMuted: '#5D6979',
    border: '#E4EAEE',
    inputBg: '#FFFFFF',

    danger: '#CC2228',
    // Mais escuro do que o verde dos ícones, pela mesma razão: `success`
    // aparece quase sempre em PALAVRAS ("aprovado", "documento válido"), e o
    // #049455 das maquetas não chega ao mínimo de leitura. Este dá 5,4:1.
    success: '#077A48',
    star: '#F4B400',

    onTeal: '#F2F8F6',

    // Tintes: painéis coloridos de fundo suave. Estavam escritos à mão
    // em catorze ficheiros, o que fazia deles o único sítio da app que
    // não sabia que existe um segundo tema.
    tintaTeal: '#F1F7F5',
    tintaCoral: '#FFF3EC',
    tintaPerigo: '#FDECEC',
    contornoCoral: '#F7DCCB',
    contornoPerigo: '#F3CCCD',
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
