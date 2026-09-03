import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import OSMMap from '../components/OSMMap.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherLugares from '../components/EscolherLugares.js';
import NomearLugar from '../components/NomearLugar.js';
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

export default function RequestRideScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { requestRide } = useRides();
  // O sítio que está a ser nomeado, e o nome que a app lhe tinha dado.
  const [aNomear, setANomear] = useState(null);

  // Dois passos, e de propósito.
  //
  // O ícone sozinho não diz para que serve — um "!" ao lado de um nome pode
  // querer dizer muita coisa. A pergunta explica antes de abrir um formulário,
  // e quem tocou por curiosidade sai com um toque.
  //
  // Só quem responder "Corrigir" chega ao formulário do OpenStreetMap.
  const perguntarNome = useCallback(
    (alvo) => {
      Alert.alert(t('lugarPerguntaNome'), `${alvo.ponto.label}\n\n${t('lugarCorrigirExplica')}`, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('lugarCorrigirBotao'), onPress: () => setANomear(alvo) },
      ]);
    },
    [t]
  );

  const [origem, setOrigem] = useState(null); // { lat, lng, label }
  // Um destino pode chegar já escolhido — de um lugar guardado ou de um
  // recente no ecrã inicial. Poupa a pesquisa inteira, que numa rede
  // lenta é a parte que custa.
  const [destino, setDestino] = useState(route?.params?.destino || null);
  const [orcamento, setOrcamento] = useState(null);
  const [aCalcular, setACalcular] = useState(false);
  const [veiculo, setVeiculo] = useState('car');
  const [pessoas, setPessoas] = useState(1);
  const [gps, setGps] = useState(false);
  // O erro que o GPS declarou na última leitura. Desenha o círculo no mapa
  // e impede a app de nomear um edifício quando não tem como saber qual é.
  const [precisao, setPrecisao] = useState(null);
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
      // ALTA PRECISÃO, e não a equilibrada.
      //
      // `Balanced` está documentada como "com erro de cerca de cem metros" —
      // usa antenas e wi-fi antes do satélite, para poupar bateria. Cem
      // metros numa cidade é o edifício ao lado.
      //
      // Foi o que aconteceu ao Simão: estava no Centro de Formação Jurídica e
      // a app pôs o ponto no Tribunal da Primeira Instância, que fica a 93
      // metros. Dentro do erro declarado.
      //
      // Esta é A coordenada mais importante da aplicação — é onde o motorista
      // vai buscar alguém. Uns segundos a mais e um pouco de bateria valem
      // menos do que um carro parado na porta errada.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Mesma ordem: o ponto primeiro, o nome quando vier. Ter o mapa
      // centrado onde estamos vale mais do que saber como se chama a rua.
      setOrigem({ lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true });
      // O erro que o próprio GPS declara vai junto: com um erro grande, dar
      // um nome de edifício é escolher à sorte entre os que cabem no círculo.
      setPrecisao(pos.coords.accuracy ?? null);
      const nome = await nomeDoLugar(lat, lng, pos.coords.accuracy);
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

  // Alguém arrastou um pino para o sítio certo.
  //
  // Um ponto posto à mão é EXACTO por definição — quem o arrastou está lá e
  // sabe onde está. Por isso o círculo de incerteza desaparece e o nome é
  // pedido sem margem de erro: aqui já se pode dizer o nome do edifício.
  async function arrastouPino({ tipo, lat, lng }) {
    const ponto = { lat, lng, label: rotuloCoordenadas(lat, lng), provisorio: true };
    if (tipo === 'destino') setDestino(ponto);
    else {
      setOrigem(ponto);
      setPrecisao(null);
    }
    const nome = await nomeDoLugar(lat, lng, 0);
    if (!nome) return;
    const mesmo = (p) => p && p.lat === lat && p.lng === lng;
    if (tipo === 'destino')
      setDestino((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
    else setOrigem((p) => (mesmo(p) ? { ...p, label: nome, provisorio: false } : p));
  }

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
    } else if (!destino) {
      setDestino(ponto);
    } else {
      // VIAGEM DEFINIDA: o toque no mapa deixa de mudar seja o que for.
      //
      // Fixar só o arrasto não chegava, e este caminho era o pior dos dois.
      // Com recolha e destino postos, um toque solto no mapa caía aqui e
      // SUBSTITUÍA O DESTINO — a distância mudava, a tarifa mudava, e nada
      // no ecrã perguntava se era mesmo aquilo que se queria.
      //
      // Quem quiser mudar toca na recolha ou no destino e procura outra vez.
      // A linha por baixo dos dois campos di-lo, e está à vista no momento
      // exacto em que a dúvida aparece.
      return;
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
        {/* OS PINOS SÓ SE ARRASTAM ENQUANTO A VIAGEM NÃO ESTIVER DEFINIDA.
            Com recolha e destino postos, um arrasto sem querer — um dedo a
            passar no mapa para o mover — mudava o ponto e, com ele, a
            distância e a tarifa. Sem aviso nenhum, porque arrastar não
            pergunta nada.
            Para mudar, toca-se na recolha ou no destino e procura-se outra
            vez. É um gesto deliberado, e é essa a diferença. */}
        <OSMMap
          pickable
          fill
          markers={marcadores}
          onPick={escolherNoMapa}
          arrastavel={!(origem && destino)}
          onArrastar={arrastouPino}
          precisaoM={origem && destino ? null : precisao}
        />
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
          {/* O ! aparece nos dois campos. Quem está PARADO num sítio é quem
              melhor sabe como ele se chama — muito mais do que quem vai a
              caminho —, por isso a recolha é, das duas, a melhor fonte. */}
          <Ponto
            cor={colors.teal}
            rotulo={t('pickupPoint')}
            valor={origem?.label}
            vazio={gps ? t('gettingLocation') : t('useMyLocation')}
            onPress={() => setPesquisa('origem')}
            onCorrigir={
              origem && !origem.provisorio
                ? () => perguntarNome({ ponto: origem, qual: 'origem' })
                : undefined
            }
          />
          {/* A dica de arrastar, e SÓ enquanto o ponto vier do GPS.
              Depois de o arrastar, o ponto está onde a pessoa o pôs e a dica
              deixa de fazer sentido — repeti-la seria pedir para corrigir uma
              coisa que já está certa.
              Diz também de quanto é o erro: "mais ou menos 40 m" explica
              porque é que o pino não está exactamente na porta, e transforma
              um defeito aparente numa informação. */}
          {origem && destino ? (
            // Fixados. Dizê-lo evita o pior caso: alguém tentar arrastar,
            // não conseguir, e concluir que a app está avariada.
            <Text style={styles.dicaArrastar}>{t('pontosFixados')}</Text>
          ) : origem && !origem.provisorio && precisao > 15 ? (
            <Text style={styles.dicaArrastar}>
              {t('arrastarPino')} · ±{Math.round(precisao)} m
            </Text>
          ) : null}
          <View style={styles.linha} />
          <Ponto
            cor={colors.coral}
            rotulo={t('dropoffPoint')}
            valor={destino?.label}
            vazio={t('searchOrTap')}
            onPress={() => setPesquisa('destino')}
            onCorrigir={
              destino && !destino.provisorio
                ? () => perguntarNome({ ponto: destino, qual: 'destino' })
                : undefined
            }
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
              {/* Taxas de entrada, logo a seguir à escolha do veículo.
                  Aqui e não antes, porque no Timor Plaza só o carro paga —
                  o aviso muda conforme o que se escolhe. */}
              <TaxasDeEntrada taxas={orcamento.taxasDeEntrada} veiculo={veiculo} t={t} />

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

      {/* Dar nome a um sítio.
          Guarda a correcção no servidor E muda o rótulo aqui. As duas coisas
          porque servem fins diferentes: o rótulo é para esta viagem, a
          correcção é para o mapa de toda a gente. */}
      <NomearLugar
        alvo={aNomear}
        onFechar={() => setANomear(null)}
        onGuardar={async (nome, tipo, morada) => {
          const p = aNomear.ponto;
          setANomear(null);
          if (aNomear.qual === 'destino') setDestino({ ...p, label: nome });
          else setOrigem({ ...p, label: nome });
          try {
            await api.proporLugar(token, {
              nome,
              nomeMapa: p.label,
              lat: p.lat,
              lng: p.lng,
              tipo,
              ...morada,
            });
          } catch {
            // Se falhar, não se diz nada. A viagem dele não depende disto, e
            // um erro sobre uma contribuição ao mapa no meio de um pedido de
            // transporte é ruído no pior momento.
          }
        }}
      />
    </SafeAreaView>
  );
}

