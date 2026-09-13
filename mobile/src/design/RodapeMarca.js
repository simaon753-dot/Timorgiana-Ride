import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';
import Logo from '../components/Logo.js';

// O RODAPÉ COM DÍLI — sistema de design TGA (14/09/26).
//
// A costa com o Cristo Rei recortada da referência do Simão, muito ténue por
// trás do logótipo e de "DÍLI · TIMOR-LESTE". Fecha os ecrãs longos (as
// definições, o painel) com a identidade local que as referências pedem, sem
// lema — decisão do Simão.
//
// O texto não se traduz: é o nome da marca e o nome do sítio.
const DILI = require('../../assets/entrada/dili.webp');

export default function RodapeMarca() {
  return (
    <View style={styles.caixa}>
      <Image
        source={DILI}
        style={styles.paisagem}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Logo size="sm" />
      <Text style={styles.nome}>TimorgianaRide</Text>
      <Text style={styles.lugar}>DÍLI · TIMOR-LESTE</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      minHeight: 170,
      marginTop: spacing.xl,
      paddingBottom: spacing.md,
      overflow: 'hidden',
    },
    paisagem: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      aspectRatio: 914 / 506,
      opacity: paletaEmUso() === 'escuro' ? 0.12 : 0.22,
    },
    nome: { ...tipo.subtitulo, color: colors.teal, marginTop: spacing.xs },
    lugar: { ...tipo.legenda, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
