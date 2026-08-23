import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button.js';
import Voltar from '../components/Voltar.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { getApiUrl } from '../serverUrl.js';
import { abrirNoMapa } from '../lib/mapaLink.js';

// Painel de quem gere o serviço.
//
// Três secções, porque as perguntas são três e não se misturam: "está tudo
// bem?" (resumo), "quem conduz?" (motoristas) e "o que se passou?"
// (viagens). Um ecrã único com tudo obrigava a percorrer motoristas para
// chegar a um alerta de emergência.
const SECCOES = ['resumo', 'motoristas', 'viagens'];
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
  const [aCarregar, setACarregar] = useState(true);
  // Qual a decisão a pedir motivo, se houver alguma em curso.
  const [pedido, setPedido] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [r, s, d, e] = await Promise.all([
        api.adminResumo(token),
        api.adminSos(token),
        api.adminDrivers(token, filtro),
        api.adminEstatisticas(token, 7),
      ]);
      setResumo(r.resumo);
      setAlertas(s.alertas || []);
      setMotoristas(d.drivers || []);
      setEstat(e);
    } catch (err) {
      Alert.alert(t('errGeneric'), err?.message || '');
    } finally {
      setACarregar(false);
    }
  }, [token, filtro, t]);

  const carregarViagens = useCallback(async () => {
    try {
      const v = await api.adminViagens(token, 24);
      setViagens(v.viagens || []);
    } catch {
      /* fica o que já estava */
    }
  }, [token]);

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
      <SafeAreaView style={styles.centro}>
        <ActivityIndicator color={colors.teal} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ecra} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topo}>
        <Voltar navigation={navigation} />
        <Text style={styles.titulo}>{t('adminTitle')}</Text>
        <View style={{ width: 60 }} />
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

      <View style={styles.abas}>
        {SECCOES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSeccao(s)}
            style={[styles.aba, seccao === s && styles.abaActiva]}
          >
            <Text style={[styles.abaTexto, seccao === s && styles.abaTextoActivo]}>
              {t(s === 'resumo' ? 'admSecResumo' : s === 'motoristas' ? 'admSecDrivers' : 'admSecRides')}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={seccao === 'viagens' ? carregarViagens : carregar}
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
                  onAprovar={() => decidir(m, 'approved')}
                  onRecusar={() =>
                    setPedido({ m, decision: 'rejected', titulo: t('adminRejectTitle'), explicacao: t('adminRejectExplain') })
                  }
                  onSuspender={() =>
                    setPedido({ m, decision: 'suspended', titulo: t('admSuspendTitle'), explicacao: t('admSuspendExplain') })
                  }
                />
              ))
            )}
          </>
        ) : (
          <Viagens viagens={viagens} t={t} />
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
    </SafeAreaView>
  );
}

