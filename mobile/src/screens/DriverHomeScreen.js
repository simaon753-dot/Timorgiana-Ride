import React, { useState, useEffect, useCallback } from 'react';
import DadosCarga from '../design/DadosCarga.js';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo.js';
import AvisoTeste from '../components/AvisoTeste.js';
import Button from '../components/Button.js';
import BarraTopo from '../components/BarraTopo.js';
import { statusMeta } from '../components/StatusBadge.js';
import Avatar from '../design/Avatar.js';
import BotaoAccao from '../design/BotaoAccao.js';
import { abrirNoMapa } from '../lib/mapaLink.js';
import MapaExpandivel from '../components/MapaExpandivel.js';
import MotivoCancelamento from '../components/MotivoCancelamento.js';
import PedirCodigo from '../components/PedirCodigo.js';
import FotoDeTurno from '../components/FotoDeTurno.js';
import BotaoPower from '../components/BotaoPower.js';
import { api } from '../api/client.js';
import { paraMostrar } from '../lib/datas.js';
import SosButton from '../components/SosButton.js';
import RatingPanel from '../components/RatingPanel.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { VEICULOS, nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, radius, registarEstilos, paletaEmUso, elevacao } from '../theme.js';
import Icone from '../design/Icone.js';
import NumerosViagem from '../design/NumerosViagem.js';
import PercursoPontos from '../design/PercursoPontos.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import { VERSAO_TERMOS_MOTORISTA, VERSAO_PRIVACIDADE } from '../termos/versao.js';
import ImagemProtegida from '../design/ImagemProtegida.js';

