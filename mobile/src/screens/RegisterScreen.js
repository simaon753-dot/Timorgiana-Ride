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
import CampoTelefone from '../components/CampoTelefone.js';
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
import { VERSAO_PRIVACIDADE } from '../termos/versao.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

export default function RegisterScreen({ navigation, route }) {
  const { t } = useI18n();
  const { register } = useAuth();

  const [role, setRole] = useState(route?.params?.role || 'passenger');
  // Declaração de cidadania, só para quem se inscreve como motorista.
  const [cidadaoTL, setCidadaoTL] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Escrever a senha duas vezes. Uma senha mal escrita no registo não dá
  // erro nenhum — a conta é criada e a pessoa só descobre no dia em que
  // tenta entrar, sem forma de saber o que escreveu da primeira vez.
  const [password2, setPassword2] = useState('');
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
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
    // A COR É OBRIGATÓRIA, e não era.
    //
    // É o que o passageiro vê primeiro. A matrícula só se lê a três metros;
    // ao fundo da rua o que identifica um veículo é a cor. Sem ela, quem
    // espera fica a olhar para todos os carros que passam.
    //
    // O campo já cá estava e já aparecia no ecrã — só nunca foi exigido. Um
    // motorista que não lhe tocasse ficava sem cor para sempre, e ninguém
    // dava por isso até um passageiro estar na rua à espera.
    if (role === 'driver' && !vColor) return setError(t('errColorRequired'));
    if (role === 'driver' && !cidadaoTL) return setError(t('errCidadaoTL'));
    if (!aceitou) return setError(t('errTermsRequired'));
    if (!aceitouPrivacidade) return setError(t('errPrivacyRequired'));

    const payload = {
      name,
      phone,
      email: email.trim(),
      password,
      role,
      termsVersion: VERSAO_TERMOS,
      privacyVersion: VERSAO_PRIVACIDADE,
      ...(role === 'driver' ? { cidadaoTL: true } : {}),
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
            {/* O país escolhe-se ao lado do número, e vem com o
                Timor-Leste já escolhido. Quase ninguém lhe vai tocar — é por
                isso que é pequeno e fica encostado, em vez de ser mais um
                campo a preencher. */}
            <CampoTelefone
              label={t('phone')}
              valor={phone}
              onChange={setPhone}
              // Conduzir é para cidadãos de Timor-Leste, e um número
              // timorense é a única parte disso que a app consegue verificar
              // sozinha. Quem prova a cidadania é o documento, no painel.
              soTimor={role === 'driver'}
              hint={role === 'driver' ? t('driverSoTimorTel') : undefined}
            />
            {/* O EMAIL DEIXOU DE SER OPCIONAL.
                Não serve para entrar — entra-se com o telemóvel e a senha,
                que é o que se sabe de cor. Serve para o dia em que a senha se
                perde: sem endereço, a única recuperação é telefonar a alguém.
                A dica diz para que é. Um campo obrigatório sem razão à vista
                parece um capricho, e as pessoas escrevem qualquer coisa. */}
            <TextField
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              hint={t('emailPorque')}
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

            {/* CIDADANIA, DECLARADA E NÃO VERIFICADA.
                A app não consegue provar a nacionalidade de ninguém — o que
                consegue é fazer a pergunta antes de haver conta, guardar a
                resposta com a hora, e pôr o documento à frente de quem
                aprova. Uma declaração falsa passa a ser uma declaração
                falsa, e os termos já preveem suspensão para isso. */}
            {role === 'driver' ? (
              <Pressable
                style={styles.declaracao}
                onPress={() => setCidadaoTL((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: cidadaoTL }}
              >
                <View style={[styles.quadrado, cidadaoTL && styles.quadradoMarcado]}>
                  {cidadaoTL ? <Text style={styles.visto}>✓</Text> : null}
                </View>
                <Text style={styles.declaracaoTexto}>{t('driverDeclaraCidadao')}</Text>
              </Pressable>
            ) : null}

            <View style={{ marginBottom: spacing.md }}>
              <AceitarTermos
                aceite={aceitou}
                onMudar={setAceitou}
                quem={role}
                onAbrir={() => navigation.navigate('Termos', { quem: role })}
              />
              {/* DUAS CAIXAS E NÃO UMA, e a razão é jurídica.
                  Antes havia uma caixa para os termos e a privacidade era
                  uma ligação ao lado — quem se registava aceitava os termos
                  e nunca dizia nada sobre o tratamento dos seus dados.
                  Consentir o contrato e consentir o tratamento de dados são
                  actos distintos, e cada um guarda a sua própria versão. */}
              <View style={{ height: spacing.sm }} />
              <AceitarTermos
                aceite={aceitouPrivacidade}
                onMudar={setAceitouPrivacidade}
                documento="privacidade"
                onAbrir={() => navigation.navigate('Termos', { documento: 'privacidade' })}
              />
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
    // A mesma forma da caixa de aceitar os termos, logo abaixo. São dois
    // actos da mesma natureza — declarar e consentir — e devem parecer-se.
    declaracao: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      paddingRight: spacing.sm,
    },
    quadrado: {
      width: 22,
      height: 22,
      borderRadius: radius.xs,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quadradoMarcado: { backgroundColor: colors.teal, borderColor: colors.teal },
    visto: { color: colors.onTeal, fontSize: 14, fontWeight: '700', lineHeight: 16 },
    declaracaoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
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
