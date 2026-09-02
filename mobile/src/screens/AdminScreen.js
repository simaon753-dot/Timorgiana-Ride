import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
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
import Voltar from '../components/Voltar.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { Metrica, Pastilha, Ponto, Bloco, Esqueleto, ESTADO } from '../design/painel.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
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
const SECCOES = [
  ['resumo', 'admSecResumo'],
  ['motoristas', 'admSecDrivers'],
  ['contas', 'admSecContas'],
  ['viagens', 'admSecRides'],
  ['registo', 'admSecRegisto'],
  ['lugares', 'admSecLugares'],
];
const FILTROS = ['todos', 'pending', 'approved', 'suspended'];

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
      const [r, s, d, e, n] = await Promise.all([
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
      ]);
      setResumo(r.resumo);
      setAlertas(s.alertas || []);
      setMotoristas(d.drivers || []);
      setEstat(e);
      setNotif(n);
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

  if (aCarregar) {
    return (
      <SafeAreaView style={styles.ecra} edges={['top']}>
        <BarraEstado />
        <View style={styles.topo}>
          <Voltar navigation={navigation} />
          <Text style={styles.titulo}>{t('adminTitle')}</Text>
        </View>
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
      <View style={styles.topo}>
        <Voltar navigation={navigation} />
        <Text style={styles.titulo}>{t('adminTitle')}</Text>
        {/* O sino ocupa o lugar do espaçador, para o título continuar
            centrado. */}
        <Pressable
          onPress={() => setVerNotif(true)}
          hitSlop={10}
          style={styles.sino}
          accessibilityRole="button"
          accessibilityLabel={t('admNotificacoes')}
        >
          <Text style={styles.sinoIcone}>🔔</Text>
          {notif?.porTratar > 0 ? (
            <View style={styles.sinoConta}>
              <Text style={styles.sinoContaTexto}>
                {notif.porTratar > 9 ? '9+' : notif.porTratar}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

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
          {SECCOES.map(([id, chave]) => {
            const activa = seccao === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSeccao(id)}
                onLayout={(e) => {
                  posicoes.current[id] = e.nativeEvent.layout.x;
                }}
                style={styles.aba}
              >
                <Text style={[styles.abaTexto, activa && styles.abaTextoActivo]} numberOfLines={1}>
                  {t(chave)}
                </Text>
                {/* A barra existe sempre, transparente quando inactiva:
                    assim o texto não salta um pixel ao mudar de secção. */}
                <View style={[styles.abaBarra, activa && styles.abaBarraActiva]} />
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
          <Resumo resumo={resumo} estat={estat} t={t} />
        ) : seccao === 'motoristas' ? (
          <>
            <View style={styles.filtros}>
              {FILTROS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFiltro(f)}
                  style={[styles.filtro, filtro === f && styles.filtroActivo]}
                >
                  <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoActivo]}>
                    {t(
                      f === 'todos'
                        ? 'admFiltroTodos'
                        : f === 'pending'
                          ? 'admFiltroPending'
                          : f === 'approved'
                            ? 'admFiltroApproved'
                            : 'admFiltroSuspended'
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>

            {motoristas.length === 0 ? (
              <Text style={styles.vazio}>{t('adminNoPending')}</Text>
            ) : (
              motoristas.map((m) => (
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

function Resumo({ resumo, estat, t }) {
  const seg = estat?.segundosAteAceitar;
  const disponiveis = resumo?.disponiveis ?? 0;
  const esperando = resumo?.esperando ?? 0;
  const semResposta = estat?.semResposta ?? 0;

  // Cada número carrega o seu estado. Sem isto, oito números iguais
  // obrigam a ler os oito para saber se está tudo bem — que é o oposto
  // do que um painel serve para fazer.
  //
  // Nenhum motorista disponível é MAU, não neutro: sem motoristas a app
  // não faz nada. Passageiros à espera é aviso enquanto forem poucos e
  // mau quando passam de três — aí já é fila.
  return (
    <>
      <Bloco titulo={t('admAgora')}>
        <View style={styles.numeros}>
          <Metrica valor={resumo?.aprovados} etiqueta={t('adminDrivers')} />
          <Metrica
            valor={disponiveis}
            etiqueta={t('adminOnline')}
            estado={disponiveis === 0 ? ESTADO.mau : ESTADO.bom}
          />
          {/* Em serviço não é o mesmo que disponível: um motorista pode estar
              online sem ninguém no banco de trás. A diferença entre os dois
              números é procura que não está a ser atendida. */}
          <Metrica valor={resumo?.veiculosServico} etiqueta={t('admVeiculosServico')} />
          <Metrica valor={resumo?.viagens24h} etiqueta={t('adminRides24h')} />
          <Metrica
            valor={resumo?.canceladas24h}
            etiqueta={t('admCanceladas24h')}
            estado={resumo?.canceladas24h > 0 ? ESTADO.aviso : ESTADO.neutro}
          />
          {/* Tarifas, NÃO receita. A TimorgianaRide não cobra comissão e não
              recebe nada disto — o dinheiro passa do passageiro ao motorista,
              em mão. Chamar-lhe receita seria afirmar, no painel da própria
              empresa, o contrário do que os termos dizem. */}
          <Metrica
            valor={
              resumo?.tarifas24h != null ? `${'$'}${Number(resumo.tarifas24h).toFixed(2)}` : '—'
            }
            etiqueta={t('admTarifas24h')}
            nota={t('admTarifasNota')}
          />
          <Metrica
            valor={esperando}
            etiqueta={t('adminWaiting')}
            estado={esperando === 0 ? ESTADO.neutro : esperando > 3 ? ESTADO.mau : ESTADO.aviso}
          />
        </View>
      </Bloco>

      {/* O tempo de espera é o número que decide se o serviço funciona:
          acima de dois ou três minutos, o passageiro desiste e não volta.
          Por isso leva limiares e não só um valor. */}
      <Bloco titulo={t('admQualidade')}>
        <View style={styles.par}>
          <Metrica
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
          <Metrica
            valor={semResposta}
            etiqueta={t('admNoAnswer')}
            estado={semResposta === 0 ? ESTADO.bom : ESTADO.mau}
          />
        </View>
      </Bloco>

      {estat?.documentosACaducar?.length ? (
        <>
          <Text style={styles.seccaoTitulo}>{t('admExpiringSoon')}</Text>
          <View style={styles.caixa}>
            {estat.documentosACaducar.map((d, i) => (
              <View key={i} style={styles.linhaSimples}>
                <Text style={styles.linhaNome}>{d.nome}</Text>
                <Text style={styles.linhaValorMau}>{d.ate}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {estat?.cancelamentos?.length ? (
        <>
          <Text style={styles.seccaoTitulo}>{t('admCancelReasons')}</Text>
          <View style={styles.caixa}>
            {estat.cancelamentos.map((c) => (
              <View key={c.motivo} style={styles.linhaSimples}>
                <Text style={styles.linhaNome}>{t(`cancelReason_${c.motivo}`)}</Text>
                <Text style={styles.linhaValor}>{c.n}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
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
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('AdminDetalhe', { tipoAlvo: 'utilizador', id: m.id })}
        >
          <View style={styles.nomeLinha}>
            <Ponto estado={m.online ? ESTADO.bom : ESTADO.neutro} />
            <Text style={styles.nome} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={styles.seta}>›</Text>
          </View>
          <Text style={styles.meta}>
            {m.phone} · {m.vehicle?.type === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar')}
            {m.vehicle?.plate ? ` · ${m.vehicle.plate}` : ''}
          </Text>
        </Pressable>
        <Text
          style={[
            styles.estado,
            m.driverStatus === 'approved' && styles.estadoOk,
            (m.driverStatus === 'suspended' || m.driverStatus === 'rejected') && styles.estadoMau,
          ]}
        >
          {estado}
        </Text>
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
const PAPEIS = ['todos', 'passageiros', 'motoristas', 'admins', 'suspensas'];

function Contas({ contas, t, navigation, busca, setBusca, papel, setPapel, haMais, onMais }) {
  return (
    <>
      <TextInput
        style={styles.busca}
        value={busca}
        onChangeText={setBusca}
        placeholder={t('admProcurar')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />
      <View style={styles.filtros}>
        {PAPEIS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPapel(p)}
            style={[styles.filtro, papel === p && styles.filtroActivo]}
          >
            <Text style={[styles.filtroTexto, papel === p && styles.filtroTextoActivo]}>
              {t(
                p === 'todos'
                  ? 'admFiltroTodos'
                  : p === 'passageiros'
                    ? 'admFiltroPassageiros'
                    : p === 'motoristas'
                      ? 'admFiltroMotoristas'
                      : p === 'admins'
                        ? 'admPapelAdmin'
                        : 'admFiltroSuspensas'
              )}
            </Text>
          </Pressable>
        ))}
      </View>

      {contas.length === 0 ? (
        <Text style={styles.vazio}>{t('admSemResultados')}</Text>
      ) : (
        contas.map((u) => (
          <Pressable
            key={u.id}
            style={styles.conta}
            onPress={() =>
              navigation.navigate('AdminDetalhe', { tipoAlvo: 'utilizador', id: u.id })
            }
          >
            <View style={{ flex: 1 }}>
              <View style={styles.contaLinha}>
                <Text style={styles.contaNome} numberOfLines={1}>
                  {u.nome}
                </Text>
                {u.isAdmin ? <Pastilha texto={t('admPapelAdmin')} estado={ESTADO.neutro} /> : null}
              </View>
              <Text style={styles.contaOculto}>
                {u.online ? ' ' : ''}

                {u.online ? ' •' : ''}
              </Text>
              <Text style={styles.contaMeta}>
                {u.telefone} · {u.driverStatus ? t('admPapelMotorista') : t('admPapelPassageiro')}
                {u.veiculo?.matricula ? ` · ${u.veiculo.matricula}` : ''}
              </Text>
              <Text style={styles.contaMeta}>
                {t('admTripsCount', { n: u.viagensPassageiro + u.viagensMotorista })}
                {u.estrelas ? ` · ⭐ ${Number(u.estrelas).toFixed(1)}` : ''}
              </Text>
            </View>
            <Text style={styles.viagemSeta}>›</Text>
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

// Registo de acessos: quem leu conversas privadas, e quando.
//
// Existe para ser visto, não só escrito. Um registo que ninguém pode
// consultar é o mesmo que não haver registo — serve para dizer que se
// tem auditoria, não para responder a uma pergunta.
function Registo({ acessos, t, navigation, dias, setDias }) {
  // Os filtros ficam FORA do `if` de lista vazia. Se estivessem dentro,
  // escolher "Hoje" num dia sem acessos deixava o ecrã sem forma de voltar
  // a "30 dias" — um beco sem saída construído pelo próprio filtro.
  const periodos = [
    [1, 'admPeriodoHoje'],
    [7, 'admPeriodo7'],
    [30, 'admPeriodo30'],
  ];
  return (
    <>
      <View style={styles.filtros}>
        {periodos.map(([d, chave]) => (
          <Pressable
            key={d}
            onPress={() => setDias(d)}
            style={[styles.filtro, dias === d && styles.filtroActivo]}
          >
            <Text style={[styles.filtroTexto, dias === d && styles.filtroTextoActivo]}>
              {t(chave)}
            </Text>
          </Pressable>
        ))}
      </View>

      {!acessos.length ? (
        <Text style={styles.vazio}>{t('admRegistoVazio')}</Text>
      ) : (
        <>
          <Text style={styles.seccaoTitulo}>{t('admRegistoTitulo')}</Text>
          {acessos.map((a) => (
            <Pressable
              key={a.id}
              style={styles.conta}
              onPress={() =>
                a.alvo
                  ? navigation.navigate('AdminDetalhe', { tipoAlvo: 'viagem', id: a.alvo })
                  : null
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.contaNome}>
                  {a.admin} · {a.que}
                </Text>
                <Text style={styles.contaMeta}>
                  {a.alvo ? `${t('admDetalheViagem')} #${a.alvo} · ` : ''}
                  {new Date(a.quando).toLocaleString(undefined, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {a.alvo ? <Text style={styles.viagemSeta}>›</Text> : null}
            </Pressable>
          ))}
        </>
      )}
    </>
  );
}

// Uma viagem, em cartão. Extraída porque agora aparece em dois sítios —
// nas que estão a decorrer e nas recentes — e um cartão copiado é um
// cartão que passa a divergir do outro à primeira correcção.
function CartaoViagem({ v, t, navigation }) {
  return (
    <Pressable
      key={v.id}
      style={styles.viagem}
      onPress={() => navigation.navigate('AdminDetalhe', { tipoAlvo: 'viagem', id: v.id })}
    >
      <View style={styles.viagemTopo}>
        <Text style={styles.viagemDestino} numberOfLines={1}>
          {v.destino}
        </Text>
        <Text style={styles.viagemPreco}>${v.preco ?? '—'}</Text>
      </View>
      <Text style={styles.viagemMeta}>
        {v.passageiro}
        {v.motorista ? ` → ${v.motorista}` : ' → —'}
        {v.km ? ` · ${v.km} km` : ''}
      </Text>
      <View style={styles.viagemLinha}>
        <Text
          style={[
            styles.viagemEstado,
            v.estado === 'completed' && styles.estadoOk,
            v.estado === 'cancelled' && styles.estadoMau,
          ]}
        >
          {t(
            v.estado === 'completed'
              ? 'statusCompleted'
              : v.estado === 'cancelled'
                ? 'statusCancelled'
                : v.estado === 'in_progress'
                  ? 'statusInProgress'
                  : v.estado === 'requested'
                    ? 'statusRequested'
                    : 'statusAccepted'
          )}
        </Text>
        {v.motivoCancelamento ? (
          <Text style={styles.viagemMotivo}>{t(`cancelReason_${v.motivoCancelamento}`)}</Text>
        ) : null}
      </View>
      <Text style={styles.viagemSeta}>›</Text>
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

  if (!viagens.length) return <Text style={styles.vazio}>{t('admNoRides')}</Text>;

  return (
    <>
      <Bloco titulo={t('admResumoViagens')}>
        <View style={styles.numeros}>
          <Metrica valor={viagens.length} etiqueta={t('admTotalViagens')} />
          <Metrica
            valor={activas.length}
            etiqueta={t('admEmAndamento')}
            estado={activas.length > 0 ? ESTADO.bom : ESTADO.neutro}
          />
          <Metrica valor={concluidas.length} etiqueta={t('admConcluidas')} />
          <Metrica
            valor={canceladas.length}
            etiqueta={t('admCanceladas24h')}
            estado={canceladas.length > 0 ? ESTADO.aviso : ESTADO.neutro}
          />
          <Metrica
            valor={`${'$'}${tarifas.toFixed(2)}`}
            etiqueta={t('admTarifas24h')}
            nota={t('admTarifasNota')}
          />
        </View>
      </Bloco>

      {/* As que estão a decorrer vêm primeiro e separadas. É a única parte
          desta secção onde ainda se pode agir: quando uma viagem já
          terminou, ler sobre ela é história. */}
      <Text style={styles.seccaoTitulo}>{t('admViagensActivas')}</Text>
      {activas.length === 0 ? (
        <Text style={styles.vazio}>{t('admSemViagensActivas')}</Text>
      ) : (
        activas.map((v) => <CartaoViagem key={v.id} v={v} t={t} navigation={navigation} />)
      )}

      <Text style={styles.seccaoTitulo}>{t('admViagensRecentes')}</Text>
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
    sino: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
    sinoIcone: { fontSize: 20 },
    // Contador, não pastilha decorativa: o número é a informação, e por
    // isso tem de se ler mesmo em cima do ícone.
    sinoConta: {
      position: 'absolute',
      top: -2,
      right: -4,
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

    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    titulo: { ...tipo.titulo, color: colors.text },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },

    // Uma linha fina por baixo de toda a fila: é contra ela que o
    // sublinhado do separador activo se lê como indicador, e não como um
    // traço solto no meio do ecrã.
    barraAbas: {
      marginTop: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    // Intervalo mais curto: com cinco separadores, 24 px entre cada um
    // empurrava dois para fora do ecrã sem necessidade.
    abas: { paddingHorizontal: spacing.lg, gap: spacing.md },
    // A barra existe sempre, transparente quando inactiva, para o texto
    // não saltar um pixel ao mudar de secção.
    abaBarra: {
      height: 3,
      alignSelf: 'stretch',
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      marginTop: spacing.sm,
      backgroundColor: 'transparent',
    },
    abaBarraActiva: { backgroundColor: colors.teal },
    aba: { paddingTop: spacing.sm, alignItems: 'center' },
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

    par: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

    seccaoTitulo: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    caixa: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden' },
    linhaSimples: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    linhaNome: { ...tipo.pequeno, color: colors.text, flex: 1 },
    linhaValor: { ...tipo.corpoForte, color: colors.text },
    linhaValorMau: { ...tipo.corpoForte, color: colors.danger },

    filtros: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
    filtro: {
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
    },
    filtroActivo: { backgroundColor: colors.teal },
    filtroTexto: { ...tipo.legenda, color: colors.textMuted },
    filtroTextoActivo: { color: colors.onTeal },

    busca: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...tipo.corpo,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    conta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    contaLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    contaOculto: { height: 0, opacity: 0 },
    docAviso: { position: 'absolute', top: 4, left: 4 },
    contaNome: { ...tipo.corpoForte, color: colors.text },
    contaMeta: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    contaMorada: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    viagemSeta: { fontSize: 22, color: colors.textMuted },
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
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cabecalhoMotorista: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    nomeLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    seta: { fontSize: 20, color: colors.textMuted },
    nome: { ...tipo.subtitulo, color: colors.text },
    meta: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    estado: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    estadoOk: { color: colors.success },
    estadoMau: { color: colors.danger },
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
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    viagemTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    viagemDestino: { ...tipo.corpoForte, flex: 1, color: colors.text },
    viagemPreco: { ...tipo.corpoForte, color: colors.teal },
    viagemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    viagemLinha: { flexDirection: 'row', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
    viagemEstado: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    viagemMotivo: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },

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
  if (!lugares.length) return <Text style={styles.vazio}>{t('admLugaresVazio')}</Text>;
  return (
    <>
      <Text style={styles.seccaoTitulo}>{t('admLugaresTitulo')}</Text>
      {lugares.map((l) => (
        <View key={l.id} style={styles.conta}>
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
