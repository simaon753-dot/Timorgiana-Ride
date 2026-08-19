import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StarRating from './StarRating.js';
import Button from './Button.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

// Painel de avaliação mostrado quando a viagem fica concluída.
export default function RatingPanel({ ride, role }) {
  const { t } = useI18n();
  const { rateRide, rated } = useRides();
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);

  if (rated) {
    return (
      <View style={styles.box}>
        <Text style={styles.thanks}>{t('ratingThanks')}</Text>
      </View>
    );
  }

  async function submit() {
    if (stars < 1) return;
    setBusy(true);
    try {
      await rateRide(ride.id, stars);
    } catch {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('rateTitle')}</Text>
      <Text style={styles.subtitle}>
        {role === 'passenger' ? t('rateDriver') : t('ratePassenger')}
      </Text>
      <View style={{ marginVertical: spacing.md }}>
        <StarRating value={stars} onChange={setStars} />
      </View>
      <Button title={t('submitRating')} onPress={submit} loading={busy} disabled={stars < 1} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.lg,
    backgroundColor: '#FFF8F0',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F0E2CF',
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  thanks: { fontSize: fontSize.md, fontWeight: '700', color: colors.success, textAlign: 'center' },
});
