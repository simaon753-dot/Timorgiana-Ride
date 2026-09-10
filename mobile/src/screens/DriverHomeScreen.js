import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo.js';
import AvisoTeste from '../components/AvisoTeste.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import BarraTopo from '../components/BarraTopo.js';
import StatusBadge from '../components/StatusBadge.js';
import MapaExpandivel from '../components/MapaExpandivel.js';
import MotivoCancelamento from '../components/MotivoCancelamento.js';
import PedirCodigo from '../components/PedirCodigo.js';
import FotoDeTurno from '../components/FotoDeTurno.js';
import BotaoPower from '../components/BotaoPower.js';
import { api } from '../api/client.js';
import { paraMostrar } from '../lib/datas.js';
import ChatButton from '../components/ChatButton.js';
import SosButton from '../components/SosButton.js';
import RatingPanel from '../components/RatingPanel.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { VEICULOS, nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

// O nome de cada documento, para o aviso poder dizer "Cartão de inspeção"
// em vez de "inspection". Num mapa e não construído letra a letra: uma chave
// montada em tempo de execução escapa ao verificador de traduções, e foi
// assim que os tipos de lugar quase saíram sem tétum.
const CHAVE_CARGA = {
  compras: 'cargaCompras',
  moveis: 'cargaMoveis',
  caixas: 'cargaCaixas',
  eletrodomesticos: 'cargaEletrodomesticos',
  materiais: 'cargaMateriais',
  mercadorias: 'cargaMercadorias',
  outros: 'cargaOutros',
};
const CHAVE_VOLUME = {
  pequeno: 'cargaVolPequeno',
  medio: 'cargaVolMedio',
  grande: 'cargaVolGrande',
};
const CHAVE_AJUDA = {
  nenhuma: 'cargaAjudaNenhuma',
  carregar: 'cargaAjudaCarregar',
  descarregar: 'cargaAjudaDescarregar',
  ambas: 'cargaAjudaAmbas',
};

const NOME_DO_DOC = {
  licence: 'docLicence',
  vehicle: 'docVehicle',
  inspection: 'docInspection',
  identity: 'docIdentity',
  photo: 'docPhoto',
};

