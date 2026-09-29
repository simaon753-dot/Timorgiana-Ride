import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { getBaseUrl } from '../serverUrl.js';
import { useI18n } from '../i18n/index.js';
import { tipo } from '../design/tipografia.js';
import { colors, spacing, registarEstilos } from '../theme.js';

// A NAVEGAÇÃO NOSSA DENTRO DA APP (29/09/2026, versão 1.5.0).
//
// É a MESMA página de /navegar (backend/publico/navegar), aberta aqui
// dentro em vez de no navegador. Decisão do Simão (opção B): mapa nosso e
// sem Google, e a página que já foi ensaiada — em vez de um mapa novo.
//
// O QUE A APP FAZ PELA PÁGINA, porque dentro de um WebView ela não consegue:
//   · a VOZ — o WebView do Android não tem a voz do navegador; a página
//     manda o texto (`{ tipo: 'falar' }`) e a app di-lo com a do telemóvel;
//   · o ECRÃ LIGADO — `useKeepAwake`, enquanto este ecrã estiver aberto;
//   · SAIR — a página pede (`{ tipo: 'sair' }`) e a app volta à viagem.
//
// SÓ O NOSSO SERVIDOR carrega aqui dentro. Qualquer outro endereço (a
// ligação dos créditos do OpenStreetMap, por exemplo) abre no navegador: o
// que corre dentro da app, e fala com a app, é só o que é nosso.
export default function NavegarScreen({ navigation, route }) {
  useKeepAwake();
  const { t, lang } = useI18n();
  const { lat, lng, nome } = route.params || {};
  const [podeGps, setPodeGps] = useState(null);

  // O GPS da página é o da app: sem autorização da app, o WebView não o dá.
  // Os motoristas já a deram; isto só a pede se ainda faltar.
  useEffect(() => {
    let vivo = true;
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => vivo && setPodeGps(status === 'granted'))
      .catch(() => vivo && setPodeGps(false));
    return () => {
      vivo = false;
      Speech.stop();
    };
  }, []);

  const base = getBaseUrl();
  const lingua = ['pt', 'tet', 'en'].includes(lang) ? lang : 'tet';
  const uri =
    `${base}/navegar?para=${lat},${lng}` +
    `&nome=${encodeURIComponent(nome || '')}&lingua=${lingua}&naApp=1`;

  function aoMensagem(e) {
    let m;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m?.tipo === 'falar' && m.texto) {
      Speech.stop();
      Speech.speak(String(m.texto).slice(0, 300), {
        language: m.lingua === 'en' ? 'en-GB' : 'pt-PT',
      });
    } else if (m?.tipo === 'calar') {
      Speech.stop();
    } else if (m?.tipo === 'sair') {
      Speech.stop();
      navigation.goBack();
    }
  }

  if (lat == null || lng == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Text style={styles.aviso}>{t('navegarSemDestino')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {podeGps === null ? (
        <ActivityIndicator style={styles.roda} color={colors.teal} />
      ) : (
        <WebView
          source={{ uri }}
          style={styles.flex}
          geolocationEnabled={podeGps}
          javaScriptEnabled
          domStorageEnabled
          onMessage={aoMensagem}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.carregar}>
              <ActivityIndicator color={colors.teal} />
            </View>
          )}
          onShouldStartLoadWithRequest={(pedido) => {
            if (pedido.url.startsWith(base)) return true;
            Linking.openURL(pedido.url).catch(() => {});
            return false;
          }}
        />
      )}
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    flex: { flex: 1 },
    roda: { marginTop: spacing.xl },
    carregar: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    aviso: { ...tipo.corpo, color: colors.text, margin: spacing.lg },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
