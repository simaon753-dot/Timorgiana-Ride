import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import OSMMap from '../components/OSMMap.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherLugares from '../components/EscolherLugares.js';
import { LUGARES } from '../dados/veiculos.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function RequestRideScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { requestRide } = useRides();

  const [origem, setOrigem] = useState(null); // { lat, lng, label }
  const [destino, setDestino] = useState(null);
  const [orcamento, setOrcamento] = useState(null);
  const [aCalcular, setACalcular] = useState(false);
  const [veiculo, setVeiculo] = useState('car');
  const [pessoas, setPessoas] = useState(1);
  const [gps, setGps] = useState(false);
  const [erro, setErro] = useState(null);
  const [aPedir, setAPedir] = useState(false);
  const [pesquisa, setPesquisa] = useState(null); // 'origem' | 'destino' | null

  // Assim que houver os dois pontos, o servidor devolve rota, preços e
  // tempo de chegada num só pedido — é ele que fixa o preço.
  useEffect(() => {
    if (!origem || !destino) return setOrcamento(null);
    let cancelado = false;
    setACalcular(true);
    api
      .quote(token, {
        originLat: origem.lat,
        originLng: origem.lng,
        destLat: destino.lat,
        destLng: destino.lng,
      })
      .then((q) => !cancelado && setOrcamento(q))
      .catch(() => !cancelado && setOrcamento(null))
      .finally(() => !cancelado && setACalcular(false));
    return () => {
      cancelado = true;
    };
  }, [token, origem?.lat, origem?.lng, destino?.lat, destino?.lng]);

  const usarLocalizacao = useCallback(async () => {
    setGps(true);
    setErro(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const label = await nomeDoLugar(lat, lng);
      setOrigem({ lat, lng, label: label || rotuloCoordenadas(lat, lng) });
    } catch {
      /* sem GPS — o utilizador pode escolher no mapa */
    } finally {
      setGps(false);
    }
  }, []);

  // Pedir a localização logo à entrada: quase sempre a recolha é onde a
  // pessoa está, e poupa-lhe um toque.
  useEffect(() => {
    usarLocalizacao();
  }, [usarLocalizacao]);

  async function escolherNoMapa({ lat, lng }) {
    const label = await nomeDoLugar(lat, lng);
    const ponto = { lat, lng, label: label || rotuloCoordenadas(lat, lng) };

    // Com a pesquisa aberta, o campo que a abriu decide — a pessoa disse
    // explicitamente qual queria. Só sem pesquisa é que adivinhamos:
    // primeiro toque é a recolha, o seguinte é o destino.
    if (pesquisa === 'origem') {
      setOrigem(ponto);
      setPesquisa(null);
    } else if (pesquisa === 'destino') {
      setDestino(ponto);
      setPesquisa(null);
    } else if (!origem) {
      setOrigem(ponto);
    } else {
      setDestino(ponto);
    }
  }

  // A pesquisa flutua por cima do mapa, que nunca é desmontado. O campo
  // que a abriu decide o que a escolha define — recolha ou destino.
  function aoEscolherDaPesquisa(lugar) {
    const ponto = { lat: lugar.lat, lng: lugar.lng, label: lugar.label };
    if (pesquisa === 'origem') setOrigem(ponto);
    else setDestino(ponto);
    setPesquisa(null);
  }

  async function pedir() {
    setErro(null);
    if (!origem || !destino) return setErro(t('needBothPoints'));
    setAPedir(true);
    try {
      await requestRide({
        destLabel: destino.label,
        destLat: destino.lat,
        destLng: destino.lng,
        originLabel: origem.label,
        originLat: origem.lat,
        originLng: origem.lng,
        vehicleType: veiculo,
        ...(veiculo === 'car' ? { passengers: pessoas } : {}),
      });
      navigation.goBack();
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAPedir(false);
    }
  }

  const marcadores = [];
  if (origem) marcadores.push({ lat: origem.lat, lng: origem.lng, label: origem.label, tipo: 'origem' });
  if (destino) marcadores.push({ lat: destino.lat, lng: destino.lng, label: destino.label, tipo: 'destino' });

  const opcao = orcamento?.options?.find((o) => o.type === veiculo);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Mapa a ocupar o espaço todo até ao painel. Nunca é desmontado:
          além de manter o contexto visual durante a pesquisa, remontá-lo
          obrigaria o WebView a recarregar o Leaflet e a perder o zoom. */}
      <View style={styles.mapa}>
        <OSMMap pickable fill markers={marcadores} onPick={escolherNoMapa} />
        {!pesquisa ? (
          <Pressable style={styles.voltar} onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.voltarTexto}>‹</Text>
          </Pressable>
        ) : null}
        {orcamento && !pesquisa ? (
          <View style={styles.rotaBadge}>
            <Text style={styles.rotaTexto}>
              {t('tripInfo', { km: orcamento.distanceKm, min: orcamento.durationMin })}
              {orcamento.approximate ? ` · ${t('priceApprox')}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {pesquisa ? (
        <PlaceSearch
          placeholder={t('searchPlaceholder')}
          onEscolher={aoEscolherDaPesquisa}
          onFechar={() => setPesquisa(null)}
          onUsarLocalizacao={
            pesquisa === 'origem'
              ? () => {
                  setPesquisa(null);
                  usarLocalizacao();
                }
              : undefined
          }
        />
      ) : null}

      {/* Painel inferior */}
      <View style={[styles.painel, pesquisa && styles.escondido]}>
        <View style={styles.puxador} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Ponto
            cor={colors.teal}
            rotulo={t('pickupPoint')}
            valor={origem?.label}
            vazio={gps ? t('gettingLocation') : t('useMyLocation')}
            onPress={() => setPesquisa('origem')}
          />
          <View style={styles.linha} />
          <Ponto
            cor={colors.coral}
            rotulo={t('dropoffPoint')}
            valor={destino?.label}
            vazio={t('searchOrTap')}
            onPress={() => setPesquisa('destino')}
          />

          {aCalcular ? (
            <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.lg }} />
          ) : orcamento ? (
            <>
              <Text style={styles.seccao}>{t('chooseVehicle')}</Text>
              {orcamento.options.map((o) => (
                <CartaoVeiculo
                  key={o.type}
                  opcao={o}
                  ativo={veiculo === o.type}
                  onPress={() => setVeiculo(o.type)}
                  t={t}
                />
              ))}
              {/* Só em carro: numa motorizada vai sempre uma pessoa, e
                  perguntar seria fazer perder tempo com uma resposta que
                  já se sabe. */}
              {veiculo === 'car' ? (
                <>
                  <Text style={styles.seccao}>{t('howManyPeople')}</Text>
                  <EscolherLugares opcoes={LUGARES} valor={pessoas} onEscolher={setPessoas} />
                  <View style={{ height: spacing.md }} />
                </>
              ) : null}

              <View style={styles.pagamento}>
                <Text style={styles.pagamentoTexto}>💵 {t('payCash')}</Text>
              </View>
            </>
          ) : null}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        </ScrollView>

        <Pressable
          style={[styles.botao, (!opcao || aPedir) && styles.botaoInativo]}
          onPress={pedir}
          disabled={!opcao || aPedir}
        >
          {aPedir ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.botaoTexto}>
              {opcao ? `${t('confirmRide')} $${opcao.fareUsd.toFixed(2)}` : t('whereTo')}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Ponto({ cor, rotulo, valor, vazio, onPress }) {
  return (
    <Pressable style={styles.ponto} onPress={onPress}>
      <View style={[styles.bolinha, { backgroundColor: cor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pontoRotulo}>{rotulo}</Text>
        <Text style={[styles.pontoValor, !valor && styles.pontoVazio]} numberOfLines={1}>
          {valor || vazio}
        </Text>
      </View>
    </Pressable>
  );
}

function CartaoVeiculo({ opcao, ativo, onPress, t }) {
  const nome = opcao.type === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar');
  const icone = opcao.type === 'motorbike' ? '🏍️' : '🚗';
  return (
    <Pressable
      style={[styles.veiculo, ativo && styles.veiculoAtivo, !opcao.available && styles.veiculoIndisp]}
      onPress={onPress}
    >
      <Text style={styles.veiculoIcone}>{icone}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.veiculoNome}>{nome}</Text>
        <Text style={styles.veiculoEta}>
          {opcao.available ? t('minAway', { min: opcao.etaMin }) : t('noDriverNearby')}
        </Text>
      </View>
      <Text style={styles.veiculoPreco}>${opcao.fareUsd.toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  mapa: { flex: 1, position: 'relative' },
  // display:none em vez de não renderizar: mantém o painel montado, para
  // o veículo escolhido e o orçamento não se perderem ao abrir a pesquisa.
  escondido: { display: 'none' },
  voltar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  voltarTexto: { fontSize: 26, color: colors.teal, fontWeight: '800', marginTop: -4 },
  rotaBadge: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  rotaTexto: { color: colors.onTeal, fontWeight: '700', fontSize: fontSize.sm },

  painel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    maxHeight: '58%',
  },
  puxador: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  ponto: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  bolinha: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  pontoRotulo: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pontoValor: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  pontoVazio: { color: colors.textMuted, fontWeight: '400' },
  linha: { height: 1, backgroundColor: colors.border, marginLeft: 26 },

  seccao: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  veiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  veiculoAtivo: { borderColor: colors.teal, backgroundColor: '#F0F5F4' },
  veiculoIndisp: { opacity: 0.55 },
  veiculoIcone: { fontSize: 26, marginRight: spacing.md },
  veiculoNome: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  veiculoEta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  veiculoPreco: { fontSize: fontSize.lg, fontWeight: '800', color: colors.teal },

  pagamento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  pagamentoTexto: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },

  erro: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },

  botao: {
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  botaoInativo: { backgroundColor: colors.border },
  botaoTexto: { color: colors.white, fontSize: fontSize.md, fontWeight: '800' },
});
