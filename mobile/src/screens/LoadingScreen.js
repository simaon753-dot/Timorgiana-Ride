import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Carregando from '../design/Carregando.js';
import Tais from '../design/Tais.js';
import { colors, spacing, registarEstilos } from '../theme.js';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Logo onTeal />
      <View style={{ marginTop: spacing.xl }}>
        <Carregando tamanho={56} sobreEscuro />
      </View>
      {/* Uma linha de tais no fundo. É a única decoração de todo o ecrã, e
          é o primeiro sítio onde a marca fala sem usar palavras. */}
      <Tais altura={4} sobreEscuro style={styles.tais} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tais: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
