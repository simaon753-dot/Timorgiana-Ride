import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import TextField from '../components/TextField.js';
import FormularioVeiculo from '../components/FormularioVeiculo.js';
import Voltar from '../components/Voltar.js';
import { VERSAO_TERMOS_MOTORISTA } from '../termos/index.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

// OS TRÊS DOCUMENTOS OBRIGATÓRIOS, e os três valem para carro E motorizada.
// Nenhum deles depende do tipo de veículo: quem conduz uma motorizada precisa
// de registo e de inspecção exactamente como quem conduz um carro.
//
// A fotografia não é um documento — é o retrato da pessoa, e serve para saber
// quem está ao volante. Por isso está na lista mas não caduca.
const TIPOS = [
  { kind: 'licence', label: 'docLicence' },
  { kind: 'vehicle', label: 'docVehicle' },
  // Kartaun Inspesaun. Obrigatório em Timor-Leste, válido um ano, e conduzir
  // com ele caducado dá multa a dobrar se a polícia de trânsito mandar
  // parar. Entrou em 02/09/2026.
  { kind: 'inspection', label: 'docInspection' },
  { kind: 'photo', label: 'docPhoto' },
];

// Ecrã que o motorista vê enquanto a conta não está aprovada. Sem isto,
// alguém acabado de registar via a lista de pedidos vazia e concluía que
// a app estava avariada — em vez de perceber que falta ser aprovado.
export default function DriverPendingScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, logout, refreshUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(null);
  const [validades, setValidades] = useState({}); // que documento está a enviar
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const rejected = user?.driverStatus === 'rejected';

  const carregar = useCallback(async () => {
    try {
      const { documents } = await api.driverStatus(token);
      setDocs(documents || []);
    } catch {
      /* sem rede — mostra o que já tem */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Enquanto espera, verifica de tempos a tempos se já foi decidido.
  // Não usamos socket aqui: o motorista por aprovar nem entra nas salas.
  useEffect(() => {
    if (rejected) return;
    const id = setInterval(refreshUser, 20000);
    return () => clearInterval(id);
  }, [refreshUser, rejected]);

  // A fotografia do motorista não caduca; tudo o resto sim. Não se pergunta
  // uma data que não existe.
  function precisaValidade(kind) {
    return kind !== 'photo';
  }

  // Guardar só a data, sem mexer na fotografia.
  //
  // O caminho existe para os documentos que já estão na conta e ficaram sem
  // validade — obrigar a refotografar uma carta de condução só para
  // escrever uma data seria trabalho que não serve para nada.
  async function guardarData(kind) {
    setError(null);
    const d = (validades[kind] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return setError(t('docExpiryRequired'));
    setBusy(kind);
    try {
      await api.definirValidadeDoc(token, kind, d);
      await carregar();
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setBusy(null);
    }
  }

  async function enviar(kind) {
    setError(null);
    if (precisaValidade(kind) && !/^\d{4}-\d{2}-\d{2}$/.test((validades[kind] || '').trim())) {
      return setError(t('docExpiryRequired'));
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(t('errPermissionPhotos'));

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6, // comprime: os documentos não precisam de qualidade máxima
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;

    setBusy(kind);
    try {
      await api.uploadDocument(token, {
        kind,
        mime: res.assets[0].mimeType || 'image/jpeg',
        base64: res.assets[0].base64,
        ...(precisaValidade(kind) ? { expiresOn: validades[kind].trim() } : {}),
      });
      await carregar();
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setBusy(null);
    }
  }

  const enviados = docs.map((d) => d.kind);
  const completo = TIPOS.every((tp) => enviados.includes(tp.kind));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Voltar navigation={navigation} />
          <View style={styles.topBarDireita}>
            {user?.isAdmin ? (
              <Pressable onPress={() => navigation.navigate('Admin')} style={styles.adminLink}>
                <Text style={styles.adminLinkText}>⚙</Text>
              </Pressable>
            ) : null}
            <LanguageToggle />
          </View>
        </View>

        {/* Sem veículo declarado, não há documentos a pedir: primeiro
            diz-se o que se conduz. É este o caminho de quem se registou
            como passageiro e mais tarde quis conduzir. */}
        {!user?.vehicle?.plate ? (
          <FormularioVeiculo onPronto={carregar} />
        ) : (
          <>
            <View style={[styles.card, rejected && styles.cardRejected]}>
              <Text style={styles.icon}>{rejected ? '⛔' : '⏳'}</Text>
              <Text style={styles.title}>{rejected ? t('rejectedTitle') : t('pendingTitle')}</Text>
              <Text style={styles.explain}>
                {rejected ? t('rejectedExplain') : t('pendingExplain')}
              </Text>
            </View>

            {!rejected ? (
              <>
                <Text style={styles.hint}>{t('docHint')}</Text>

                {loading ? (
                  <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
                ) : (
                  TIPOS.map((tp) => {
                    const enviado = enviados.includes(tp.kind);
                    const doc = docs.find((d) => d.kind === tp.kind);
                    return (
                      <View key={tp.kind}>
                        <View style={styles.docRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.docName}>{t(tp.label)}</Text>
                            <Text style={[styles.docState, enviado && styles.docStateOk]}>
                              {enviado ? `✓ ${t('docSent')}` : t('docMissing')}
                            </Text>
                            {/* Um documento enviado e sem data conta como
                          fora de ordem — é o que impede a regra de ser
                          decorativa. Dizê-lo aqui evita que alguém veja
                          "✓ enviado" e conclua que está tratado. */}
                            {enviado && precisaValidade(tp.kind) && !doc?.expiresOn ? (
                              <Text style={[styles.docValidade, styles.docValidadeMa]}>
                                {t('docSemValidade')}
                              </Text>
                            ) : null}
                            {doc?.expiresOn ? (
                              <Text
                                style={[
                                  styles.docValidade,
                                  doc.expirado && styles.docValidadeMa,
                                  doc.aExpirar && styles.docValidadeAviso,
                                ]}
                              >
                                {doc.expirado
                                  ? t('docExpired')
                                  : doc.aExpirar
                                    ? t('docExpiringSoon')
                                    : `${t('docExpiry')} ${doc.expiresOn}`}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            style={[styles.docBtn, enviado && styles.docBtnSecondary]}
                            onPress={() => enviar(tp.kind)}
                            disabled={busy === tp.kind}
                          >
                            <Text
                              style={[styles.docBtnText, enviado && styles.docBtnTextSecondary]}
                            >
                              {busy === tp.kind
                                ? t('docSending')
                                : enviado
                                  ? t('docReplace')
                                  : t('docSend')}
                            </Text>
                          </Pressable>
                        </View>

                        {/* A data pede-se ANTES de escolher a fotografia: com o
                      selector de imagens aberto o teclado não cabe, e
                      pedi-la depois obrigaria a repetir tudo se estivesse
                      errada. */}
                        {precisaValidade(tp.kind) ? (
                          <View style={styles.validadeCaixa}>
                            <TextField
                              label={t('docExpiry')}
                              value={validades[tp.kind] || ''}
                              onChangeText={(v) =>
                                setValidades((a) => ({
                                  ...a,
                                  [tp.kind]: v.replace(/[^\d-]/g, '').slice(0, 10),
                                }))
                              }
                              placeholder="2028-03-10"
                              keyboardType="numbers-and-punctuation"
                            />
                            <Text style={styles.validadeAjuda}>{t('docExpiryHelp')}</Text>
                            {enviado && !doc?.expiresOn ? (
                              <Pressable
                                style={styles.docBtn}
                                onPress={() => guardarData(tp.kind)}
                                disabled={busy === tp.kind}
                              >
                                <Text style={styles.docBtnText}>{t('docGuardarData')}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Text style={[styles.status, completo && styles.statusOk]}>
                  {completo ? t('docsComplete') : t('docsIncomplete')}
                </Text>
              </>
            ) : null}

            <View style={{ flex: 1, minHeight: spacing.xl }} />
            {/* Os termos de motorista vêm DEPOIS dos documentos, de propósito:
            falam de seguro e de documentos válidos, e aceitá-los antes de
            os entregar seria aceitar no abstracto. */}
            {completo && user?.driverTermsVersion !== VERSAO_TERMOS_MOTORISTA ? (
              <View style={styles.termosCaixa}>
                <Text style={styles.termosTexto}>{t('driverTermsPending')}</Text>
                <View style={{ height: spacing.sm }} />
                <Button
                  title={t('driverTermsRead')}
                  onPress={() => navigation.navigate('Termos', { quem: 'driver', aceitavel: true })}
                />
              </View>
            ) : completo ? (
              <Text style={styles.termosFeitos}>{t('driverTermsDone')}</Text>
            ) : null}

            <View style={{ height: spacing.lg }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    docValidade: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    docValidadeAviso: { color: colors.coralDark, fontWeight: '700' },
    docValidadeMa: { color: colors.danger, fontWeight: '700' },
    validadeCaixa: { marginTop: -spacing.xs, marginBottom: spacing.sm },
    validadeAjuda: { fontSize: 11, color: colors.textMuted, marginTop: -spacing.sm },
    termosCaixa: {
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.coral,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    termosTexto: { ...tipo.corpoForte, color: colors.text },
    termosFeitos: {
      ...tipo.corpoForte,
      color: colors.success,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    scroll: { flexGrow: 1, padding: spacing.lg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    topBarDireita: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    adminLink: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
    },
    adminLinkText: { fontSize: 18, color: colors.teal },
    card: {
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    cardRejected: { backgroundColor: colors.tintaPerigo, borderColor: colors.contornoPerigo },
    icon: { fontSize: 38, marginBottom: spacing.sm },
    title: { ...tipo.titulo, color: colors.text, textAlign: 'center' },
    explain: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 21,
    },
    hint: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    docName: { ...tipo.subtitulo, color: colors.text },
    docState: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    docStateOk: { color: colors.success, fontWeight: '600' },
    docBtn: {
      backgroundColor: colors.coral,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
    },
    docBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.teal },
    docBtnText: { ...tipo.corpoForte, color: colors.white },
    docBtnTextSecondary: { color: colors.teal },
    error: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
    status: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    statusOk: { color: colors.success, fontWeight: '600' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
