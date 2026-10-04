import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraTopo from '../components/BarraTopo.js';
import PlanoAtividade from '../components/PlanoAtividade.js';
import GraficoGanhos from '../components/GraficoGanhos.js';
import DetalheDoDia from '../components/DetalheDoDia.js';
import EscolherPeriodo from '../components/EscolherPeriodo.js';
import Chip, { FilaChips } from '../design/Chip.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo, FAMILIAS } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paraMostrar } from '../lib/datas.js';
import {
  contagem,
  diaDaSemana,
  diaMes,
  horasMinutos,
  hojeEmDili,
  periodoDoFiltro,
} from '../lib/periodos.js';

// Quanto o motorista fez. O dinheiro nunca passa por nós — é entregue em
// mão — por isso isto é a soma das viagens concluídas, não um saldo.
//
// "Hoje" vem primeiro e em grande porque é a única pergunta que se faz
// mesmo: valeu a pena o dia? O resto é contexto.
//
// O ECRÃ NOVO (04/10/2026, pedido do Simão): por baixo do dia, o plano de
// atividade; depois o período escolhido (hoje, 7 dias, 30 dias, este mês ou
// à escolha), com o gráfico e a lista dia a dia — que abre o detalhe de cada
// dia. Tudo vem do servidor: os dias de atividade de `dias_contados`, as
// horas de `sessoes_online`. O telemóvel não conta nada.
const FILTROS = ['hoje', '7', '30', 'mes', 'personalizado'];
const DIAS_VISIVEIS = 7;

