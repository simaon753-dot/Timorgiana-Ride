import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Marca HAKAT (a app chamava-se HAKAT até 07/10/2026).
//
// Quatro ficheiros, não um. Duas razões independentes:
//
// TAMANHO — a versão completa traz a palavra "HAKAT", que num cabeçalho de
// 40 px de altura seria uma mancha. Aí usa-se só o H com a estrada.
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
  const fonte = grande ? (onTeal ? COMPLETO_CLARO : COMPLETO) : onTeal ? MARCA_CLARA : MARCA;

  return (
    <View style={styles.caixa}>
      <Image
        source={fonte}
        style={grande ? styles.grande : styles.pequeno}
        resizeMode="contain"
        accessibilityLabel="HAKAT"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'center' },
  // Proporções dos ficheiros (scripts/gerar-logotipos.py): marca 328×200,
  // completo 512×389.
  grande: { width: 196, height: 149 },
  pequeno: { width: 69, height: 42 },
});
