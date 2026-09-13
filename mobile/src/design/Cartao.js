import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, elevacao, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

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
//
// DAS REFERÊNCIAS "VIZ" (14/09/26) vieram três coisas, todas opcionais para
// o cartão continuar a servir quem o usava como estava:
//   · `titulo` (+ `icone`, `direita`) — um cabeçalho com ícone sozinho e um
//     lugar à direita (o "Edita", o saldo de dias);
//   · `lista` — o corpo sem margem interior, para as linhas de menu irem de
//     ponta a ponta com o traço entre elas;
//   · raio 20 em vez de 14, o dos cartões das referências.
export default function Cartao({
  nivel = 'plano',
  icone,
  titulo,
  direita,
  lista = false,
  compacto = false,
  children,
  style,
  onPress,
  ...resto
}) {
  const caixa = [
    styles.base,
    nivel === 'flutuante' && styles.flutuante,
    nivel === 'destaque' && styles.destaque,
    style,
  ];
  const dentro = (
    <>
      {titulo ? (
        <View style={styles.cabeca}>
          {icone ? <Icone nome={icone} tamanho={22} cor={colors.teal} /> : null}
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {direita}
        </View>
      ) : null}
      <View style={lista ? null : compacto ? styles.corpoCompacto : styles.corpo}>{children}</View>
    </>
  );

  if (!onPress) {
    return (
      <View style={caixa} {...resto}>
        {dentro}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [...caixa, pressed && styles.premido]}
      {...resto}
    >
      {dentro}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...elevacao.plana,
    },
    flutuante: { ...elevacao.flutuante },
    // O destaque marca-se com o contorno e não com um fundo colorido: um
    // cartão de fundo teal come o texto que tem dentro e obriga cada
    // elemento lá dentro a mudar de cor. O contorno destaca sem contagiar.
    destaque: { borderWidth: 1.5, borderColor: colors.teal },
    premido: { opacity: 0.94, transform: [{ scale: 0.995 }] },
    cabeca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    titulo: { ...tipo.subtitulo, color: colors.teal, flex: 1 },
    corpo: { padding: spacing.md },
    corpoCompacto: { padding: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
