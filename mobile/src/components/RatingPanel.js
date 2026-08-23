import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StarRating from './StarRating.js';
import Button from './Button.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

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

const criarEstilos = () =>
  StyleSheet.create({
    box: {
      marginTop: spacing.lg,
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      padding: spacing.lg,
      alignItems: 'center',
    },
    title: { ...tipo.subtitulo, color: colors.text },
    subtitle: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    thanks: { ...tipo.subtitulo, color: colors.success, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
