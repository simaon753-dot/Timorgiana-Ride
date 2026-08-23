import React, { useState, useEffect } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import EscolherEmergencia from './EscolherEmergencia.js';

// Botão de emergência. Duas coisas acontecem quando se carrega, por esta
// ordem: o alerta é registado no servidor (para ficar prova de que houve
// pedido de ajuda, com hora e sítio), e só depois se oferece a chamada.
//
// Pede confirmação porque um SOS acidental gasta a confiança de toda a
// gente — mas a confirmação é UM toque, não um formulário.
// Números embutidos, iguais aos do servidor. Existem para o caso de não
// haver rede no momento em que fazem falta — que é precisamente quando
// fazem mais falta.
const NUMEROS_POR_OMISSAO = { medica: '110', policia: '112', protecao: '115' };

export default function SosButton({ rideId, compact }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [aEnviar, setAEnviar] = useState(false);
  const [aEscolher, setAEscolher] = useState(false);
  const [numeros, setNumeros] = useState(NUMEROS_POR_OMISSAO);

  // Vai buscar os números ao servidor uma vez. Se algum estiver errado,
  // corrige-se lá e chega aos telemóveis sem novo APK.
  useEffect(() => {
    api
      .numerosEmergencia()
      .then((r) => r?.numeros && setNumeros({ ...NUMEROS_POR_OMISSAO, ...r.numeros }))
      .catch(() => {});
  }, []);

  async function enviar(tipo) {
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

    let numero = numeros[tipo] || numeros.policia;
    try {
      const r = await api.sos(token, rideId, { lat, lng, tipo });
      // O servidor é a autoridade sobre os números.
      if (r?.numeros?.[tipo]) numero = r.numeros[tipo];
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

  // Sem confirmação genérica: escolher o TIPO já é o acto deliberado que
  // evita um toque acidental, e poupa um passo a quem está com pressa.
  function abrirEscolha() {
    setAEscolher(true);
  }

  function escolhido(tipo) {
    setAEscolher(false);
    enviar(tipo);
  }

  return (
    <>
    <EscolherEmergencia
      visivel={aEscolher}
      numeros={numeros}
      onFechar={() => setAEscolher(false)}
      onEscolher={escolhido}
    />
    <TouchableOpacity
      style={[styles.botao, compact && styles.compacto]}
      onPress={abrirEscolha}
      disabled={aEnviar}
      accessibilityRole="button"
      accessibilityLabel={t('sos')}
    >
      <Text style={[styles.texto, compact && styles.textoCompacto]}>
        {aEnviar ? '…' : compact ? 'SOS' : `🚨  ${t('sos')}`}
      </Text>
    </TouchableOpacity>
    </>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
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

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
