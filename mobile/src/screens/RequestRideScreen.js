import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import OSMMap from '../components/OSMMap.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherLugares from '../components/EscolherLugares.js';
import SegmentedPicker from '../components/SegmentedPicker.js';
import { LUGARES } from '../dados/veiculos.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

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
      // Mesma ordem: o ponto primeiro, o nome quando vier. Ter o mapa
      // centrado onde estamos vale mais do que saber como se chama a rua.
      setOrigem({ lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true });
      const nome = await nomeDoLugar(lat, lng);
      if (nome) {
        setOrigem((p) =>
          p && p.lat === lat && p.lng === lng ? { ...p, label: nome, provisorio: false } : p
        );
      }
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
    // A coordenada já se sabe no instante do toque; o NOME é que demora.
    // Antes esperava-se pelo nome antes de marcar o ponto, e numa rede
    // lenta tocava-se no mapa e não acontecia nada durante segundos — a
    // pessoa tocava outra vez, e outra. Agora o pino aparece já, com a
    // coordenada por rótulo, e o nome entra quando chegar.
    const ponto = { lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true };

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

    // O nome chega depois e substitui o rótulo — mas só se o ponto ainda
    // for este. Sem essa verificação, um nome lento de um toque antigo
    // sobrescrevia um ponto que a pessoa entretanto já tinha mudado.
    const nome = await nomeDoLugar(lat, lng);
    if (!nome) return;
    const mesmo = (p) => p && p.lat === lat && p.lng === lng;
    setOrigem((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
    setDestino((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
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
  if (origem)
    marcadores.push({ lat: origem.lat, lng: origem.lng, label: origem.label, tipo: 'origem' });
  if (destino)
    marcadores.push({ lat: destino.lat, lng: destino.lng, label: destino.label, tipo: 'destino' });

  const opcao = orcamento?.options?.find((o) => o.type === veiculo);

  // Pedir depende de haver DOIS PONTOS, não de haver preço.
  //
  // Antes o botão exigia a cotação. Mas `pedir()` não envia preço nenhum
  // — quem o calcula é o servidor, ao criar a viagem. A cotação só serve
  // para mostrar o valor antes de confirmar. Numa rede lenta, uma
  // cotação que não chegava bloqueava por completo a funcionalidade
  // principal da aplicação, por causa de um número que é apenas
  // informativo.
  const podePedir = !!origem && !!destino && !aPedir;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />

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
        {/* O indicador de deslize é mostrado de propósito. Escondido, o
            painel cortava a meio — a pergunta "quantas pessoas?" ficava
            visível e as respostas por baixo da dobra, sem nada a dizer
            que havia mais. Parecia avariado, e não estava. */}
        <ScrollView>
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
          ) : origem && destino ? (
            // Sem cotação — a rede não respondeu. A viagem continua a
            // poder ser pedida; o preço combina-se com o motorista, que é
            // o que já acontece quando o servidor não consegue calcular.
            <>
              <Text style={styles.seccao}>{t('chooseVehicle')}</Text>
              <SegmentedPicker
                value={veiculo}
                onChange={setVeiculo}
                options={[
                  { value: 'car', label: t('vehicleCar'), icon: '🚗' },
                  { value: 'motorbike', label: t('vehicleMotorbike'), icon: '🏍️' },
                ]}
              />
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
          style={[styles.botao, !podePedir && styles.botaoInativo]}
          onPress={pedir}
          disabled={!podePedir}
        >
          {aPedir ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.botaoTexto}>
              {opcao
                ? `${t('confirmRide')} $${opcao.fareUsd.toFixed(2)}`
                : podePedir
                  ? `${t('confirmRide')} · ${t('fareToAgree')}`
                  : t('whereTo')}
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
      style={[
        styles.veiculo,
        ativo && styles.veiculoAtivo,
        !opcao.available && styles.veiculoIndisp,
      ]}
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

const criarEstilos = () =>
  StyleSheet.create({
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
    rotaTexto: { ...tipo.corpoForte, color: colors.onTeal },

    painel: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      maxHeight: '62%',
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
    pontoRotulo: { ...tipo.etiqueta, color: colors.textMuted },
    pontoValor: { ...tipo.subtitulo, color: colors.text },
    pontoVazio: { color: colors.textMuted, fontWeight: '400' },
    linha: { height: 1, backgroundColor: colors.border, marginLeft: 26 },

    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
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
    veiculoAtivo: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    veiculoIndisp: { opacity: 0.55 },
    veiculoIcone: { fontSize: 26, marginRight: spacing.md },
    veiculoNome: { ...tipo.subtitulo, color: colors.text },
    veiculoEta: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    veiculoPreco: { ...tipo.titulo, color: colors.teal },

    pagamento: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    pagamentoTexto: { ...tipo.subtitulo, color: colors.text },

    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },

    botao: {
      backgroundColor: colors.coral,
      borderRadius: radius.md,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    botaoInativo: { backgroundColor: colors.border },
    botaoTexto: { ...tipo.subtitulo, color: colors.white },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
