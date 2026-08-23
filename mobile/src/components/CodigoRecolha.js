import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// O código que o passageiro diz ao motorista.
//
// Grande e espaçado de propósito: vai ser lido em voz alta à porta de um
// carro, muitas vezes de noite e com barulho de rua. Quatro algarismos
// pequenos obrigariam a passar o telemóvel para a mão do motorista, o que
// é exactamente o que não queremos.
export default function CodigoRecolha({ codigo }) {
  const { t } = useI18n();
  if (!codigo) return null;

  return (
    <View style={styles.caixa}>
      <Text style={styles.rotulo}>{t('pickupCodeLabel')}</Text>
      <Text style={styles.numero}>{String(codigo).split('').join(' ')}</Text>
      <Text style={styles.ajuda}>{t('pickupCodeHelp')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  caixa: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  rotulo: {
    color: colors.onTeal,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  numero: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  ajuda: { color: colors.onTeal, fontSize: fontSize.xs, opacity: 0.85, textAlign: 'center' },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
