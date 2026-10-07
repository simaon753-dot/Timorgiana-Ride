import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setSlowHandler } from '../api/client.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Faixa que aparece quando um pedido está a demorar. Nos planos gratuitos
// o servidor adormece e leva cerca de um minuto a acordar — sem este aviso
// o utilizador fica a olhar para um ecrã parado e conclui que avariou.
export default function SlowBanner() {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);
  // A app desenha de ponta a ponta (edgeToEdgeEnabled): sem esta margem, a
  // faixa ficava por baixo do relógio e dos ícones do telemóvel, com o texto
  // em cima deles (visto no Samsung, 07/10/2026).
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    setSlowHandler(setSlow);
    return () => setSlowHandler(null);
  }, []);

  if (!slow) return null;

  return (
    <View style={[styles.bar, { paddingTop: top + 8 }]}>
      <ActivityIndicator size="small" color={colors.white} />
      <Text style={styles.text}>{t('waking')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.coral,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
    },
    text: { ...tipo.corpoForte, color: colors.white },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
