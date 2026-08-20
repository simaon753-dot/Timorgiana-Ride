import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import LanguageToggle from '../components/LanguageToggle.js';
import StatusBadge from '../components/StatusBadge.js';
import OSMMap from '../components/OSMMap.js';
import ChatButton from '../components/ChatButton.js';
import RatingPanel from '../components/RatingPanel.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function DriverHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const {
    activeRide,
    isFinal,
    requests,
    acceptRide,
    advanceStatus,
    cancelRide,
    dismissRide,
    loading,
    connected,
    online,
    toggleOnline,
  } = useRides();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Logo size="sm" />
          <LanguageToggle />
        </View>

        {/* Interruptor de disponibilidade. Um motorista a almoçar não deve
            receber pedidos: para o passageiro, um pedido que ninguém atende
            é pior do que nenhum. */}
        {!activeRide ? (
          <Pressable
            style={[styles.onlineCard, online && styles.onlineCardOn]}
            onPress={() => toggleOnline(!online)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.onlineTitle, online && styles.onlineTitleOn]}>
                {online ? `🟢 ${t('online')}` : `⚪ ${t('offline')}`}
              </Text>
              <Text style={styles.onlineHint}>{online ? t('onlineHint') : t('offlineHint')}</Text>
            </View>
            <View style={[styles.switchTrack, online && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, online && styles.switchThumbOn]} />
            </View>
          </Pressable>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        ) : activeRide ? (
          <ActiveRideCard
            ride={activeRide}
            isFinal={isFinal}
            navigation={navigation}
            onArriving={() => advanceStatus(activeRide.id, 'arriving')}
            onComplete={() => advanceStatus(activeRide.id, 'completed')}
            onCancel={() => cancelRide(activeRide.id)}
            onDismiss={dismissRide}
          />
        ) : (
          <View>
            <Text style={styles.heading}>{t('availableRequests')}</Text>
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('noRequests')}</Text>
                <Text style={styles.emptyHint}>{t('waitingRequests')}</Text>
              </View>
            ) : (
              requests.map((r) => (
                <RequestCard key={r.id} ride={r} onAccept={(fare) => acceptRide(r.id, fare)} />
              ))
            )}
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
        {!connected ? <Text style={styles.offline}>{t('liveOff')}</Text> : null}
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

// ---- Cartão de um pedido por aceitar ----
function RequestCard({ ride, onAccept }) {
  const { t } = useI18n();
  const [fare, setFare] = useState(ride.fareUsd != null ? String(ride.fareUsd) : '');
  const [busy, setBusy] = useState(false);

  const wants =
    ride.vehicleType === 'motorbike'
      ? t('vehicleMotorbike')
      : ride.vehicleType === 'car'
        ? t('vehicleCar')
        : t('vehicleAny');

  async function accept() {
    setBusy(true);
    try {
      await onAccept(fare === '' ? null : Number(fare));
    } catch {
      setBusy(false); // se falhar (já aceite por outro), volta a permitir
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.destValue}>{ride.destLabel}</Text>
      {ride.originLabel ? (
        <Text style={styles.origin}>
          {t('originField')}: {ride.originLabel}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.passenger}>🧍 {ride.passenger?.name}</Text>
        <Text style={styles.wants}>
          {t('wantsLabel')}: {wants}
        </Text>
      </View>
      <TextField
        label={t('fareInput')}
        value={fare}
        onChangeText={setFare}
        keyboardType="numeric"
        placeholder="Ex.: 3"
      />
      <Button title={t('acceptRide')} onPress={accept} loading={busy} />
    </View>
  );
}

// Editor da tarifa combinada (o motorista pode ajustar após conversar)
function FareEditor({ ride }) {
  const { t } = useI18n();
  const { updateFare } = useRides();
  const [fare, setFare] = useState(ride.fareUsd != null ? String(ride.fareUsd) : '');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (fare.trim() === '') return;
    setBusy(true);
    try {
      await updateFare(ride.id, Number(fare));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fareEditor}>
      <View style={{ flex: 1 }}>
        <TextField
          label={`${t('fareLabel')} (USD)`}
          value={fare}
          onChangeText={setFare}
          keyboardType="numeric"
          placeholder="Ex.: 3"
        />
      </View>
      <Button title={t('saveFare')} onPress={save} loading={busy} style={styles.fareSaveBtn} />
    </View>
  );
}

// ---- Cartão da viagem ativa do motorista ----
function ActiveRideCard({ ride, isFinal, navigation, onArriving, onComplete, onCancel, onDismiss }) {
  const { t } = useI18n();
  const markers = rideMarkers(ride);
  const active = ['accepted', 'arriving'].includes(ride.status);

  return (
    <View style={styles.card}>
      <StatusBadge status={ride.status} />
      <Text style={styles.destLabel}>{t('destination')}</Text>
      <Text style={styles.destValue}>{ride.destLabel}</Text>
      {ride.originLabel ? (
        <Text style={styles.origin}>
          {t('originField')}: {ride.originLabel}
        </Text>
      ) : null}

      {markers.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <OSMMap markers={markers} height={170} />
        </View>
      ) : null}

      <View style={styles.passengerBox}>
        <Text style={styles.boxTitle}>{t('yourPassenger')}</Text>
        <Text style={styles.passengerName}>{ride.passenger?.name}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('fareLabel')}</Text>
          <Text style={styles.rowValueStrong}>
            {ride.fareUsd != null ? `$${ride.fareUsd}` : t('fareToAgree')}
          </Text>
        </View>
        {ride.passenger?.phone ? (
          <Pressable
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${ride.passenger.phone}`)}
          >
            <Text style={styles.callBtnText}>
              📞 {t('callLabel')} · {ride.passenger.phone}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {active ? (
        <>
          <View style={{ marginTop: spacing.md }}>
            <ChatButton navigation={navigation} />
          </View>
          <FareEditor ride={ride} />
        </>
      ) : null}

      {ride.status === 'completed' ? <RatingPanel ride={ride} role="driver" /> : null}

      <View style={{ height: spacing.lg }} />
      {isFinal ? (
        <Button title={t('newRide')} onPress={onDismiss} />
      ) : ride.status === 'accepted' ? (
        <>
          <Button title={t('onTheWay')} onPress={onArriving} />
          <View style={{ height: spacing.sm }} />
          <Button title={t('cancelRide')} variant="outline" onPress={onCancel} />
        </>
      ) : (
        <>
          <Button title={t('completeRide')} variant="secondary" onPress={onComplete} />
          <View style={{ height: spacing.sm }} />
          <Button title={t('cancelRide')} variant="outline" onPress={onCancel} />
        </>
      )}
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
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  destLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  origin: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  passenger: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  wants: { fontSize: fontSize.sm, color: colors.teal, fontWeight: '700' },
  passengerBox: {
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
  passengerName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  rowValueStrong: { fontSize: fontSize.md, fontWeight: '800', color: colors.teal },
  callBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callBtnText: { color: colors.onTeal, fontWeight: '700', fontSize: fontSize.sm },
  fareEditor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fareSaveBtn: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  onlineCardOn: { borderColor: colors.success, backgroundColor: '#F1F8F4' },
  onlineTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.textMuted },
  onlineTitleOn: { color: colors.success },
  onlineHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  switchTrack: {
    width: 52, height: 30, borderRadius: 15,
    backgroundColor: colors.border, padding: 3, justifyContent: 'center',
  },
  switchTrackOn: { backgroundColor: colors.success },
  switchThumb: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white,
  },
  switchThumbOn: { alignSelf: 'flex-end' },
  offline: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
});
