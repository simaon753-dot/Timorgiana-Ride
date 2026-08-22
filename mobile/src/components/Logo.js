import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Marca TimorgianaRide.
//
// Quatro ficheiros, não um. Duas razões independentes:
//
// TAMANHO — a versão completa traz a palavra "timorgiana ride", que num
// cabeçalho de 40 px de altura seria uma mancha. Aí usa-se só o TGA.
//
// FUNDO — o logótipo tem teal escuro, e vários ecrãs desta app SÃO teal
// escuro. Sobre eles a palavra desaparecia. A variante clara sobe a
// luminosidade dos teais e deixa o coral em paz, que já contrasta.
const MARCA = require('../../assets/logo-marca.png');
const MARCA_CLARA = require('../../assets/logo-marca-claro.png');
const COMPLETO = require('../../assets/logo-completo.png');
const COMPLETO_CLARO = require('../../assets/logo-completo-claro.png');

export default function Logo({ size = 'lg', onTeal = false }) {
  const grande = size === 'lg';
  const fonte = grande
    ? onTeal
      ? COMPLETO_CLARO
      : COMPLETO
    : onTeal
      ? MARCA_CLARA
      : MARCA;

  return (
    <View style={styles.caixa}>
      <Image
        source={fonte}
        style={grande ? styles.grande : styles.pequeno}
        resizeMode="contain"
        accessibilityLabel="TimorgianaRide"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'center' },
  // Proporções dos ficheiros: marca 256×201, completo 512×447.
  grande: { width: 196, height: 171 },
  pequeno: { width: 54, height: 42 },
});
