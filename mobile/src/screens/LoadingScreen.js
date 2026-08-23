import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import { colors, spacing, registarEstilos } from '../theme.js';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Logo onTeal />
      <ActivityIndicator color={colors.onTeal} style={{ marginTop: spacing.xl }} />
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
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