// O nome de cada documento, para o aviso poder dizer "Cartão de inspeção"
// em vez de "inspection". Num mapa e não construído letra a letra: uma chave
// montada em tempo de execução escapa ao verificador de traduções, e foi
// assim que os tipos de lugar quase saíram sem tétum.
const CHAVE_CARGA = {
  compras: 'cargaCompras',
  caixas: 'cargaCaixas',
  moveis: 'cargaMoveis',
  mudanca: 'cargaMudanca',
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
  cartaverso: 'docCartaverso',
  vehicle: 'docVehicle',
  inspection: 'docInspection',
  identity: 'docIdentity',
  photo: 'docPhoto',
  fotoveiculo: 'docFotoveiculo',
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
    recusarPedido,
    marcarEtapaCarga,
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

  // Documentos por aceitar. A privacidade também: o ecrã do passageiro já a
  // pedia, mas quem está no modo de motorista nunca passa por lá.
  const faltaTermosMotorista = user?.driverTermsVersion !== VERSAO_TERMOS_MOTORISTA;
  const faltaPrivacidade = user?.privacyVersion !== VERSAO_PRIVACIDADE;

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
        <BarraTopo navigation={navigation} motoristaOnline={!!online} />

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
        {/* O CARRY SEM CAPACIDADE: registou-se antes do campo existir. Vê todos
            os pedidos (decisão do Simão), e este aviso pede o que falta. */}
        {!activeRide &&
        VEICULOS[user?.vehicle?.type]?.perguntaCarga &&
        !user?.vehicle?.capacidade ? (
          <AvisoCapacidade />
        ) : null}

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

        {/* OS TERMOS MUDARAM (14/09/26). Antes disto, só o ecrã dos documentos
            pedia a nova aceitação — e um motorista já aprovado só lá chega
            pelo perfil. A versão que entrou a assinatura nunca seria aceite
            por quem já trabalha. Coral e não vermelho: não impede de
            trabalhar, pede que se leia. */}
        {!activeRide && (faltaTermosMotorista || faltaPrivacidade) ? (
          <Pressable
            // Vermelho nos termos do motorista: desde 15/09/26 impedem de ficar
            // disponível. A privacidade continua a ser só um pedido.
            style={faltaTermosMotorista ? styles.avisoDocs : styles.avisoValidade}
            // Um de cada vez, os termos primeiro — como no ecrã do passageiro.
            // Aceite o primeiro, o aviso volta com o segundo.
            onPress={() =>
              navigation.navigate(
                'Termos',
                faltaTermosMotorista
                  ? { quem: 'driver', aceitavel: true }
                  : { documento: 'privacidade', aceitavel: true }
              )
            }
            accessibilityRole="button"
          >
            <Text
              style={faltaTermosMotorista ? styles.avisoDocsTitulo : styles.avisoValidadeTitulo}
            >
              {t(faltaTermosMotorista ? 'termosNovosTitulo' : 'privacidadeNovaTitulo')}
            </Text>
            <Text style={faltaTermosMotorista ? styles.avisoDocsTexto : styles.avisoValidadeTexto}>
              {t('termosNovosTexto')}
            </Text>
            {faltaTermosMotorista ? (
              <Text style={styles.avisoDocsTexto}>{t('termosObrigatorios')}</Text>
            ) : null}
            <Text
              style={[
                faltaTermosMotorista ? styles.avisoDocsTexto : styles.avisoValidadeTexto,
                { fontWeight: '700' },
              ]}
            >
              {t('driverTermsRead')} ›
            </Text>
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
        {/* Com pedidos na lista, este mapa sai: cada cartão traz o seu, com
            a posição dele lá dentro, e um mapa a mais em cima empurrava o
            primeiro pedido para fora do ecrã. */}
        {activeRide || (minhaPosicao && !requests.length) ? (
          <View style={{ marginBottom: spacing.md }}>
            <MapaExpandivel
              markers={activeRide ? rideMarkers(activeRide) : []}
              center={activeRide ? undefined : centroMapa}
              liveMarker={minhaPosicao}
              liveLabel={t('myLocation')}
              height={activeRide ? 220 : 190}
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
            onEtapa={(etapa) => marcarEtapaCarga(activeRide.id, etapa)}
            onDismiss={dismissRide}
          />
        ) : (
          <View>
            <View style={styles.cabecalhoLista}>
              <Text style={styles.heading}>{t('availableRequests')}</Text>
              {online && requests.length ? (
                <View style={styles.novoPastilha}>
                  <Text style={styles.novoTexto}>{t('pedidoNovo')}</Text>
                </View>
              ) : null}
            </View>
            {/* O VAZIO COM DESENHO, como na referência: a mota a andar diz
                "está tudo a funcionar, só ainda não há ninguém" melhor do que
                uma caixa de texto — que se lê como "a lista não carregou". */}
            {/* INDISPONÍVEL NÃO VÊ PEDIDOS (14/09/26): nem a lista nem o botão
                de aceitar. O ecrã diz porquê e o que fazer — o botão de ligar
                está logo acima. */}
            {!online ? (
              <View style={styles.empty}>
                <Icone nome="volante" tamanho={52} cor={colors.textMuted} traco={1.6} />
                <Text style={[styles.emptyTitle, { marginTop: spacing.sm }]}>
                  {t('indisponivelTitulo')}
                </Text>
                <Text style={styles.emptyHint}>{t('indisponivelTexto')}</Text>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.vazioImagemCaixa}>
                  <Image
                    source={
                      VEICULOS.motorbike.imagens[paletaEmUso()] || VEICULOS.motorbike.imagens.claro
                    }
                    style={styles.vazioImagem}
                    resizeMode="contain"
                  />
                </View>
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
                  onIgnorar={(motivo) => recusarPedido(r.id, motivo)}
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

  // RECUSAR COM MOTIVO num pedido de bens: "Carga incompatível com o
  // veículo" fica registado, e diz se a carga chegou ao veículo errado.
  // Numa viagem de pessoas não há que escolher.
  function recusar() {
    if (!ride.carga) return onIgnorar('agora');
    Alert.alert(t('recusaMotivoTitulo'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('recusaAgora'), onPress: () => onIgnorar('agora') },
      { text: t('recusaIncompativel'), onPress: () => onIgnorar('incompativel') },
    ]);
  }

  async function accept() {
    setBusy(true);
    try {
      await onAccept(null);
    } catch (e) {
      setBusy(false); // se falhar, volta a permitir
      // A RAZÃO À VISTA: já aceite por outro, indisponível, outra viagem a
      // decorrer. O `catch` mudo deixava o botão voltar atrás sem explicar.
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }

  return (
    <View style={styles.card}>
      {/* QUEM PEDE, com a média das estrelas — e SEM telefone nem mensagem.
          A referência tinha os dois botões aqui, mas antes de aceitar o
          motorista não tem nada a dizer ao passageiro, e a lista de pedidos
          vai para todos os motoristas disponíveis do município: o número de
          alguém não pode andar por dezenas de telemóveis só porque pediu
          uma viagem. O telefone aparece depois de aceitar, e só durante a
          viagem. */}
      <View style={styles.pedidoCabeca}>
        <View style={styles.pedidoAvatar}>
          <Icone nome="pessoa" tamanho={26} cor={colors.teal} />
        </View>
        <View style={styles.pedidoQuem}>
          <Text style={styles.pedidoNome} numberOfLines={1}>
            {ride.passenger?.name}
          </Text>
          <View style={styles.pedidoMetaLinha}>
            {ride.passenger?.rating ? (
              <View style={styles.pedidoEstrelas}>
                <Icone nome="estrela" tamanho={14} cor={colors.coral} />
                <Text style={styles.pedidoMeta}>{ride.passenger.rating.toFixed(1)} ·</Text>
              </View>
            ) : null}
            <Text style={styles.pedidoMeta} numberOfLines={1}>
              {wants}
            </Text>
          </View>
        </View>
      </View>
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
      <PercursoPontos
        partida={ride.originLabel}
        destino={ride.destLabel}
        paragens={ride.destinos || []}
        notaPartida={ride.pickupKm != null ? t('pickupDistance', { km: ride.pickupKm }) : null}
      />
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
      <NumerosViagem
        km={ride.distanceKm}
        min={ride.durationMin}
        preco={ride.fareUsd}
        semPreco={t('fareToAgree')}
      />
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
            {(ride.carga.tipos || [ride.carga.tipo])
              .map((x) => t(CHAVE_CARGA[x] || 'cargaOutros'))
              .join(' · ')}
            {ride.carga.outro ? `: ${ride.carga.outro}` : ''}
            {ride.carga.volume ? ` · ${t(CHAVE_VOLUME[ride.carga.volume])}` : ''}
          </Text>
          {ride.carga.ajuda && ride.carga.ajuda !== 'nenhuma' ? (
            <Text style={styles.cargaAjuda}>{t(CHAVE_AJUDA[ride.carga.ajuda])}</Text>
          ) : null}
          {ride.carga.notas ? <Text style={styles.cargaNotas}>{ride.carga.notas}</Text> : null}
          {/* AS FOTOGRAFIAS DOS BENS, se quem pediu as tirou.
              É a informação mais honesta do cartão. "Móveis · Grande" é uma
              escala que nós inventámos e que cada um lê à sua maneira; a
              fotografia mostra a cómoda, e o motorista sabe num segundo se
              ela lhe entra na caixa — coisa que nenhuma lista de volumes lhe
              ia dizer.
              Vêm em último dentro do bloco e não em primeiro: quem passa a
              lista a correr lê as palavras de relance, e só pára a olhar para
              o pedido que lhe interessa.
              O número vem no pedido; os bytes só são pedidos aqui, uma
              chamada por fotografia e só para os cartões que aparecem. */}
          {ride.carga.fotos > 0 ? (
            <View style={styles.cargaFotos}>
              {Array.from({ length: ride.carga.fotos }).map((_, i) => (
                <ImagemProtegida
                  key={`${ride.id}-${i}`}
                  caminho={`/rides/${ride.id}/carga-foto/${i}`}
                  style={styles.cargaFoto}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {/* CARRY COM PESSOAS: quantas, antes de aceitar. Um grupo de doze na
          caixa é outra decisão do que uma máquina de lavar. */}
      {ride.vehicleType === 'carry' && !ride.carga && ride.passengers ? (
        <View style={styles.carga}>
          <Text style={styles.cargaLinha}>
            👥 {ride.passengers} · {t('carryModoPessoas')}
          </Text>
        </View>
      ) : null}
      {/* RECUSAR E ACEITAR LADO A LADO, como na referência (14/09/26).
          O mesmo tamanho, mas não o mesmo peso: o "Simu" é cheio, o "Recusa"
          é só tinta — a hierarquia está na cor, não no tamanho.
          "Recusa" faz o que o antigo "ignorar" fazia: o pedido continua a ir
          para os outros motoristas disponíveis do município, e só sai da
          lista de quem o pôs de lado. Ninguém fica sem viagem por isto. */}
      <View style={styles.pedidoBotoes}>
        {onIgnorar ? (
          <View style={styles.pedidoBotao}>
            <Button title={t('recusaPedidu')} icone="✕" variant="perigoSuave" onPress={recusar} />
          </View>
        ) : null}
        <View style={styles.pedidoBotao}>
          <Button
            title={t('simuPedidu')}
            icone="✓"
            variant="secondary"
            onPress={accept}
            loading={busy}
          />
        </View>
      </View>
    </View>
  );
}

// ---- Cartão da viagem ativa do motorista ----
// As etapas da entrega: o texto do botão e o ícone de cada uma.
const ACCAO_ETAPA = {
  carregada: 'accaoCarregada',
  no_destino: 'accaoNoDestino',
  descarregada: 'accaoDescarregada',
};
const ICONE_ETAPA = { carregada: 'caixa', no_destino: 'pin', descarregada: 'caixa' };

function ActiveRideCard({
  ride,
  isFinal,
  navigation,
  onArriving,
  onStart,
  onComplete,
  onCancel,
  onDismiss,
  onEtapa,
}) {
  const { t } = useI18n();
  const { unread } = useRides();
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
  // NUMA ENTREGA DE BENS, a acção de trabalho percorre as etapas por ordem
  // antes de concluir: carregada → no destino → descarregada → entregue. Uma
  // de cada vez, a seguinte; o passageiro vê cada uma na linha do tempo.
  const etapaSeguinte =
    ride.status === 'in_progress' && ride.carga
      ? !ride.carregadaEm
        ? 'carregada'
        : !ride.noDestinoEm
          ? 'no_destino'
          : !ride.descarregadaEm
            ? 'descarregada'
            : null
      : null;
  async function marcarEtapa(etapa) {
    try {
      await onEtapa?.(etapa);
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }
  const active = ['accepted', 'arriving', 'in_progress'].includes(ride.status);
  const aIrBuscar = ride.status === 'accepted' || ride.status === 'arriving';
  const tipoV = VEICULOS[ride.vehicleType];
  // QUEM VIAJA À FRENTE, quem pediu por baixo. O motorista vai buscar uma
  // pessoa, não uma conta: pôr o nome do titular em cima seria mandá-lo
  // perguntar pela pessoa errada à porta de casa.
  const quemViaja = ride.viajante?.nome || ride.passenger?.name;
  // O NÚMERO DE QUEM ESTÁ À ESPERA, não o da conta: quem pediu pode estar em
  // casa, e quem atende tem de ser quem está no passeio.
  const telefone = ride.viajante?.telefone || ride.passenger?.phone;
  // O "ver no mapa" leva à RECOLHA enquanto se vai buscar a pessoa, e ao
  // DESTINO depois de ela entrar — é a pergunta que o motorista tem em cada
  // momento, e abre a navegação do telemóvel já com o ponto certo.
  const alvo = aIrBuscar
    ? { lat: ride.originLat, lng: ride.originLng }
    : { lat: ride.destLat, lng: ride.destLng };
  const pedida = ride.createdAt ? new Date(ride.createdAt) : null;
  const quando =
    pedida && !Number.isNaN(pedida.getTime())
      ? pedida.toLocaleString(undefined, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  // A ACÇÃO DE TRABALHO muda com o estado, e é sempre uma só: ir buscar,
  // começar (com o código do passageiro), acabar. Concluir sem começar
  // deixou de ser possível — o código é que abre a viagem.
  const principal =
    ride.status === 'accepted'
      ? { titulo: t('onTheWay'), icone: 'rota', onPress: onArriving }
      : ride.status === 'arriving'
        ? { titulo: t('startRide'), icone: 'volante', onPress: () => setAPedirCodigo(true) }
        : etapaSeguinte
          ? {
              titulo: t(ACCAO_ETAPA[etapaSeguinte]),
              icone: ICONE_ETAPA[etapaSeguinte],
              onPress: () => marcarEtapa(etapaSeguinte),
            }
          : {
              titulo: t(ride.carga ? 'entregaConcluida' : 'completeRide'),
              icone: 'bandeira',
              onPress: onComplete,
            };

  return (
    <View style={styles.viagem}>
      {/* CABEÇALHO: o estado em palavras, e à direita o número da viagem e a
          hora do pedido — é o que se diz ao telefone quando alguma coisa
          corre mal ("a viagem 63, das 21:52"). */}
      <View style={styles.viagemTopo}>
        <Icone nome={tipoV?.icone || 'carro'} tamanho={30} cor={colors.teal} />
        <Text style={styles.viagemEstado}>{t(statusMeta(ride.status).key)}</Text>
        <View style={styles.viagemId}>
          <View style={styles.idPastilha}>
            <Text style={styles.idTexto}>#{ride.id}</Text>
          </View>
          {quando ? <Text style={styles.idHora}>{quando}</Text> : null}
        </View>
      </View>

      <View style={styles.destinoLinha}>
        <Icone nome="pin" tamanho={22} cor={colors.coral} />
        <View style={styles.destinoTextos}>
          <Text style={styles.destLabel}>{t('destination')}</Text>
          <Text style={styles.destValue}>{ride.destLabel}</Text>
          {ride.originLabel ? (
            <Text style={styles.origin}>
              {t('originField')}: {ride.originLabel}
            </Text>
          ) : null}
        </View>
      </View>
      {active && alvo.lat != null && alvo.lng != null ? (
        <Pressable
          style={({ pressed }) => [styles.hareeMapa, pressed && { opacity: 0.8 }]}
          onPress={() => abrirNoMapa(Linking, alvo.lat, alvo.lng)}
          accessibilityRole="button"
        >
          <Icone nome="mapa" tamanho={18} cor={colors.teal} />
          <Text style={styles.hareeMapaTexto}>{t(aIrBuscar ? 'mapaRecolha' : 'mapaDestino')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.passageiroCaixa}>
        <View style={styles.passageiroLinha}>
          <Avatar nome={quemViaja} tamanho={56} />
          <View style={styles.passageiroTextos}>
            <Text style={styles.passageiroRotulo}>{t('yourPassenger')}</Text>
            <Text style={styles.passageiroNome} numberOfLines={2}>
              {quemViaja}
            </Text>
            {/* A média é de quem tem a conta; se viaja outra pessoa, as
                estrelas não são dela e ficam de fora. Só a média, sem o
                número de avaliações — decisão do Simão. */}
            {!ride.viajante && ride.passenger?.rating ? (
              <View style={styles.estrelas}>
                <Icone nome="estrela" tamanho={14} cor={colors.coral} />
                <Text style={styles.estrelasTexto}>{ride.passenger.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {ride.viajante ? (
              <Text style={styles.quemPediu}>
                {ride.viajante.menor ? `${t('pedidoMenor')} · ` : ''}
                {t('pedidoPor', { nome: ride.passenger?.name || '—' })}
              </Text>
            ) : null}
          </View>
        </View>
        <NumerosViagem
          km={ride.distanceKm}
          min={ride.durationMin}
          preco={ride.fareUsd}
          semPreco={t('fareToAgree')}
        />
      </View>

      {/* A GRELHA DE ACÇÕES, pela ordem da referência: falar (telefone,
          mensagem), depois o que muda a viagem (emergência, a acção de
          trabalho), e por último o cancelar — sozinho, a toda a largura e só
          com contorno, para não se carregar sem querer. A emergência é o
          SosButton de sempre, com o seu fluxo: escolher o serviço, registar o
          alerta, ligar. O motorista corre o mesmo risco que o passageiro. */}
      {active ? (
        <View style={styles.accoes}>
          <View style={styles.accoesLinha}>
            {telefone ? (
              <BotaoAccao
                icone="telefone"
                titulo={t('phone')}
                sub={telefone}
                variante="cheio"
                onPress={() => Linking.openURL(`tel:${telefone}`)}
              />
            ) : null}
            <BotaoAccao
              icone="mensagem"
              titulo={t('acaoMensajen')}
              contagem={unread}
              onPress={() => navigation.navigate('Chat')}
            />
          </View>
          <View style={styles.accoesLinha}>
            <View style={styles.sosCaixa}>
              <SosButton rideId={ride.id} />
            </View>
            <BotaoAccao
              icone={principal.icone}
              titulo={principal.titulo}
              variante="cheio"
              onPress={principal.onPress}
            />
          </View>
          <View style={styles.accoesLinha}>
            <BotaoAccao
              icone="fechar"
              titulo={t('cancelRide')}
              variante="perigoContorno"
              onPress={() => setACancelar(true)}
            />
          </View>
        </View>
      ) : null}

      {active ? (
        <View style={styles.seguranca}>
          <Icone nome="escudo" tamanho={28} cor={colors.teal} />
          <View style={styles.segurancaTextos}>
            <Text style={styles.segurancaTitulo}>{t('seguroTitulo')}</Text>
            <Text style={styles.segurancaTexto}>{t('seguroTexto')}</Text>
          </View>
        </View>
      ) : null}

      {ride.status === 'completed' ? <RatingPanel ride={ride} role="driver" /> : null}

      {isFinal ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button title={t('newRide')} onPress={onDismiss} />
        </View>
      ) : null}

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
    heading: { ...tipo.titulo, color: colors.text },
    cabecalhoLista: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    novoPastilha: {
      backgroundColor: colors.teal,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: spacing.md,
    },
    novoTexto: { ...tipo.corpoForte, color: colors.onTeal },
    empty: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
    },
    // A ilustração num quadrado da cor do fundo DELA — ver SISTEMA.md.
    vazioImagemCaixa: {
      width: 150,
      height: 104,
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    vazioImagem: { width: 150, height: 104 },
    pedidoCabeca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xs,
    },
    pedidoAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pedidoQuem: { flex: 1 },
    pedidoNome: { ...tipo.subtitulo, color: colors.text },
    pedidoMetaLinha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
    pedidoEstrelas: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    pedidoMeta: { ...tipo.pequeno, color: colors.textMuted, flexShrink: 1 },
    pedidoBotoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    pedidoBotao: { flex: 1 },
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
    // ---- A viagem do motorista (14/09/26) ----
    viagem: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...elevacao.plana,
    },
    viagemTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    viagemEstado: { ...tipo.subtitulo, color: colors.teal, flex: 1 },
    viagemId: { alignItems: 'flex-end', gap: 2 },
    idPastilha: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    idTexto: { ...tipo.corpoForte, fontSize: 13, color: colors.teal },
    idHora: { ...tipo.legenda, color: colors.textMuted, fontVariant: ['tabular-nums'] },
    destinoLinha: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    destinoTextos: { flex: 1 },
    hareeMapa: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      minHeight: 40,
      marginTop: spacing.sm,
      marginLeft: 30,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.tintaTeal,
    },
    hareeMapaTexto: { ...tipo.corpoForte, fontSize: 14, color: colors.teal },
    passageiroCaixa: {
      backgroundColor: colors.paper,
      borderRadius: radius.lg,
      padding: spacing.md,
      paddingBottom: spacing.xs,
      marginTop: spacing.md,
    },
    passageiroLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    passageiroTextos: { flex: 1 },
    passageiroRotulo: { ...tipo.legenda, color: colors.teal },
    passageiroNome: { ...tipo.titulo, color: colors.text },
    estrelas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    estrelasTexto: { ...tipo.corpoForte, color: colors.text },
    accoes: { gap: spacing.sm, marginTop: spacing.md },
    accoesLinha: { flexDirection: 'row', gap: spacing.sm },
    sosCaixa: { flex: 1, justifyContent: 'center' },
    seguranca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    segurancaTextos: { flex: 1 },
    segurancaTitulo: { ...tipo.corpoForte, color: colors.teal },
    segurancaTexto: { ...tipo.pequeno, color: colors.text, marginTop: 1 },
    destLabel: { ...tipo.etiqueta, color: colors.textMuted, marginTop: spacing.md },
    destValue: { ...tipo.titulo, color: colors.text },
    origin: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
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
    cargaFotos: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    cargaFoto: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.border,
    },
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
  const tinta = bloqueado ? colors.onDanger : colors.onTeal;

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
      style={({ pressed }) => [
        estilosFaixa.faixa,
        bloqueado && estilosFaixa.faixaMau,
        pressed && estilosFaixa.premida,
      ]}
      accessibilityRole="button"
    >
      <Icone nome={bloqueado ? 'carteira' : 'documento'} tamanho={28} cor={tinta} />
      <View style={estilosFaixa.textos}>
        <Text style={[estilosFaixa.titulo, { color: tinta }]}>
          {bloqueado ? t('assinBloqueado') : t('assinGratuitaAte', { ate: quando })}
        </Text>
        <Text style={[estilosFaixa.nota, { color: tinta }]}>
          {bloqueado ? t('assinSemSaldo') : t('assinVer')}
        </Text>
      </View>
      <Icone nome="seta" tamanho={20} cor={tinta} traco={2.5} />
    </Pressable>
  );
}

const criarEstilosFaixa = () =>
  StyleSheet.create({
    faixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.teal,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      minHeight: 72,
    },
    faixaMau: { backgroundColor: colors.danger },
    premida: { opacity: 0.85 },
    textos: { flex: 1, gap: 2 },
    titulo: { ...tipo.corpoForte },
    nota: { ...tipo.pequeno, opacity: 0.9 },
  });

let estilosFaixa = criarEstilosFaixa();
registarEstilos(() => {
  estilosFaixa = criarEstilosFaixa();
});

// O aviso ao Carry sem capacidade, com o formulário numa folha.
function AvisoCapacidade() {
  const { t } = useI18n();
  const { token, refreshUser } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [carroceria, setCarroceria] = useState(null);
  const [capacidade, setCapacidade] = useState(null);
  const [ano, setAno] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);

  async function guardar() {
    if (!carroceria || !capacidade) return setErro(t('errCarroceriaCapacidade'));
    setErro(null);
    setAGuardar(true);
    try {
      await api.definirCapacidade(token, { carroceria, capacidade, ano: ano ? Number(ano) : null });
      await refreshUser();
      setAberto(false);
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [estilosCap.aviso, pressed && { opacity: 0.85 }]}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
      >
        <Icone nome="caixa" tamanho={28} cor={colors.coralDark} />
        <View style={{ flex: 1 }}>
          <Text style={estilosCap.titulo}>{t('capacidadeFaltaTitulo')}</Text>
          <Text style={estilosCap.texto}>{t('capacidadeFaltaTexto')}</Text>
        </View>
        <Icone nome="seta" tamanho={18} cor={colors.coralDark} traco={2.5} />
      </Pressable>
      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={estilosCap.folha} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={estilosCap.folhaConteudo}>
            <Text style={estilosCap.folhaTitulo}>{t('capacidadeFaltaTitulo')}</Text>
            <Text style={estilosCap.texto}>{t('capacidadeFaltaTexto')}</Text>
            <View style={{ height: spacing.lg }} />
            <DadosCarga
              carroceria={carroceria}
              onCarroceria={setCarroceria}
              capacidade={capacidade}
              onCapacidade={setCapacidade}
              ano={ano}
              onAno={setAno}
            />
            {erro ? <Text style={estilosCap.erro}>{erro}</Text> : null}
            <Button
              title={t('capacidadeGuardar')}
              onPress={guardar}
              loading={aGuardar}
              variant="marca"
              tamanho="grande"
            />
            <View style={{ height: spacing.sm }} />
            <Button title={t('cancel')} variant="ghost" onPress={() => setAberto(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const criarEstilosCap = () =>
  StyleSheet.create({
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginBottom: spacing.md,
      minHeight: 72,
    },
    titulo: { ...tipo.corpoForte, color: colors.coralDark },
    texto: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    folha: { flex: 1, backgroundColor: colors.paper },
    folhaConteudo: { padding: spacing.lg },
    folhaTitulo: { ...tipo.displayPequeno, color: colors.text, marginBottom: spacing.xs },
    erro: { ...tipo.pequeno, color: colors.danger, marginBottom: spacing.sm },
  });

let estilosCap = criarEstilosCap();
registarEstilos(() => {
  estilosCap = criarEstilosCap();
});
