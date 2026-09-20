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
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import Logo from '../components/Logo.js';
import * as Updates from 'expo-updates';
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
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

// Permite apontar a app a outro servidor sem recompilar o APK.
// Acessível a partir do ecrã de boas-vindas — tem de o ser, porque se o
// endereço estiver errado nem sequer é possível iniciar sessão.
export default function ServerScreen({ navigation }) {
  const { t } = useI18n();
  const { logout, user } = useAuth();

  const [url, setUrl] = useState(getBaseUrl());
  const [result, setResult] = useState(null); // { ok, error }
  const [testing, setTesting] = useState(false);
  const [aProcurar, setAProcurar] = useState(false);
  const [recado, setRecado] = useState(null); // { ok, texto }
  const [saved, setSaved] = useState(false);

  // PROCURAR ACTUALIZAÇÃO À MÃO (21/09/2026).
  //
  // A app está configurada para arrancar SEM esperar (`fallbackToCacheTimeout:
  // 0`) e procurar a actualização por trás — o que é o que se quer em Díli,
  // onde uma rede lenta transformaria cada arranque numa sala de espera. O
  // preço é que a actualização descarregada numa abertura só corre na
  // SEGUINTE, e a pessoa fica a olhar para o ecrã antigo sem perceber porquê.
  //
  // Este botão troca essa espera por uma decisão: descarrega agora e reinicia
  // a app. Existe porque quem está a testar precisa de saber se está a ver a
  // versão nova ou a velha — e essa pergunta não se responde com paciência.
  async function procurarActualizacao() {
    setRecado(null);
    setAProcurar(true);
    try {
      // Em Expo Go e no modo de desenvolvimento não há actualizações; dizê-lo
      // é melhor do que uma procura que não podia dar em nada.
      if (!Updates.isEnabled) {
        return setRecado({ ok: false, texto: t('updateDesligado') });
      }
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) return setRecado({ ok: true, texto: t('updateNenhuma') });

      setRecado({ ok: true, texto: t('updateADescarregar') });
      await Updates.fetchUpdateAsync();
      // Não devolve: a app reinicia aqui, já com a versão nova.
      await Updates.reloadAsync();
    } catch (e) {
      setRecado({ ok: false, texto: e?.message || t('errGeneric') });
    } finally {
      setAProcurar(false);
    }
  }

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
      <BarraEstado />
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
          <Text style={styles.explain}>⏳ {t('serverFirstSlow')}</Text>

          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>{t('serverCurrent')}</Text>
            <Text style={styles.currentValue}>{getBaseUrl()}</Text>
            <Text style={styles.currentSource}>
              ({isUsingSavedUrl() ? t('serverCustom') : t('serverDefault')})
            </Text>
          </View>

          {/* QUE VERSÃO ESTÁ A CORRER.
              Existe pela mesma razão que o campo `versao` do /api/health:
              sem isto, "a correcção já chegou?" é um palpite. Foi a olhar
              para dois ecrãs iguais que percebemos que uma actualização
              podia ter chegado sem mudar nada de visível — e não havia como
              distinguir isso de não ter chegado de todo.
              `isEmbeddedLaunch` diz o que interessa: se o JavaScript é o
              que veio dentro do APK, ou se já é uma actualização
              descarregada por cima. */}
          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>{t('versaoTitulo')}</Text>
            <Text style={styles.currentValue}>
              {Updates.runtimeVersion || '—'}
              {Updates.updateId ? ` · ${String(Updates.updateId).slice(0, 8)}` : ''}
            </Text>
            <Text style={styles.currentSource}>
              ({Updates.isEmbeddedLaunch ? t('versaoEmbutida') : t('versaoAtualizada')}
              {Updates.createdAt ? ` · ${new Date(Updates.createdAt).toLocaleString()}` : ''})
            </Text>
          </View>

          <Button
            title={t('updateProcurar')}
            variant="secondary"
            icone="⟳"
            loading={aProcurar}
            onPress={procurarActualizacao}
          />
          {recado ? (
            <Text style={[styles.result, recado.ok ? styles.resultOk : styles.resultFail]}>
              {recado.texto}
            </Text>
          ) : null}

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

          <Text style={styles.hint}>
            {t('serverDefault')}: {getDefaultUrl()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    topBar: { paddingTop: spacing.sm },
    back: { ...tipo.subtitulo, color: colors.teal },
    brand: { marginTop: spacing.lg, marginBottom: spacing.md },
    title: { ...tipo.displayPequeno, color: colors.text },
    explain: {
      ...tipo.pequeno,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    currentBox: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    currentLabel: { ...tipo.etiqueta, color: colors.textMuted },
    currentValue: { ...tipo.subtitulo, color: colors.teal, marginTop: 2 },
    currentSource: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    result: { ...tipo.corpoForte, marginBottom: spacing.md },
    resultOk: { color: colors.success },
    resultFail: { color: colors.danger },
    hint: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
