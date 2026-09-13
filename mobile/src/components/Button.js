import React from 'react';
import Degrade from '../design/Degrade.js';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, elevacao, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Botão.
//
// Hierarquia com três degraus e não quatro variantes soltas:
//   principal  — a acção que o ecrã existe para fazer. Coral, com peso.
//   secundária — uma acção legítima mas não a principal. Teal.
//   contorno   — alternativa reconhecida (cancelar, recusar).
//   discreto   — saída ou navegação. Sem caixa.
//
// Só deve haver UM botão principal por ecrã. Dois coral lado a lado não
// dão duas acções importantes — dão zero, porque nenhuma se destaca.
//
// As variantes são calculadas a cada desenho e não fixadas ao carregar o
// módulo: fixadas, ficavam com as cores do tema de arranque e o botão era
// o único elemento que não mudava ao trocar de paleta.
function variantes() {
  return {
    primary: { fundo: colors.coral, tinta: '#22100A', contorno: colors.coral, elevar: true },
    secondary: { fundo: colors.teal, tinta: colors.onTeal, contorno: colors.teal, elevar: true },
    outline: { fundo: 'transparent', tinta: colors.teal, contorno: colors.teal },
    ghost: { fundo: 'transparent', tinta: colors.teal, contorno: 'transparent' },
    perigo: { fundo: colors.danger, tinta: colors.onDanger, contorno: colors.danger, elevar: true },
    // O botão principal das referências TGA: teal em degradé, texto claro.
    // Desenhado com o Degrade (react-native-svg, que já está no binário) e
    // não com o expo-linear-gradient, que é nativo e obrigaria a APK novo.
    marca: {
      fundo: 'transparent',
      tinta: colors.onDegrade,
      contorno: 'transparent',
      elevar: true,
      degrade: [colors.degradeDe, colors.degradePara],
    },
  };
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  // 'grande' para o CTA principal de um ecrã; 'normal' para o resto.
  tamanho = 'normal',
  icone,
  // Seta ou ícone depois do texto ("Kontinua →").
  iconeDireita,
  style,
}) {
  const inactivo = disabled || loading;
  const v = variantes()[variant] || variantes().primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.base,
        tamanho === 'grande' && styles.grande,
        { backgroundColor: v.fundo, borderColor: v.contorno },
        // A sombra só nos botões com fundo: um botão transparente com
        // sombra parece um erro de desenho, não uma elevação.
        v.elevar && !inactivo && elevacao.plana,
        pressed && !inactivo && styles.premido,
        v.degrade && styles.comDegrade,
        inactivo && styles.inactivo,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: loading }}
    >
      {v.degrade ? (
        <Degrade
          de={v.degrade[0]}
          para={v.degrade[1]}
          diagonal={false}
          estilo={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={v.tinta} />
      ) : (
        <View style={styles.linha}>
          {icone ? <Text style={[styles.icone, { color: v.tinta }]}>{icone}</Text> : null}
          <Text style={[styles.rotulo, { color: v.tinta }]} numberOfLines={1}>
            {title}
          </Text>
          {iconeDireita ? (
            <Text style={[styles.icone, styles.iconeDireita, { color: v.tinta }]}>
              {iconeDireita}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    comDegrade: { overflow: 'hidden', borderWidth: 0 },
    iconeDireita: { marginRight: 0, marginLeft: 8 },
    base: {
      minHeight: 52,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    grande: { minHeight: 60, borderRadius: radius.xl },
    // Escala quase imperceptível: o dedo sente a resposta, o olho não vê
    // um salto. Exagerar aqui é o que faz uma app parecer um brinquedo.
    premido: { opacity: 0.9, transform: [{ scale: 0.985 }] },
    inactivo: { opacity: 0.45 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    icone: { fontSize: 17 },
    rotulo: { ...tipo.botao },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
