import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import Retrato from '../design/Retrato.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import AvisoTeste from '../components/AvisoTeste.js';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from '../termos/versao.js';
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

// As fotografias dos dois veículos. Fora do componente para não voltarem a
// ser resolvidas a cada desenho do ecrã.
const IMG_MOTA = require('../../assets/veiculos/mota.png');
const IMG_CARRO = require('../../assets/veiculos/carro.png');

export default function PassengerHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, logout } = useAuth();
  // TERMOS POR ACEITAR — os desta versão, não "uns termos quaisquer".
  //
  // Compara-se a VERSÃO e não a existência: quem aceitou a de Agosto não
  // aceitou a de hoje se o texto mudou de sentido, e é justamente aí que voltar
  // a perguntar interessa. As contas criadas antes de isto ser guardado têm o
  // campo vazio e caem no mesmo caso, que é o correcto — nunca aceitaram.
  const faltaTermos = user?.termsVersion !== VERSAO_TERMOS;
  const faltaPrivacidade = user?.privacyVersion !== VERSAO_PRIVACIDADE;
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
        <AvisoTeste />
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
                {/* O ROSTO AO LADO DO NOME, e não um nome sozinho.
                    A política de segurança manda confirmar "a matrícula, o
                    modelo do veículo e o nome/fotografia do motorista" antes
                    de entrar. As duas primeiras estavam no ecrã; a fotografia
                    não estava em lado nenhum, e a instrução não se podia
                    cumprir.
                    Junto do nome de propósito: quem espera na rua olha uma
                    vez para o ecrã e uma vez para a pessoa. Separados, eram
                    duas verificações; juntos, é uma. */}
                <View style={styles.linhaMotorista}>
                  <Retrato tamanho={54} caminho={`/rides/${activeRide.id}/retrato`} />
                  <Text style={[styles.driverName, styles.nomeAoLado]}>
                    {activeRide.driver.name}
                  </Text>
                </View>

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

            {/* NINGUÉM RESPONDEU.
             *
             * Ao fim de dez minutos o pedido fecha-se sozinho no servidor. Sem
             * esta linha, a viagem desaparecia do ecrã sem explicação — e uma
             * viagem que desaparece sozinha lê-se como avaria da app, não como
             * "não havia motoristas". */}
            {activeRide.cancelReason === 'sem_motorista' ? (
              <View style={styles.semMotorista}>
                <Text style={styles.semMotoristaTexto}>{t('noDriverFound')}</Text>
              </View>
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
            {/* AVISA, MAS NÃO TRANCA.
             *
             * A tentação era não deixar pedir viagem sem os termos aceites.
             * Mas um engano numa cadeia de versões deixaria toda a gente à
             * porta da app ao mesmo tempo, e o remédio seria pior. A faixa
             * fica sempre à vista até ser resolvida, que é o que uma pessoa
             * precisa para o fazer — e o painel continua a poder mostrar quem
             * ainda não aceitou. */}
            {faltaTermos || faltaPrivacidade ? (
              <View style={styles.termosCaixa}>
                <Text style={styles.termosTexto}>
                  {faltaTermos ? t('termosPorAceitar') : t('privacidadePorAceitar')}
                </Text>
                <View style={{ height: spacing.sm }} />
                <Button
                  title={t('driverTermsRead')}
                  onPress={() =>
                    navigation.navigate('Termos', {
                      // Um de cada vez, e os termos primeiro. Duas caixas ao
                      // mesmo tempo pedem duas decisões antes de se poder fazer
                      // seja o que for; assim que a primeira for aceite, esta
                      // faixa reaparece com a segunda.
                      ...(faltaTermos ? { quem: 'passenger' } : { documento: 'privacidade' }),
                      aceitavel: true,
                    })
                  }
                />
              </View>
            ) : null}

            <Text style={styles.saudacao}>{t('homeHello', { name: user?.name || '' })}</Text>
            <Text style={styles.convite}>{t('escolherVeiculo')}</Text>

            {/* O VEÍCULO É O PRIMEIRO PASSO, e não o último.
                Antes escolhia-se o destino aqui e o veículo três ecrãs à
                frente, ao lado do preço. O Simão pediu ao contrário, e faz
                sentido em Díli: entre mota e carro a diferença de preço é
                mais do dobro, e é a decisão que a pessoa já traz tomada
                quando pega no telemóvel.
                Dois cartões grandes e não uma lista: são duas opções, e uma
                escolha entre duas coisas mostra-se lado a lado. */}
            <View style={styles.veiculos}>
              {[
                {
                  id: 'motorbike',
                  img: IMG_MOTA,
                  nome: t('vehicleMotorbike'),
                  nota: t('motoMaisBarato'),
                },
                { id: 'car', img: IMG_CARRO, nome: t('vehicleCar'), nota: t('carroMaisAbrigado') },
              ].map((v) => (
                <Pressable
                  key={v.id}
                  style={({ pressed }) => [styles.veiculo, pressed && styles.premido]}
                  onPress={() => navigation.navigate('EscolherDestino', { veiculo: v.id })}
                  accessibilityRole="button"
                  accessibilityLabel={v.nome}
                >
                  <Image source={v.img} style={styles.veiculoFoto} resizeMode="contain" />
                  <View style={styles.veiculoTextos}>
                    <Text style={styles.veiculoNome}>{v.nome}</Text>
                    <Text style={styles.veiculoNota}>{v.nota}</Text>
                  </View>
                  <Icone nome="seta" tamanho={20} cor={colors.textMuted} />
                </Pressable>
              ))}
            </View>
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
    // Os dois cartões de veículo. Altura fixa para os dois ficarem iguais
    // mesmo com fotografias de proporções diferentes — a mota é alta e
    // estreita, o carro é baixo e largo, e sem altura fixa um cartão
    // ficava maior do que o outro sem razão nenhuma.
    veiculos: { gap: spacing.md, marginTop: spacing.lg },
    veiculo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      minHeight: 104,
      ...elevacao.cartao,
    },
    veiculoFoto: { width: 104, height: 76 },
    veiculoTextos: { flex: 1 },
    veiculoNome: { ...tipo.subtitulo, color: colors.text },
    veiculoNota: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    saudacao: { ...tipo.display, color: colors.text },
    convite: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
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
    // O retrato e o nome na mesma linha, alinhados ao centro pela vertical.
    linhaMotorista: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    // Sem a margem de cima que o nome tinha quando estava sozinho: aqui é o
    // retrato que dá a altura da linha.
    nomeAoLado: { marginTop: 0, flexShrink: 1 },
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
    // A mesma linguagem do aviso de "Indisponível" no ecrã do pedido: fundo de
    // tinta de perigo e texto na cor de perigo. É a mesma família de recado —
    // "isto não vai acontecer, e a razão não és tu".
    // A mesma forma da caixa dos termos de motorista, no ecrã dele. Duas
    // caixas com o mesmo recado devem ter o mesmo aspecto.
    termosCaixa: {
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    termosTexto: { ...tipo.corpoForte, color: colors.text },
    semMotorista: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    semMotoristaTexto: { ...tipo.corpoForte, color: colors.danger, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
