import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraTopo from '../components/BarraTopo.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// A assinatura, do lado do motorista.
//
// Este ecrã existe sobretudo por uma razão: a lista dos dias contados. O
// saldo sozinho não chega. Quando um motorista disser "vocês tiraram-me um
// dia que eu não trabalhei", o que responde é esta lista, com as datas — e
// tem de estar no telemóvel dele, não numa folha nossa. Uma discussão sobre
// dinheiro resolve-se sempre contra quem não tem registo.
//
// Por isso a regra também está escrita aqui, por extenso. É a mesma frase
// que se diz em voz alta à porta do carro, e é bom que seja exactamente a
// mesma.

// Os bancos são nomes próprios e não se traduzem. Só as duas últimas formas
// — escritório e agente — são descrições, e essas passam pelo dicionário.
const NOMES = {
  mandiri: 'Bank Mandiri',
  bnu: 'BNU',
  bnctl: 'BNCTL',
  bri: 'BRI',
  telemor: 'Telemor',
};

export default function AssinaturaScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [a, setA] = useState(null);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setA(await api.assinatura(token));
    } catch {
      /* mantém o que já estava; a rede em Díli vai e vem */
    } finally {
      setACarregar(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const semSaldo = !a?.gratuito && (a?.dias ?? 0) <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <BarraTopo navigation={navigation} titulo={t('assinTitulo')} />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={carregar} tintColor={colors.teal} />
        }
      >
        {aCarregar && !a ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            {/* Em período gratuito o cartão é verde e diz a data. Depois
                dele, mostra dias — e fica coral quando chegar a zero, que é
                a única altura em que este ecrã precisa de gritar. */}
            <View style={[styles.destaque, semSaldo && styles.destaqueMau]}>
              {a?.gratuito ? (
                <>
                  <Text style={styles.destaqueValor}>
                    {t('assinGratuitaAte', { ate: a.gratuitoAte })}
                  </Text>
                  <Text style={styles.destaqueNota}>{t('assinGratuitaExplica')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.destaqueRotulo}>{t('assinSaldo')}</Text>
                  <Text style={styles.destaqueValor}>
                    {a?.dias ?? 0} {t('assinDias')}
                  </Text>
                  {semSaldo ? <Text style={styles.destaqueNota}>{t('assinSemSaldo')}</Text> : null}
                </>
              )}
            </View>

            <Text style={styles.regra}>{t('assinRegra')}</Text>

            <Text style={styles.seccao}>{t('assinPacotes')}</Text>
            <View style={styles.caixa}>
              {(a?.pacotes ?? []).map((p) => (
                <View key={p.dias} style={styles.linha}>
                  <Text style={styles.linhaTexto}>
                    {p.dias} {t('assinDias')}
                  </Text>
                  <Text style={styles.linhaValor}>${p.usd}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.seccao}>{t('assinComoPagar')}</Text>
            <View style={styles.caixa}>
              {(a?.formasPagamento ?? []).map((f) => (
                <View key={f} style={styles.linha}>
                  <Text style={styles.linhaTexto}>
                    {NOMES[f] ??
                      (f === 'escritorio' ? t('assinNoEscritorio') : t('assinComAgente'))}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.nota}>{t('assinComoPagarNota')}</Text>

            {/* A prova. Cada dia que foi cobrado, com a data. */}
            <Text style={styles.seccao}>{t('assinHistorico')}</Text>
            <View style={styles.caixa}>
              {!a?.diasContados?.length ? (
                <Text style={styles.vazio}>{t('assinSemHistorico')}</Text>
              ) : (
                a.diasContados.map((d) => (
                  <View key={d.dia} style={styles.linha}>
                    <Text style={styles.linhaTexto}>{d.dia}</Text>
                    <Text style={[styles.linhaValor, d.gratuito && styles.gratis]}>
                      {d.gratuito ? t('assinGratis') : `−1 ${t('assinDias')}`}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {a?.carregamentos?.length ? (
              <>
                <Text style={styles.seccao}>{t('assinCarregamentos')}</Text>
                <View style={styles.caixa}>
                  {a.carregamentos.map((c, i) => (
                    <View key={i} style={styles.linha}>
                      <Text style={styles.linhaTexto}>
                        {c.quando}
                        {c.metodo ? ` · ${NOMES[c.metodo] ?? c.metodo}` : ''}
                      </Text>
                      <Text style={styles.linhaValor}>
                        +{c.dias} {t('assinDias')}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },

    destaque: {
      backgroundColor: colors.teal,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    destaqueMau: { backgroundColor: colors.danger },
    destaqueRotulo: { ...tipo.corpoForte, color: colors.onTeal, opacity: 0.85 },
    destaqueValor: { ...tipo.display, color: colors.onTeal, fontVariant: ['tabular-nums'] },
    destaqueNota: { ...tipo.pequeno, color: colors.onTeal, opacity: 0.9 },

    // A regra fica logo a seguir ao número, e não escondida no fundo: quem
    // abre este ecrã preocupado com o saldo é exactamente quem precisa de a
    // ler.
    regra: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.md },

    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    caixa: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    linhaTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    linhaValor: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    gratis: { color: colors.textMuted },
    vazio: { ...tipo.pequeno, color: colors.textMuted, paddingVertical: spacing.md },
    nota: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
