import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Mapa estado -> aparência
export function statusMeta(status) {
  switch (status) {
    case 'requested':
      return { key: 'statusRequested', bg: '#FFF1E8', fg: colors.coralDark, icon: '⏳' };
    case 'accepted':
      return { key: 'statusAccepted', bg: '#E9F2F0', fg: colors.teal, icon: '🚗' };
    case 'arriving':
      return { key: 'statusArriving', bg: '#E9F2F0', fg: colors.teal, icon: '📍' };
    case 'in_progress':
      return { key: 'statusInProgress', bg: '#E9F2F0', fg: colors.teal, icon: '🛣️' };
    case 'completed':
      return { key: 'statusCompleted', bg: '#E4F1EA', fg: colors.success, icon: '✓' };
    case 'cancelled':
      return { key: 'statusCancelled', bg: '#FBEAE8', fg: colors.danger, icon: '✕' };
    default:
      return { key: 'statusRequested', bg: colors.border, fg: colors.text, icon: '•' };
  }
}

export default function StatusBadge({ status }) {
  const { t } = useI18n();
  const m = statusMeta(status);
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <Text style={[styles.text, { color: m.fg }]}>
        {m.icon} {t(m.key)}
      </Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.pill,
    },
    text: { ...tipo.corpoForte },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
