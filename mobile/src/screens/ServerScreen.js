import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import Logo from '../components/Logo.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  getBaseUrl,
  getDefaultUrl,
  isUsingSavedUrl,
  saveServer,
  resetServer,
  testServer,
} from '../serverUrl.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

// Permite apontar a app a outro servidor sem recompilar o APK.
// Acessível a partir do ecrã de boas-vindas — tem de o ser, porque se o
// endereço estiver errado nem sequer é possível iniciar sessão.
export default function ServerScreen({ navigation }) {
  const { t } = useI18n();
  const { logout, user } = useAuth();

  const [url, setUrl] = useState(getBaseUrl());
  const [result, setResult] = useState(null); // { ok, error }
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onTest() {
    setTesting(true);
    setResult(null);
    setResult(await testServer(url));
    setTesting(false);
  }

  async function onSave() {
    try {
      await saveServer(url);
      setSaved(true);
      setResult(null);
      // Mudar de servidor invalida a sessão: as contas são de outro servidor
      if (user) await logout();
    } catch (e) {
      setResult({ ok: false, error: e?.message || 'Erro' });
    }
  }

  async function onReset() {
    const base = await resetServer();
    setUrl(base);
    setSaved(false);
    setResult(null);
    if (user) await logout();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.back}>‹ {t('back')}</Text>
            </Pressable>
          </View>

          <View style={styles.brand}>
            <Logo size="sm" />
          </View>

          <Text style={styles.title}>{t('serverTitle')}</Text>
          <Text style={styles.explain}>{t('serverExplain')}</Text>

          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>{t('serverCurrent')}</Text>
            <Text style={styles.currentValue}>{getBaseUrl()}</Text>
            <Text style={styles.currentSource}>
              ({isUsingSavedUrl() ? t('serverCustom') : t('serverDefault')})
            </Text>
          </View>

          <TextField
            label={t('serverField')}
            value={url}
            onChangeText={(v) => {
              setUrl(v);
              setResult(null);
              setSaved(false);
            }}
            placeholder={t('serverPlaceholder')}
            autoCapitalize="none"
          />

          {result ? (
            <Text style={[styles.result, result.ok ? styles.resultOk : styles.resultFail]}>
              {result.ok ? t('serverOk') : `${t('serverFail')} — ${result.error}`}
            </Text>
          ) : null}
          {saved ? <Text style={[styles.result, styles.resultOk]}>{t('serverSaved')}</Text> : null}

          <Button
            title={testing ? t('serverTesting') : t('serverTest')}
            variant="outline"
            onPress={onTest}
            loading={testing}
          />
          <View style={{ height: spacing.sm }} />
          <Button title={t('serverSave')} onPress={onSave} />

          {isUsingSavedUrl() ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button title={t('serverReset')} variant="ghost" onPress={onReset} />
            </>
          ) : null}

          <Text style={styles.hint}>{t('serverDefault')}: {getDefaultUrl()}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  topBar: { paddingTop: spacing.sm },
  back: { color: colors.teal, fontSize: fontSize.md, fontWeight: '700' },
  brand: { marginTop: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  explain: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  currentBox: {
    backgroundColor: '#EFEAE1',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  currentLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' },
  currentValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.teal,
    marginTop: 2,
  },
  currentSource: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  result: { fontSize: fontSize.sm, marginBottom: spacing.md, fontWeight: '600' },
  resultOk: { color: colors.success },
  resultFail: { color: colors.danger },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