export default function GanhosScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [g, setG] = useState(null);
  const [plano, setPlano] = useState(null);
  const [aCarregar, setACarregar] = useState(true);
  const [aMudar, setAMudar] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState('7');
  const [personalizado, setPersonalizado] = useState(null);
  const [escolherDatas, setEscolherDatas] = useState(false);
  const [todos, setTodos] = useState(false);
  const [diaAberto, setDiaAberto] = useState(null);

  const hoje = hojeEmDili();
  const periodo = useMemo(
    () => periodoDoFiltro(filtro, hoje, personalizado),
    [filtro, hoje, personalizado]
  );

  const carregar = useCallback(async () => {
    try {
      const r = await api.ganhos(token, periodo);
      setG(r.ganhos);
      setPlano(r.plano || null);
      setErro(null);
    } catch (e) {
      // Mantém o que já estava; a rede volta.
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : t('errGeneric'));
    } finally {
      setACarregar(false);
      setAMudar(false);
    }
  }, [token, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAMudar(true);
    setTodos(false);
    carregar();
  }, [carregar]);
  useEffect(() => navigation.addListener('focus', carregar), [navigation, carregar]);

  const escolherFiltro = (f) => {
    if (f === 'personalizado') return setEscolherDatas(true);
    setFiltro(f);
  };

  // Antes do primeiro registo de horas, não se sabe — e «0h» seria mentir.
  const semHoras = (dia) => !g?.onlineDesde || dia < g.onlineDesde;
  const p = g?.periodo;
  const media = (valor, n) => (n > 0 ? `$${(valor / n).toFixed(2)}` : '—');
  const dias = g?.porDia || [];
  const visiveis = todos ? dias : dias.slice(0, DIAS_VISIVEIS);
  const nomesDia = t('semanaCurtaDomingo').split(',');

  const rotuloPeriodo =
    filtro === 'personalizado' && personalizado
      ? `${paraMostrar(personalizado.de)} – ${paraMostrar(personalizado.ate)}`
      : filtro === '7'
        ? t('earningsWeek')
        : filtro === '30'
          ? t('ganhosUltimos30')
          : t(`ganhosFiltro_${filtro}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <BarraTopo navigation={navigation} titulo={t('tabEarnings')} />

      {aCarregar ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.conteudo}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={carregar} tintColor={colors.teal} />
          }
        >
          {erro && !g ? <Text style={styles.erro}>{erro}</Text> : null}

          {/* ── 1. HOJE ─────────────────────────────────────────────── */}
          <View style={styles.hoje}>
            <Text style={styles.hojeRotulo}>{t('earningsToday')}</Text>
            <Text style={styles.hojeValor}>${(g?.hoje ?? 0).toFixed(2)}</Text>
            <Text style={styles.hojeViagens}>
              {contagem(t, g?.viagensHoje ?? 0, 'ganhosUmaViagem', 'earningsTrips')}
            </Text>
            <View style={styles.hojeNumeros}>
              <NumeroHoje rotulo={t('ganhosViagensHoje')} valor={String(g?.viagensHoje ?? 0)} />
              <NumeroHoje
                rotulo={t('ganhosHorasOnline')}
                valor={semHoras(hoje) ? '—' : horasMinutos(g?.minutosOnlineHoje ?? 0)}
              />
              <NumeroHoje
                rotulo={t('ganhosMediaViagem')}
                valor={media(g?.hoje ?? 0, g?.viagensHoje ?? 0)}
              />
            </View>
          </View>

          {/* ── 2. PLANO DE ATIVIDADE ───────────────────────────────── */}
          <PlanoAtividade plano={plano} diasContados={g?.diasTotal} navigation={navigation} />

          {/* ── 3. O PERÍODO ────────────────────────────────────────── */}
          <Text style={styles.seccao}>{t('ganhosPeriodo')}</Text>
          <FilaChips>
            {FILTROS.map((f) => (
              <Chip
                key={f}
                texto={t(`ganhosFiltro_${f}`)}
                activo={filtro === f}
                onPress={() => escolherFiltro(f)}
              />
            ))}
          </FilaChips>

          <View style={[styles.cartao, aMudar && styles.aMudar]}>
            <View style={styles.periodoTopo}>
              <Text style={styles.periodoNome} numberOfLines={2}>
                {rotuloPeriodo}
              </Text>
              {aMudar ? <ActivityIndicator color={colors.teal} size="small" /> : null}
            </View>
            <Text style={styles.periodoValor}>${(p?.valor ?? 0).toFixed(2)}</Text>
            <View style={styles.grelha}>
              <Numero rotulo={t('ganhosViagens')} valor={String(p?.viagens ?? 0)} />
              <Numero rotulo={t('ganhosDiasDeAtividade')} valor={String(p?.dias ?? 0)} />
              <Numero
                rotulo={t('ganhosMediaViagem')}
                valor={media(p?.valor ?? 0, p?.viagens ?? 0)}
              />
              <Numero rotulo={t('ganhosMediaDia')} valor={media(p?.valor ?? 0, p?.dias ?? 0)} />
            </View>
          </View>

          {/* ── 4. OS CARTÕES FIXOS ─────────────────────────────────── */}
          <View style={styles.par}>
            <Cartao
              rotulo={t('earningsWeek')}
              valor={g?.semana}
              viagens={g?.viagensSemana}
              dias={g?.diasSemana}
              t={t}
            />
            <Cartao
              rotulo={t('earningsTotal')}
              valor={g?.total}
              viagens={g?.viagensTotal}
              dias={g?.diasTotal}
              t={t}
            />
          </View>

          {/* ── 5. O GRÁFICO ────────────────────────────────────────── */}
          <Text style={styles.seccao}>{t('ganhosGrafico')}</Text>
          <GraficoGanhos porDia={dias} />

          {/* ── 6. POR DIA ──────────────────────────────────────────── */}
          <Text style={styles.seccao}>{t('earningsLastDays')}</Text>
          {dias.length ? (
            <View style={styles.lista}>
              {visiveis.map((d, i) => (
                <Pressable
                  key={d.dia}
                  onPress={() => setDiaAberto(d.dia)}
                  style={({ pressed }) => [
                    styles.dia,
                    i === visiveis.length - 1 && styles.diaUltimo,
                    pressed && styles.premido,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${paraMostrar(d.dia)}: $${d.valor.toFixed(2)}`}
                >
                  <View style={[styles.marca, d.conta && styles.marcaConta]} />
                  <View style={styles.diaData}>
                    <Text style={styles.diaDataTexto} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {diaMes(d.dia)}
                    </Text>
                    <Text style={styles.diaSemana}>{nomesDia[diaDaSemana(d.dia)]}</Text>
                  </View>
                  <View style={styles.diaMeio}>
                    <Text style={[styles.diaValor, !d.valor && styles.diaValorZero]}>
                      ${d.valor.toFixed(2)}
                    </Text>
                    <Text style={styles.diaViagens}>
                      {contagem(t, d.viagens, 'ganhosUmaViagem', 'earningsTrips')}
                    </Text>
                  </View>
                  <View style={[styles.pastilha, d.conta && styles.pastilhaConta]}>
                    <Text
                      style={[styles.pastilhaTexto, d.conta && styles.pastilhaTextoConta]}
                      numberOfLines={1}
                    >
                      {!d.conta
                        ? t('ganhosNaoConta')
                        : d.gratuito
                          ? t('ganhosContaGratis')
                          : t('ganhosConta')}
                    </Text>
                  </View>
                  <Text style={styles.seta}>›</Text>
                </Pressable>
              ))}
              {dias.length > DIAS_VISIVEIS ? (
                <Pressable
                  onPress={() => setTodos((x) => !x)}
                  style={styles.verTodos}
                  accessibilityRole="button"
                >
                  <Text style={styles.verTodosTexto}>
                    {todos ? t('ganhosVerMenos') : t('ganhosVerTodos', { n: dias.length })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={styles.vazio}>{t('earningsEmpty')}</Text>
          )}

          <Text style={styles.nota}>{t('earningsNote')}</Text>
        </ScrollView>
      )}

      <EscolherPeriodo
        visivel={escolherDatas}
        hoje={hoje}
        inicial={personalizado || periodo}
        aoFechar={() => setEscolherDatas(false)}
        aoEscolher={(x) => {
          setPersonalizado(x);
          setFiltro('personalizado');
          setEscolherDatas(false);
        }}
      />
      <DetalheDoDia
        dia={diaAberto}
        semHoras={diaAberto ? semHoras(diaAberto) : false}
        aoFechar={() => setDiaAberto(null)}
      />
    </SafeAreaView>
  );
}

