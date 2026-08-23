import { useFonts } from 'expo-font';
// Importado peso a peso, pelo subcaminho, e NÃO pelo índice do pacote.
// O índice reexporta os 28 ficheiros (14 pesos × direito e itálico) e o
// Metro empacota-os todos, mesmo os que não são nomeados — porque um
// .ttf é um recurso, não código, e não é removido por não se usar.
// Pelo índice o pacote levava 1311 KB de letra; assim leva 368 KB.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';

// Tipografia TimorgianaRide — Plus Jakarta Sans.
//
// A app usava o tipo de letra do sistema, que no Android é Roboto. Nada
// está errado com o Roboto, mas é o que TODAS as apps usam por omissão —
// e uma app que usa a letra por omissão parece uma app feita por omissão.
//
// Plus Jakarta Sans, e não por gosto:
//   · Foi desenhado para a identidade da cidade de Jacarta. A proximidade
//     com a Indonésia não é decorativa: é de onde vêm os veículos, o
//     comércio e metade das referências visuais que circulam em Díli.
//   · Cobertura completa dos acentos do português e do ʼ do tétum.
//   · Números tabulares — preços, o código de recolha e os ganhos alinham
//     em coluna e não dançam quando mudam.
//   · Tem personalidade nas minúsculas sem sacrificar a leitura a 12 px,
//     que é onde vive metade desta interface.
//
// Quatro pesos e não sete: cada ficheiro pesa 92 KB e viaja em cada
// actualização pelo ar. Em Díli, isso paga-se em dados móveis.
export const FAMILIAS = {
  normal: 'PlusJakartaSans_400Regular',
  semi: 'PlusJakartaSans_600SemiBold',
  forte: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
};

export function useTipografia() {
  const [pronta, erro] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Se a letra falhar, a app SEGUE com a letra do sistema. Sem isto,
  // `pronta` ficava falso para sempre e o arranque prendia-se no ecrã de
  // carregamento — um telemóvel sem espaço ou um ficheiro corrompido
  // deixavam a aplicação inutilizável. Um tipo de letra é uma melhoria;
  // nunca pode ser uma condição para a app abrir.
  if (erro) {
    console.warn('Tipos de letra não carregaram; segue com a letra do sistema.', erro);
    return true;
  }
  return pronta;
}

// Escala com PAPÉIS, não com tamanhos soltos.
//
// Antes havia `fontSize.md` e cada ecrã decidia o peso e a altura de linha
// à sua maneira — daí a sensação de que cada ecrã era de uma app
// diferente. Aqui cada papel traz tamanho, peso, entrelinha e espaçamento
// juntos, porque é a combinação que dá o carácter, não o tamanho sozinho.
//
// A entrelinha é generosa de propósito: o português e o tétum fazem
// palavras longas, e linhas apertadas em ecrãs pequenos cansam.
export const tipo = {
  // Números grandes e momentos de abertura. Espaçamento negativo para o
  // texto grande não parecer solto.
  display: { fontFamily: FAMILIAS.extra, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  displayPequeno: { fontFamily: FAMILIAS.extra, fontSize: 27, lineHeight: 33, letterSpacing: -0.5 },

  // Títulos de ecrã.
  titulo: { fontFamily: FAMILIAS.forte, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  // Cabeçalhos de secção dentro de um ecrã.
  subtitulo: { fontFamily: FAMILIAS.semi, fontSize: 17, lineHeight: 23, letterSpacing: -0.1 },

  corpoForte: { fontFamily: FAMILIAS.semi, fontSize: 15, lineHeight: 22 },
  corpo: { fontFamily: FAMILIAS.normal, fontSize: 15, lineHeight: 22 },
  pequeno: { fontFamily: FAMILIAS.normal, fontSize: 13.5, lineHeight: 19 },
  legenda: { fontFamily: FAMILIAS.normal, fontSize: 12, lineHeight: 16 },

  // Etiquetas de secção. Maiúsculas e espaçadas: lêem-se como estrutura,
  // não como texto para ler.
  etiqueta: {
    fontFamily: FAMILIAS.extra,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Botões. Um pouco mais apertados do que o corpo, para o texto assentar
  // no centro do alvo.
  botao: { fontFamily: FAMILIAS.forte, fontSize: 15.5, lineHeight: 20, letterSpacing: 0.1 },

  // Tudo o que é número e muda: preços, ganhos, códigos, distâncias. As
  // figuras tabulares impedem que o texto salte quando o valor muda.
  numero: { fontFamily: FAMILIAS.extra, fontVariant: ['tabular-nums'] },
};

// Mantido para o código antigo enquanto os ecrãs migram, um a um.
export const fontSize = { xs: 12, sm: 13.5, md: 15, lg: 21, xl: 27, xxl: 34 };
