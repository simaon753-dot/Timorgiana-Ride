import React from 'react';
import { Share, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// Partilhar a viagem com alguém de fora. É o par preventivo do botão de
// emergência: em vez de pedir ajuda depois de algo correr mal, dá a uma
// pessoa de confiança os dados para saber onde estamos antes disso.
//
// Usa a folha de partilha do sistema, por isso serve WhatsApp, SMS ou o
// que a pessoa tiver — não obrigamos ninguém a instalar nada.
export default function ShareTripButton({ ride, driverLocation }) {
  const { t } = useI18n();

  async function partilhar() {
    // Preferimos onde o carro está agora; se ainda não houver posição em
    // tempo real, o destino é melhor do que nada.
    const ponto =
      driverLocation ||
      (ride.destLat != null && ride.destLng != null
        ? { lat: ride.destLat, lng: ride.destLng }
        : null);

    const link = ponto
      ? `https://www.openstreetmap.org/?mlat=${ponto.lat}&mlon=${ponto.lng}#map=16/${ponto.lat}/${ponto.lng}`
      : '';

    const texto = t('shareTripText', {
      driver: ride.driver?.name || '—',
      plate: ride.driver?.vehicle?.plate || '—',
      dest: ride.destLabel || '—',
      link,
    });

    try {
      await Share.share({ message: texto });
    } catch {
      // A pessoa fechou a folha de partilha. Não é erro.
    }
  }

  return (
    <TouchableOpacity style={styles.botao} onPress={partilhar} accessibilityRole="button">
      <Text style={styles.texto}>📍  {t('shareTrip')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  texto: { color: colors.teal, fontWeight: '700', fontSize: fontSize.md },
});
