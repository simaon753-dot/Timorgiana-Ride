import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// A MOLDURA DE UMA JANELA <Modal>, afastada das barras do sistema.
//
// Recebe o mesmo que o SafeAreaView (`style` e `edges`, em lista), mas dentro
// de um <Modal> o SafeAreaView não serve no iPhone. Viu-se a 16/09/2026, na
// primeira vez que a app correu num iPhone: no mapa em ecrã inteiro, o mapa
// passava por baixo das horas e da bateria, e o ✕ ficava no canto de cima à
// direita. É por esse canto que o iPhone abre o Centro de Controlo, e fechar o
// mapa era uma luta.
//
// A causa: no iPhone o Modal é uma janela à parte, que entra a deslizar de fora
// do ecrã. O SafeAreaView mede as margens da própria vista, e ali mediu zero.
//
// Aqui as margens vêm da raiz da app (o SafeAreaProvider do App.js), que as
// mede no ecrã inteiro e acerta. No Android nada muda: continua a ser o
// SafeAreaView de sempre, que lá funciona.
//
// Soma à margem o padding que o `style` já traga, como o SafeAreaView faz, para
// um painel com folga por dentro não a perder no iPhone.
export default function MolduraModal({
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  children,
  ...resto
}) {
  const margens = useSafeAreaInsets();

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={style} edges={edges} {...resto}>
        {children}
      </SafeAreaView>
    );
  }

  const s = StyleSheet.flatten(style) || {};
  const folga = (lado, eixo) => s[`padding${lado}`] ?? s[`padding${eixo}`] ?? s.padding ?? 0;
  const soma = {};
  if (edges.includes('top')) soma.paddingTop = folga('Top', 'Vertical') + margens.top;
  if (edges.includes('bottom')) soma.paddingBottom = folga('Bottom', 'Vertical') + margens.bottom;
  if (edges.includes('left')) soma.paddingLeft = folga('Left', 'Horizontal') + margens.left;
  if (edges.includes('right')) soma.paddingRight = folga('Right', 'Horizontal') + margens.right;

  return (
    <View style={[style, soma]} {...resto}>
      {children}
    </View>
  );
}
