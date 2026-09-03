import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import Aviso from '../design/Aviso.js';
import { tipo } from '../design/tipografia.js';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, registarEstilos } from '../theme.js';

export default function LoginScreen({ navigation }) {
  const { t } = useI18n();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!phone.trim()) return setError(t('errPhoneRequired'));
    if (!password) return setError(t('errPasswordShort'));

    setLoading(true);
    try {
      await login({ phone, password });
      // O RootNavigator troca automaticamente para a área autenticada.
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setLoading(false);
    }
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
            <LanguageToggle />
          </View>

          <View style={styles.brand}>
            <Logo />
          </View>

          <Text style={styles.title}>{t('loginTitle')}</Text>
          <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

          <View style={styles.form}>
            <TextField
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phonePlaceholder')}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <TextField
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Aviso texto={error} style={styles.erro} />

            {/* Entrar é a única acção deste ecrã: leva o tamanho grande. */}
            <Button
              title={t('loginButton')}
              onPress={onSubmit}
              loading={loading}
              tamanho="grande"
              style={{ marginTop: spacing.sm }}
            />

            {/* Esqueceu-se da palavra-passe.
                Antes não havia saída nenhuma: a conta perdia-se com os dias
                comprados e os documentos aprovados lá dentro. */}
            <Pressable
              onPress={() => navigation.navigate('Recuperar')}
              hitSlop={8}
              style={{ alignSelf: 'center', marginTop: spacing.md }}
            >
              <Text style={styles.footerLink}>{t('recEsqueci')}</Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('noAccountQuestion')} </Text>
              <Pressable
                onPress={() => navigation.navigate('Register', { role: 'passenger' })}
                hitSlop={8}
              >
                <Text style={styles.footerLink}>{t('registerLink')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
    },
    back: { ...tipo.corpoForte, color: colors.teal },
    brand: { marginTop: spacing.xl, marginBottom: spacing.lg },
    title: { ...tipo.displayPequeno, color: colors.text },
    subtitle: {
      ...tipo.corpo,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    form: { marginTop: spacing.sm },
    erro: { marginBottom: spacing.sm },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    footerText: { ...tipo.corpo, color: colors.textMuted },
    footerLink: { ...tipo.corpoForte, color: colors.coral },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
