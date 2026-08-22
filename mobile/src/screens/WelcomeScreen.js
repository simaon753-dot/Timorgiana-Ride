import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function WelcomeScreen({ navigation }) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('Server')} hitSlop={10}>
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
        <LanguageToggle onTeal />
      </View>

      <View style={styles.hero}>
        <Logo onTeal />
        <Text style={styles.title}>{t('welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('welcomeSubtitle')}</Text>
      </View>

      <View style={styles.actions}>
        {/* Entrar é a acção grande. Depois da primeira semana, quase todos
            os toques neste ecrã são de quem já tem conta — o registo faz-se
            uma vez, a entrada faz-se sempre. */}
        <Pressable
          style={({ pressed }) => [styles.entrar, pressed && styles.premido]}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
        >
          <Text style={styles.entrarTexto}>{t('loginTitle')}</Text>
        </Pressable>

        <Text style={styles.registarRotulo}>{t('noAccountQuestion')}</Text>

        <View style={styles.registos}>
          <Pressable
            style={({ pressed }) => [styles.registo, pressed && styles.premido]}
            onPress={() => navigation.navigate('Register', { role: 'passenger' })}
            accessibilityRole="button"
          >
            <Text style={styles.registoIcone}>🧍</Text>
            <Text style={styles.registoTexto}>{t('passenger')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.registo, pressed && styles.premido]}
            onPress={() => navigation.navigate('Register', { role: 'driver' })}
            accessibilityRole="button"
          >
            <Text style={styles.registoIcone}>🛵</Text>
            <Text style={styles.registoTexto}>{t('driver')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.teal },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  gear: { fontSize: 22 },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '800', marginTop: spacing.xl },
  subtitle: {
    color: colors.onTeal,
    fontSize: fontSize.md,
    lineHeight: 24,
    marginTop: spacing.sm,
    opacity: 0.9,
  },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  entrar: {
    backgroundColor: colors.coral,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrarTexto: { color: '#22100A', fontSize: fontSize.lg, fontWeight: '800' },

  registarRotulo: {
    color: colors.onTeal,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  registos: { flexDirection: 'row', gap: spacing.sm },
  registo: {
    flex: 1,
    backgroundColor: colors.tealDark,
    borderWidth: 1.5,
    borderColor: colors.tealLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  registoIcone: { fontSize: 24, marginBottom: 2 },
  registoTexto: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },

  premido: { opacity: 0.75 },
});