function Ponto({ cor, rotulo, valor, vazio, onPress, onCorrigir }) {
  return (
    <Pressable style={styles.ponto} onPress={onPress}>
      <View style={[styles.bolinha, { backgroundColor: cor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pontoRotulo}>{rotulo}</Text>
        <Text style={[styles.pontoValor, !valor && styles.pontoVazio]} numberOfLines={1}>
          {valor || vazio}
        </Text>
      </View>

      {/* O ! ao lado do nome, e não uma frase por baixo.
          A frase ocupava uma linha em cada campo e empurrava tudo para
          baixo — duas linhas de texto para uma coisa que quase ninguém
          usa. O ícone diz o mesmo num canto: há aqui uma dúvida, toca se
          quiseres.
          `stopPropagation` porque a linha inteira já abre a pesquisa: sem
          isso, tocar no ! abria a pesquisa em vez do aviso. */}
      {onCorrigir ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onCorrigir();
          }}
          hitSlop={12}
          style={styles.avisoNome}
        >
          <Text style={styles.avisoNomeTexto}>!</Text>
        </Pressable>
      ) : null}
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
    dicaArrastar: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },

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

    // O "!" ao lado do nome.
    //
    // Vermelho por dentro, aro branco por fora. O aro não é enfeite: sem ele o
    // ícone desaparecia sobre o fundo claro do painel no tema claro, e sobre o
    // preto no tema escuro. Assim lê-se nos dois.
    avisoNome: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.danger,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    avisoNomeTexto: {
      color: '#FFFFFF',
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
    },
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