function Alerta({ a, t, onResolver }) {
  const rotulo =
    a.tipo === 'policia'
      ? `🚔 ${t('emgTypePolicia')}`
      : a.tipo === 'medica'
        ? `🚑 ${t('emgTypeMedica')}`
        : a.tipo === 'protecao'
          ? `🚒 ${t('emgTypeProtecao')}`
          : t('emgTypeOutro');
  return (
    <View style={styles.cartaoSos}>
      <Text style={styles.sosTipo}>{rotulo}</Text>
      <Text style={styles.sosNome}>{a.quem}</Text>
      <Text style={styles.sosMeta}>
        {new Date(a.quando).toLocaleString('pt-PT')}
        {a.destino ? ` · ${a.destino}` : ''}
      </Text>
      <View style={styles.linhaAcoes}>
        {a.telefone ? (
          <Pressable style={styles.accaoSos} onPress={() => Linking.openURL(`tel:${a.telefone}`)}>
            <Text style={styles.accaoSosTexto}>📞 {a.telefone}</Text>
          </Pressable>
        ) : null}
        {a.lat != null && a.lng != null ? (
          <Pressable style={styles.accaoSos} onPress={() => abrirNoMapa(Linking, a.lat, a.lng)}>
            <Text style={styles.accaoSosTexto}>🗺 {t('adminSosMap')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={onResolver}>
        <Text style={styles.resolver}>✓ {t('adminSosResolve')}</Text>
      </Pressable>
    </View>
  );
}

function Resumo({ resumo, estat, t }) {
  const seg = estat?.segundosAteAceitar;
  return (
    <>
      <View style={styles.numeros}>
        <Numero valor={resumo?.aprovados} etiqueta={t('adminDrivers')} />
        <Numero valor={resumo?.disponiveis} etiqueta={t('adminOnline')} destaque />
        <Numero valor={resumo?.viagens24h} etiqueta={t('adminRides24h')} />
        <Numero valor={resumo?.esperando} etiqueta={t('adminWaiting')} />
      </View>

      {/* O tempo de espera é o número que decide se o serviço funciona:
          acima de dois ou três minutos, o passageiro desiste e não volta. */}
      <View style={styles.par}>
        <Cartao
          rotulo={t('admWaitTime')}
          valor={seg == null ? '—' : seg < 120 ? t('admSeconds', { n: seg }) : t('admMinutes', { n: Math.round(seg / 60) })}
          mau={seg != null && seg > 180}
        />
        <Cartao rotulo={t('admNoAnswer')} valor={String(estat?.semResposta ?? 0)} mau={(estat?.semResposta ?? 0) > 0} />
      </View>

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

function Motorista({ m, t, token, onAprovar, onRecusar, onSuspender }) {
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
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>
            {m.online ? '🟢 ' : ''}
            {m.name}
          </Text>
          <Text style={styles.meta}>
            {m.phone} · {m.vehicle?.type === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar')}
            {m.vehicle?.plate ? ` · ${m.vehicle.plate}` : ''}
          </Text>
        </View>
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
          <Text style={[styles.facto, styles.factoMau]}>{t('admCancelled', { n: m.cancelou })}</Text>
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
              <Image
                source={{
                  uri: `${getApiUrl()}/admin/documents/${d.id}`,
                  headers: { Authorization: `Bearer ${token}` },
                }}
                style={styles.doc}
              />
              {d.expirado ? <Text style={styles.docMau}>⚠</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.semDocs}>⚠ {t('adminNoDocs')}</Text>
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

function Viagens({ viagens, t }) {
  if (!viagens.length) return <Text style={styles.vazio}>{t('admNoRides')}</Text>;
  return (
    <>
      <Text style={styles.seccaoTitulo}>{t('admLast24h')}</Text>
      {viagens.map((v) => (
        <View key={v.id} style={styles.viagem}>
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
        </View>
      ))}
    </>
  );
}

// Painel de motivo. Existe porque o Alert.prompt do sistema só funciona no
// iPhone — no Android não há forma de escrever num alerta.
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

function Numero({ valor, etiqueta, destaque }) {
  return (
    <View style={styles.numero}>
      <Text style={[styles.numeroValor, destaque && { color: colors.coral }]}>{valor ?? '–'}</Text>
      <Text style={styles.numeroEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Cartao({ rotulo, valor, mau }) {
  return (
    <View style={styles.cartaoNumero}>
      <Text style={styles.cartaoRotulo}>{rotulo}</Text>
      <Text style={[styles.cartaoValor, mau && styles.estadoMau]}>{valor}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    ecra: { flex: 1, backgroundColor: colors.paper },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    titulo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },

    abas: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
    aba: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      alignItems: 'center',
    },
    abaActiva: { backgroundColor: colors.teal },
    abaTexto: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted },
    abaTextoActivo: { color: colors.onTeal },

    blocoSos: {
      backgroundColor: '#FDECEA',
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.lg,
      padding: spacing.sm,
      borderWidth: 2,
      borderColor: colors.danger,
    },
    cartaoSos: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs },
    sosTipo: { fontWeight: '800', color: colors.danger, fontSize: fontSize.sm },
    sosNome: { fontWeight: '700', color: colors.text, fontSize: fontSize.md, marginTop: 2 },
    sosMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    linhaAcoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
    accaoSos: {
      backgroundColor: colors.danger,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
    },
    accaoSosTexto: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
    resolver: { color: colors.teal, fontWeight: '700', marginTop: spacing.sm, fontSize: fontSize.sm },

    numeros: { flexDirection: 'row', gap: spacing.sm },
    numero: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    numeroValor: { fontSize: fontSize.xl, fontWeight: '800', color: colors.teal },
    numeroEtiqueta: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

    par: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    cartaoNumero: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
    cartaoRotulo: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
    cartaoValor: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: 2 },

    seccaoTitulo: {
      fontSize: fontSize.xs,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
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
    linhaNome: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
    linhaValor: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
    linhaValorMau: { fontSize: fontSize.sm, fontWeight: '800', color: colors.danger },

    filtros: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
    filtro: {
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
    },
    filtroActivo: { backgroundColor: colors.teal },
    filtroTexto: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted },
    filtroTextoActivo: { color: colors.onTeal },

    vazio: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
    cartao: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    cabecalhoMotorista: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    nome: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    meta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    estado: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    estadoOk: { color: colors.success },
    estadoMau: { color: colors.danger },
    factos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    facto: { fontSize: 11, color: colors.textMuted },
    factoMau: { color: colors.danger, fontWeight: '700' },
    motivo: { fontSize: fontSize.xs, color: colors.danger, fontStyle: 'italic', marginTop: spacing.sm },
    docs: { marginTop: spacing.md },
    doc: { width: 84, height: 84, borderRadius: radius.sm, marginRight: spacing.sm, backgroundColor: colors.border },
    docMau: { position: 'absolute', top: 2, right: 10, fontSize: 16 },
    semDocs: { marginTop: spacing.sm, color: colors.danger, fontSize: fontSize.xs },
    botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    metade: { flex: 1 },

    viagem: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
    viagemTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    viagemDestino: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    viagemPreco: { fontSize: fontSize.sm, fontWeight: '800', color: colors.teal },
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
    motivoTitulo: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
    motivoExplica: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
    motivoCampo: {
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
      minHeight: 74,
      color: colors.text,
      fontSize: fontSize.md,
      textAlignVertical: 'top',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
