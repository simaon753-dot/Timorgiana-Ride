import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

const TIPOS = [
  { kind: 'licence', label: 'docLicence' },
  { kind: 'vehicle', label: 'docVehicle' },
  { kind: 'photo', label: 'docPhoto' },
];

// Ecrã que o motorista vê enquanto a conta não está aprovada. Sem isto,
// alguém acabado de registar via a lista de pedidos vazia e concluía que
// a app estava avariada — em vez de perceber que falta ser aprovado.
export default function DriverPendingScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, logout, refreshUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(null); // que documento está a enviar
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

  async function enviar(kind) {
    setError(null);
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
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Logo size="sm" />
          <View style={styles.topBarDireita}>
            {user?.isAdmin ? (
              <Pressable onPress={() => navigation.navigate('Admin')} style={styles.adminLink}>
                <Text style={styles.adminLinkText}>⚙</Text>
              </Pressable>
            ) : null}
            <LanguageToggle />
          </View>
        </View>

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
                return (
                  <View key={tp.kind} style={styles.docRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{t(tp.label)}</Text>
                      <Text style={[styles.docState, enviado && styles.docStateOk]}>
                        {enviado ? `✓ ${t('docSent')}` : t('docMissing')}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.docBtn, enviado && styles.docBtnSecondary]}
                      onPress={() => enviar(tp.kind)}
                      disabled={busy === tp.kind}
                    >
                      <Text style={[styles.docBtnText, enviado && styles.docBtnTextSecondary]}>
                        {busy === tp.kind ? t('docSending') : enviado ? t('docReplace') : t('docSend')}
                      </Text>
                    </Pressable>
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
        <Button title={t('logout')} variant="ghost" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
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
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#F0E2CF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cardRejected: { backgroundColor: '#FBEAE8', borderColor: '#F0CFCB' },
  icon: { fontSize: 38, marginBottom: spacing.sm },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, textAlign: 'center' },
  explain: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  hint: {
    fontSize: fontSize.xs,
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
  docName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  docState: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  docStateOk: { color: colors.success, fontWeight: '600' },
  docBtn: {
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  docBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.teal },
  docBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  docBtnTextSecondary: { color: colors.teal },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
  status: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  statusOk: { color: colors.success, fontWeight: '600' },
});
