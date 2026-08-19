import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize } from '../theme.js';

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
        <Button
          title={t('iAmPassenger')}
          variant="primary"
          onPress={() => navigation.navigate('Register', { role: 'passenger' })}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('iAmDriver')}
          variant="secondary"
          style={styles.driverBtn}
          onPress={() => navigation.navigate('Register', { role: 'driver' })}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>{t('alreadyHaveAccount')} </Text>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text style={styles.loginLink}>{t('goToLogin')}</Text>
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
  driverBtn: { borderColor: colors.onTeal, backgroundColor: colors.tealDark },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginText: { color: colors.onTeal, fontSize: fontSize.md },
  loginLink: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
