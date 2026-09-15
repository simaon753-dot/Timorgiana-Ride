import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import BarraTopo from '../components/BarraTopo.js';
import Button from '../components/Button.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import Aviso from '../design/Aviso.js';
import ImagemProtegida from '../design/ImagemProtegida.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paraMostrar } from '../lib/datas.js';
import { nomeDaForma } from '../dados/formasPagamento.js';

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
//
// CARREGAR DIAS (14/09/26) — a política que os termos descrevem, em três
// passos: o pacote, onde pagar (com a referência pessoal) e o comprovativo.
// O pedido fica à espera até alguém confirmar o pagamento no extracto; os
// dias só existem depois disso. Um pedido de cada vez: enquanto houver um à
// espera, o formulário dá lugar ao cartão desse pedido.

export default function AssinaturaScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [a, setA] = useState(null);
  const [aCarregar, setACarregar] = useState(true);
  const [pacote, setPacote] = useState(null);
  const [forma, setForma] = useState(null);
  const [comprovativo, setComprovativo] = useState(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState(null);

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
  const pendente = a?.pedidos?.find((p) => p.estado === 'pendente') || null;
  const ultimo = a?.pedidos?.[0];
  const recusado = ultimo?.estado === 'recusado' ? ultimo : null;
  const formas = a?.formas ?? [];
  const podeComprar = !!a?.comprasAbertas && !pendente && formas.some((f) => f.comPedido);
  const valor = (a?.pacotes ?? []).find((p) => p.dias === pacote)?.usd;
  const prazo = a?.prazoHoras ?? 24;

  async function escolherComprovativo() {
    setErro(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErro(t('errPermissionPhotos'));
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    const f = res.assets[0];
    setComprovativo({ mime: f.mimeType || 'image/jpeg', base64: f.base64, uri: f.uri });
  }

  async function enviarPedido() {
    if (!pacote || !forma || !comprovativo) return setErro(t('assinFaltaAlgo'));
    setAEnviar(true);
    setErro(null);
    try {
      await api.pedirCarregamento(token, {
        dias: pacote,
        metodo: forma,
        mime: comprovativo.mime,
        base64: comprovativo.base64,
      });
      setPacote(null);
      setForma(null);
      setComprovativo(null);
      Alert.alert(t('assinCarregarTitulo'), t('assinPedidoEnviado', { h: prazo }));
      await carregar();
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAEnviar(false);
    }
  }

  function desistir() {
    Alert.alert(t('assinDesistir'), t('assinDesistirConfirmar'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('assinDesistir'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.cancelarCarregamento(token, pendente.id);
            await carregar();
          } catch (e) {
            Alert.alert(t('errGeneric'), e?.message || '');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <BarraTopo navigation={navigation} titulo={t('assinTitulo')} />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
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

            {/* O pedido à espera vem ANTES de tudo: é a pergunta que traz o
                motorista a este ecrã depois de pagar — "já entrou?". */}
            {pendente ? (
              <View style={styles.espera}>
                <Text style={styles.esperaTitulo}>{t('assinEsperaTitulo')}</Text>
                <Text style={styles.esperaValor}>
                  {pendente.dias} {t('assinDias')} · ${pendente.valorUsd} ·{' '}
                  {nomeDaForma(pendente.metodo, t)}
                </Text>
                <Text style={styles.esperaTexto}>{t('assinEsperaTexto', { h: prazo })}</Text>
                <Button title={t('assinDesistir')} variant="ghost" onPress={desistir} />
              </View>
            ) : null}
            {!pendente && recusado ? (
              <Aviso tipoAviso="erro" texto={t('assinRecusado', { motivo: recusado.motivo })} />
            ) : null}

            <Text style={styles.seccao}>{podeComprar ? t('assinPasso1') : t('assinPacotes')}</Text>
            <View style={styles.caixa}>
              {(a?.pacotes ?? []).map((p) => {
                const escolhido = podeComprar && pacote === p.dias;
                const conteudo = (
                  <>
                    <Text style={[styles.linhaTexto, escolhido && styles.escolhidoTexto]}>
                      {p.dias} {t('assinDias')}
                    </Text>
                    <Text style={[styles.linhaValor, escolhido && styles.escolhidoTexto]}>
                      ${p.usd}
                    </Text>
                  </>
                );
                return podeComprar ? (
                  <Pressable
                    key={p.dias}
                    onPress={() => setPacote(p.dias)}
                    style={[styles.linha, escolhido && styles.escolhido]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: escolhido }}
                  >
                    {conteudo}
                  </Pressable>
                ) : (
                  <View key={p.dias} style={styles.linha}>
                    {conteudo}
                  </View>
                );
              })}
            </View>

            {!a?.comprasAbertas ? (
              <>
                <Text style={styles.seccao}>{t('assinComoPagar')}</Text>
                <Text style={styles.nota}>
                  {t('assinAbremEm', { data: paraMostrar(a?.comprasAbremEm) })}
                </Text>
              </>
            ) : !pendente ? (
              <>
                <Text style={styles.seccao}>{t('assinPasso2')}</Text>
                {!formas.length ? (
                  <Text style={styles.nota}>{t('assinSemFormas')}</Text>
                ) : (
                  formas.map((f) => {
                    const activa = forma === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        disabled={!f.comPedido}
                        onPress={() => setForma(f.id)}
                        style={[styles.forma, activa && styles.formaActiva]}
                        accessibilityRole={f.comPedido ? 'radio' : undefined}
                        accessibilityState={{ selected: activa }}
                      >
                        <View style={styles.formaCabeca}>
                          <Text style={styles.formaNome}>{nomeDaForma(f.id, t)}</Text>
                          {f.comPedido ? (
                            <View style={[styles.radio, activa && styles.radioActivo]} />
                          ) : null}
                        </View>
                        <Text selectable style={styles.formaInstrucoes}>
                          {f.instrucoes}
                        </Text>
                        {/* O QR do banco (15/09/26). O motorista está a olhar
                            para ele no mesmo telemóvel que tem a app do banco:
                            a nota diz como o levar até lá. */}
                        {f.id === 'tuqr' && f.temQr ? (
                          <>
                            <ImagemProtegida
                              caminho="/driver/assinatura/qr"
                              style={styles.qr}
                              resizeMode="contain"
                            />
                            <Text style={styles.nota}>{t('assinQrNota')}</Text>
                          </>
                        ) : null}
                        {!f.comPedido ? (
                          <Text style={styles.nota}>{t('assinNoBalcao')}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })
                )}

                {/* A referência é o que faz o pagamento encontrar-se no
                    extracto. Grande, e seleccionável para copiar. */}
                {podeComprar ? (
                  <View style={styles.referencia}>
                    <Text style={styles.referenciaRotulo}>{t('assinReferenciaRotulo')}</Text>
                    <Text selectable style={styles.referenciaValor}>
                      {a.referencia}
                    </Text>
                    {valor != null ? (
                      <Text style={styles.referenciaRotulo}>
                        {t('assinValorAPagar')}: <Text style={styles.valor}>${valor}</Text>
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {podeComprar ? (
                  <>
                    <Text style={styles.seccao}>{t('assinPasso3')}</Text>
                    {comprovativo ? (
                      <Image
                        source={{ uri: comprovativo.uri }}
                        style={styles.previa}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    ) : null}
                    <Button
                      title={
                        comprovativo ? t('assinTrocarComprovativo') : t('assinEscolherComprovativo')
                      }
                      variant="outline"
                      icone="galeria"
                      onPress={escolherComprovativo}
                    />
                    <Aviso tipoAviso="erro" texto={erro} style={{ marginTop: spacing.sm }} />
                    <View style={{ height: spacing.md }} />
                    <Button
                      title={t('assinEnviarPedido')}
                      variant="marca"
                      tamanho="grande"
                      loading={aEnviar}
                      disabled={!pacote || !forma || !comprovativo}
                      onPress={enviarPedido}
                    />
                  </>
                ) : null}
              </>
            ) : null}

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
                        {c.metodo ? ` · ${nomeDaForma(c.metodo, t)}` : ''}
                      </Text>
                      <Text style={styles.linhaValor}>
                        +{c.dias} {t('assinDias')}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {a?.devolucoes?.length ? (
              <>
                <Text style={styles.seccao}>{t('assinDevolucoes')}</Text>
                <View style={styles.caixa}>
                  {a.devolucoes.map((d, i) => (
                    <View key={i} style={styles.linha}>
                      <Text style={styles.linhaTexto}>
                        {d.quando} · −{d.dias} {t('assinDias')}
                      </Text>
                      <Text style={styles.linhaValor}>${d.valor_usd}</Text>
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

    espera: {
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.xs,
    },
    esperaTitulo: { ...tipo.corpoForte, color: colors.coralDark },
    esperaValor: { ...tipo.corpoForte, color: colors.text },
    esperaTexto: { ...tipo.pequeno, color: colors.text },

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
    escolhido: {
      backgroundColor: colors.tintaTeal,
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
    },
    escolhidoTexto: { color: colors.teal, fontWeight: '700' },
    linhaTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    linhaValor: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    gratis: { color: colors.textMuted },
    vazio: { ...tipo.pequeno, color: colors.textMuted, paddingVertical: spacing.md },
    nota: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },

    forma: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    formaActiva: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    formaCabeca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formaNome: { ...tipo.corpoForte, color: colors.text },
    formaInstrucoes: { ...tipo.pequeno, color: colors.text },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
    },
    radioActivo: { borderColor: colors.teal, backgroundColor: colors.teal },
    // Fundo branco sempre, também no tema escuro: é o que o leitor de QR espera.
    qr: {
      width: 220,
      height: 220,
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: radius.md,
      marginVertical: spacing.sm,
    },

    referencia: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.teal,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
      alignItems: 'center',
      gap: spacing.xs,
    },
    referenciaRotulo: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },
    referenciaValor: {
      ...tipo.display,
      color: colors.teal,
      letterSpacing: 2,
      fontVariant: ['tabular-nums'],
    },
    valor: { ...tipo.corpoForte, color: colors.text },

    previa: {
      width: '100%',
      height: 220,
      borderRadius: radius.md,
      backgroundColor: colors.white,
      marginBottom: spacing.sm,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
