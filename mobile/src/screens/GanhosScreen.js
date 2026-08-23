import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import BarraTopo from '../components/BarraTopo.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Quanto o motorista fez. O dinheiro nunca passa por nós — é entregue em
// mão — por isso isto é a soma das viagens concluídas, não um saldo.
//
// "Hoje" vem primeiro e em grande porque é a única pergunta que se faz
// mesmo: valeu a pena o dia? O resto é contexto.
export default function GanhosScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [g, setG] = useState(null);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const r = await api.ganhos(token);
      setG(r.ganhos);
    } catch {
      /* mantém o que já estava; a rede volta */
    } finally {
      setACarregar(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
    return navigation.addListener('focus', carregar);
  }, [carregar, navigation]);

  const maximo = Math.max(1, ...(g?.dias || []).map((d) => d.valor));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
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
          <View style={styles.hoje}>
            <Text style={styles.hojeRotulo}>{t('earningsToday')}</Text>
            <Text style={styles.hojeValor}>${(g?.hoje ?? 0).toFixed(2)}</Text>
            <Text style={styles.hojeViagens}>
              {t('earningsTrips', { n: g?.viagensHoje ?? 0 })}
            </Text>
          </View>

          <View style={styles.par}>
            <Cartao rotulo={t('earningsWeek')} valor={g?.semana} viagens={g?.viagensSemana} t={t} />
            <Cartao rotulo={t('earningsTotal')} valor={g?.total} viagens={g?.viagensTotal} t={t} />
          </View>

          <Text style={styles.seccao}>{t('earningsLastDays')}</Text>
          {g?.dias?.length ? (
            <View style={styles.caixa}>
              {g.dias.map((d) => (
                <View key={d.dia} style={styles.dia}>
                  <Text style={styles.diaData}>{formatarDia(d.dia)}</Text>
                  {/* Barra proporcional ao melhor dia: compara-se um dia
                      com os outros, não com um valor abstracto. */}
                  <View style={styles.barraFundo}>
                    <View style={[styles.barra, { width: `${(d.valor / maximo) * 100}%` }]} />
                  </View>
                  <Text style={styles.diaValor}>${d.valor.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.vazio}>{t('earningsEmpty')}</Text>
          )}

          <Text style={styles.nota}>{t('earningsNote')}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Cartao({ rotulo, valor, viagens, t }) {
  return (
    <View style={styles.cartao}>
      <Text style={styles.cartaoRotulo}>{rotulo}</Text>
      <Text style={styles.cartaoValor}>${(valor ?? 0).toFixed(2)}</Text>
      <Text style={styles.cartaoViagens}>{t('earningsTrips', { n: viagens ?? 0 })}</Text>
    </View>
  );
}

// A data vem como 'AAAA-MM-DD' sem fuso, de propósito. Partir a string
// evita que o telemóvel a interprete como instante e mude o dia.
function formatarDia(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const criarEstilos = () =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hoje: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  hojeRotulo: { color: colors.onTeal, fontSize: fontSize.sm, opacity: 0.85, fontWeight: '600' },
  hojeValor: {
    color: colors.onTeal,
    fontSize: 46,
    fontWeight: '800',
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  hojeViagens: { color: colors.onTeal, fontSize: fontSize.sm, opacity: 0.85 },
  par: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cartao: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cartaoRotulo: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '700' },
  cartaoValor: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  cartaoViagens: { fontSize: 11, color: colors.textMuted },
  seccao: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  caixa: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
  dia: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  diaData: {
    width: 44,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  barraFundo: { flex: 1, height: 10, backgroundColor: colors.paper, borderRadius: 5 },
  barra: { height: 10, backgroundColor: colors.coral, borderRadius: 5 },
  diaValor: {
    width: 62,
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  vazio: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  nota: {
    fontSize: fontSize.xs,
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
