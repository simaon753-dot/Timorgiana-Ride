import React, { useState } from 'react';
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
import BarraTopo from '../components/BarraTopo.js';
import StatusBadge from '../components/StatusBadge.js';
import MapaExpandivel from '../components/MapaExpandivel.js';
import { minutosAte, horaDeChegada } from '../lib/estimativa.js';
import ChatButton from '../components/ChatButton.js';
import SosButton from '../components/SosButton.js';
import CodigoRecolha from '../components/CodigoRecolha.js';
import MotivoCancelamento from '../components/MotivoCancelamento.js';
import ShareTripButton from '../components/ShareTripButton.js';
import RatingPanel from '../components/RatingPanel.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { nomeDaCor, hexDaCor } from '../lib/corVeiculo.js';
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
    activeRide?.driver && ['accepted', 'arriving', 'in_progress'].includes(activeRide.status);

  // O motorista ainda vem a caminho: quanto falta até estar à porta.
  const minChegada =
    activeRide?.status === 'accepted' || activeRide?.status === 'arriving'
      ? minutosAte(driverLocation, {
          lat: activeRide.originLat,
          lng: activeRide.originLng,
        })
      : null;

  // Cancelar depois de o motorista aceitar não é a mesma coisa que cancelar
  // enquanto ainda se procura. O texto diz-lhe qual dos dois é — sem
  // impedir nada: às vezes cancelar é mesmo o que faz falta.
  const [aCancelar, setACancelar] = useState(false);

  async function cancelarComMotivo(motivo) {
    setACancelar(false);
    const r = await cancelRide(activeRide.id, motivo);
    if (r?.aviso === 'demasiados') {
      Alert.alert(t('cancelTooMany', { n: r.cancelamentos }), t('cancelTooManyExplain'));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <BarraTopo navigation={navigation} />

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
                <MapaExpandivel
                  markers={markers}
                  height={190}
                  liveMarker={driverLocation}
                  liveLabel={driverPlace}
                  info={{ km: activeRide.distanceKm, min: activeRide.durationMin }}
                  aviso={
                    minChegada != null ? t('etaArrivalShort', { min: minChegada }) : null
                  }
                />
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
                {/* A cor é o que se vê primeiro na rua, antes da matrícula.
                    Leva amostra: um quadrado branco identifica-se de longe,
                    a palavra "Branco" tem de ser lida. */}
                {activeRide.driver.vehicle?.color ? (
                  <View style={styles.linhaCor}>
                    <Text style={styles.corRotulo}>{t('vehicleColor')}</Text>
                    <View style={styles.corValor}>
                      {hexDaCor(activeRide.driver.vehicle.color) ? (
                        <View
                          style={[
                            styles.corAmostra,
                            { backgroundColor: hexDaCor(activeRide.driver.vehicle.color) },
                          ]}
                        />
                      ) : null}
                      <Text style={styles.corTexto}>
                        {nomeDaCor(activeRide.driver.vehicle.color, t)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {minChegada != null ? (
                  <InfoRow
                    label={t('etaArrival')}
                    value={t('etaMinutes', { min: minChegada, hora: horaDeChegada(minChegada) })}
                    strong
                  />
                ) : null}
                {activeRide.durationMin != null ? (
                  <InfoRow
                    label={t('etaTrip')}
                    value={t('etaTripValue', {
                      min: activeRide.durationMin,
                      km: activeRide.distanceKm ?? '—',
                    })}
                  />
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

            {/* Só até a viagem começar. Depois de estar no carro, o
                código já não serve para nada e só ocupa o ecrã. */}
            {activeRide.pickupCode && activeRide.status !== 'in_progress' ? (
              <View style={{ marginTop: spacing.md }}>
                <CodigoRecolha codigo={activeRide.pickupCode} />
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

            <MotivoCancelamento
              visivel={aCancelar}
              papel="passenger"
              aCaminho={!!withDriver}
              onFechar={() => setACancelar(false)}
              onConfirmar={cancelarComMotivo}
            />

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
                onPress={() => setACancelar(true)}
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
  linhaCor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  corRotulo: { fontSize: fontSize.sm, color: colors.textMuted },
  corValor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  corAmostra: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  corTexto: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
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
