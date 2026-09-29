import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { getBaseUrl } from '../serverUrl.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { marcarParagemFeita, paragensPorFazer } from '../lib/paragensFeitas.js';
import PedirCodigo from '../components/PedirCodigo.js';
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
// A VIAGEM INTEIRA (29/09/2026, pedido do Simão). Com `rideId`, a página
// recebe a recolha, as paragens que faltam e o destino, e mostra o caminho
// todo: do motorista ao passageiro, e daí ao destino. O ESTADO da viagem vem
// daqui (`tgaEstado`), e é por ele que a página passa da recolha ao destino
// sem ninguém sair do mapa. Os botões «Cheguei» e «Iniciar viagem» estão na
// página, mas QUEM FAZ É A APP, com as mesmas funções do cartão da viagem —
// incluindo o código do passageiro para começar.
//
// SÓ O NOSSO SERVIDOR carrega aqui dentro. Qualquer outro endereço (a
// ligação dos créditos do OpenStreetMap, por exemplo) abre no navegador: o
// que corre dentro da app, e fala com a app, é só o que é nosso.
export default function NavegarScreen({ navigation, route }) {
  useKeepAwake();
  const { t, lang } = useI18n();
  const { activeRide, advanceStatus, startRide } = useRides();
  const { lat, lng, nome, rideId } = route.params || {};
  const ride = rideId != null && activeRide?.id === rideId ? activeRide : null;
  const [podeGps, setPodeGps] = useState(null);
  const [aPedirCodigo, setAPedirCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState(null);
  const [aIniciar, setAIniciar] = useState(false);
  const web = useRef(null);

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

  // O ENDEREÇO FICA O DO PRIMEIRO DESENHO: mudar o endereço recarregava a
  // página e apagava a linha. As mudanças da viagem entram por `tgaEstado`.
  const base = getBaseUrl();
  const [uri] = useState(() => {
    const lingua = ['pt', 'tet', 'en'].includes(lang) ? lang : 'tet';
    const comum = `&lingua=${lingua}&naApp=1`;
    if (ride) {
      const paragens = paragensPorFazer(ride)
        .map((p) => `${p.lat},${p.lng}`)
        .join(';');
      return (
        `${base}/navegar?recolha=${ride.originLat},${ride.originLng}` +
        `&nomeRecolha=${encodeURIComponent(ride.originLabel || '')}` +
        `&para=${ride.destLat},${ride.destLng}` +
        `&nome=${encodeURIComponent(ride.destLabel || '')}` +
        (paragens ? `&paragens=${paragens}` : '') +
        `&fase=${ride.status === 'in_progress' ? 'destino' : 'recolha'}` +
        comum
      );
    }
    return `${base}/navegar?para=${lat},${lng}&nome=${encodeURIComponent(nome || '')}${comum}`;
  });

  // O ESTADO DA VIAGEM, dito à página sempre que muda.
  const estado = ride?.status || null;
  function dizerEstado() {
    if (!estado) return;
    web.current?.injectJavaScript(
      `window.tgaEstado && window.tgaEstado(${JSON.stringify(estado)}); true;`
    );
  }
  useEffect(dizerEstado, [estado]);

  // A viagem acabou ou foi cancelada enquanto se navegava: volta-se a ela, que
  // é onde o motorista vê o que aconteceu.
  const tinhaViagem = useRef(!!ride);
  useEffect(() => {
    if (!tinhaViagem.current) return;
    if (!ride || ride.status === 'completed' || ride.status === 'cancelled') {
      Speech.stop();
      navigation.goBack();
    }
  }, [ride, navigation]);

  async function fazer(accao) {
    if (!ride) return;
    if (accao === 'cheguei') {
      try {
        await advanceStatus(ride.id, 'arriving');
      } catch (e) {
        Alert.alert(t('errGeneric'), e?.message === 'NETWORK' ? t('errNetwork') : e?.message || '');
      }
    } else if (accao === 'iniciar') {
      setErroCodigo(null);
      setAPedirCodigo(true);
    }
  }

  async function iniciarComCodigo(codigo) {
    setErroCodigo(null);
    setAIniciar(true);
    try {
      await startRide(ride.id, codigo);
      setAPedirCodigo(false);
    } catch (e) {
      setErroCodigo(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAIniciar(false);
    }
  }

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
    } else if (m?.tipo === 'pronta') {
      dizerEstado();
    } else if (m?.tipo === 'accao') {
      if (m.accao === 'voltar') navigation.goBack();
      else fazer(m.accao);
    } else if (m?.tipo === 'paragemFeita') {
      marcarParagemFeita(ride, { lat: Number(m.lat), lng: Number(m.lng) });
    } else if (m?.tipo === 'sair') {
      Speech.stop();
      navigation.goBack();
    }
  }

  if (!ride && (lat == null || lng == null)) {
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
          ref={web}
          source={{ uri }}
          style={styles.flex}
          geolocationEnabled={podeGps}
          javaScriptEnabled
          domStorageEnabled
          onMessage={aoMensagem}
          onLoadEnd={dizerEstado}
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
      <PedirCodigo
        visivel={aPedirCodigo}
        erro={erroCodigo}
        aEnviar={aIniciar}
        onFechar={() => {
          setAPedirCodigo(false);
          setErroCodigo(null);
        }}
        onConfirmar={iniciarComCodigo}
      />
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
