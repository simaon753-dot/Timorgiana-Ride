import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';

// O RODAPÉ COM DÍLI — sistema de design TGA (14/09/26).
//
// A costa com o Cristo Rei recortada da referência do Simão, muito ténue por
// trás de "DÍLI · TIMOR-LESTE". Fecha os ecrãs longos (as
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
      {/* Sem logótipo (10/10/2026): o Simão quer a marca SÓ no ícone, na
          entrada e no «Entrar». */}
      <Text style={styles.lugar}>DÍLI · TIMOR-LESTE</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      // Mais baixo desde que o logótipo saiu (10/10/2026): com 170 ficava um
      // vazio entre o menu e o «DÍLI · TIMOR-LESTE» (captura do Simão).
      minHeight: 84,
      marginTop: spacing.md,
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
    lugar: { ...tipo.legenda, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
