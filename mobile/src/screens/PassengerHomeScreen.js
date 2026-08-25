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
import BarraEstado from '../design/BarraEstado.js';
import { tipo } from '../design/tipografia.js';
import { FIXOS, lerFixos, guardarFixo, destinosRecentes } from '../lib/lugares.js';
import PlaceSearch from '../components/PlaceSearch.js';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import BarraTopo from '../components/BarraTopo.js';
import { useModo } from '../context/ModoContext.js';
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
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

export default function PassengerHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { podeConduzir, setModo } = useModo();
  const {
    activeRide: viagemBruta,
    isFinal,
    cancelRide,
    dismissRide,
    loading,
    driverLocation,
    driverPlace,
  } = useRides();

  // Só mostra viagens em que EU sou o passageiro. Sem isto, quem conduz e
  // caia neste ecrã por um instante veria "o teu motorista: <o próprio
  // nome>", que é absurdo e mina a confiança no resto.
  const activeRide = viagemBruta && viagemBruta.driver?.id !== user?.id ? viagemBruta : null;

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
  const [fixos, setFixos] = useState({});
  const [recentes, setRecentes] = useState([]);

  // Carrega ao entrar e sempre que se volta a este ecrã: um destino novo
  // acabado de usar deve aparecer nos recentes sem obrigar a reabrir a
  // aplicação.
  useEffect(() => {
    const actualizar = () => {
      lerFixos().then(setFixos);
      destinosRecentes(token).then(setRecentes);
    };
    actualizar();
    return navigation.addListener('focus', actualizar);
  }, [navigation, token]);

  function irPara(destino) {
    navigation.navigate('RequestRide', destino ? { destino } : undefined);
  }

  // A pesquisa abre-se aqui mesmo, e não no ecrã de pedir viagem.
  //
  // A primeira ideia foi passar uma função pelos parâmetros da navegação
  // para o outro ecrã a chamar. Não presta: parâmetros de navegação têm
  // de ser dados simples — uma função dá avisos e perde-se quando o
  // sistema restaura o estado da aplicação.
  //
  // Definir a casa também não é pedir uma viagem. Sobrecarregar o ecrã
  // de pedido com um segundo propósito obrigava a mudar-lhe o botão e a
  // explicar ao utilizador em que modo está.
  const [aDefinir, setADefinir] = useState(null);

  async function guardarLugar(lugar) {
    const id = aDefinir;
    setADefinir(null);
    if (!id) return;
    setFixos(await guardarFixo(id, lugar));
  }

  async function cancelarComMotivo(motivo) {
    setACancelar(false);
    const r = await cancelRide(activeRide.id, motivo);
    if (r?.aviso === 'demasiados') {
      Alert.alert(t('cancelTooMany', { n: r.cancelamentos }), t('cancelTooManyExplain'));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <BarraTopo navigation={navigation} />

        {/* Um motorista que veio aqui pedir uma viagem tem de saber como
            volta ao trabalho. Sem isto ficaria a olhar para o ecrã errado
            sem perceber porquê. */}
        {podeConduzir ? (
          <Pressable style={styles.voltarConduzir} onPress={() => setModo('motorista')}>
            <Text style={styles.voltarConduzirTexto}>← {t('backToDriving')}</Text>
          </Pressable>
        ) : null}

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
                  info={{
                    km: activeRide.distanceKm,
                    min: activeRide.durationMin,
                  }}
                  aviso={minChegada != null ? t('etaArrivalShort', { min: minChegada }) : null}
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

                {/* Identificação do veículo, em bloco próprio.
                    Quem espera na rua faz sempre a mesma sequência: vê a
                    COR ao longe, e confirma a MATRÍCULA de perto. Estavam
                    as duas perdidas numa lista de linhas iguais, ao lado
                    do preço e da hora. Aqui saem da lista e ficam do
                    tamanho do trabalho que fazem. */}
                <View style={styles.identificacao}>
                  {activeRide.driver.vehicle?.plate ? (
                    <View style={styles.matriculaCaixa}>
                      <Text style={styles.matriculaRotulo}>{t('vehiclePlate')}</Text>
                      <Text style={styles.matricula}>{activeRide.driver.vehicle.plate}</Text>
                    </View>
                  ) : null}

                  {activeRide.driver.vehicle?.color ? (
                    <View style={styles.corBloco}>
                      {hexDaCor(activeRide.driver.vehicle.color) ? (
                        <View
                          style={[
                            styles.corAmostra,
                            {
                              backgroundColor: hexDaCor(activeRide.driver.vehicle.color),
                            },
                          ]}
                        />
                      ) : null}
                      <Text style={styles.corTexto}>
                        {nomeDaCor(activeRide.driver.vehicle.color, t)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <InfoRow label={t('vehicleType')} value={vehicleLabel(activeRide.driver.vehicle)} />
                {activeRide.driver.vehicle?.model ? (
                  <InfoRow label={t('vehicleModel')} value={activeRide.driver.vehicle.model} />
                ) : null}
                {minChegada != null ? (
                  <InfoRow
                    label={t('etaArrival')}
                    value={t('etaMinutes', {
                      min: minChegada,
                      hora: horaDeChegada(minChegada),
                    })}
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
          //
          // Este é o estado em que a app abre quase sempre, e era o mais
          // fraco do ecrã: um cartão pequeno com uma saudação e um botão.
          //
          // Agora a saudação respira e a acção tem a forma de uma barra de
          // procura com um ponto coral à esquerda. Não é decoração: é a
          // forma que toda a gente já associa a "escrever para onde vou",
          // e diz o que vai acontecer antes de se lhe tocar. Um botão que
          // diz "Pedir viagem" obriga a adivinhar o passo seguinte.
          <View style={styles.inicio}>
            <Text style={styles.saudacao}>{t('homeHello', { name: user?.name || '' })}</Text>
            <Text style={styles.convite}>{t('passengerPrompt')}</Text>

            <Pressable
              style={({ pressed }) => [styles.barraDestino, pressed && styles.premido]}
              onPress={() => irPara(null)}
              accessibilityRole="button"
              accessibilityLabel={t('requestRide')}
            >
              <View style={styles.pontoPartida} />
              <Text style={styles.barraTexto}>{t('whereTo')}</Text>
              <Text style={styles.barraSeta}>›</Text>
            </Pressable>

            {/* Casa e trabalho. Um toque leva lá; o lápis muda o sítio.
                O lápis existe porque a alternativa era um toque longo — e
                um gesto que ninguém descobre é funcionalidade que não
                existe. */}
            <View style={styles.lugares}>
              {FIXOS.map((f) => {
                const lugar = fixos[f.id];
                return (
                  <Pressable
                    key={f.id}
                    style={({ pressed }) => [styles.lugar, pressed && styles.premido]}
                    onPress={() => (lugar ? irPara(lugar) : setADefinir(f.id))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.lugarIcone}>{f.icone}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lugarNome}>{t(f.chave)}</Text>
                      <Text style={styles.lugarMorada} numberOfLines={1}>
                        {lugar ? lugar.label : t('lugarDefinir')}
                      </Text>
                    </View>
                    {lugar ? (
                      <Pressable onPress={() => setADefinir(f.id)} hitSlop={12}>
                        <Text style={styles.lugarLapis}>✎</Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {recentes.length > 0 ? (
              <>
                <Text style={styles.recentesTitulo}>{t('lugarRecentes')}</Text>
                {recentes.map((r, i) => (
                  <Pressable
                    key={`${r.lat},${r.lng},${i}`}
                    style={({ pressed }) => [styles.recente, pressed && styles.premido]}
                    onPress={() => irPara(r)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.recenteIcone}>🕘</Text>
                    <Text style={styles.recenteTexto} numberOfLines={1}>
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
      </ScrollView>

      {aDefinir ? (
        <View style={styles.pesquisaSobreposta}>
          <PlaceSearch
            placeholder={t(FIXOS.find((f) => f.id === aDefinir)?.chave)}
            onEscolher={guardarLugar}
            onFechar={() => setADefinir(null)}
          />
        </View>
      ) : null}
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

const criarEstilos = () =>
  StyleSheet.create({
    // A amostra é grande de propósito: identifica-se de longe, enquanto a
    // palavra "Branco" tem primeiro de ser lida.
    corAmostra: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    corTexto: { ...tipo.legenda, color: colors.text },
    // ---- Estado sem viagem ----
    inicio: { paddingTop: spacing.sm },
    saudacao: { ...tipo.display, color: colors.text },
    convite: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
    barraDestino: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      ...elevacao.plana,
    },
    // O ponto é a única coisa coral do ecrã em repouso. Marca onde a
    // viagem começa, e é o que faz a barra ler-se como um mapa e não como
    // um campo de texto qualquer.
    pontoPartida: {
      width: 11,
      height: 11,
      borderRadius: radius.pill,
      backgroundColor: colors.coral,
    },
    barraTexto: { ...tipo.corpoForte, color: colors.text, flex: 1 },
    barraSeta: { fontSize: 24, color: colors.textMuted, marginTop: -2 },
    premido: { opacity: 0.92, transform: [{ scale: 0.995 }] },

    // ---- Identificação do veículo ----
    identificacao: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
    matriculaCaixa: {
      flex: 1,
      backgroundColor: colors.paper,
      borderWidth: 1.5,
      borderColor: colors.teal,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    matriculaRotulo: { ...tipo.etiqueta, color: colors.textMuted },
    // Espaçamento largo: uma matrícula lê-se caracter a caracter, não como
    // palavra, e é assim que se compara com o carro que está à frente.
    matricula: { ...tipo.titulo, color: colors.text, letterSpacing: 1.5, marginTop: 1 },
    corBloco: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
    },

    // A pesquisa cobre o ecrã enquanto se define um lugar. Sem isto
    // ficava atrás do conteúdo e a lista de resultados era inalcançável.
    pesquisaSobreposta: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.paper,
      zIndex: 10,
    },

    // ---- Lugares guardados e recentes ----
    lugares: { marginTop: spacing.lg, gap: spacing.sm },
    lugar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // Sem disco de cor por trás: o ícone sozinho.
    lugarIcone: { fontSize: 20 },
    lugarNome: { ...tipo.corpoForte, color: colors.text },
    lugarMorada: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    lugarLapis: { fontSize: 17, color: colors.textMuted },

    recentesTitulo: { ...tipo.etiqueta, color: colors.textMuted, marginTop: spacing.lg },
    recente: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    recenteIcone: { fontSize: 15, opacity: 0.7 },
    recenteTexto: { ...tipo.corpo, color: colors.text, flex: 1 },

    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { flexGrow: 1, padding: spacing.lg },
    voltarConduzir: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      alignSelf: 'flex-start',
    },
    voltarConduzirTexto: { ...tipo.corpoForte, color: colors.teal },
    card: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    destLabel: { ...tipo.etiqueta, color: colors.textMuted, marginTop: spacing.md },
    destValue: { ...tipo.displayPequeno, color: colors.text },
    origin: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    searching: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    searchingText: { ...tipo.corpoForte, color: colors.coralDark },
    // Era '#F0F5F4' fixo — um creme esverdeado que no tema escuro ficava um
    // rectângulo claro dentro do ecrã preto.
    driverBox: {
      marginTop: spacing.lg,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    boxTitle: { ...tipo.etiqueta, color: colors.teal, marginBottom: spacing.xs },
    driverName: { ...tipo.titulo, color: colors.text },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    rowLabel: { ...tipo.pequeno, color: colors.textMuted },
    rowValue: { ...tipo.corpoForte, color: colors.text },
    rowValueStrong: { ...tipo.subtitulo, color: colors.teal },
    callBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.teal,
      borderRadius: radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    callBtnText: { ...tipo.corpoForte, color: colors.onTeal },
    driverMoving: {
      ...tipo.legenda,
      color: colors.teal,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