// Aviso das taxas de entrada.
//
// Existe por causa de uma discussão à porta de um carro. Um passageiro que
// não sabe da taxa chega à cancela e recusa-se a pagar; quem fica a perder é
// o motorista, que já entrou e tem de sair pela mesma cancela. Duas pessoas
// zangadas por causa de uma informação que ninguém lhes deu.
//
// Só aparece se o veículo ESCOLHIDO pagar. No Timor Plaza a motorizada entra
// de graça, e mostrar-lhe um aviso de taxa seria dizer-lhe uma coisa falsa.
function TaxasDeEntrada({ taxas, veiculo, t }) {
  const aplicaveis = (taxas ?? []).filter((x) => x.taxa?.[veiculo]);
  if (!aplicaveis.length) return null;

  return (
    <View style={estilosTaxa.caixa}>
      <Text style={estilosTaxa.titulo}>{t('taxaEntradaTitulo')}</Text>
      {aplicaveis.map((x) => {
        const c = x.taxa[veiculo];
        const valor =
          c.usd == null
            ? t('taxaSemValor')
            : c.por === 'hora'
              ? t('taxaPorHora', { valor: `$${c.usd.toFixed(2)}` })
              : t('taxaAEntrada', { valor: `$${c.usd.toFixed(2)}` });
        const onde =
          x.onde === 'estacionamento' ? t('taxaOndeEstacionamento') : t('taxaOndeRecinto');
        return (
          <Text key={x.id} style={estilosTaxa.linha}>
            {x.nome} · {onde} — <Text style={estilosTaxa.valor}>{valor}</Text>
          </Text>
        );
      })}
      <Text style={estilosTaxa.nota}>{t('taxaEntradaPaga')}</Text>
    </View>
  );
}

const criarEstilosTaxa = () =>
  StyleSheet.create({
    // Contorno coral e fundo neutro: é um aviso, não um erro. O passageiro
    // não fez nada de errado — só precisa de saber antes de ir.
    caixa: {
      borderWidth: 1,
      borderColor: colors.coral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    titulo: { ...tipo.corpoForte, color: colors.coral },
    linha: { ...tipo.pequeno, color: colors.text },
    valor: { ...tipo.corpoForte, color: colors.text },
    nota: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
  });

let estilosTaxa = criarEstilosTaxa();
registarEstilos(() => {
  estilosTaxa = criarEstilosTaxa();
});

// Perguntar como se chama um sítio.
//
// O texto explica PORQUÊ, e isso não é enfeite: sem razão, um campo que
// pergunta o nome de um sítio parece burocracia. Com razão — "o mapa de
// Díli está a ser feito agora, e o que escrever ajuda toda a gente" —
// passa a ser um convite.
// Os tipos, na ordem em que aparecem.
//
// Vivem aqui e não no servidor porque cada um precisa de uma palavra
// traduzida ao lado — e essa palavra está na app. Pôr a lista no servidor
// não pouparia uma publicação nenhuma; só afastaria as duas metades da
// mesma coisa.
