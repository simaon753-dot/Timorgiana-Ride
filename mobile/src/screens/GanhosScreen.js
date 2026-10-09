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
import Chip from '../design/Chip.js';
import Icone from '../design/Icone.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
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
//
// COMPACTO COMO NA IMAGEM DO SIMÃO (05/10/2026): hoje numa linha com três
// números ao lado, o plano em tinta teal, as pastilhas numa linha, quatro
// números dois a dois, o gráfico com o valor por cima das barras, o melhor
// dia e a lista em tabela. Letra nunca abaixo de 10–11 pt: o resto desliza.
const FILTROS = ['hoje', '7', '30', 'mes', 'personalizado'];
const DIAS_VISIVEIS = 7;

export default function GanhosScreen({ navigation }) {
  const { t } = useI18n();
  const { token, user } = useAuth();
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

  // O MELHOR DIA do período (05/10/2026, da imagem do Simão). Só com ganhos:
  // num período a zero não há melhor dia, e «$0.00» como recorde seria triste.
  const melhor = dias.reduce((m, d) => (d.valor > (m?.valor ?? 0) ? d : m), null);
  const maxDia = Math.max(1, ...visiveis.map((d) => d.valor));
  const iconeVeiculo = VEICULOS[user?.vehicle?.type]?.icone || 'carro';

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

          {/* ── 1. HOJE: o dinheiro à esquerda, três números ao lado ── */}
          <View style={styles.hoje}>
            <View style={styles.hojeEsquerda}>
              <Text
                style={styles.hojeRotulo}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.2}
              >
                {t('earningsToday')}
              </Text>
              <Text
                style={styles.hojeValor}
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.2}
              >
                ${(g?.hoje ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.hojeViagens} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {contagem(t, g?.viagensHoje ?? 0, 'ganhosUmaViagem', 'earningsTrips')}
              </Text>
            </View>
            <ColunaHoje
              icone={iconeVeiculo}
              rotulo={t('ganhosViagensHoje')}
              valor={String(g?.viagensHoje ?? 0)}
            />
            <ColunaHoje
              icone="relogio"
              rotulo={t('ganhosHorasOnline')}
              valor={semHoras(hoje) ? '—' : horasMinutos(g?.minutosOnlineHoje ?? 0)}
            />
            <ColunaHoje
              icone="grafico"
              rotulo={t('ganhosMediaViagem')}
              valor={media(g?.hoje ?? 0, g?.viagensHoje ?? 0)}
            />
          </View>

          {/* ── 2. PLANO DE ATIVIDADE ───────────────────────────────── */}
          <PlanoAtividade plano={plano} diasContados={g?.diasTotal} navigation={navigation} />

          {/* ── 3. O PERÍODO: as pastilhas numa linha só, que desliza ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtros}
            contentContainerStyle={styles.filtrosDentro}
          >
            {FILTROS.map((f) => (
              <Chip
                key={f}
                icone={f === 'personalizado' ? 'calendario' : undefined}
                texto={
                  f === 'personalizado' && filtro === 'personalizado' && personalizado
                    ? rotuloPeriodo
                    : t(`ganhosFiltro_${f}`)
                }
                activo={filtro === f}
                onPress={() => escolherFiltro(f)}
              />
            ))}
          </ScrollView>

          {/* ── 4. QUATRO NÚMEROS, dois a dois ──────────────────────── */}
          <View style={[styles.grelha, aMudar && styles.aMudar]}>
            <CartaoNumero
              icone="moedas"
              valor={`$${(p?.valor ?? 0).toFixed(2)}`}
              rotulo={rotuloPeriodo}
              notas={[
                contagem(t, p?.viagens ?? 0, 'ganhosUmaViagem', 'earningsTrips'),
                contagem(t, p?.dias ?? 0, 'ganhosUmDiaAtividade', 'ganhosDiasAtividade'),
              ]}
            />
            <CartaoNumero
              icone="calendario"
              valor={`$${(g?.total ?? 0).toFixed(2)}`}
              rotulo={t('earningsTotal')}
              notas={[
                contagem(t, g?.viagensTotal ?? 0, 'ganhosUmaViagem', 'earningsTrips'),
                contagem(t, g?.diasTotal ?? 0, 'ganhosUmDiaAtividade', 'ganhosDiasAtividade'),
              ]}
            />
            <CartaoNumero
              icone="grafico"
              valor={media(p?.valor ?? 0, p?.dias ?? 0)}
              rotulo={t('ganhosMediaDia')}
              notas={[rotuloPeriodo]}
            />
            <CartaoNumero
              icone="rota"
              valor={media(p?.valor ?? 0, p?.viagens ?? 0)}
              rotulo={t('ganhosMediaViagem')}
              notas={[rotuloPeriodo]}
            />
          </View>
          {aMudar ? (
            <ActivityIndicator color={colors.teal} size="small" style={styles.aMudarRoda} />
          ) : null}

          {/* ── 5. O GRÁFICO, com o valor por cima de cada barra ────── */}
          <View style={styles.espaco} />
          <GraficoGanhos porDia={dias} />

          {/* ── 6. O MELHOR DIA ─────────────────────────────────────── */}
          {melhor ? (
            <Pressable
              onPress={() => setDiaAberto(melhor.dia)}
              style={({ pressed }) => [styles.melhor, pressed && styles.premido]}
              accessibilityRole="button"
            >
              <Icone nome="coroa" tamanho={26} cor={colors.coralDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.melhorRotulo} maxFontSizeMultiplier={1.2}>
                  {t('ganhosMelhorDia')}
                </Text>
                <Text style={styles.melhorDia} maxFontSizeMultiplier={1.2}>
                  {nomesDia[diaDaSemana(melhor.dia)]}, {diaMes(melhor.dia)} ·{' '}
                  {contagem(t, melhor.viagens, 'ganhosUmaViagem', 'earningsTrips')}
                </Text>
              </View>
              <Text style={styles.melhorValor} maxFontSizeMultiplier={1.2}>
                ${melhor.valor.toFixed(2)}
              </Text>
            </Pressable>
          ) : null}

          {/* ── 7. POR DIA, em tabela ───────────────────────────────── */}
          <View style={styles.seccaoTopo}>
            <Text style={styles.seccao}>{t('earningsLastDays')}</Text>
            {dias.length > DIAS_VISIVEIS ? (
              <Pressable
                onPress={() => setTodos((x) => !x)}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={styles.verTodos}>
                  {todos ? t('ganhosVerMenos') : t('ganhosVerTodos', { n: dias.length })} ›
                </Text>
              </Pressable>
            ) : null}
          </View>
          {dias.length ? (
            <View style={styles.tabela}>
              <View style={styles.cabecalho}>
                <Text style={[styles.cab, styles.colData]} maxFontSizeMultiplier={1.2}>
                  {t('ganhosColData')}
                </Text>
                <Text style={[styles.cab, styles.colGanhos]} maxFontSizeMultiplier={1.2}>
                  {t('tabEarnings')}
                </Text>
                <Text
                  style={[styles.cab, styles.colViagens]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('ganhosColViagens')}
                </Text>
                <Text
                  style={[styles.cab, styles.colDia]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('ganhosDiaAtividade')}
                </Text>
              </View>
              {visiveis.map((d, i) => (
                <Pressable
                  key={d.dia}
                  onPress={() => setDiaAberto(d.dia)}
                  style={({ pressed }) => [
                    styles.linha,
                    i === visiveis.length - 1 && styles.linhaUltima,
                    pressed && styles.premido,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${paraMostrar(d.dia)}: $${d.valor.toFixed(2)}`}
                >
                  <View style={[styles.colData, styles.data]}>
                    <Text style={styles.dataTexto} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {diaMes(d.dia)}
                    </Text>
                    <Text style={styles.semana} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {nomesDia[diaDaSemana(d.dia)]}
                    </Text>
                  </View>
                  <View style={styles.colGanhos}>
                    <Text
                      style={[styles.valor, !d.valor && styles.valorZero]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      ${d.valor.toFixed(2)}
                    </Text>
                    {/* A barra pequena compara o dia com os outros da lista. */}
                    <View style={styles.miniFundo}>
                      <View style={[styles.mini, { width: `${(d.valor / maxDia) * 100}%` }]} />
                    </View>
                  </View>
                  <Text style={[styles.colViagens, styles.viagens]} maxFontSizeMultiplier={1.2}>
                    {d.viagens}
                  </Text>
                  <View style={[styles.colDia, styles.estado]}>
                    <View style={[styles.ponto, d.conta && styles.pontoConta]} />
                    <Text
                      style={[styles.estadoTexto, d.conta && styles.estadoTextoConta]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
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
            </View>
          ) : (
            <Text style={styles.vazio}>{t('earningsEmpty')}</Text>
          )}

          {/* ── 8. QUEM RECEBE O DINHEIRO ───────────────────────────── */}
          <View style={styles.nota}>
            <Icone nome="info" tamanho={20} cor={colors.teal} />
            <Text style={styles.notaTexto}>{t('earningsNote')}</Text>
          </View>
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

// Uma coluna do cartão de hoje: ícone, rótulo curto, número.
function ColunaHoje({ icone, rotulo, valor }) {
  return (
    <View style={styles.coluna}>
      <Icone nome={icone} tamanho={22} cor={colors.onTeal} />
      <Text style={styles.colunaRotulo} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {rotulo}
      </Text>
      <Text
        style={styles.colunaValor}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.15}
      >
        {valor}
      </Text>
    </View>
  );
}

// Um dos quatro números: ícone sozinho (sem disco por trás, como o Simão
// pediu para os ícones), o valor, o que é, e o contexto.
function CartaoNumero({ icone, valor, rotulo, notas = [] }) {
  return (
    <View style={styles.numero}>
      <Icone nome={icone} tamanho={22} cor={colors.teal} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={styles.numeroValor}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {valor}
        </Text>
        <Text style={styles.numeroRotulo} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {rotulo}
        </Text>
        {notas.map((n) => (
          <Text key={n} style={styles.numeroNota} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {n}
          </Text>
        ))}
      </View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    // Margem de 16 e não de 24 (a do sistema): neste ecrã cada ponto de
    // largura é uma coluna da tabela, e a imagem do Simão é assim.
    conteudo: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    erro: { ...tipo.pequeno, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },

    hoje: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.teal,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    hojeEsquerda: { flex: 1.45, alignItems: 'center', paddingHorizontal: spacing.xs },
    hojeRotulo: { ...tipo.corpoForte, fontSize: 14, color: colors.onTeal },
    hojeValor: {
      fontFamily: FAMILIAS.forte,
      fontSize: 28,
      color: colors.onTeal,
      fontVariant: ['tabular-nums'],
    },
    hojeViagens: { ...tipo.legenda, color: colors.onTeal, opacity: 0.9 },
    coluna: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 3,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.onTeal,
    },
    colunaRotulo: {
      ...tipo.legenda,
      fontSize: 11,
      lineHeight: 14,
      color: colors.onTeal,
      opacity: 0.9,
      textAlign: 'center',
    },
    colunaValor: {
      fontFamily: FAMILIAS.forte,
      fontSize: 17,
      color: colors.onTeal,
      fontVariant: ['tabular-nums'],
    },

    filtros: { marginTop: spacing.sm, marginHorizontal: -spacing.md },
    filtrosDentro: { gap: spacing.xs, paddingHorizontal: spacing.md },

    grelha: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    aMudar: { opacity: 0.55 },
    aMudarRoda: { marginTop: -spacing.xl },
    numero: {
      flexGrow: 1,
      flexBasis: '45%',
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.sm + 2,
    },
    numeroValor: {
      fontFamily: FAMILIAS.forte,
      fontSize: 18,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    numeroRotulo: { ...tipo.legenda, color: colors.text },
    numeroNota: { ...tipo.legenda, fontSize: 11, lineHeight: 15, color: colors.textMuted },

    espaco: { height: spacing.sm },

    melhor: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      minHeight: 52,
    },
    melhorRotulo: { ...tipo.legenda, color: colors.textMuted },
    melhorDia: { ...tipo.corpoForte, fontSize: 14, color: colors.text },
    melhorValor: {
      fontFamily: FAMILIAS.forte,
      fontSize: 18,
      color: colors.teal,
      fontVariant: ['tabular-nums'],
    },

    seccaoTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    seccao: { ...tipo.subtitulo, color: colors.text },
    verTodos: { ...tipo.corpoForte, fontSize: 14, color: colors.teal },

    tabela: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden' },
    cabecalho: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.paper,
      paddingVertical: 6,
      // Alinhado com as linhas: 4 de margem + 12 = os 16 delas; à direita, o
      // lugar da seta.
      paddingLeft: spacing.md - spacing.xs,
      paddingRight: spacing.sm + 14 - spacing.xs,
      marginHorizontal: spacing.xs,
      marginTop: spacing.xs,
      borderRadius: radius.sm,
    },
    cab: { ...tipo.legenda, fontSize: 11, color: colors.textMuted },
    colData: { width: 52 },
    colGanhos: { flex: 1, minWidth: 0 },
    colViagens: { width: 36, textAlign: 'center' },
    colDia: { width: 114 },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 50,
      paddingVertical: 4,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    linhaUltima: { borderBottomWidth: 0 },
    premido: { backgroundColor: colors.paper },
    // O dia da semana por baixo da data: lado a lado, com a letra do sistema
    // maior, encostava ao valor (visto no simulador a 05/10/2026).
    data: { justifyContent: 'center' },
    dataTexto: {
      ...tipo.corpoForte,
      fontSize: 14,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    semana: { ...tipo.legenda, color: colors.textMuted },
    valor: { ...tipo.corpoForte, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
    valorZero: { color: colors.textMuted },
    miniFundo: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.paper,
      marginTop: 3,
      marginRight: spacing.xs,
      overflow: 'hidden',
    },
    mini: { height: 5, borderRadius: 3, backgroundColor: colors.coral },
    viagens: { ...tipo.pequeno, color: colors.text },
    estado: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    pontoConta: { backgroundColor: colors.teal },
    estadoTexto: { ...tipo.legenda, fontSize: 11, color: colors.textMuted, flexShrink: 1 },
    estadoTextoConta: { color: colors.teal },
    seta: { ...tipo.subtitulo, color: colors.textMuted },
    vazio: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },

    nota: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    notaTexto: { ...tipo.legenda, color: colors.text, lineHeight: 17, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