function NumeroHoje({ rotulo, valor }) {
  return (
    <View style={styles.hojeNumero}>
      <Text style={styles.hojeNumeroValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={styles.hojeNumeroRotulo} numberOfLines={2}>
        {rotulo}
      </Text>
    </View>
  );
}

function Numero({ rotulo, valor }) {
  return (
    <View style={styles.numero}>
      <Text style={styles.numeroValor} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={styles.numeroRotulo} numberOfLines={2}>
        {rotulo}
      </Text>
    </View>
  );
}

function Cartao({ rotulo, valor, viagens, dias, t }) {
  return (
    <View style={styles.cartaoPequeno}>
      <Text style={styles.cartaoRotulo} numberOfLines={1}>
        {rotulo}
      </Text>
      <Text style={styles.cartaoValor} numberOfLines={1} adjustsFontSizeToFit>
        ${(valor ?? 0).toFixed(2)}
      </Text>
      <Text style={styles.cartaoViagens}>
        {contagem(t, viagens ?? 0, 'ganhosUmaViagem', 'earningsTrips')}
      </Text>
      <Text style={styles.cartaoViagens}>
        {contagem(t, dias ?? 0, 'ganhosUmDiaAtividade', 'ganhosDiasAtividade')}
      </Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
    erro: { ...tipo.pequeno, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
    hoje: {
      backgroundColor: colors.teal,
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: 'center',
    },
    hojeRotulo: { ...tipo.corpoForte, color: colors.onTeal, opacity: 0.85 },
    hojeValor: {
      color: colors.onTeal,
      fontFamily: FAMILIAS.forte,
      fontSize: 46,
      marginVertical: 2,
      fontVariant: ['tabular-nums'],
    },
    hojeViagens: { ...tipo.pequeno, color: colors.onTeal, opacity: 0.85 },
    hojeNumeros: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.onTeal,
      gap: spacing.xs,
    },
    hojeNumero: { flex: 1, alignItems: 'center' },
    hojeNumeroValor: {
      ...tipo.subtitulo,
      color: colors.onTeal,
      fontVariant: ['tabular-nums'],
    },
    hojeNumeroRotulo: {
      ...tipo.legenda,
      color: colors.onTeal,
      opacity: 0.85,
      textAlign: 'center',
      marginTop: 1,
    },
    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    cartao: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md },
    aMudar: { opacity: 0.6 },
    periodoTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    periodoNome: { ...tipo.corpoForte, color: colors.textMuted, flex: 1 },
    periodoValor: {
      ...tipo.displayPequeno,
      color: colors.text,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    grelha: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, rowGap: spacing.sm },
    numero: { width: '50%', paddingRight: spacing.sm },
    numeroValor: { ...tipo.subtitulo, color: colors.text, fontVariant: ['tabular-nums'] },
    numeroRotulo: { ...tipo.legenda, color: colors.textMuted },
    par: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cartaoPequeno: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      alignItems: 'center',
    },
    cartaoRotulo: { ...tipo.legenda, color: colors.textMuted },
    cartaoValor: {
      ...tipo.titulo,
      color: colors.text,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    cartaoViagens: { ...tipo.legenda, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
    lista: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden' },
    dia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 60,
      paddingRight: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    diaUltimo: { borderBottomWidth: 0 },
    premido: { backgroundColor: colors.paper },
    marca: { width: 4, alignSelf: 'stretch', backgroundColor: colors.border },
    marcaConta: { backgroundColor: colors.teal },
    // Largura para «04/10» na letra do sistema maior (1,3×) sem partir.
    diaData: { minWidth: 58, paddingLeft: spacing.xs },
    diaDataTexto: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    diaSemana: { ...tipo.legenda, color: colors.textMuted },
    diaMeio: { flex: 1, minWidth: 0 },
    diaValor: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    diaValorZero: { color: colors.textMuted },
    diaViagens: { ...tipo.legenda, color: colors.textMuted },
    pastilha: {
      backgroundColor: colors.paper,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      maxWidth: 130,
    },
    pastilhaConta: { backgroundColor: colors.tintaTeal },
    pastilhaTexto: { ...tipo.legenda, color: colors.textMuted },
    pastilhaTextoConta: { color: colors.teal },
    seta: { ...tipo.subtitulo, color: colors.textMuted },
    verTodos: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    verTodosTexto: { ...tipo.corpoForte, color: colors.teal },
    vazio: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    nota: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginTop: spacing.lg,
      lineHeight: 17,
      textAlign: 'center',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
