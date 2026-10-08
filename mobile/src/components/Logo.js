import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Marca HAKAT (a app chamava-se HAKAT até 07/10/2026).
//
// Quatro ficheiros, não um. Duas razões independentes:
//
// TAMANHO — desde 08/10/2026 as duas medidas mostram a palavra "HAKAT"
// (pedido dele: o H sozinho no início e no perfil não dizia o nome). A
// pequena tem 23 dp de altura; o H sozinho ficou só para o painel e o
// favicon.
//
// FUNDO — o logótipo tem teal escuro, e vários ecrãs desta app SÃO teal
// escuro. Sobre eles a palavra desaparecia. A variante clara sobe a
// luminosidade dos teais e deixa o coral em paz, que já contrasta.
const COMPLETO = require('../../assets/logo-completo.png');
const COMPLETO_CLARO = require('../../assets/logo-completo-claro.png');

export default function Logo({ size = 'lg', onTeal = false }) {
  const grande = size === 'lg';
  const fonte = onTeal ? COMPLETO_CLARO : COMPLETO;

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
  // Proporções dos ficheiros (scripts/gerar-logotipos.py): marca 221×200,
  // completo 768×134 — só as letras desde 08/10/2026.
  grande: { width: 264, height: 46 },
  pequeno: { width: 132, height: 23 },
});
