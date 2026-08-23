import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';

export default function ChatButton({ navigation }) {
  const { t } = useI18n();
  const { unread } = useRides();
  return (
    <Pressable style={styles.btn} onPress={() => navigation.navigate('Chat')}>
      <Text style={styles.text}>💬 {t('openChat')}</Text>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  text: { color: colors.teal, fontWeight: '700', fontSize: fontSize.md },
  badge: {
    backgroundColor: colors.coral,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '800' },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
