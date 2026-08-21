import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import StatusBadge from '../components/StatusBadge.js';
import OSMMap from '../components/OSMMap.js';
import ChatButton from '../components/ChatButton.js';
import SosButton from '../components/SosButton.js';
import ShareTripButton from '../components/ShareTripButton.js';
import RatingPanel from '../components/RatingPanel.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function PassengerHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { activeRide, isFinal, cancelRide, dismissRide, loading, driverLocation, driverPlace } =
    useRides();

  const vehicleLabel = (v) => (v?.type === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar'));
  const markers = activeRide ? rideMarkers(activeRide) : [];
  const withDriver =
    activeRide?.driver && ['accepted', 'arriving'].includes(activeRide.status);

  // Cancelar depois de o motorista aceitar não é a mesma coisa que cancelar
  // enquanto ainda se procura. O texto diz-lhe qual dos dois é — sem
  // impedir nada: às vezes cancelar é mesmo o que faz falta.
  function confirmarCancelamento() {
    Alert.alert(
      t('cancelConfirmTitle'),
      withDriver ? t('cancelConfirmAccepted') : t('cancelConfirmRequested'),
      [
        { text: t('cancelKeep'), style: 'cancel' },
        {
          text: t('cancelYes'),
          style: 'destructive',
          onPress: async () => {
            const r = await cancelRide(activeRide.id);
            if (r?.aviso === 'demasiados') {
              Alert.alert(t('cancelTooMany', { n: r.cancelamentos }), t('cancelTooManyExplain'));
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Logo size="sm" />
          <View style={styles.topBarDireita}>
            {user?.isAdmin ? (
              <Pressable onPress={() => navigation.navigate('Admin')} style={styles.adminLink}>
                <Text style={styles.adminLinkText}>⚙</Text>
              </Pressable>
            ) : null}
            <LanguageToggle />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        ) : activeRide ? (
          // ---- Viagem em curso ----
          <View style={styles.card}>
            <StatusBadge status={activeRide.status} />

            <Text style={styles.destLabel}>{t('destination')}</Text>
            <Text style={styles.destValue}>{activeRide.destLabel}</Text>
            {activeRide.originLabel ? (
              <Text style={styles.origin}>
                {t('originField')}: {activeRide.originLabel}
              </Text>
            ) : null}

            {markers.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <OSMMap markers={markers} height={190} liveMarker={driverLocation} liveLabel={driverPlace} />
                {driverLocation ? (
                  <Text style={styles.driverMoving}>
                    {driverPlace ? t('nowOnStreet', { rua: driverPlace }) : t('driverOnMap')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {activeRide.status === 'requested' ? (
              <View style={styles.searching}>
                <ActivityIndicator color={colors.coral} />
                <Text style={styles.searchingText}>{t('statusRequested')}</Text>
              </View>
            ) : null}

            {withDriver ? (
              <View style={styles.driverBox}>
                <Text style={styles.boxTitle}>{t('yourDriver')}</Text>
                <Text style={styles.driverName}>{activeRide.driver.name}</Text>
                <InfoRow label={t('vehicleType')} value={vehicleLabel(activeRide.driver.vehicle)} />
                {activeRide.driver.vehicle?.model ? (
                  <InfoRow label={t('vehicleModel')} value={activeRide.driver.vehicle.model} />
                ) : null}
                {activeRide.driver.vehicle?.plate ? (
                  <InfoRow label={t('vehiclePlate')} value={activeRide.driver.vehicle.plate} />
                ) : null}
                <InfoRow
                  label={t('fareLabel')}
                  value={activeRide.fareUsd != null ? `$${activeRide.fareUsd}` : t('fareToAgree')}
                  strong
                />
                <Pressable
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${activeRide.driver.phone}`)}
                >
                  <Text style={styles.callBtnText}>
                    📞 {t('callLabel')} · {activeRide.driver.phone}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {withDriver ? (
              <View style={{ marginTop: spacing.md }}>
                <ChatButton navigation={navigation} />
              </View>
            ) : null}

            {withDriver ? (
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <ShareTripButton
                  ride={activeRide}
                  driverLocation={driverLocation}
                  driverPlace={driverPlace}
                />
                <SosButton rideId={activeRide.id} />
              </View>
            ) : null}

            {activeRide.status === 'completed' ? (
              <RatingPanel ride={activeRide} role="passenger" />
            ) : null}

            <View style={{ height: spacing.lg }} />
            {isFinal ? (
              <Button title={t('newRide')} onPress={dismissRide} />
            ) : (
              <Button
                title={t('cancelRide')}
                variant="outline"
                onPress={() => confirmarCancelamento()}
              />
            )}
          </View>
        ) : (
          // ---- Sem viagem: pedir ----
          <View style={styles.heroCard}>
            <Text style={styles.hello}>{t('homeHello', { name: user?.name || '' })}</Text>
            <Text style={styles.prompt}>{t('passengerPrompt')}</Text>
            <Button
              title={t('requestRide')}
              onPress={() => navigation.navigate('RequestRide')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
        <Button
          title={`🧾 ${t('history')}`}
          variant="outline"
          onPress={() => navigation.navigate('History')}
        />
        <View style={{ height: spacing.sm }} />
        <Button title={t('logout')} variant="ghost" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, strong }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, padding: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  topBarDireita: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adminLink: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  adminLinkText: { fontSize: 18, color: colors.teal },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hello: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  prompt: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  origin: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  searchingText: { fontSize: fontSize.md, color: colors.coralDark, fontWeight: '600' },
  driverBox: {
    marginTop: spacing.lg,
    backgroundColor: '#F0F5F4',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  boxTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: spacing.xs,
  },
  driverName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  rowValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  rowValueStrong: { fontSize: fontSize.md, fontWeight: '800', color: colors.teal },
  callBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callBtnText: { color: colors.onTeal, fontWeight: '700', fontSize: fontSize.sm },
  driverMoving: {
    fontSize: fontSize.xs,
    color: colors.teal,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
