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
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import RoleSelector from '../components/RoleSelector.js';
import SegmentedPicker from '../components/SegmentedPicker.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, fontSize } from '../theme.js';

export default function RegisterScreen({ navigation, route }) {
  const { t } = useI18n();
  const { register } = useAuth();

  const [role, setRole] = useState(route?.params?.role || 'passenger');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vType, setVType] = useState('car'); // 'car' | 'motorbike'
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vColor, setVColor] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError(t('errNameRequired'));
    if (phone.replace(/[\s()-]/g, '').length < 7) return setError(t('errPhoneRequired'));
    if (password.length < 6) return setError(t('errPasswordShort'));
    if (role === 'driver' && !vPlate.trim()) return setError(t('errPlateRequired'));

    const payload = {
      name,
      phone,
      email: email.trim() || undefined,
      password,
      role,
      ...(role === 'driver'
        ? { vehicle: { type: vType, model: vModel, plate: vPlate, color: vColor } }
        : {}),
    };

    setLoading(true);
    try {
      await register(payload);
      // O RootNavigator troca automaticamente para a área autenticada.
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setLoading(false);
    }
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
            <LanguageToggle />
          </View>

          <View style={styles.brand}>
            <Logo size="sm" />
          </View>

          <Text style={styles.title}>{t('registerTitle')}</Text>

          <Text style={styles.sectionLabel}>{t('accountType')}</Text>
          <RoleSelector value={role} onChange={setRole} />

          <View style={styles.form}>
            <TextField
              label={t('name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phonePlaceholder')}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <TextField
              label={t('email')}
              optionalLabel={t('optional')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              hint={t('passwordHint')}
              secureTextEntry
              autoCapitalize="none"
            />

            {role === 'driver' ? (
              <View style={styles.vehicleBox}>
                <Text style={styles.vehicleTitle}>{t('vehicleSection')}</Text>

                <Text style={styles.vehicleTypeLabel}>{t('vehicleType')}</Text>
                <SegmentedPicker
                  value={vType}
                  onChange={setVType}
                  options={[
                    { value: 'car', label: t('vehicleCar'), icon: '🚗' },
                    { value: 'motorbike', label: t('vehicleMotorbike'), icon: '🏍️' },
                  ]}
                />
                <View style={{ height: spacing.md }} />

                <TextField
                  label={t('vehicleModel')}
                  value={vModel}
                  onChangeText={setVModel}
                  placeholder={
                    vType === 'motorbike'
                      ? t('vehicleModelPlaceholderBike')
                      : t('vehicleModelPlaceholder')
                  }
                />
                <TextField
                  label={t('vehiclePlate')}
                  value={vPlate}
                  onChangeText={setVPlate}
                  placeholder={t('vehiclePlatePlaceholder')}
                  autoCapitalize="characters"
                />
                <TextField
                  label={t('vehicleColor')}
                  value={vColor}
                  onChangeText={setVColor}
                  placeholder={t('vehicleColorPlaceholder')}
                />
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={t('createAccountButton')}
              onPress={onSubmit}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('haveAccountQuestion')} </Text>
              <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
                <Text style={styles.footerLink}>{t('signInLink')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  back: { color: colors.teal, fontSize: fontSize.md, fontWeight: '700' },
  brand: { marginTop: spacing.lg, marginBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  form: { marginTop: spacing.lg },
  vehicleBox: {
    backgroundColor: '#EFEAE1',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  vehicleTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: spacing.md,
  },
  vehicleTypeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted, fontSize: fontSize.md },
  footerLink: { color: colors.coral, fontSize: fontSize.md, fontWeight: '800' },
});