export default function DriverHomeScreen({ navigation }) {
  const { t } = useI18n();
  const { logout, token, user } = useAuth();
  // Se já há foto de hoje. Enquanto não se sabe fica `null`, para não
  // piscar o cartão de fotografia a quem já a tirou.
  const [fotoDeHoje, setFotoDeHoje] = useState(null);
  const [avisoDocs, setAvisoDocs] = useState(null);
  // Documentos que acabam nos próximos quinze dias. Separado do bloqueio: um
  // é "não pode trabalhar", o outro é "trate disto esta semana", e mostrá-los
  // com a mesma cara ensinaria a ignorar os dois.
  const [docsACaducar, setDocsACaducar] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [centroMapa, setCentroMapa] = useState(null);

  // O useRides() VEM ANTES de quem o usa, e isso é a correcção de um defeito
  // que deixou um motorista sem ecrã depois de aceitar uma viagem.
  //
  // Estava no fim do bloco, depois de `activeRide` e do efeito que centra o
  // mapa — os dois a ler valores que ainda não tinham sido criados. Em
  // JavaScript isso é um erro que rebenta... mas o empacotador do React
  // Native converte `const` em `var` ao compilar, e aí não rebenta: passa a
  // valer `undefined`, em silêncio.
  //
  // O resultado era que `viagemBruta` valia SEMPRE `undefined` na linha de
  // baixo, em todos os desenhos do ecrã. Logo `activeRide` era sempre nulo, e
  // o motorista que aceitava uma viagem via o ecrã de sempre: "Sem pedidos de
  // momento". Não era intermitente nem dependia da rede — nunca podia
  // funcionar.
  //
  // Nada no ecrã dizia que havia um erro, porque para o JavaScript não
  // havia: `undefined && ...` é uma expressão perfeitamente válida. Foi
  // preciso um motorista a sério, a olhar para um ecrã vazio, para aparecer.
  const {
    activeRide: viagemBruta,
    isFinal,
    requests,
    ignorarPedido,
    acceptRide,
    advanceStatus,
    startRide,
    cancelRide,
    dismissRide,
    loading,
    connected,
    online,
    toggleOnline,
    bloqueio,
    minhaPosicao,
  } = useRides();

  // Espelho do ecrã do passageiro: aqui só entram viagens que EU conduzo.
  const activeRide = viagemBruta && viagemBruta.driver?.id === user?.id ? viagemBruta : null;

  const verEstado = useCallback(async () => {
    try {
      const r = await api.driverStatus(token);
      setFotoDeHoje(!!r.fotoDeHoje);
      setAvisoDocs(r.apto?.pode === false ? r.apto : null);
      setDocsACaducar(r.apto?.pode ? r.apto.aCaducar || [] : []);
      setAssinatura(r.assinatura || null);
    } catch {
      /* sem rede: não bloqueamos nada com base em desconhecimento */
    }
  }, [token]);

  useEffect(() => {
    verEstado();
    return navigation.addListener('focus', verEstado);
  }, [verEstado, navigation]);

  useEffect(() => {
    if (minhaPosicao && !centroMapa) setCentroMapa(minhaPosicao);
  }, [minhaPosicao, centroMapa]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AvisoTeste />
        <BarraTopo navigation={navigation} />

        {/* A fotografia do dia vem ANTES do interruptor: sem ela o
            interruptor não funciona, e um botão que recusa sem explicar
            gera um telefonema. */}
        {!activeRide && fotoDeHoje === false ? (
          <View style={{ marginBottom: spacing.md }}>
            <FotoDeTurno feita={false} onFeita={verEstado} />
          </View>
        ) : null}

        {/* A assinatura fica ACIMA do interruptor, como a fotografia de
            turno: as duas coisas que podem impedir o motorista de trabalhar
            têm de estar à vista antes de ele carregar no botão, e não
            depois de o botão recusar. */}
        {!activeRide ? (
          <FaixaAssinatura a={assinatura} bloqueio={bloqueio} navigation={navigation} />
        ) : null}

        {/* A conta está suspensa. Não é uma decisão de ninguém — é o que
            acontece enquanto um documento estiver fora de prazo, e desfaz-se
            sozinha quando o documento novo chegar. Dizer isso importa: sem
            essa frase, quem lê "suspensa" telefona. */}
        {!activeRide && avisoDocs ? (
          <Pressable style={styles.avisoDocs} onPress={() => navigation.navigate('DriverPending')}>
            <Text style={styles.avisoDocsTitulo}>{t('docSuspensoTitulo')}</Text>
            <Text style={styles.avisoDocsTexto}>
              {avisoDocs.motivo === 'documento_caducado'
                ? t('cannotGoOnlineExpired')
                : avisoDocs.motivo === 'documento_sem_validade'
                  ? t('cannotGoOnlineNoDate')
                  : t('docsIncomplete')}
              {avisoDocs.qual && NOME_DO_DOC[avisoDocs.qual]
                ? `  ·  ${t(NOME_DO_DOC[avisoDocs.qual])}`
                : ''}
            </Text>
            {avisoDocs.qual === 'inspection' ? (
              <Text style={styles.avisoDocsTexto}>{t('docMultaAviso')}</Text>
            ) : null}
            <Text style={styles.avisoDocsTexto}>{t('docSuspensoExplica')}</Text>
          </Pressable>
        ) : null}

        {/* Quinze dias antes. Chega para tratar de um papel em Díli sem
            perder um dia de trabalho, e não é tão cedo que se esqueça.
            Diz quantos dias faltam e não "está quase": quatro dias mandam
            fazer alguma coisa hoje, "está quase" não manda fazer nada. */}
        {!activeRide && docsACaducar.length ? (
          <Pressable
            style={styles.avisoValidade}
            onPress={() => navigation.navigate('DriverPending')}
          >
            <Text style={styles.avisoValidadeTitulo}>{t('docAvisoTitulo')}</Text>
            {docsACaducar.map((d) => (
              <Text key={d.qual} style={styles.avisoValidadeTexto}>
                {t(NOME_DO_DOC[d.qual] || 'docLicence')}:{' '}
                {(d.dias <= 0 ? t('docPorAcabarHoje') : t('docPorAcabar'))
                  .replace('{ate}', paraMostrar(d.ate))
                  .replace('{dias}', String(d.dias))}
              </Text>
            ))}
            {/* O próprio cartão diz, no rodapé, para renovar a partir de dez
                dias antes. Avisamos aos quinze — que é o tempo de reparar no
                aviso — mas quem for logo no primeiro dia faz viagem à toa até
                à DNTT. Um aviso que provoca uma deslocação inútil é um aviso
                mal feito. */}
            {docsACaducar.some((d) => d.qual === 'inspection') ? (
              <Text style={styles.avisoValidadeTexto}>{t('docInspecaoRenovar')}</Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* Ligar e desligar o trabalho. Um motorista a almoçar não deve
            receber pedidos: para o passageiro, um pedido que ninguém
            atende é pior do que nenhum. */}
        {!activeRide ? <BotaoPower ligado={online} onPress={() => toggleOnline(!online)} /> : null}

        {/* O mapa também do lado do motorista: sem ele, ele sabe o NOME do
            sítio de recolha mas não onde fica em relação a si. Com viagem
            mostra recolha e destino; sem viagem mostra só onde ele está,
            que já chega para se situar. */}
        {minhaPosicao || activeRide ? (
          <View style={{ marginBottom: spacing.md }}>
            <MapaExpandivel
              markers={activeRide ? rideMarkers(activeRide) : []}
              center={activeRide ? undefined : centroMapa}
              liveMarker={minhaPosicao}
              liveLabel={t('myLocation')}
              height={activeRide ? 150 : 190}
              info={
                activeRide ? { km: activeRide.distanceKm, min: activeRide.durationMin } : undefined
              }
            />
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        ) : activeRide ? (
          <ActiveRideCard
            ride={activeRide}
            isFinal={isFinal}
            navigation={navigation}
            onArriving={() => advanceStatus(activeRide.id, 'arriving')}
            onStart={(codigo) => startRide(activeRide.id, codigo)}
            onComplete={() => advanceStatus(activeRide.id, 'completed')}
            onCancel={(motivo) => cancelRide(activeRide.id, motivo)}
            onDismiss={dismissRide}
          />
        ) : (
          <View>
            <Text style={styles.heading}>{t('availableRequests')}</Text>
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('noRequests')}</Text>
                <Text style={styles.emptyHint}>{t('waitingRequests')}</Text>
              </View>
            ) : (
              requests.map((r) => (
                <RequestCard
                  key={r.id}
                  ride={r}
                  // A POSIÇÃO DELE VAI NO CARTÃO, e é metade do que serve
                  // para decidir. Ver "recolha na Avenida X" não diz nada a
                  // quem não sabe de cor onde está; ver os três pontos no
                  // mesmo mapa diz tudo de uma vez.
                  minhaPosicao={minhaPosicao}
                  onAccept={(fare) => acceptRide(r.id, fare)}
                  onIgnorar={() => ignorarPedido(r.id)}
                />
              ))
            )}
          </View>
        )}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
        {!connected ? <Text style={styles.offline}>{t('liveOff')}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Cartão de um pedido por aceitar ----
function RequestCard({ ride, minhaPosicao, onAccept, onIgnorar }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  // OS TRÊS PONTOS NO MESMO MAPA, antes de aceitar.
  //
  // O cartão dizia os nomes dos sítios — "recolha na Avenida X, destino Y" —
  // e um nome só serve a quem já sabe onde aquilo fica. O motorista tinha de
  // decidir sem ver: aceitava e só depois descobria que a recolha era do
  // outro lado da cidade, ou que o destino o deixava longe de tudo.
  //
  // É o MESMO mapa do ecrã do passageiro (MapaExpandivel), e por isso abre em
  // grande ao tocar. Pequeno no cartão para a lista continuar a ler-se de
  // relance; inteiro quando a decisão merecer olhar com cuidado.
  const marcadores = rideMarkers(ride);

  // `vehicleAny` continua a existir e é preciso: há viagens sem tipo
  // gravado — pedidos antigos, ou feitos sem coordenadas — e a essas não se
  // pode chamar "Carro" só porque é o valor de reserva da tabela.
  const wants = VEICULOS[ride.vehicleType] ? nomeDoVeiculo(t, ride.vehicleType) : t('vehicleAny');

  async function accept() {
    setBusy(true);
    try {
      await onAccept(null);
    } catch {
      setBusy(false); // se falhar (já aceite por outro), volta a permitir
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.destValue}>{ride.destLabel}</Text>
      {ride.originLabel ? (
        <Text style={styles.origin}>
          {t('originField')}: {ride.originLabel}
        </Text>
      ) : null}
      {/* PARA OUTRA PESSOA, dito antes de aceitar.
          É aqui que o consentimento do motorista acontece de facto: se ele
          só soubesse depois de aceitar, já não estaria a escolher — estaria
          a ser informado de uma escolha feita por outro.
          O nome de quem viaja não vem nesta fase, de propósito: não é
          preciso para decidir, e a lista de pedidos vai para todos os
          motoristas disponíveis do município. */}
      {ride.viajante ? (
        <View style={[styles.paraOutra, ride.viajante.menor && styles.paraOutraMenor]}>
          <Text style={styles.paraOutraTexto}>
            {ride.viajante.menor ? `👦 ${t('pedidoMenor')}` : `👤 ${t('pedidoOutraPessoa')}`}
          </Text>
        </View>
      ) : null}
      {/* O mapa depois dos nomes e ANTES do preço e do botão: a ordem em que
          a decisão se forma. Primeiro para onde é, depois onde fica, e só
          então quanto rende e se aceita. */}
      {marcadores.length ? (
        <View style={{ marginTop: spacing.md }}>
          <MapaExpandivel
            markers={marcadores}
            // A posição dele entra como marcador vivo — o mesmo lugar onde o
            // passageiro vê o carro a aproximar-se. Aqui é ele próprio, e é o
            // ponto que dá sentido aos outros dois.
            liveMarker={minhaPosicao}
            liveLabel={t('youAreHere')}
            height={150}
            info={
              ride.distanceKm != null ? { km: ride.distanceKm, min: ride.durationMin } : undefined
            }
          />
        </View>
      ) : null}
      {/* A CARGA, ANTES DE ACEITAR — e é a razão de existir metade da fase 2.
          Um motorista que aceita sem saber o que vai levar chega, olha para um
          sofá que não lhe cabe na caixa, e vai-se embora: a viagem perde-se
          para os dois e a manhã de alguém fica estragada.
          O que precisa de decidir é isto: o que é, quanto é, e se lhe pedem
          para carregar. As observações vêm a seguir porque são o detalhe, não
          a decisão. */}
      {ride.carga ? (
        <View style={styles.carga}>
          <Text style={styles.cargaLinha}>
            {t(CHAVE_CARGA[ride.carga.tipo] || 'cargaOutros')}
            {ride.carga.volume ? ` · ${t(CHAVE_VOLUME[ride.carga.volume])}` : ''}
          </Text>
          {ride.carga.ajuda && ride.carga.ajuda !== 'nenhuma' ? (
            <Text style={styles.cargaAjuda}>{t(CHAVE_AJUDA[ride.carga.ajuda])}</Text>
          ) : null}
          {ride.carga.notas ? <Text style={styles.cargaNotas}>{ride.carga.notas}</Text> : null}
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.passenger}>🧍 {ride.passenger?.name}</Text>
        <Text style={styles.wants}>
          {ride.pickupKm != null
            ? `📍 ${t('pickupDistance', { km: ride.pickupKm })}`
            : `${t('wantsLabel')}: ${wants}`}
        </Text>
      </View>
      <View style={styles.precoLinha}>
        <Text style={styles.precoRotulo}>{t('fareLabel')}</Text>
        <Text style={styles.precoValor}>
          {ride.fareUsd != null ? `$${ride.fareUsd.toFixed(2)}` : t('fareToAgree')}
        </Text>
      </View>
      <Button title={t('acceptRide')} onPress={accept} loading={busy} />
      {/* IGNORAR, e não "recusar".
          A palavra importa: recusar soa a decidir pela viagem, e não é isso
          que acontece. O pedido continua a ir para os outros motoristas
          disponíveis do município — só desaparece da lista de quem o pôs de
          lado.
          Discreto por baixo do aceitar, e não lado a lado: aceitar é o que se
          vem fazer aqui, e dois botões do mesmo tamanho fariam da recusa uma
          escolha tão oferecida como a outra. */}
      {onIgnorar ? (
        <Pressable style={styles.ignorar} onPress={onIgnorar} hitSlop={8}>
          <Text style={styles.ignorarTexto}>{t('ignoreRequest')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---- Cartão da viagem ativa do motorista ----
function ActiveRideCard({
  ride,
  isFinal,
  navigation,
  onArriving,
  onStart,
  onComplete,
  onCancel,
  onDismiss,
}) {
  const { t } = useI18n();
  const [aCancelar, setACancelar] = useState(false);
  const [aPedirCodigo, setAPedirCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState(null);
  const [aIniciar, setAIniciar] = useState(false);

  async function comecar(codigo) {
    setErroCodigo(null);
    setAIniciar(true);
    try {
      await onStart(codigo);
      setAPedirCodigo(false);
    } catch (e) {
      setErroCodigo(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAIniciar(false);
    }
  }
  const active = ['accepted', 'arriving', 'in_progress'].includes(ride.status);

  return (
    <View style={styles.card}>
      <StatusBadge status={ride.status} />
      <Text style={styles.destLabel}>{t('destination')}</Text>
      <Text style={styles.destValue}>{ride.destLabel}</Text>
      {ride.originLabel ? (
        <Text style={styles.origin}>
          {t('originField')}: {ride.originLabel}
        </Text>
      ) : null}

      <View style={styles.passengerBox}>
        <Text style={styles.boxTitle}>{t('yourPassenger')}</Text>
        {/* QUEM VIAJA À FRENTE, quem pediu por baixo.
            O motorista vai buscar uma pessoa, não uma conta. Pôr o nome do
            titular em cima seria mandá-lo perguntar pela pessoa errada à
            porta de casa. */}
        <Text style={styles.passengerName}>{ride.viajante?.nome || ride.passenger?.name}</Text>
        {ride.viajante ? (
          <Text style={styles.quemPediu}>
            {ride.viajante.menor ? `👦 ${t('pedidoMenor')} · ` : ''}
            {t('pedidoPor', { nome: ride.passenger?.name || '—' })}
          </Text>
        ) : null}
        {/* O motorista precisa de saber em que se está a meter antes de
            arrancar: quanto tempo e quantos quilómetros. */}
        {ride.durationMin != null ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('etaTrip')}</Text>
            <Text style={styles.rowValue}>
              {t('etaTripValue', { min: ride.durationMin, km: ride.distanceKm ?? '—' })}
            </Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('fareLabel')}</Text>
          <Text style={styles.rowValueStrong}>
            {ride.fareUsd != null ? `$${ride.fareUsd}` : t('fareToAgree')}
          </Text>
        </View>
        {/* O NÚMERO DE QUEM ESTÁ À ESPERA, não o da conta.
            Quem pediu pode estar em casa; quem atende tem de ser quem está
            no passeio. Sem viajante, é o mesmo número de sempre. */}
        {ride.viajante?.telefone || ride.passenger?.phone ? (
          <Pressable
            style={styles.callBtn}
            onPress={() =>
              Linking.openURL(`tel:${ride.viajante?.telefone || ride.passenger.phone}`)
            }
          >
            <Text style={styles.callBtnText}>
              📞 {t('callLabel')} · {ride.viajante?.telefone || ride.passenger.phone}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {active ? (
        <>
          <View style={{ marginTop: spacing.md }}>
            <ChatButton navigation={navigation} />
          </View>
          {/* O motorista corre o mesmo risco que o passageiro — leva
              desconhecidos no carro, muitas vezes de noite. */}
          <View style={{ marginTop: spacing.md }}>
            <SosButton rideId={ride.id} />
          </View>
        </>
      ) : null}

      {ride.status === 'completed' ? <RatingPanel ride={ride} role="driver" /> : null}

      <View style={{ height: spacing.lg }} />
      {isFinal ? (
        <Button title={t('newRide')} onPress={onDismiss} />
      ) : ride.status === 'accepted' ? (
        <>
          <Button title={t('onTheWay')} onPress={onArriving} />
          <View style={{ height: spacing.sm }} />
          <Button title={t('cancelRide')} variant="outline" onPress={() => setACancelar(true)} />
        </>
      ) : ride.status === 'arriving' ? (
        <>
          {/* Só depois do código é que a viagem começa. Concluir sem
              começar deixou de ser possível. */}
          <Button title={t('startRide')} onPress={() => setAPedirCodigo(true)} />
          <View style={{ height: spacing.sm }} />
          <Button title={t('cancelRide')} variant="outline" onPress={() => setACancelar(true)} />
        </>
      ) : (
        <>
          <Button title={t('completeRide')} variant="secondary" onPress={onComplete} />
          <View style={{ height: spacing.sm }} />
          <Button title={t('cancelRide')} variant="outline" onPress={() => setACancelar(true)} />
        </>
      )}

      <PedirCodigo
        visivel={aPedirCodigo}
        erro={erroCodigo}
        aEnviar={aIniciar}
        onFechar={() => {
          setAPedirCodigo(false);
          setErroCodigo(null);
        }}
        onConfirmar={comecar}
      />

      <MotivoCancelamento
        visivel={aCancelar}
        papel="driver"
        aCaminho
        onFechar={() => setACancelar(false)}
        onConfirmar={(motivo) => {
          setACancelar(false);
          onCancel(motivo);
        }}
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    avisoDocs: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    avisoDocsTitulo: { ...tipo.corpoForte, color: colors.danger },
    avisoDocsTexto: { ...tipo.pequeno, color: colors.danger },
    // Coral e não vermelho: isto não impede ninguém de trabalhar hoje. Dar
    // ao aviso a mesma cara do bloqueio ensinava a ignorar os dois.
    avisoValidade: {
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    avisoValidadeTitulo: { ...tipo.corpoForte, color: colors.coralDark },
    avisoValidadeTexto: { ...tipo.pequeno, color: colors.coralDark },
    scroll: { flexGrow: 1, padding: spacing.lg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    heading: { ...tipo.titulo, color: colors.text, marginBottom: spacing.md },
    empty: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyTitle: { ...tipo.subtitulo, color: colors.text },
    emptyHint: {
      ...tipo.pequeno,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    destLabel: { ...tipo.etiqueta, color: colors.textMuted, marginTop: spacing.md },
    destValue: { ...tipo.titulo, color: colors.text },
    origin: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    passenger: { ...tipo.corpoForte, color: colors.text },
    wants: { ...tipo.corpoForte, color: colors.teal },
    passengerBox: {
      marginTop: spacing.lg,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    boxTitle: { ...tipo.corpoForte, color: colors.teal, marginBottom: spacing.xs },
    passengerName: { ...tipo.titulo, color: colors.text, marginBottom: spacing.xs },
    quemPediu: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    // O distintivo de "para outra pessoa". Coral quando é um menor: não é
    // um erro, é uma coisa que o motorista tem de ver antes de decidir.
    paraOutra: {
      alignSelf: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.tintaTeal,
      marginBottom: spacing.xs,
    },
    paraOutraMenor: { backgroundColor: colors.tintaCoral },
    paraOutraTexto: { ...tipo.legenda, color: colors.text, fontWeight: '700' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
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
    // Sem fundo nem contorno: um link, não um botão. Ver a nota no cartão.
    ignorar: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
    ignorarTexto: { ...tipo.pequeno, color: colors.textMuted },
    carga: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    cargaLinha: { ...tipo.corpoForte, color: colors.teal },
    cargaAjuda: { ...tipo.pequeno, color: colors.teal, marginTop: 1 },
    cargaNotas: { ...tipo.pequeno, color: colors.textMuted, marginTop: 3 },
    precoLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    precoRotulo: { ...tipo.pequeno, color: colors.textMuted },
    precoValor: { ...tipo.displayPequeno, color: colors.teal },
    fareEditor: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    fareSaveBtn: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    offline: {
      ...tipo.legenda,
      textAlign: 'center',
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});

// Faixa da assinatura.
//
// Três estados, e só um aparece de cada vez:
//   · em período gratuito — verde, com a data. Diz o preço antes de o
//     cobrar, que é a diferença entre "acabou a promoção" e "tiraram-me
//     alguma coisa".
//   · sem dias — coral, e leva ao ecrã onde se carrega.
//   · com dias — nada. Um motorista a trabalhar não precisa de ver a
//     contabilidade dele todos os dias.
function FaixaAssinatura({ a, bloqueio, navigation }) {
  const { t, lang } = useI18n();
  if (!a) return null;

  const bloqueado = bloqueio?.motivo === 'sem_saldo' || (!a.gratuito && (a.dias ?? 0) <= 0);
  if (!a.gratuito && !bloqueado) return null;

  // "2027-04-30" lê-se mal numa faixa. O nome do mês lê-se de relance — e
  // é assim que o Simão o diz em voz alta. O tétum não é uma língua que o
  // Intl conheça; os meses em português são o que qualquer motorista em
  // Díli reconhece.
  const quando = (() => {
    try {
      return new Date(`${a.gratuitoAte}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en' : 'pt', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return a.gratuitoAte;
    }
  })();

  return (
    <Pressable
      onPress={() => navigation.navigate('Assinatura')}
      style={[estilosFaixa.faixa, bloqueado && estilosFaixa.faixaMau]}
    >
      <Text style={estilosFaixa.titulo}>
        {bloqueado ? t('assinBloqueado') : t('assinGratuitaAte', { ate: quando })}
      </Text>
      <Text style={estilosFaixa.nota}>{bloqueado ? t('assinSemSaldo') : t('assinVer')}</Text>
    </Pressable>
  );
}

const criarEstilosFaixa = () =>
  StyleSheet.create({
    faixa: {
      backgroundColor: colors.teal,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      gap: 2,
    },
    faixaMau: { backgroundColor: colors.danger },
    titulo: { ...tipo.corpoForte, color: colors.onTeal },
    nota: { ...tipo.pequeno, color: colors.onTeal, opacity: 0.9 },
  });

let estilosFaixa = criarEstilosFaixa();
registarEstilos(() => {
  estilosFaixa = criarEstilosFaixa();
});
