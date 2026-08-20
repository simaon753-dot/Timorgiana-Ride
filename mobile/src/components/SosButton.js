import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Botão de emergência. Duas coisas acontecem quando se carrega, por esta
// ordem: o alerta é registado no servidor (para ficar prova de que houve
// pedido de ajuda, com hora e sítio), e só depois se oferece a chamada.
//
// Pede confirmação porque um SOS acidental gasta a confiança de toda a
// gente — mas a confirmação é UM toque, não um formulário.
export default function SosButton({ rideId, compact }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [aEnviar, setAEnviar] = useState(false);

  async function enviar() {
    setAEnviar(true);
    let lat = null;
    let lng = null;

    // A posição é um extra. Se o GPS demorar, seguimos sem ela — o alerta
    // vale mais depressa e vazio do que tarde e completo.
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Promise.race([
          Location.getLastKnownPositionAsync(),
          new Promise((r) => setTimeout(() => r(null), 3000)),
        ]);
        if (pos?.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }
    } catch {
      /* sem posição, seguimos na mesma */
    }

    let numero = '112';
    try {
      const r = await api.sos(token, rideId, { lat, lng });
      numero = r?.emergencia || numero;
    } catch {
      // Nem o servidor pode travar isto: se a rede falhar, a pessoa tem de
      // conseguir ligar à polícia à mesma.
      Alert.alert(t('sosOffline'), t('sosOfflineExplain'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('sosCall', { n: numero }), onPress: () => Linking.openURL(`tel:${numero}`) },
      ]);
      setAEnviar(false);
      return;
    }

    setAEnviar(false);
    Alert.alert(t('sosSentTitle'), t('sosSentExplain'), [
      { text: t('sosOnlyAlert'), style: 'cancel' },
      { text: t('sosCall', { n: numero }), onPress: () => Linking.openURL(`tel:${numero}`) },
    ]);
  }

  function confirmar() {
    Alert.alert(t('sosConfirmTitle'), t('sosConfirmExplain'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('sosConfirmYes'), style: 'destructive', onPress: enviar },
    ]);
  }

  return (
    <TouchableOpacity
      style={[styles.botao, compact && styles.compacto]}
      onPress={confirmar}
      disabled={aEnviar}
      accessibilityRole="button"
      accessibilityLabel={t('sos')}
    >
      <Text style={[styles.texto, compact && styles.textoCompacto]}>
        {aEnviar ? '…' : compact ? 'SOS' : `🚨  ${t('sos')}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingVertical: 0,
    borderWidth: 2,
    borderColor: colors.white,
  },
  texto: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  textoCompacto: { fontSize: 13, letterSpacing: 0 },
});
