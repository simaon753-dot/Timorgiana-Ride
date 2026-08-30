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
import RoleSelector from '../components/RoleSelector.js';
import SegmentedPicker from '../components/SegmentedPicker.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';
import AceitarTermos from '../components/AceitarTermos.js';
import EscolherModelo from '../components/EscolherModelo.js';
import EscolherCor from '../components/EscolherCor.js';
import EscolherLugares from '../components/EscolherLugares.js';
import { LUGARES } from '../dados/veiculos.js';
import { VERSAO_TERMOS } from '../termos/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

export default function RegisterScreen({ navigation, route }) {
  const { t } = useI18n();
  const { register } = useAuth();

  const [role, setRole] = useState(route?.params?.role || 'passenger');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Escrever a senha duas vezes. Uma senha mal escrita no registo não dá
  // erro nenhum — a conta é criada e a pessoa só descobre no dia em que
  // tenta entrar, sem forma de saber o que escreveu da primeira vez.
  const [password2, setPassword2] = useState('');
  const [vType, setVType] = useState('car'); // 'car' | 'motorbike'
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vColor, setVColor] = useState('');
  const [vSeats, setVSeats] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aceitou, setAceitou] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError(t('errNameRequired'));
    if (phone.replace(/[\s()-]/g, '').length < 7) return setError(t('errPhoneRequired'));
    if (password.length < 6) return setError(t('errPasswordShort'));
    if (password !== password2) return setError(t('errPasswordMismatch'));
    if (role === 'driver' && !vPlate.trim()) return setError(t('errPlateRequired'));
    if (role === 'driver' && vType === 'car' && !vSeats) return setError(t('errSeatsRequired'));
    if (!aceitou) return setError(t('errTermsRequired'));

    const payload = {
      name,
      phone,
      email: email.trim() || undefined,
      password,
      role,
      termsVersion: VERSAO_TERMOS,
      ...(role === 'driver'
        ? {
            vehicle: {
              type: vType,
              model: vModel,
              plate: vPlate.trim().toUpperCase(),
              color: vColor,
              ...(vType === 'car' && vSeats ? { seats: vSeats } : {}),
            },
          }
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
            <Logo size="sm" />
          </View>

          <Text style={styles.title}>{t('registerTitle')}</Text>

          <Text style={styles.sectionLabel}>{t('accountType')}</Text>
          <RoleSelector value={role} onChange={setRole} />

          <View style={styles.form}>
            {/* Nome OFICIAL, e a explicação por baixo do campo.
                O nome tem de bater certo com a carta de condução e com o
                documento de identificação, senão a aprovação do motorista
                fica presa numa dúvida que ninguém consegue resolver. */}
            <TextField
              label={t('name')}
              value={name}
              onChangeText={setName}
              hint={t('nameHint')}
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
            {/* O aviso de senhas diferentes aparece no próprio campo, e
                não junto ao botão: é ali que se corrige, e é ali que os
                olhos estão. Só depois de a segunda ter sido escrita — a
                meio da escrita, todas as senhas são diferentes. */}
            <TextField
              label={t('passwordConfirm')}
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
              autoCapitalize="none"
              error={
                password2.length > 0 && password !== password2 ? t('errPasswordMismatch') : null
              }
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
                    {
                      value: 'motorbike',
                      label: t('vehicleMotorbike'),
                      icon: '🏍️',
                    },
                  ]}
                />
                <View style={{ height: spacing.md }} />

                <Text style={styles.rotulo}>{t('vehicleModel')}</Text>
                <EscolherModelo tipo={vType} valor={vModel} onEscolher={setVModel} />

                {/* Só a matrícula se escreve à mão: é única por veículo e
                    não há lista possível.
                    O formato difere entre carro e motorizada — cinco
                    dígitos com ponto contra quatro. Mostrar o exemplo
                    errado leva a pessoa a escrever a matrícula errada. */}
                <View style={{ height: spacing.md }} />
                <TextField
                  label={t('vehiclePlate')}
                  value={vPlate}
                  onChangeText={setVPlate}
                  placeholder={t(
                    vType === 'motorbike'
                      ? 'vehiclePlatePlaceholderMoto'
                      : 'vehiclePlatePlaceholderCar'
                  )}
                  hint={t('vehiclePlateHint')}
                  autoCapitalize="characters"
                />

                {vType === 'car' ? (
                  <>
                    <Text style={styles.rotulo}>{t('vehicleSeats')}</Text>
                    <Text style={styles.ajuda}>{t('vehicleSeatsHelp')}</Text>
                    <EscolherLugares opcoes={LUGARES} valor={vSeats} onEscolher={setVSeats} />
                    <View style={{ height: spacing.md }} />
                  </>
                ) : null}

                <Text style={styles.rotulo}>{t('vehicleColor')}</Text>
                <EscolherCor valor={vColor} onEscolher={setVColor} />
              </View>
            ) : null}

            <Aviso texto={error} style={styles.erro} />

            <View style={{ marginBottom: spacing.md }}>
              <AceitarTermos
                aceite={aceitou}
                onMudar={setAceitou}
                quem={role}
                onAbrir={() => navigation.navigate('Termos', { quem: role })}
              />
              {/* O aviso de privacidade fica ao lado dos termos e não
                  escondido nas opções: quem está a criar conta é quem
                  precisa de saber que dados vão ser recolhidos, e é agora
                  que o pode ler antes de decidir. */}
              <Pressable
                onPress={() => navigation.navigate('Termos', { documento: 'privacidade' })}
                hitSlop={8}
              >
                <Text style={styles.linkPrivacidade}>{t('privacyTitle')}</Text>
              </Pressable>
            </View>

            <Button
              title={t('createAccountButton')}
              onPress={onSubmit}
              loading={loading}
              tamanho="grande"
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

const criarEstilos = () =>
  StyleSheet.create({
    // Estas duas tinham a cor escrita à mão (#1C2421 e #6B756F). Liam-se
    // bem, porque a caixa do veículo era creme fixo — mas as três cores
    // fixas juntas faziam com que este bloco fosse o único sítio da app que
    // ignorava o tema. No tema escuro era um rectângulo creme dentro de um
    // ecrã preto.
    rotulo: {
      ...tipo.corpoForte,
      color: colors.text,
      marginBottom: 6,
      marginTop: 4,
    },
    ajuda: { ...tipo.legenda, color: colors.textMuted, marginBottom: 8 },
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
    brand: { marginTop: spacing.lg, marginBottom: spacing.md },
    title: {
      ...tipo.displayPequeno,
      color: colors.text,
      marginBottom: spacing.md,
    },
    sectionLabel: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    form: { marginTop: spacing.lg },
    vehicleBox: {
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    vehicleTitle: {
      ...tipo.subtitulo,
      color: colors.teal,
      marginBottom: spacing.md,
    },
    vehicleTypeLabel: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    erro: { marginBottom: spacing.sm },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    footerText: { ...tipo.corpo, color: colors.textMuted },
    linkPrivacidade: {
      ...tipo.pequeno,
      color: colors.teal,
      textDecorationLine: 'underline',
      marginTop: spacing.sm,
    },
    footerLink: { ...tipo.corpoForte, color: colors.coral },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
