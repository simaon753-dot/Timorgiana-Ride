import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Saída de um ecrã empilhado.
//
// Existe como componente e não como quatro cópias porque foi esquecido uma
// vez: no Android o sistema tem botão de voltar e o esquecimento não se
// nota; no iPhone a pessoa fica presa. Um ecrã sem saída visível é um ecrã
// partido em metade dos telemóveis.
export default function Voltar({ navigation, style }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={12}
      style={[styles.area, style]}
      accessibilityRole="button"
      accessibilityLabel={t('back')}
    >
      <Text style={styles.texto} numberOfLines={1}>
        ‹ {t('back')}
      </Text>
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    area: { alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingRight: spacing.md },
    texto: { ...tipo.subtitulo, color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
