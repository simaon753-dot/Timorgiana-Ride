import React, { useState } from 'react';
import { View, Text, Pressable, Linking, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import Retrato from '../design/Retrato.js';
import Icone from '../design/Icone.js';
import EtapasViagem from '../design/EtapasViagem.js';
import EtapasEntrega from '../design/EtapasEntrega.js';
import NumerosViagem from '../design/NumerosViagem.js';
import PercursoPontos from '../design/PercursoPontos.js';
import CartaoVeiculo from '../design/CartaoVeiculo.js';
import { tipo } from '../design/tipografia.js';
import Button from './Button.js';
import MapaExpandivel from './MapaExpandivel.js';
import SosButton from './SosButton.js';
import CodigoRecolha from './CodigoRecolha.js';
import MotivoCancelamento from './MotivoCancelamento.js';
import ShareTripButton from './ShareTripButton.js';
import RatingPanel from './RatingPanel.js';
import { ResumoEncomenda } from './Encomenda.js';
import { statusMeta } from './StatusBadge.js';
import { rideMarkers } from '../lib/rideMarkers.js';
import { minutosAte, horaDeChegada } from '../lib/estimativa.js';
import { useI18n } from '../i18n/index.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, radius, elevacao, registarEstilos, paletaEmUso } from '../theme.js';
import EsperaPedido from './EsperaPedido.js';

// A VIAGEM DO PASSAGEIRO, da espera até à chegada — sistema de design TGA
// (14/09/26), desenhado a partir da referência "Ecrã do passageiro com pedido
// aceitado".
//
// Saiu do ecrã inicial, onde era um bloco de duzentas linhas no meio do
// "Olá, <nome>". O ecrã inicial decide QUAL dos dois estados mostra; este
// componente é um deles.
//
// A ORDEM É A DA CABEÇA DE QUEM ESPERA NA RUA:
//   1. em que ponto está (título + as quatro etapas com hora);
//   2. onde vem o motorista (mapa);
//   3. QUEM vem — rosto, nome, estrelas — e como lhe falar;
//   4. em QUE vem — matrícula, cor, modelo — para o reconhecer na rua;
//   5. quanto custa e quanto demora;
//   6. o que fazer se algo correr mal (partilhar, emergência, cancelar).

const SUBTITULO = {
  requested: 'subRequested',
  accepted: 'subAccepted',
  arriving: 'subAccepted',
  in_progress: 'subInProgress',
};

export default function ViagemPassageiro({ ride, navigation }) {
  const { t } = useI18n();
  const { isFinal, cancelRide, dismissRide, driverLocation, driverPlace, unread, rated } =
    useRides();
  const [aCancelar, setACancelar] = useState(false);

  const markers = rideMarkers(ride);
  const withDriver = !!ride.driver && ['accepted', 'arriving', 'in_progress'].includes(ride.status);
  const aCaminho = ride.status === 'accepted' || ride.status === 'arriving';
  // O motorista ainda vem a caminho: quanto falta até estar à porta.
  const minChegada = aCaminho
    ? minutosAte(driverLocation, { lat: ride.originLat, lng: ride.originLng })
    : null;
  const veiculo = ride.driver?.vehicle;

  // Cancelar depois de o motorista aceitar não é a mesma coisa que cancelar
  // enquanto ainda se procura. O texto diz-lhe qual dos dois é — sem impedir
  // nada: às vezes cancelar é mesmo o que faz falta.
  async function cancelarComMotivo(motivo) {
    setACancelar(false);
    const r = await cancelRide(ride.id, motivo);
    if (r?.aviso === 'demasiados') {
      Alert.alert(t('cancelTooMany', { n: r.cancelamentos }), t('cancelTooManyExplain'));
    }
  }

  return (
    <View>
      <View style={styles.cabeca}>
        {ride.status === 'requested' ? <ActivityIndicator color={colors.coral} /> : null}
        <Text style={styles.titulo}>{t(statusMeta(ride.status).key)}</Text>
      </View>
      {SUBTITULO[ride.status] ? (
        <Text style={styles.subtitulo}>{t(SUBTITULO[ride.status])}</Text>
      ) : null}

      {/* Só a quem ainda não tem motorista: o relógio e, ao terceiro minuto,
          a alternativa a ficar a olhar. Cancelar já está mais abaixo, onde
          sempre esteve — este bloco só acrescenta o que faltava. */}
      {ride.status === 'requested' ? <EsperaPedido ride={ride} /> : null}

      {/* Numa ENTREGA DE BENS, a linha do tempo vertical com as etapas da
          carga; numa viagem de pessoas, as quatro etapas de sempre. */}
      {ride.status === 'cancelled' ? null : ride.carga ? (
        <EtapasEntrega ride={ride} avaliado={!!rated} />
      ) : (
        <EtapasViagem ride={ride} />
      )}

      {markers.length > 0 ? (
        <View style={styles.mapa}>
          <MapaExpandivel
            markers={markers}
            // A MESMA PERGUNTA DO LADO DELE. Ao zoom máximo, dois pinos sem
            // nome são duas cores, e saber qual é a recolha e qual é o
            // destino não pode depender de se lembrar da convenção.
            rotularPinos
            height={220}
            liveMarker={driverLocation}
            veiculoVivo={ride.vehicleType}
            liveLabel={driverPlace}
            info={{ km: ride.distanceKm, min: ride.durationMin }}
            aviso={minChegada != null ? t('etaArrivalShort', { min: minChegada }) : null}
            // PARA ONDE GUIAR, e muda com o momento da viagem.
            //
            // Enquanto o motorista vem a caminho, o que a pessoa precisa é de
            // chegar ao PONTO DE RECOLHA — que agora pode estar a uns metros
            // do pino, na estrada, como a etiqueta do mapa diz. Já dentro do
            // carro, o que interessa é o DESTINO.
            //
            // Guiar sempre para o destino seria inútil na metade da viagem em
            // que a pessoa ainda está a pé.
            navegarPara={
              ride.status === 'in_progress'
                ? { lat: ride.destLat, lng: ride.destLng }
                : { lat: ride.originLat, lng: ride.originLng }
            }
          />
          {driverLocation ? (
            <Text style={styles.driverMoving}>
              {driverPlace ? t('nowOnStreet', { rua: driverPlace }) : t('driverOnMap')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cartao}>
        <PercursoPontos
          partida={ride.originLabel}
          destino={ride.destLabel}
          paragens={ride.destinos || []}
        />
      </View>

      {/* A ENCOMENDA, ao lado do percurso: numa encomenda o percurso sozinho
          não diz nada — "da loja para casa" é meia frase sem a lista.
          Enquanto o motorista não comprar, `compras` é `null` e o cartão
          mostra só o teto: o total não se inventa antes do talão. */}
      {ride.jastip ? (
        <>
          <ResumoEncomenda
            lista={ride.jastip.lista}
            itens={ride.jastip.itens}
            loja={ride.jastip.loja}
            teto={ride.jastip.teto}
            taxa={ride.jastip.taxa}
            compras={ride.jastip.compras}
            total={ride.jastip.total}
          />
          {ride.jastip.compradoEm ? (
            <Text style={styles.encomendaComprou}>
              {t('encomendaComprou', { v: `$${Number(ride.jastip.total || 0).toFixed(2)}` })}
            </Text>
          ) : null}
        </>
      ) : null}

      {/* O ROSTO AO LADO DO NOME, e não um nome sozinho.
          A política de segurança manda confirmar "a matrícula, o modelo do
          veículo e o nome/fotografia do motorista" antes de entrar. Junto do
          nome de propósito: quem espera na rua olha uma vez para o ecrã e uma
          vez para a pessoa. Separados eram duas verificações; juntos, é uma.
          AS ESTRELAS SÃO SÓ A MÉDIA, sem o número de avaliações (pedido do
          Simão). Quem ainda não foi avaliado não mostra estrelas nenhumas — um
          "0.0" diria "péssimo" a quem só ainda não teve viagens. */}
      {withDriver ? (
        <View style={styles.cartao}>
          <View style={styles.motoristaLinha}>
            <Retrato tamanho={56} caminho={`/rides/${ride.id}/retrato`} />
            <View style={styles.motoristaTextos}>
              <Text style={styles.motoristaNome} numberOfLines={2}>
                {ride.driver.name}
              </Text>
              {ride.driver.rating ? (
                <View style={styles.estrelas}>
                  <Icone nome="estrela" tamanho={15} cor={colors.coral} />
                  <Text style={styles.estrelasTexto}>{ride.driver.rating.toFixed(1)}</Text>
                </View>
              ) : null}
              {minChegada != null ? (
                <Text style={styles.chegada}>
                  {t('etaMinutes', { min: minChegada, hora: horaDeChegada(minChegada) })}
                </Text>
              ) : null}
            </View>
            {ride.driver.phone ? (
              <AcaoRedonda
                icone="telefone"
                rotulo={t('acaoLiga')}
                onPress={() => Linking.openURL(`tel:${ride.driver.phone}`)}
              />
            ) : null}
            <AcaoRedonda
              icone="mensagem"
              rotulo={t('acaoMensajen')}
              contagem={unread}
              onPress={() => navigation.navigate('Chat')}
            />
          </View>
        </View>
      ) : null}

      {/* EM QUE VEM, em cartão próprio. Quem espera na rua faz sempre a mesma
          sequência: vê a COR e a forma ao longe, confirma a MATRÍCULA de perto.
          A ilustração é a do tipo de veículo — não uma fotografia do carro dele
          —, e serve para o olho procurar a forma certa na rua. */}
      {withDriver && veiculo ? <CartaoVeiculo veiculo={veiculo} /> : null}

      <NumerosViagem
        km={ride.distanceKm}
        min={ride.durationMin}
        preco={ride.fareUsd}
        semPreco={t('fareToAgree')}
      />

      {aCaminho ? (
        <View style={styles.aviso}>
          <Icone nome="escudo" tamanho={28} cor={colors.teal} />
          <View style={styles.avisoTextos}>
            <Text style={styles.avisoTitulo}>{t('avisoChegaTitulo')}</Text>
            <Text style={styles.avisoTexto}>{t('avisoChegaTexto')}</Text>
          </View>
        </View>
      ) : null}

      {/* O código só até a viagem começar: depois de estar no carro já não
          serve para nada e só ocupa o ecrã. */}
      {ride.pickupCode && ride.status !== 'in_progress' && !isFinal ? (
        <View style={styles.bloco}>
          <CodigoRecolha codigo={ride.pickupCode} />
        </View>
      ) : null}

      {/* PARTILHAR · EMERGÊNCIA · CANCELAR, numa fila, como na referência.
          A EMERGÊNCIA APARECE DESDE QUE HÁ VIAGEM, e não só depois de um
          motorista aceitar: quem pediu já disse à aplicação onde está, e pode
          precisar de ajuda antes de alguém aceitar — à espera na rua, de noite,
          é quando se está mais sozinho. Partilhar só com motorista, que é
          quando há alguém a seguir.
          O SOS é o círculo vermelho do meio, e não um terço da fila: é o
          mesmo botão redondo que o motorista vê, e um círculo vermelho lê-se
          como emergência antes de se ler a palavra. */}
      {!isFinal ? (
        <View style={styles.acoes}>
          {withDriver ? (
            <ShareTripButton
              ride={ride}
              driverLocation={driverLocation}
              driverPlace={driverPlace}
              compacto
            />
          ) : null}
          <SosButton rideId={ride.id} compact />
          <Pressable
            style={({ pressed }) => [styles.kansela, pressed && styles.premido]}
            onPress={() => setACancelar(true)}
            accessibilityRole="button"
          >
            <Icone nome="fechar" tamanho={18} cor={colors.danger} traco={2.5} />
            <Text style={styles.kanselaTexto} numberOfLines={2}>
              {t('cancelRide')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <MotivoCancelamento
        visivel={aCancelar}
        papel="passenger"
        aCaminho={withDriver}
        onFechar={() => setACancelar(false)}
        onConfirmar={cancelarComMotivo}
      />

      {ride.status === 'completed' ? <RatingPanel ride={ride} role="passenger" /> : null}

      {/* NINGUÉM RESPONDEU. Ao fim de dez minutos o pedido fecha-se sozinho no
          servidor; sem esta linha a viagem desaparecia sem explicação, e isso
          lê-se como avaria da app, não como "não havia motoristas". */}
      {ride.cancelReason === 'sem_motorista' ? (
        <View style={styles.semMotorista}>
          <Text style={styles.semMotoristaTexto}>{t('noDriverFound')}</Text>
        </View>
      ) : null}

      {isFinal ? (
        <View style={styles.bloco}>
          <Button title={t('newRide')} onPress={dismissRide} />
        </View>
      ) : null}
    </View>
  );
}

// Ligar e Mensajen: um círculo que é o próprio botão (48 px, o toque mínimo
// com folga), com o nome por baixo. A contagem das mensagens por ler fica no
// canto, em coral, como em qualquer aplicação de mensagens.
function AcaoRedonda({ icone, rotulo, contagem, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.acaoRedonda, pressed && styles.premido]}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
    >
      <View style={styles.acaoCirculo}>
        <Icone nome={icone} tamanho={22} cor={colors.teal} />
        {contagem > 0 ? (
          <View style={styles.contagem}>
            <Text style={styles.contagemTexto}>{contagem}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.acaoRotulo} numberOfLines={1}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    encomendaComprou: {
      ...tipo.corpoForte,
      color: colors.text,
      marginTop: spacing.sm,
    },
    cabeca: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    titulo: { ...tipo.displayPequeno, color: colors.text, textAlign: 'center', flexShrink: 1 },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
    mapa: { marginTop: spacing.xs },
    driverMoving: {
      ...tipo.legenda,
      color: colors.teal,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    bloco: { marginTop: spacing.md },
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.md,
      ...elevacao.plana,
    },
    motoristaLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    motoristaTextos: { flex: 1 },
    motoristaNome: { ...tipo.subtitulo, color: colors.text },
    estrelas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    estrelasTexto: { ...tipo.corpoForte, color: colors.text },
    chegada: { ...tipo.legenda, color: colors.teal, marginTop: 2 },
    acaoRedonda: { alignItems: 'center', width: 64 },
    acaoCirculo: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    acaoRotulo: { ...tipo.legenda, color: colors.teal, marginTop: 3 },
    contagem: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: colors.coral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Texto escuro sobre o coral: branco sobre coral fica a 2,8:1.
    contagemTexto: { ...tipo.legenda, color: '#22100A' },
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    avisoTextos: { flex: 1 },
    avisoTitulo: { ...tipo.corpoForte, color: colors.teal },
    avisoTexto: { ...tipo.pequeno, color: colors.text, marginTop: 1 },
    acoes: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    kansela: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 52,
      paddingHorizontal: 6,
      borderWidth: 1.5,
      borderColor: colors.danger,
      borderRadius: radius.md,
      backgroundColor: colors.white,
    },
    kanselaTexto: { ...tipo.corpoForte, fontSize: 13, color: colors.danger, flexShrink: 1 },
    premido: { opacity: 0.7 },
    semMotorista: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    semMotoristaTexto: { ...tipo.corpoForte, color: colors.danger, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
