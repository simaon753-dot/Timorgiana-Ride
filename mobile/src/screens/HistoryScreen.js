import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import StatusBadge from '../components/StatusBadge.js';
import StarRating from '../components/StarRating.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function HistoryScreen({ navigation }) {
  const { t } = useI18n();
  const { token, user } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .rideHistory(token)
      .then(({ rides }) => {
        if (!cancelled) setRides(rides || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // O "outro" participante depende de quem está a ver
  const otherName = (r) =>
    user?.role === 'passenger' ? r.driver?.name : r.passenger?.name;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ {t('back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('historyTitle')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
      ) : rides.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>{t('historyEmpty')}</Text>
          <Text style={styles.emptyHint}>{t('historyEmptyHint')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rides.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <StatusBadge status={r.status} />
                <Text style={styles.fare}>{r.fareUsd != null ? `$${r.fareUsd}` : '—'}</Text>
              </View>

              <Text style={styles.dest}>{r.destLabel}</Text>
              {r.originLabel ? <Text style={styles.origin}>{r.originLabel}</Text> : null}

              {otherName(r) ? (
                <Text style={styles.with}>
                  {t('withLabel')}: {otherName(r)}
                </Text>
              ) : null}

              <View style={styles.cardBottom}>
                <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
                {r.myStars != null ? (
                  <StarRating value={r.myStars} size={16} readOnly />
                ) : (
                  <Text style={styles.notRated}>{t('notRated')}</Text>
                )}
              </View>
            </View>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Aceita tanto "2026-08-19 03:24:49" (SQLite) como o formato ISO que o
// PostgreSQL devolve — e nunca mostra "Invalid Date" ao utilizador.
function formatDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.teal, fontSize: fontSize.md, fontWeight: '700', width: 60 },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fare: { fontSize: fontSize.lg, fontWeight: '800', color: colors.teal },
  dest: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  origin: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  with: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  notRated: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
