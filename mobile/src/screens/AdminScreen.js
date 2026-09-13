import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button.js';
import { colors, spacing, fontSize, radius, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { Pastilha, Ponto, Esqueleto, ESTADO, CartaoKPI, CartaoTarifa } from '../design/painel.js';
import Icone from '../design/Icone.js';
import CabecalhoEcra from '../design/CabecalhoEcra.js';
import SeccaoTitulo from '../design/SeccaoTitulo.js';
import Cartao from '../design/Cartao.js';
import { LinhaMenu, LinhaInfo } from '../design/LinhaMenu.js';
import RodapeMarca from '../design/RodapeMarca.js';
import { statusMeta } from '../components/StatusBadge.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { VEICULOS, nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import Chip, { FilaChips } from '../design/Chip.js';
import CampoBusca from '../design/CampoBusca.js';
import EstadoVazio from '../design/EstadoVazio.js';
import Avatar from '../design/Avatar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import ImagemProtegida from '../design/ImagemProtegida.js';
import { abrirNoMapa } from '../lib/mapaLink.js';

// Painel de quem gere o serviço.
//
// Três secções, porque as perguntas são três e não se misturam: "está tudo
// bem?" (resumo), "quem conduz?" (motoristas) e "o que se passou?"
// (viagens). Um ecrã único com tudo obrigava a percorrer motoristas para
// chegar a um alerta de emergência.
// 'contas' entra porque os PASSAGEIROS não apareciam em lado nenhum:
// metade das pessoas do sistema era invisível a quem o administra — e é
// do lado deles que vêm as queixas sobre motoristas.
// Separador e rótulo lado a lado. Com cinco secções, os ternários
// encadeados que estavam aqui deixavam de se ler.
// O terceiro elemento é o ícone do separador (14/09/26): com seis secções
// numa fila que desliza, o ícone reconhece-se antes de a palavra se ler.
const SECCOES = [
  ['resumo', 'admSecResumo', 'grafico'],
  ['motoristas', 'admSecDrivers', 'volante'],
  ['contas', 'admSecContas', 'pessoa'],
  ['viagens', 'admSecRides', 'carro'],
  ['registo', 'admSecRegisto', 'documento'],
  ['lugares', 'admSecLugares', 'pin'],
];
const SUBTITULO = 'TimorgianaRide · Díli';
// Estado, rótulo e ícone de cada pastilha do filtro de motoristas.
const FILTROS = [
  ['todos', 'admFiltroTodos', 'grupo'],
  ['pending', 'admFiltroPending', 'relogio'],
  ['approved', 'admFiltroApproved', 'visto'],
  ['suspended', 'admFiltroSuspended', 'proibido'],
];

export default function AdminScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();

  const [seccao, setSeccao] = useState('resumo');
  const [filtro, setFiltro] = useState('pending');
  const [resumo, setResumo] = useState(null);
  const [estat, setEstat] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [contas, setContas] = useState([]);
  const [busca, setBusca] = useState('');
  const [papel, setPapel] = useState('todos');
  const [pagina, setPagina] = useState(0);
  const [haMais, setHaMais] = useState(false);
  const [registo, setRegisto] = useState([]);
  const [notif, setNotif] = useState(null);
  const [verNotif, setVerNotif] = useState(false);
  const [dias, setDias] = useState(30);
  const [lugares, setLugares] = useState([]);
  // Quantos motoristas em cada estado (do servidor), e a busca na lista.
  const [contagens, setContagens] = useState(null);
  const [buscaMotorista, setBuscaMotorista] = useState('');

  // Posição de cada separador, para o poder trazer à vista.
  //
  // Cinco separadores não cabem num ecrã de telemóvel, e a fila desliza.
  // Sem isto, tocar num separador podia deixá-lo meio cortado — ou fora
  // do ecrã — e ficava-se sem saber em que secção se está.
  const abasRef = useRef(null);
  const posicoes = useRef({});

  useEffect(() => {
    const x = posicoes.current[seccao];
    if (x == null || !abasRef.current) return;
    // Recua 24 px para o separador não ficar colado à margem esquerda.
    abasRef.current.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [seccao]);
  const [aCarregar, setACarregar] = useState(true);
  // Qual a decisão a pedir motivo, se houver alguma em curso.
  const [pedido, setPedido] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [r, s, d, e, n, v] = await Promise.all([
        api.adminResumo(token),
        api.adminSos(token),
        api.adminDrivers(token, filtro),
        api.adminEstatisticas(token, 7),
        // As notificações vêm com o resto e não numa chamada à parte: numa
        // rede lenta, um pedido a mais é meio segundo antes de o painel
        // aparecer.
        //
        // O `.catch` não é zelo a mais. As actualizações pelo ar chegam ao
        // telemóvel em segundos; o servidor só muda quando for publicado.
        // Entre os dois momentos a app é mais nova do que o servidor, e um
        // endereço que ainda não existe devolve 404 — sem este `catch`, o
        // `Promise.all` rejeitava e o painel INTEIRO ficava vazio por causa
        // de um sino. O que é novo tem de poder faltar.
        api.adminNotificacoes(token).catch(() => null),
        // As viagens das últimas 24 horas também servem o resumo (a
        // "actividade recente"). Podem faltar sem levar o painel com elas.
        api.adminViagens(token, 24).catch(() => null),
      ]);
      setResumo(r.resumo);
      setAlertas(s.alertas || []);
      setMotoristas(d.drivers || []);
      setContagens(d.contagens || null);
      setEstat(e);
      setNotif(n);
      if (v) setViagens(v.viagens || []);
    } catch (err) {
      Alert.alert(t('errGeneric'), err?.message || '');
    } finally {
      setACarregar(false);
    }
  }, [token, filtro, t]);

  const carregarContas = useCallback(
    async (pag = 0) => {
      try {
        const r = await api.adminUtilizadores(token, { q: busca, papel, pagina: pag });
        // Página 0 substitui; as seguintes acrescentam. Numa rede lenta,
        // recarregar a lista inteira a cada página seria pagar de novo o
        // que já se descarregou.
        setContas((antes) => (pag === 0 ? r.utilizadores : [...antes, ...r.utilizadores]));
        setHaMais(r.haMais);
        setPagina(pag);
      } catch {
        /* fica o que já estava */
      }
    },
    [token, busca, papel]
  );

  const carregarViagens = useCallback(async () => {
    try {
      const v = await api.adminViagens(token, 24);
      setViagens(v.viagens || []);
    } catch {
      /* fica o que já estava */
    }
  }, [token]);

  const carregarRegisto = useCallback(async () => {
    try {
      const r = await api.adminRegisto(token, dias);
      setRegisto(r.acessos || []);
    } catch {
      /* fica o que já estava */
    }
  }, [token, dias]);

  const carregarLugares = useCallback(async () => {
    try {
      const r = await api.adminLugares(token);
      setLugares(r.lugares || []);
    } catch {
      /* fica o que já estava */
    }
  }, [token]);

  useEffect(() => {
    if (seccao === 'lugares') carregarLugares();
  }, [seccao, carregarLugares]);

  useEffect(() => {
    if (seccao === 'registo') carregarRegisto();
  }, [seccao, carregarRegisto]);

  // A pesquisa espera meio segundo depois da última tecla. Sem isso, cada
  // letra era um pedido — e numa rede lenta chegavam fora de ordem, com a
  // resposta de 'Sim' a sobrepor-se à de 'Simão'.
  useEffect(() => {
    if (seccao !== 'contas') return undefined;
    const id = setTimeout(() => carregarContas(0), 500);
    return () => clearTimeout(id);
  }, [seccao, carregarContas]);

  useEffect(() => {
    carregar();
    return navigation.addListener('focus', carregar);
  }, [carregar, navigation]);

  useEffect(() => {
    if (seccao === 'viagens') carregarViagens();
  }, [seccao, carregarViagens]);

  async function decidir(m, decision, motivo) {
    try {
      await api.adminDecidir(token, m.id, decision, motivo);
      await carregar();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }

  async function resolverAlerta(id) {
    try {
      await api.adminResolverSos(token, id);
      setAlertas((a) => a.filter((x) => x.id !== id));
      carregar();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }

  // A busca dos motoristas é feita aqui, sobre a lista que já veio: são
  // dezenas e não milhares, e um pedido por tecla numa rede de Díli custa
  // mais do que filtrar o que está em memória.
  const qm = buscaMotorista.trim().toLowerCase();
  const motoristasVisiveis = qm
    ? motoristas.filter((m) => `${m.name} ${m.phone} ${m.id}`.toLowerCase().includes(qm))
    : motoristas;

  if (aCarregar) {
    return (
      <SafeAreaView style={styles.ecra} edges={['top']}>
        <BarraEstado />
        <CabecalhoEcra navigation={navigation} titulo={t('adminTitle')} subtitulo={SUBTITULO} />
        {/* Esqueleto e não um círculo a girar: mostra a forma do que vem
            aí, e nada se desloca quando os dados chegam. */}
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={styles.numeros}>
            <Esqueleto linhas={1} altura={84} />
            <Esqueleto linhas={1} altura={84} />
          </View>
          <Esqueleto linhas={3} altura={64} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ecra} edges={['top', 'bottom']}>
      <BarraEstado />
      <CabecalhoEcra
        navigation={navigation}
        titulo={t('adminTitle')}
        subtitulo={SUBTITULO}
        direita={
          <Pressable
            onPress={() => setVerNotif(true)}
            hitSlop={10}
            style={styles.sino}
            accessibilityRole="button"
            accessibilityLabel={t('admNotificacoes')}
          >
            <Icone nome="sino" tamanho={26} cor={colors.teal} />
            {notif?.porTratar > 0 ? (
              <View style={styles.sinoConta}>
                <Text style={styles.sinoContaTexto}>
                  {notif.porTratar > 9 ? '9+' : notif.porTratar}
                </Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {/* Os alertas de emergência ficam FORA das secções: aparecem sempre,
          esteja-se a ver o que se estiver. Uma pessoa a pedir ajuda não
          espera que se navegue até ela. */}
      {alertas.length > 0 ? (
        <View style={styles.blocoSos}>
          {alertas.map((a) => (
            <Alerta key={a.id} a={a} t={t} onResolver={() => resolverAlerta(a.id)} />
          ))}
        </View>
      ) : null}

      {/* Separadores com sublinhado, e não pastilhas de largura igual.
          Com `flex: 1` cada pastilha ficava com um quarto do ecrã, e
          "Motoristas" partia-se em duas linhas. Aqui cada separador ocupa
          o que o seu texto precisa e a fila desliza se não couber — o que
          também deixa acrescentar secções sem apertar as existentes. */}
      <View style={styles.barraAbas}>
        <ScrollView
          ref={abasRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.abas}
        >
          {SECCOES.map(([id, chave, icone]) => {
            const activa = seccao === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSeccao(id)}
                onLayout={(e) => {
                  posicoes.current[id] = e.nativeEvent.layout.x;
                }}
                style={[styles.aba, activa && styles.abaActiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
              >
                <Icone nome={icone} tamanho={18} cor={activa ? colors.teal : colors.textMuted} />
                <Text style={[styles.abaTexto, activa && styles.abaTextoActivo]} numberOfLines={1}>
                  {t(chave)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={
              seccao === 'viagens'
                ? carregarViagens
                : seccao === 'registo'
                  ? carregarRegisto
                  : seccao === 'contas'
                    ? () => carregarContas(0)
                    : carregar
            }
            tintColor={colors.teal}
          />
        }
      >
        {seccao === 'resumo' ? (
          <Resumo
            resumo={resumo}
            estat={estat}
            notif={notif}
            viagens={viagens}
            t={t}
            navigation={navigation}
            onIr={setSeccao}
            onNotif={() => setVerNotif(true)}
          />
        ) : seccao === 'motoristas' ? (
          <>
            <FilaChips>
              {FILTROS.map(([f, chave, icone]) => (
                <Chip
                  key={f}
                  icone={icone}
                  texto={t(chave)}
                  contagem={contagens ? (contagens[f] ?? 0) : null}
                  activo={filtro === f}
                  onPress={() => setFiltro(f)}
                />
              ))}
            </FilaChips>
            <CampoBusca
              valor={buscaMotorista}
              onMudar={setBuscaMotorista}
              placeholder={t('admProcurarMotorista')}
            />

            {motoristasVisiveis.length === 0 ? (
              <EstadoVazio
                imagem={
                  VEICULOS.motorbike.imagens[paletaEmUso()] || VEICULOS.motorbike.imagens.claro
                }
                titulo={qm ? t('admSemResultados') : t('admVazioMotoristas')}
                texto={qm ? null : t('admVazioMotoristasTexto')}
                accao={qm ? null : t('admAtualizar')}
                onAccao={carregar}
              />
            ) : (
              motoristasVisiveis.map((m) => (
                <Motorista
                  key={m.id}
                  m={m}
                  t={t}
                  token={token}
                  navigation={navigation}
                  onAprovar={() => decidir(m, 'approved')}
                  onRecusar={() =>
                    setPedido({
                      m,
                      decision: 'rejected',
                      titulo: t('adminRejectTitle'),
                      explicacao: t('adminRejectExplain'),
                    })
                  }
                  onSuspender={() =>
                    setPedido({
                      m,
                      decision: 'suspended',
                      titulo: t('admSuspendTitle'),
                      explicacao: t('admSuspendExplain'),
                    })
                  }
                />
              ))
            )}
          </>
        ) : seccao === 'contas' ? (
          <Contas
            contas={contas}
            t={t}
            navigation={navigation}
            busca={busca}
            setBusca={setBusca}
            papel={papel}
            setPapel={setPapel}
            haMais={haMais}
            onMais={() => carregarContas(pagina + 1)}
          />
        ) : seccao === 'viagens' ? (
          <Viagens viagens={viagens} t={t} navigation={navigation} />
        ) : seccao === 'registo' ? (
          <Registo acessos={registo} t={t} navigation={navigation} dias={dias} setDias={setDias} />
        ) : (
          <Lugares
            lugares={lugares}
            t={t}
            onDecidir={async (id, estado) => {
              try {
                await api.adminLugarEstado(token, id, estado);
                carregarLugares();
              } catch (e) {
                Alert.alert(t('errGeneric'), e?.message || '');
              }
            }}
          />
        )}
        <RodapeMarca />
      </ScrollView>

      {pedido ? (
        <PedirMotivo
          pedido={pedido}
          t={t}
          onFechar={() => setPedido(null)}
          onConfirmar={(motivo) => {
            const p = pedido;
            setPedido(null);
            decidir(p.m, p.decision, motivo);
          }}
        />
      ) : null}

      {/* Notificações.
          Uma folha que sobe do fundo e não um ecrã novo: o que está aqui
          decide-se em segundos e volta-se ao que se estava a fazer. Tocar
          num item leva à secção onde o problema se resolve — uma
          notificação que só informa obriga a procurar o sítio à mão. */}
      <Modal
        visible={verNotif}
        transparent
        animationType="slide"
        onRequestClose={() => setVerNotif(false)}
      >
        <Pressable style={styles.notifFundo} onPress={() => setVerNotif(false)} />
        <View style={styles.notifFolha}>
          <View style={styles.notifPega} />
          <Text style={styles.notifTitulo}>{t('admNotificacoes')}</Text>

          {!notif?.itens?.length ? (
            <Text style={styles.vazio}>{t('admNadaATratar')}</Text>
          ) : (
            notif.itens.map((i) => (
              <Pressable
                key={i.chave}
                style={styles.notifLinha}
                onPress={() => {
                  setVerNotif(false);
                  setSeccao(i.seccao);
                }}
              >
                <Ponto estado={ESTADO[i.nivel] ?? ESTADO.neutro} />
                <Text style={styles.notifTexto} numberOfLines={2}>
                  {t('admNotif' + i.chave.charAt(0).toUpperCase() + i.chave.slice(1))}
                </Text>
                <Text style={styles.notifConta}>{i.n}</Text>
              </Pressable>
            ))
          )}

          <Button title={t('admFechar')} variant="ghost" onPress={() => setVerNotif(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Alerta({ a, t, onResolver }) {
  // Sem emoji: o 🚔 muda de desenho conforme o telemóvel, não recebe a
  // cor do tema e não se alinha com o texto. A pastilha diz o mesmo e
  // obedece ao desenho da aplicação.
  const rotulo =
    a.tipo === 'policia'
      ? t('emgTypePolicia')
      : a.tipo === 'medica'
        ? t('emgTypeMedica')
        : a.tipo === 'protecao'
          ? t('emgTypeProtecao')
          : t('emgTypeOutro');
  return (
    <View style={styles.cartaoSos}>
      <Pastilha texto={rotulo} estado={ESTADO.mau} />
      <Text style={styles.sosNome}>{a.quem}</Text>
      <Text style={styles.sosMeta}>
        {new Date(a.quando).toLocaleString('pt-PT')}
        {a.destino ? ` · ${a.destino}` : ''}
      </Text>
      <View style={styles.linhaAcoes}>
        {a.telefone ? (
          <Pressable style={styles.accaoSos} onPress={() => Linking.openURL(`tel:${a.telefone}`)}>
            <Text style={styles.accaoSosTexto}>{a.telefone}</Text>
          </Pressable>
        ) : null}
        {a.lat != null && a.lng != null ? (
          <Pressable style={styles.accaoSos} onPress={() => abrirNoMapa(Linking, a.lat, a.lng)}>
            <Text style={styles.accaoSosTexto}>{t('adminSosMap')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={onResolver}>
        <Text style={styles.resolver}>{t('adminSosResolve')}</Text>
      </Pressable>
    </View>
  );
}

// Hora curta, para as listas do resumo.
function hhmm(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// O ícone de cada estado de viagem, numa tabela e não em ternários.
const ICONE_DO_ESTADO = {
  completed: 'visto',
  cancelled: 'fechar',
  in_progress: 'rota',
  requested: 'relogio',
  accepted: 'carro',
  arriving: 'pin',
};

function Resumo({ resumo, estat, notif, viagens, t, navigation, onIr, onNotif }) {
  const seg = estat?.segundosAteAceitar;
  const disponiveis = resumo?.disponiveis ?? 0;
  const esperando = resumo?.esperando ?? 0;
  const semResposta = estat?.semResposta ?? 0;
  const v24 = resumo?.viagens24h ?? 0;
  const c24 = resumo?.canceladas24h ?? 0;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const porTratar = notif?.porTratar ?? 0;
  const recentes = (viagens || []).slice(0, 4);
  const temTaxas = estat?.pedidos > 0;
  const taxaCanc = temTaxas ? pct(estat.canceladas, estat.pedidos) : null;

  // Cada número carrega o seu estado: oito números iguais obrigam a ler os
  // oito para saber se está tudo bem, que é o oposto do que um painel serve.
  // Nenhum motorista disponível é MAU, não neutro: sem motoristas a app não
  // faz nada. Passageiros à espera é aviso até três, mau daí para cima.
  return (
    <>
      <SeccaoTitulo
        icone="grafico"
        titulo={t('admAgora')}
        nota={porTratar ? t('admPorTratar', { n: porTratar }) : t('admSistemaNormal')}
      />
      <View style={styles.numeros}>
        <CartaoKPI
          icone="pessoa"
          valor={resumo?.aprovados}
          etiqueta={t('adminDrivers')}
          nota={t('admNotaAprovados')}
          onPress={() => onIr('motoristas')}
        />
        <CartaoKPI
          icone="volante"
          valor={disponiveis}
          etiqueta={t('adminOnline')}
          nota={t('admNotaDisponiveis')}
          estado={disponiveis === 0 ? ESTADO.mau : ESTADO.bom}
          onPress={() => onIr('motoristas')}
        />
        {/* Em serviço não é o mesmo que disponível: um motorista pode estar
            online sem ninguém no banco de trás. */}
        <CartaoKPI
          icone="carro"
          valor={resumo?.veiculosServico}
          etiqueta={t('admVeiculosServico')}
          nota={t('admNotaServico')}
        />
        <CartaoKPI
          icone="rota"
          valor={v24}
          etiqueta={t('adminRides24h')}
          nota={t('admNotaViagens24')}
          onPress={() => onIr('viagens')}
        />
        <CartaoKPI
          icone="fechar"
          valor={c24}
          etiqueta={t('admCanceladas24h')}
          nota={pct(c24, v24) != null ? t('admPctPedidos', { n: pct(c24, v24) }) : null}
          estado={c24 > 0 ? ESTADO.aviso : ESTADO.neutro}
          onPress={() => onIr('viagens')}
        />
        <CartaoKPI
          icone="relogio"
          valor={esperando}
          etiqueta={t('adminWaiting')}
          nota={t('admNotaEsperando')}
          estado={esperando === 0 ? ESTADO.neutro : esperando > 3 ? ESTADO.mau : ESTADO.aviso}
        />
      </View>
      {/* Tarifas, NÃO receita: o dinheiro passa do passageiro ao motorista,
          em mão, e a plataforma não fica com nada. */}
      <CartaoTarifa total={resumo?.tarifas24h} etiqueta={t('admTarifas24h')} />

      {/* O tempo de espera é o número que decide se o serviço funciona:
          acima de dois ou três minutos o passageiro desiste e não volta.
          As taxas vêm com a conta ao lado ("2 husi 3 pedidu"): uma
          percentagem sozinha de três pedidos engana. */}
      <SeccaoTitulo
        icone="visto"
        titulo={t('admQualidade')}
        nota={t('admUltimosDias', { n: estat?.dias ?? 7 })}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.qualidade}
      >
        <Qualidade
          icone="relogio"
          valor={
            seg == null
              ? '—'
              : seg < 120
                ? t('admSeconds', { n: seg })
                : t('admMinutes', { n: Math.round(seg / 60) })
          }
          etiqueta={t('admWaitTime')}
          estado={
            seg == null
              ? ESTADO.neutro
              : seg > 180
                ? ESTADO.mau
                : seg > 90
                  ? ESTADO.aviso
                  : ESTADO.bom
          }
        />
        <Qualidade
          icone="mensagem"
          valor={semResposta}
          etiqueta={t('admNoAnswer')}
          estado={semResposta === 0 ? ESTADO.bom : ESTADO.mau}
        />
        {temTaxas ? (
          <Qualidade
            icone="visto"
            valor={`${pct(estat.aceites, estat.pedidos)}%`}
            etiqueta={t('admTaxaAceitacao')}
            nota={t('admXdeY', { x: estat.aceites, y: estat.pedidos })}
          />
        ) : null}
        {temTaxas ? (
          <Qualidade
            icone="fechar"
            valor={`${taxaCanc}%`}
            etiqueta={t('admTaxaCancelamento')}
            nota={t('admXdeY', { x: estat.canceladas, y: estat.pedidos })}
            estado={taxaCanc > 20 ? ESTADO.aviso : ESTADO.neutro}
          />
        ) : null}
        <Qualidade
          icone="estrela"
          valor={estat?.satisfacao ? Number(estat.satisfacao.media).toFixed(1) : '—'}
          etiqueta={t('admSatisfacao')}
          nota={estat?.satisfacao ? t('admNotas', { n: estat.satisfacao.n }) : null}
        />
      </ScrollView>

      <SeccaoTitulo
        icone="relogio"
        titulo={t('admActividade')}
        accao={t('admVerTudo')}
        onAccao={() => onIr('viagens')}
      />
      <Cartao lista>
        {recentes.length ? (
          recentes.map((v, i) => (
            <LinhaMenu
              key={v.id}
              icone={ICONE_DO_ESTADO[v.estado] || 'carro'}
              titulo={t(statusMeta(v.estado).key)}
              subtitulo={v.destino}
              perigo={v.estado === 'cancelled'}
              direita={<Text style={styles.horaLista}>{hhmm(v.quando)}</Text>}
              onPress={() => navigation.navigate('AdminDetalhe', { tipoAlvo: 'viagem', id: v.id })}
              ultimo={i === recentes.length - 1}
            />
          ))
        ) : (
          <LinhaMenu icone="rota" titulo={t('admNoRides')} ultimo />
        )}
      </Cartao>

      {/* Os alertas são uma leitura do estado actual, não mensagens
          guardadas: quando a razão desaparece, o alerta desaparece. */}
      <SeccaoTitulo
        icone="sino"
        titulo={t('admAlertas')}
        accao={notif?.itens?.length ? t('admVerTudo') : null}
        onAccao={onNotif}
      />
      <Cartao lista>
        {notif?.itens?.length ? (
          notif.itens.map((i, k) => (
            <LinhaMenu
              key={i.chave}
              icone={i.nivel === 'mau' ? 'aviso' : i.nivel === 'aviso' ? 'info' : 'sino'}
              titulo={t('admNotif' + i.chave.charAt(0).toUpperCase() + i.chave.slice(1))}
              perigo={i.nivel === 'mau'}
              direita={<Text style={styles.contaLista}>{i.n}</Text>}
              onPress={() => onIr(i.seccao)}
              ultimo={k === notif.itens.length - 1}
            />
          ))
        ) : (
          <LinhaMenu icone="visto" titulo={t('admNadaATratar')} ultimo />
        )}
      </Cartao>

      {estat?.documentosACaducar?.length ? (
        <>
          <SeccaoTitulo icone="documento" titulo={t('admExpiringSoon')} />
          <Cartao lista>
            {estat.documentosACaducar.map((d, i) => (
              <LinhaInfo
                key={i}
                rotulo={d.nome}
                valor={d.ate}
                mau
                ultimo={i === estat.documentosACaducar.length - 1}
              />
            ))}
          </Cartao>
        </>
      ) : null}

      {estat?.cancelamentos?.length ? (
        <>
          <SeccaoTitulo icone="fechar" titulo={t('admCancelReasons')} />
          <Cartao lista>
            {estat.cancelamentos.map((c, i) => (
              <LinhaInfo
                key={c.motivo}
                rotulo={t(`cancelReason_${c.motivo}`)}
                valor={String(c.n)}
                ultimo={i === estat.cancelamentos.length - 1}
              />
            ))}
          </Cartao>
        </>
      ) : null}
    </>
  );
}

// Um cartão pequeno da fila da qualidade: ícone, número, rótulo, e a conta
// por baixo quando a há. Largura fixa, e a fila desliza: cinco números lado
// a lado não cabem num telemóvel de 360 px sem se partirem a meio.
function Qualidade({ icone, valor, etiqueta, nota, estado = ESTADO.neutro }) {
  const cor =
    estado === ESTADO.mau ? colors.danger : estado === ESTADO.aviso ? colors.coral : colors.teal;
  return (
    <View style={styles.qualCartao}>
      <Icone nome={icone} tamanho={22} cor={cor} />
      <Text
        style={[
          styles.qualValor,
          estado !== ESTADO.neutro && estado !== ESTADO.bom && { color: cor },
        ]}
        numberOfLines={1}
      >
        {valor}
      </Text>
      <Text style={styles.qualEtiqueta} numberOfLines={3}>
        {etiqueta}
      </Text>
      {nota ? <Text style={styles.qualNota}>{nota}</Text> : null}
    </View>
  );
}

function Motorista({ m, t, token, navigation, onAprovar, onRecusar, onSuspender }) {
  const estado =
    m.driverStatus === 'approved'
      ? t('admStatusApproved')
      : m.driverStatus === 'rejected'
        ? t('admStatusRejected')
        : m.driverStatus === 'suspended'
          ? t('admStatusSuspended')
          : t('admStatusPending');

  return (
    <View style={styles.cartao}>
      <View style={styles.cabecalhoMotorista}>
        {/* Só o nome abre o detalhe. Os botões de decisão ficam fora da
            zona clicável: aprovar por engano ao querer apenas ver quem é
            a pessoa seria o pior erro possível neste ecrã. */}
        <Pressable
          style={styles.motoristaQuem}
          onPress={() => navigation.navigate('AdminDetalhe', { tipoAlvo: 'utilizador', id: m.id })}
          accessibilityRole="button"
        >
          <Avatar nome={m.name} tamanho={48} online={m.online} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nome} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={styles.meta}>
              {m.phone} · {nomeDoVeiculo(t, m.vehicle?.type)}
              {m.vehicle?.plate ? ` · ${m.vehicle.plate}` : ''}
            </Text>
          </View>
          <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} />
        </Pressable>
      </View>
      <View style={styles.estadoLinha}>
        <Pastilha
          texto={estado}
          estado={
            m.driverStatus === 'approved'
              ? ESTADO.bom
              : m.driverStatus === 'suspended' || m.driverStatus === 'rejected'
                ? ESTADO.mau
                : ESTADO.aviso
          }
        />
      </View>

      <View style={styles.factos}>
        <Text style={styles.facto}>{t('admTripsCount', { n: m.viagens })}</Text>
        {m.cancelou > 0 ? (
          <Text style={[styles.facto, styles.factoMau]}>
            {t('admCancelled', { n: m.cancelou })}
          </Text>
        ) : null}
        <Text style={[styles.facto, !m.fotoHoje && styles.factoMau]}>
          {m.fotoHoje ? t('admPhotoToday') : t('admPhotoMissing')}
        </Text>
        {m.validadeMin ? (
          <Text style={styles.facto}>{t('admDocsUntil', { data: m.validadeMin })}</Text>
        ) : null}
      </View>

      {m.driverStatusMotivo ? <Text style={styles.motivo}>“{m.driverStatusMotivo}”</Text> : null}

      {m.documents?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docs}>
          {m.documents.map((d) => (
            <View key={d.id}>
              {/* Passou a buscar os bytes com fetch, como o retrato do
                  perfil: o carregador nativo pode não enviar o cabeçalho
                  de autorização, e nesse caso os documentos apareciam em
                  branco sem dizer porquê. */}
              <ImagemProtegida caminho={`/admin/documents/${d.id}`} style={styles.doc} />
              {d.expirado ? (
                <View style={styles.docAviso}>
                  <Pastilha texto={t('admStatusExpired')} estado={ESTADO.mau} />
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.semDocs}>{t('adminNoDocs')}</Text>
      )}

      <View style={styles.botoes}>
        {m.driverStatus === 'pending' ? (
          <>
            <View style={styles.metade}>
              <Button title={t('adminReject')} variant="ghost" onPress={onRecusar} />
            </View>
            <View style={styles.metade}>
              <Button title={t('adminApprove')} onPress={onAprovar} />
            </View>
          </>
        ) : m.driverStatus === 'approved' ? (
          <View style={{ flex: 1 }}>
            <Button title={t('admSuspend')} variant="outline" onPress={onSuspender} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Button title={t('admReactivate')} onPress={onAprovar} />
          </View>
        )}
      </View>
    </View>
  );
}

// Todas as contas do sistema, com pesquisa e filtro por papel.
const PAPEIS = [
  ['todos', 'admFiltroTodos', 'grupo'],
  ['passageiros', 'admFiltroPassageiros', 'pessoa'],
  ['motoristas', 'admFiltroMotoristas', 'volante'],
  ['admins', 'admPapelAdmin', 'coroa'],
  ['suspensas', 'admFiltroSuspensas', 'proibido'],
];

function Contas({ contas, t, navigation, busca, setBusca, papel, setPapel, haMais, onMais }) {
  return (
    <>
      <CampoBusca valor={busca} onMudar={setBusca} placeholder={t('admProcurar')} />
      <FilaChips>
        {PAPEIS.map(([p, chave, icone]) => (
          <Chip
            key={p}
            icone={icone}
            texto={t(chave)}
            activo={papel === p}
            onPress={() => setPapel(p)}
          />
        ))}
      </FilaChips>

      {/* O total é o que veio. Contar a tabela inteira a cada folha custava
          uma consulta pesada por cada letra escrita na busca; com mais
          páginas por carregar diz "30+", que é verdade. */}
      {contas.length ? (
        <Text style={styles.total}>
          {t('admTotalContas', { n: haMais ? `${contas.length}+` : contas.length })}
        </Text>
      ) : null}

      {contas.length === 0 ? (
        <EstadoVazio icone="lupa" titulo={t('admSemResultados')} />
      ) : (
        contas.map((u) => (
          <Pressable
            key={u.id}
            style={({ pressed }) => [styles.conta, pressed && { opacity: 0.85 }]}
            onPress={() =>
              navigation.navigate('AdminDetalhe', { tipoAlvo: 'utilizador', id: u.id })
            }
            accessibilityRole="button"
          >
            <Avatar nome={u.nome} tamanho={52} online={u.online} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contaNome} numberOfLines={1}>
                {u.nome}
              </Text>
              <Text style={styles.contaMeta}>{u.telefone}</Text>
              <View style={styles.contaPastilhas}>
                <Etiqueta
                  icone={u.driverStatus ? 'volante' : 'pessoa'}
                  texto={u.driverStatus ? t('admPapelMotorista') : t('admPapelPassageiro')}
                />
                {u.veiculo?.matricula ? <Etiqueta texto={u.veiculo.matricula} /> : null}
                {u.isAdmin ? <Etiqueta icone="coroa" texto={t('admPapelAdmin')} /> : null}
                {u.driverStatus === 'suspended' ? (
                  <Etiqueta icone="proibido" texto={t('admStatusSuspended')} mau />
                ) : null}
              </View>
              <View style={styles.contaFactos}>
                <Icone nome="grafico" tamanho={14} cor={colors.textMuted} />
                <Text style={styles.contaMeta}>
                  {t('admTripsCount', { n: u.viagensPassageiro + u.viagensMotorista })}
                </Text>
                {u.estrelas ? (
                  <>
                    <Icone nome="estrela" tamanho={14} cor={colors.coral} />
                    <Text style={styles.contaMeta}>{Number(u.estrelas).toFixed(1)}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <Icone nome="seta" tamanho={18} cor={colors.textMuted} traco={2.4} />
          </Pressable>
        ))
      )}

      {haMais ? (
        <Pressable style={styles.mais} onPress={onMais}>
          <Text style={styles.maisTexto}>{t('admMais')}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

// Uma etiqueta pequena de papel ou de matrícula, dentro de um cartão de
// conta. Vermelha só quando diz uma coisa má (suspensa).
function Etiqueta({ icone, texto, mau, neutra }) {
  const cor = mau ? colors.danger : neutra ? colors.textMuted : colors.teal;
  return (
    <View style={[styles.etiqueta, mau && styles.etiquetaMau, neutra && styles.etiquetaNeutra]}>
      {icone ? <Icone nome={icone} tamanho={13} cor={cor} /> : null}
      <Text style={[styles.etiquetaTexto, { color: cor }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

// Registo de acessos: QUEM VIU OS DOCUMENTOS DE QUEM, e quando.
//
// Cartas de condução, bilhetes de identidade e fotografias são dados
// pessoais sensíveis. Quem os abre fica registado — e o registo existe para
// responder a uma pergunta concreta, no dia em que alguém a fizer: quem
// andou a ver os meus documentos?
//
// Não trava nada e nunca faz um pedido falhar. Um painel que deixa de
// funcionar porque a auditoria falhou é pior do que um sem auditoria.
//
// Nasceu para o chat, que era POR VIAGEM — daí o ecrã ter mostrado durante
// meses "Viagem #4" quando o número é o de uma PESSOA. A administração
// deixou de poder ler conversas; o rótulo é que ficou para trás.
//
// Existe para ser visto, não só escrito. Um registo que ninguém pode
// consultar é o mesmo que não haver registo — serve para dizer que se
// tem auditoria, não para responder a uma pergunta.
function Registo({ acessos, t, navigation, dias, setDias }) {
  const [busca, setBusca] = useState('');
  // Os filtros ficam FORA do `if` de lista vazia. Se estivessem dentro,
  // escolher "Hoje" num dia sem acessos deixava o ecrã sem forma de voltar
  // a "30 dias" — um beco sem saída construído pelo próprio filtro.
  const periodos = [
    [1, 'admPeriodoHoje'],
    [7, 'admPeriodo7'],
    [30, 'admPeriodo30'],
  ];
  const q = busca.trim().toLowerCase();
  const visiveis = q
    ? acessos.filter((a) =>
        `${a.alvoNome || ''} ${a.que || ''} ${(a.admins || []).join(' ')}`.toLowerCase().includes(q)
      )
    : acessos;
  return (
    <>
      <FilaChips>
        {periodos.map(([d, chave]) => (
          <Chip
            key={d}
            icone="calendario"
            texto={t(chave)}
            activo={dias === d}
            onPress={() => setDias(d)}
          />
        ))}
      </FilaChips>
      <CampoBusca valor={busca} onMudar={setBusca} placeholder={t('admProcurarRegisto')} />

      {/* O QUE ESTE REGISTO É, dito no próprio ecrã. A referência dizia que
          guardava "viagens, pagamentos e mudanças" — não guarda: é o registo
          de quem abriu os documentos e os dados pessoais de quem. Um painel
          que descreve mal a sua própria auditoria é pior do que um que não
          a descreve. */}
      <View style={styles.infoCaixa}>
        <Icone nome="info" tamanho={22} cor={colors.teal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitulo}>{t('admRegistoInfoTitulo')}</Text>
          <Text style={styles.infoTexto}>{t('admRegistoInfo')}</Text>
        </View>
      </View>

      {!visiveis.length ? (
        <EstadoVazio
          icone="documento"
          titulo={q ? t('admSemResultados') : t('admRegistoVazio')}
          texto={q ? null : t('admRegistoVazioTexto')}
        />
      ) : (
        <>
          <SeccaoTitulo icone="olho" titulo={t('admRegistoTitulo')} />
          {visiveis.map((a) => (
            <GrupoDeAcesso key={a.id} a={a} t={t} navigation={navigation} />
          ))}
        </>
      )}
    </>
  );
}

// Um grupo: uma pessoa, um tipo de consulta, quantas vezes.
//
// Fechado responde à pergunta que interessa — quem, a quem, quantas vezes, a
// última quando. Aberto mostra as horas, até dez, que é o que permite ver um
// padrão: três consultas espalhadas por três semanas não é o mesmo que três
// na mesma tarde.
function GrupoDeAcesso({ a, t, navigation }) {
  const [aberto, setAberto] = useState(false);
  const hora = (d) =>
    new Date(d).toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  // A quem. Uma conta apagada continua a ter de aparecer: apagar a conta não
  // apaga o facto de alguém ter visto os documentos dela.
  const quem = a.alvoNome
    ? a.alvoNome
    : a.alvoApagado
      ? `#${a.alvo} · ${t('admRegistoApagada')}`
      : t('admRegistoSemAlvo');

  return (
    <Pressable style={styles.conta} onPress={() => setAberto((v) => !v)} accessibilityRole="button">
      <Icone nome="olho" tamanho={22} cor={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={styles.contaNome}>{quem}</Text>
        <Text style={styles.contaMeta}>
          {a.que} · {a.vezes === 1 ? t('admRegistoUmaVez') : t('admRegistoVezes', { n: a.vezes })}
          {' · '}
          {t('admRegistoUltima')} {hora(a.quando)}
        </Text>
        {a.admins?.length ? <Text style={styles.contaMeta}>{a.admins.join(', ')}</Text> : null}

        {aberto ? (
          <View style={styles.horas}>
            {(a.quandos || []).map((q) => (
              <Text key={q} style={styles.hora}>
                {hora(q)}
              </Text>
            ))}
            {a.vezes > (a.quandos || []).length ? (
              <Text style={styles.hora}>
                {t('admRegistoMais', { n: a.vezes - (a.quandos || []).length })}
              </Text>
            ) : null}
            {a.alvo && !a.alvoApagado ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('AdminDetalhe', { tipoAlvo: 'conta', id: a.alvo })
                }
              >
                <Text style={styles.horaLigacao}>{t('admRegistoVerConta')} ›</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} />
    </Pressable>
  );
}

// Uma viagem, em cartão. Extraída porque agora aparece em dois sítios —
// nas que estão a decorrer e nas recentes — e um cartão copiado é um
// cartão que passa a divergir do outro à primeira correcção.
function CartaoViagem({ v, t, navigation }) {
  const mau = v.estado === 'cancelled';
  return (
    <Pressable
      style={({ pressed }) => [styles.viagem, pressed && { opacity: 0.85 }]}
      onPress={() => navigation.navigate('AdminDetalhe', { tipoAlvo: 'viagem', id: v.id })}
      accessibilityRole="button"
    >
      <Icone
        nome={ICONE_DO_ESTADO[v.estado] || 'carro'}
        tamanho={26}
        cor={mau ? colors.danger : colors.teal}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.viagemDestino} numberOfLines={1}>
          {v.destino}
        </Text>
        <Text style={styles.viagemMeta} numberOfLines={1}>
          {v.passageiro}
          {v.motorista ? ` → ${v.motorista}` : ' → —'}
          {v.km ? ` · ${v.km} km` : ''}
        </Text>
        <View style={styles.viagemLinha}>
          <Etiqueta texto={t(statusMeta(v.estado).key)} mau={mau} />
          {v.motivoCancelamento ? (
            <Etiqueta texto={t(`cancelReason_${v.motivoCancelamento}`)} neutra />
          ) : null}
        </View>
      </View>
      <View style={styles.viagemDireita}>
        <Text style={styles.viagemPreco}>
          {v.preco != null ? `$${Number(v.preco).toFixed(2)}` : '—'}
        </Text>
        <Text style={styles.horaLista}>{hhmm(v.quando)}</Text>
      </View>
      <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} />
    </Pressable>
  );
}

// Estados em que a viagem ainda não acabou. Fica numa constante porque a
// mesma pergunta — "isto ainda está a acontecer?" — é feita em três
// sítios, e três listas escritas à mão divergem.
const A_DECORRER = ['requested', 'accepted', 'arriving', 'in_progress'];

function Viagens({ viagens, t, navigation }) {
  // Contas feitas aqui e não no servidor: os dados já vieram todos, e numa
  // rede como a de Díli um pedido a mais custa mais do que estas somas.
  const activas = viagens.filter((v) => A_DECORRER.includes(v.estado));
  const concluidas = viagens.filter((v) => v.estado === 'completed');
  const canceladas = viagens.filter((v) => v.estado === 'cancelled');
  const tarifas = concluidas.reduce((soma, v) => soma + (Number(v.preco) || 0), 0);

  if (!viagens.length) return <EstadoVazio icone="rota" titulo={t('admNoRides')} />;

  return (
    <>
      <SeccaoTitulo icone="grafico" titulo={t('admResumoViagens')} nota={t('admUltimas24h')} />
      <View style={styles.numeros}>
        <CartaoKPI icone="rota" valor={viagens.length} etiqueta={t('admTotalViagens')} />
        <CartaoKPI
          icone="relogio"
          valor={activas.length}
          etiqueta={t('admEmAndamento')}
          estado={activas.length > 0 ? ESTADO.bom : ESTADO.neutro}
        />
        <CartaoKPI icone="bandeira" valor={concluidas.length} etiqueta={t('admConcluidas')} />
        <CartaoKPI
          icone="fechar"
          valor={canceladas.length}
          etiqueta={t('admCanceladas24h')}
          estado={canceladas.length > 0 ? ESTADO.aviso : ESTADO.neutro}
        />
      </View>
      <CartaoTarifa total={tarifas} etiqueta={t('admTarifas24h')} />

      {/* As que estão a decorrer vêm primeiro e separadas. É a única parte
          desta secção onde ainda se pode agir: quando uma viagem já
          terminou, ler sobre ela é história. */}
      <SeccaoTitulo icone="rota" titulo={t('admViagensActivas')} />
      {activas.length === 0 ? (
        <EstadoVazio
          imagem={VEICULOS.car.imagens[paletaEmUso()] || VEICULOS.car.imagens.claro}
          titulo={t('admSemViagensActivas')}
        />
      ) : (
        activas.map((v) => <CartaoViagem key={v.id} v={v} t={t} navigation={navigation} />)
      )}

      <SeccaoTitulo icone="relogio" titulo={t('admViagensRecentes')} />
      {viagens
        .filter((v) => !A_DECORRER.includes(v.estado))
        .map((v) => (
          <CartaoViagem key={v.id} v={v} t={t} navigation={navigation} />
        ))}
    </>
  );
}
function PedirMotivo({ pedido, t, onFechar, onConfirmar }) {
  const [texto, setTexto] = useState('');
  return (
    <View style={styles.sobreposicao}>
      <View style={styles.painelMotivo}>
        <Text style={styles.motivoTitulo}>{pedido.titulo}</Text>
        <Text style={styles.motivoExplica}>{pedido.explicacao}</Text>
        <TextInput
          style={styles.motivoCampo}
          value={texto}
          onChangeText={setTexto}
          placeholder={t('admReasonLabel')}
          placeholderTextColor={colors.textMuted}
          multiline
          autoFocus
        />
        <View style={styles.botoes}>
          <View style={styles.metade}>
            <Button title={t('cancel')} variant="ghost" onPress={onFechar} />
          </View>
          <View style={styles.metade}>
            <Button
              title={pedido.decision === 'suspended' ? t('admSuspend') : t('adminReject')}
              onPress={() => onConfirmar(texto)}
              disabled={!texto.trim()}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    ecra: { flex: 1, backgroundColor: colors.paper },
    // O sino tem a largura do espaçador que substituiu (60), para o
    // título ficar centrado como estava.
    sino: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    // Contador, não pastilha decorativa: o número é a informação, e por
    // isso tem de se ler mesmo em cima do ícone.
    sinoConta: {
      position: 'absolute',
      top: 2,
      right: 0,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    sinoContaTexto: { color: colors.white, fontSize: 11, fontWeight: '700' },

    notifFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    notifFolha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.xs,
    },
    notifPega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    notifTitulo: { ...tipo.subtitulo, color: colors.text, marginBottom: spacing.sm },
    notifLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    notifTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    notifConta: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },

    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },

    // Uma linha fina por baixo de toda a fila: é contra ela que o
    // sublinhado do separador activo se lê como indicador, e não como um
    // traço solto no meio do ecrã.
    barraAbas: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    // Intervalo mais curto: com cinco separadores, 24 px entre cada um
    // empurrava dois para fora do ecrã sem necessidade.
    abas: { paddingHorizontal: spacing.lg, gap: spacing.xs, paddingVertical: spacing.sm },
    aba: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    abaActiva: { backgroundColor: colors.tintaTeal },
    qualidade: { gap: spacing.sm, paddingBottom: spacing.xs },
    qualCartao: {
      width: 128,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 2,
    },
    qualValor: {
      ...tipo.titulo,
      color: colors.text,
      marginTop: spacing.xs,
      fontVariant: ['tabular-nums'],
    },
    qualEtiqueta: { ...tipo.legenda, color: colors.text },
    qualNota: { ...tipo.legenda, color: colors.textMuted },
    horaLista: { ...tipo.legenda, color: colors.textMuted, fontVariant: ['tabular-nums'] },
    contaLista: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    abaTexto: { ...tipo.corpoForte, color: colors.textMuted },
    abaTextoActivo: { color: colors.teal },

    blocoSos: {
      backgroundColor: colors.tintaPerigo,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.lg,
      padding: spacing.sm,
      borderWidth: 2,
      borderColor: colors.danger,
    },
    cartaoSos: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.xs,
    },
    sosNome: { ...tipo.subtitulo, color: colors.text, marginTop: 2 },
    sosMeta: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    linhaAcoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
    accaoSos: {
      backgroundColor: colors.danger,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
    },
    // Branco fixo, e certo: assenta sobre uma superfície que é escura
    // nos dois temas. Um token de tema aqui trocaria o texto por laranja
    // sobre vermelho.
    accaoSosTexto: { ...tipo.corpoForte, color: '#fff' },
    resolver: { ...tipo.corpoForte, color: colors.teal, marginTop: spacing.sm },

    numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

    filtros: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
    filtro: {
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
    },
    filtroTexto: { ...tipo.legenda, color: colors.textMuted },

    conta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    docAviso: { position: 'absolute', top: 4, left: 4 },
    contaNome: { ...tipo.corpoForte, color: colors.text },
    contaMeta: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    contaMorada: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    etiquetas: {
      backgroundColor: colors.inputBg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      marginTop: spacing.sm,
      gap: 4,
    },
    etiquetasTitulo: { ...tipo.legenda, color: colors.textMuted },
    // Monoespaçada: são pares chave=valor, e alinhados lêem-se de relance.
    etiquetasTexto: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      lineHeight: 18,
      color: colors.text,
    },
    // As horas do grupo, quando aberto. Recuadas e separadas por uma linha
    // para se lerem como o DETALHE de cima e não como itens novos da lista.
    horas: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 2,
    },
    hora: { ...tipo.legenda, color: colors.textMuted, fontVariant: ['tabular-nums'] },
    horaLigacao: { ...tipo.legenda, color: colors.teal, marginTop: spacing.xs, fontWeight: '700' },
    mais: { alignItems: 'center', paddingVertical: spacing.md },
    maisTexto: { ...tipo.corpoForte, color: colors.teal },
    vazio: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    motoristaQuem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    estadoLinha: { flexDirection: 'row', marginTop: spacing.sm },
    total: { ...tipo.corpo, color: colors.text, marginBottom: spacing.sm },
    contaPastilhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    contaFactos: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    etiqueta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.pill,
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
    },
    etiquetaMau: { backgroundColor: colors.tintaPerigo },
    etiquetaNeutra: { backgroundColor: colors.paper },
    lugar: { alignItems: 'flex-start' },
    viagemDireita: { alignItems: 'flex-end', gap: 2 },
    infoCaixa: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    infoTitulo: { ...tipo.corpoForte, color: colors.teal },
    infoTexto: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    etiquetaTexto: { ...tipo.legenda },
    cabecalhoMotorista: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    nome: { ...tipo.subtitulo, color: colors.text },
    meta: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    factos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    facto: { fontSize: 11, color: colors.textMuted },
    factoMau: { color: colors.danger, fontWeight: '700' },
    motivo: { ...tipo.legenda, color: colors.danger, fontStyle: 'italic', marginTop: spacing.sm },
    docs: { marginTop: spacing.md },
    doc: {
      width: 84,
      height: 84,
      borderRadius: radius.sm,
      marginRight: spacing.sm,
      backgroundColor: colors.border,
    },
    semDocs: { ...tipo.legenda, marginTop: spacing.sm, color: colors.danger },
    botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    metade: { flex: 1 },

    viagem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    viagemDestino: { ...tipo.corpoForte, flex: 1, color: colors.text },
    viagemPreco: { ...tipo.corpoForte, color: colors.teal },
    viagemMeta: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    viagemLinha: { flexDirection: 'row', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },

    sobreposicao: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    painelMotivo: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg },
    motivoTitulo: { ...tipo.subtitulo, color: colors.text },
    motivoExplica: { ...tipo.pequeno, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
    motivoCampo: {
      ...tipo.corpo,
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
      minHeight: 74,
      color: colors.text,
      textAlignVertical: 'top',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});

// Sítios que os passageiros nomearam.
//
// Cada linha é alguém que corrigiu o mapa: escreveu um nome diferente do que
// a app lhe mostrou. É a mesma matéria-prima com que a Grab construiu o
// GrabMaps — quem anda na rua sabe o que o mapa não sabe.
//
// O botão abre o editor do OpenStreetMap já nas coordenadas certas. Sem
// isso, acrescentar um sítio obrigava a procurar a posição à mão, e o que dá
// trabalho não se faz.
function Lugares({ lugares, t, onDecidir }) {
  if (!lugares.length) return <EstadoVazio icone="pin" titulo={t('admLugaresVazio')} />;
  return (
    <>
      <SeccaoTitulo icone="pin" titulo={t('admLugaresTitulo')} />
      {lugares.map((l) => (
        <View key={l.id} style={[styles.conta, styles.lugar]}>
          <Icone nome="pin" tamanho={24} cor={colors.coral} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contaNome}>{l.nome}</Text>
            <Text style={styles.contaMeta}>
              {l.nomeMapa ? `${t('admLugaresMapaDizia')}: ${l.nomeMapa}` : ''}
              {l.quem ? ` · ${l.quem}` : ''}
            </Text>
            {/* A morada que quem propôs preencheu, do mais pequeno para o
                maior. É o que faltava para a proposta se conseguir mesmo
                submeter: o OpenStreetMap não aceita um ponto solto, quer
                saber em que suco e em que posto ele fica. */}
            {l.morada ? <Text style={styles.contaMorada}>{l.morada}</Text> : null}
            <Text style={styles.contaMeta}>
              {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
              {l.etiqueta ? `  ·  ${l.etiqueta}` : ''}
            </Text>

            {/* As etiquetas prontas a colar.
                O editor do OpenStreetMap tem, no painel das etiquetas, um
                botão que troca a tabela por texto — e essa vista aceita
                linhas `chave=valor` coladas de uma vez. Quem revê deixa de
                preencher campo a campo.

                SELECCIONÁVEL e não um botão de copiar: um botão obrigava a
                acrescentar um pacote com código nativo, e isso obriga a
                compilar de novo e a reinstalar a app. Tocar e segurar faz o
                mesmo, e chega hoje. */}
            {l.etiquetas?.length ? (
              <View style={styles.etiquetas}>
                <Text style={styles.etiquetasTitulo}>{t('admLugarEtiquetas')}</Text>
                <Text style={styles.etiquetasTexto} selectable>
                  {l.etiquetas.join('\n')}
                </Text>
              </View>
            ) : null}

            <View style={styles.filtros}>
              <Pressable style={styles.filtro} onPress={() => Linking.openURL(l.editar)}>
                <Text style={styles.filtroTexto}>{t('admLugarEditar')}</Text>
              </Pressable>
              <Pressable style={styles.filtro} onPress={() => onDecidir(l.id, 'aceite')}>
                <Text style={styles.filtroTexto}>{t('admLugarAceite')}</Text>
              </Pressable>
              <Pressable style={styles.filtro} onPress={() => onDecidir(l.id, 'recusado')}>
                <Text style={styles.filtroTexto}>{t('admLugarRecusado')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}
