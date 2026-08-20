import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import SegmentedPicker from '../components/SegmentedPicker.js';
import LanguageToggle from '../components/LanguageToggle.js';
import OSMMap from '../components/OSMMap.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize } from '../theme.js';

// Converte coordenadas num nome de sítio legível (OpenStreetMap Nominatim).
//
// O Nominatim exige que cada aplicação se identifique — pedidos sem
// User-Agent são recusados. Sem isso, todos os locais apareciam com o
// nome de reserva e o motorista não sabia para onde ia.
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)',
        },
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j?.display_name ? j.display_name.split(',').slice(0, 2).join(',').trim() : null;
  } catch {
    return null;
  }
}

// Nome de reserva quando não se consegue o nome do sítio: as próprias
// coordenadas. Não é bonito, mas é útil — o motorista pode copiá-las para
// um mapa. O texto do botão que o utilizador carregou não serve de nome.
function coordLabel(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function RequestRideScreen({ navigation }) {
  const { t } = useI18n();
  const { requestRide } = useRides();

  const [dest, setDest] = useState('');
  const [destCoord, setDestCoord] = useState(null);
  const [origin, setOrigin] = useState('');
  const [originCoord, setOriginCoord] = useState(null);
  const [center, setCenter] = useState(null);
  const [vType, setVType] = useState('any');
  const [fare, setFare] = useState('');
  const [distanceKm, setDistanceKm] = useState(null);
  const [gps, setGps] = useState(false);
  const [tarifas, setTarifas] = useState(null);

  // As tarifas vêm do servidor: mudá-las não deve exigir uma app nova.
  useEffect(() => {
    api.fares().then(({ fares }) => setTarifas(fares)).catch(() => {});
  }, []);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onPickDestination(coord) {
    setDestCoord(coord);
    const label = await reverseGeocode(coord.lat, coord.lng);
    setDest(label || coordLabel(coord.lat, coord.lng));
  }

  async function useMyLocation() {
    setGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setOriginCoord(c);
      setCenter(c);
      const label = await reverseGeocode(c.lat, c.lng);
      setOrigin(label || coordLabel(c.lat, c.lng));
    } catch {
      /* ignora — o utilizador pode escrever a origem à mão */
    } finally {
      setGps(false);
    }
  }

  async function onSubmit() {
    setError(null);
    if (!dest.trim()) return setError(t('errDestRequired'));

    setLoading(true);
    try {
      await requestRide({
        destLabel: dest.trim(),
        destLat: destCoord?.lat,
        destLng: destCoord?.lng,
        originLabel: origin.trim() || undefined,
        originLat: originCoord?.lat,
        originLng: originCoord?.lng,
        vehicleType: vType === 'any' ? undefined : vType,
        fareUsd: fare.trim() === '' ? undefined : Number(fare),
      });
      navigation.goBack(); // o ecrã inicial mostra agora a viagem em curso
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }

  // Quando existem os dois pontos, o mapa desenha a rota e devolve a distância
  // Sugestão a partir da distância. É só uma sugestão: o preço final
  // continua a ser combinado entre passageiro e motorista.
  const tabela = tarifas?.[vType === 'motorbike' ? 'motorbike' : 'car'];
  const sugestao =
    distanceKm != null && tabela
      ? Math.max(tabela.min, Math.round((tabela.base + tabela.perKm * distanceKm) * 4) / 4)
      : null;

  const mapMarkers = [];
  if (originCoord) mapMarkers.push({ ...originCoord, label: origin || t('originField') });
  if (destCoord) mapMarkers.push({ ...destCoord, label: dest || t('destination') });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.back}>‹ {t('back')}</Text>
          </Pressable>
          <LanguageToggle />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('requestRide')}</Text>

          <OSMMap
            pickable
            markers={mapMarkers}
            center={center}
            height={220}
            onPick={onPickDestination}
            onRoute={({ km }) => setDistanceKm(km)}
          />
          {distanceKm != null ? (
            <Text style={styles.distance}>
              🛣️ {t('distance')}: {distanceKm} {t('km')}
            </Text>
          ) : (
            <Text style={styles.mapHint}>{t('mapHint')}</Text>
          )}

          <Button
            title={gps ? t('gettingLocation') : t('useMyLocation')}
            variant="outline"
            onPress={useMyLocation}
            loading={gps}
            style={{ marginBottom: spacing.md }}
          />

          <TextField
            label={t('destination')}
            value={dest}
            onChangeText={setDest}
            placeholder={t('destinationPlaceholder')}
          />
          <TextField
            label={t('originField')}
            value={origin}
            onChangeText={setOrigin}
            placeholder={t('originPlaceholder')}
          />

          <Text style={styles.sectionLabel}>{t('vehicleType')}</Text>
          <SegmentedPicker
            value={vType}
            onChange={setVType}
            options={[
              { value: 'any', label: t('vehicleAny'), icon: '🚕' },
              { value: 'car', label: t('vehicleCar'), icon: '🚗' },
              { value: 'motorbike', label: t('vehicleMotorbike'), icon: '🏍️' },
            ]}
          />

          <View style={{ height: spacing.md }} />
          <TextField
            label={t('suggestedFare')}
            optionalLabel={t('optional')}
            value={fare}
            onChangeText={setFare}
            keyboardType="numeric"
            placeholder="Ex.: 3"
          />

          {sugestao != null && fare.trim() === '' ? (
            <Pressable style={styles.suggest} onPress={() => setFare(String(sugestao))}>
              <Text style={styles.suggestText}>
                💡 {t('fareSuggested', { value: sugestao })} · {t('fareUse')}
              </Text>
            </Pressable>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={t('requestRide')}
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  back: { color: colors.teal, fontSize: fontSize.md, fontWeight: '700' },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  mapHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  distance: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.teal,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md },
  suggest: {
    backgroundColor: '#EFEAE1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  suggestText: { color: colors.teal, fontWeight: '700', fontSize: fontSize.sm },
});
