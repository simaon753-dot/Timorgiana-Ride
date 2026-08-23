import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  colors,
  radius,
  spacing,
  elevacao,
  registarEstilos,
} from "../theme.js";

// Cartão — a superfície onde quase tudo assenta.
//
// Dez ecrãs desenhavam isto à mão, cada um com o seu raio, o seu
// preenchimento e a sua ideia de sombra. Nenhum estava errado sozinho;
// juntos é que faziam a app parecer montada por várias pessoas que nunca
// falaram entre si.
//
// Três níveis, e não mais:
//   'plano'     — informação pousada na página. O caso normal.
//   'flutuante' — algo que paira sobre o mapa.
//   'destaque'  — o cartão que responde à pergunta do ecrã. Um por ecrã.
//
// O contorno faz aqui mais trabalho do que a sombra, e de propósito: no
// tema escuro o fundo é preto e uma sombra sobre preto não existe. Um
// desenho que só se segura com sombras parte-se metade do tempo.
export default function Cartao({
  nivel = "plano",
  children,
  style,
  onPress,
  compacto = false,
  ...resto
}) {
  const corpo = [
    styles.base,
    compacto && styles.compacto,
    nivel === "flutuante" && styles.flutuante,
    nivel === "destaque" && styles.destaque,
    style,
  ];

  if (!onPress) {
    return (
      <View style={corpo} {...resto}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [...corpo, pressed && styles.premido]}
      {...resto}
    >
      {children}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      ...elevacao.plana,
    },
    compacto: { padding: spacing.sm },
    flutuante: { borderRadius: radius.xl, ...elevacao.flutuante },
    // O destaque marca-se com o contorno e não com um fundo colorido: um
    // cartão de fundo teal come o texto que tem dentro e obriga cada
    // elemento lá dentro a mudar de cor. O contorno destaca sem contagiar.
    destaque: { borderWidth: 1.5, borderColor: colors.teal },
    premido: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
