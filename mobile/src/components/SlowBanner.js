import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { setSlowHandler } from '../api/client.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize } from '../theme.js';

// Faixa que aparece quando um pedido está a demorar. Nos planos gratuitos
// o servidor adormece e leva cerca de um minuto a acordar — sem este aviso
// o utilizador fica a olhar para um ecrã parado e conclui que avariou.
export default function SlowBanner() {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setSlowHandler(setSlow);
    return () => setSlowHandler(null);
  }, []);

  if (!slow) return null;

  return (
    <View style={styles.bar}>
      <ActivityIndicator size="small" color={colors.white} />
      <Text style={styles.text}>{t('waking')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  text: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
});
