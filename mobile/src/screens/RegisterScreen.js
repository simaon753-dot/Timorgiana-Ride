import React, { useRef, useState } from 'react';
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
import CabecalhoRegisto from '../design/CabecalhoRegisto.js';
import Etapas from '../design/Etapas.js';
import CartaoSeccao from '../design/CartaoSeccao.js';
import SeletorConta from '../design/SeletorConta.js';
import EscolherTipoVeiculo from '../design/EscolherTipoVeiculo.js';
import EscolherMarcaModelo from '../design/EscolherMarcaModelo.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import CampoTelefone, { telefoneValido } from '../components/CampoTelefone.js';
import { useI18n } from '../i18n/index.js';
import AceitarTermos from '../components/AceitarTermos.js';
import EscolherCor from '../components/EscolherCor.js';
import EscolherLugares from '../components/EscolherLugares.js';
import { LUGARES } from '../dados/veiculos.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
import { VERSAO_TERMOS } from '../termos/index.js';
import { VERSAO_PRIVACIDADE } from '../termos/versao.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// A COSTA DE DÍLI COM O CRISTO REI, recortada da referência do Simão
// (13/09/26). Ele escolheu-a em vez de uma gerada, que parecia o Rio de
// Janeiro. WebP com transparência: desvanece à esquerda e em cima para
// assentar sobre qualquer fundo, e pesa uma fracção do PNG na actualização.
const DILI = require('../../assets/entrada/dili.webp');

// O REGISTO EM ETAPAS — sistema de design TGA (13/09/26).
//
// A LÓGICA DA CONTA, tal como o Simão a fixou:
//   Pasajeiru: Dadus Pessoal → Reviza Dadus → Konfirma
//   Motorista: Dadus Pessoal → Dadus Veíkulu → Konfirma
// Um passageiro NUNCA vê perguntas sobre veículo, e o pedido de registo dele
// nunca leva o bloco `vehicle` — mesmo que alguém tenha começado como
// motorista, preenchido o veículo e mudado de ideias.
//
// AS ETAPAS FICAM TODAS MONTADAS, e só a actual se vê. Cada componente guarda
// o seu estado — o seletor de marca sabe a marca que se escolheu —, e
// desmontá-lo ao avançar fazia quem voltasse atrás encontrar a marca em
// branco, embora ela continuasse guardada. Voltar tem de devolver o que se
// deixou.
//
// OS TERMOS NÃO SE ACEITAM "AO CONTINUAR". A referência tinha "Hakarak kria
// konta, ita konkorda ho Termus…" por baixo do primeiro botão; aqui os termos
// e a privacidade têm cada um a sua caixa, marcada à mão, na última etapa.
// Consentir o contrato e consentir o tratamento de dados são actos distintos,
// e nenhum se presume por se ter carregado noutro botão.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation, route }) {
  const { t } = useI18n();
  const { register } = useAuth();
  const scrollRef = useRef(null);

  const [etapa, setEtapa] = useState(0);
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
  const [aceitou, setAceitou] = useState(false);
  const [vType, setVType] = useState('car');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vColor, setVColor] = useState('');
  const [vSeats, setVSeats] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const motorista = role === 'driver';
  const etapas = motorista
    ? [t('etapaPessoal'), t('etapaVeiculo'), t('etapaKonfirma')]
    : [t('etapaPessoal'), t('etapaReviza'), t('etapaKonfirma')];
  const ultima = etapa === etapas.length - 1;
  const emailCerto = EMAIL.test(email.trim());

  function validarPessoal() {
    if (!name.trim()) return t('errNameRequired');
    if (!telefoneValido(phone)) return t('errTelefoneTL');
    if (!emailCerto) return t('errEmailInvalido');
    if (password.length < 6) return t('errPasswordShort');
    if (password !== password2) return t('errPasswordMismatch');
    return null;
  }

  function validarVeiculo() {
    if (!vModel.trim()) return t('errMarcaModelo');
    if (!vPlate.trim()) return t('errPlateRequired');
    if (VEICULOS[vType]?.perguntaLugares && !vSeats) return t('errSeatsRequired');
    // A COR É OBRIGATÓRIA: é o que o passageiro vê primeiro. A matrícula só
    // se lê a três metros; ao fundo da rua o que identifica um veículo é a cor.
    if (!vColor) return t('errColorRequired');
    return null;
  }

  function irPara(n) {
    setError(null);
    setEtapa(n);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function avancar() {
    const erro =
      etapa === 0 ? validarPessoal() : motorista && etapa === 1 ? validarVeiculo() : null;
    if (erro) return setError(erro);
    irPara(etapa + 1);
  }

  function voltar() {
    if (etapa > 0) return irPara(etapa - 1);
    navigation.goBack();
  }

  async function onSubmit() {
    setError(null);
    // As etapas já validaram, mas volta-se a validar: quem chega aqui por um
    // caminho que não se previu não pode criar uma conta incompleta.
    const erro = validarPessoal() || (motorista ? validarVeiculo() : null);
    if (erro) return setError(erro);
    if (motorista && !cidadaoTL) return setError(t('errCidadaoTL'));
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
      ...(motorista ? { cidadaoTL: true } : {}),
      // Só o motorista leva veículo. Ver a nota no topo do ficheiro.
      ...(motorista
        ? {
            vehicle: {
              type: vType,
              model: vModel,
              plate: vPlate.trim().toUpperCase(),
              color: vColor,
              ...(VEICULOS[vType]?.perguntaLugares && vSeats ? { seats: vSeats } : {}),
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

  const telefoneMostrado = phone.startsWith('+') ? phone : phone ? `+670 ${phone}` : '—';
  const linhasRevisao = [
    { rotulo: t('accountType'), valor: motorista ? t('driver') : t('passenger'), ir: 0 },
    { rotulo: t('name'), valor: name.trim() || '—', ir: 0 },
    { rotulo: t('phone'), valor: telefoneMostrado, ir: 0 },
    { rotulo: t('email'), valor: email.trim() || '—', ir: 0 },
    ...(motorista
      ? [
          { rotulo: t('vehicleType'), valor: t(VEICULOS[vType]?.chaveNome), ir: 1 },
          { rotulo: t('vehicleModel'), valor: vModel || '—', ir: 1 },
          { rotulo: t('vehiclePlate'), valor: vPlate.trim().toUpperCase() || '—', ir: 1 },
          ...(VEICULOS[vType]?.perguntaLugares
            ? [{ rotulo: t('vehicleSeats'), valor: vSeats ? String(vSeats) : '—', ir: 1 }]
            : []),
          { rotulo: t('vehicleColor'), valor: vColor ? t(`cor_${vColor}`) : '—', ir: 1 },
        ]
      : []),
  ];

  const revisao = (
    <CartaoSeccao icone="documento" titulo={t('seccaoReviza')} subtitulo={t('seccaoRevizaSub')}>
      {linhasRevisao.map((l) => (
        <View key={l.rotulo} style={styles.revLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.revRotulo}>{l.rotulo}</Text>
            <Text style={styles.revValor}>{l.valor}</Text>
          </View>
          <Pressable
            onPress={() => irPara(l.ir)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${t('edita')} ${l.rotulo}`}
          >
            <Text style={styles.revEditar}>{t('edita')}</Text>
          </Pressable>
        </View>
      ))}
    </CartaoSeccao>
  );

  const confirmacao = (
    <CartaoSeccao
      icone="visto"
      titulo={t('seccaoKonfirma')}
      subtitulo={t('seccaoKonfirmaSub')}
      obrigatorio={t('obrigatoriu')}
    >
      {/* CIDADANIA, DECLARADA E NÃO VERIFICADA. A app não consegue provar a
          nacionalidade de ninguém — o que consegue é fazer a pergunta antes
          de haver conta, guardar a resposta com a hora, e pôr o documento à
          frente de quem aprova. */}
      {motorista ? (
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
      <AceitarTermos
        aceite={aceitou}
        onMudar={setAceitou}
        quem={role}
        onAbrir={() => navigation.navigate('Termos', { quem: role })}
      />
      <View style={{ height: spacing.sm }} />
      <AceitarTermos
        aceite={aceitouPrivacidade}
        onMudar={setAceitouPrivacidade}
        documento="privacidade"
        onAbrir={() => navigation.navigate('Termos', { documento: 'privacidade' })}
      />
    </CartaoSeccao>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <CabecalhoRegisto
            onVoltar={voltar}
            titulo={t('registerTitle')}
            subtitulo={t('registoSub')}
            ilustracao={DILI}
          />
          <Etapas etapas={etapas} actual={etapa} />

          {/* ── ETAPA 1: DADUS PESSOAL ─────────────────────────────── */}
          <View style={etapa !== 0 && styles.escondida}>
            <CartaoSeccao
              icone="pessoa"
              titulo={t('seccaoPessoal')}
              subtitulo={t('seccaoPessoalSub')}
              obrigatorio={t('obrigatoriu')}
            >
              <Text style={styles.rotulo}>
                {t('accountType')}
                <Text style={styles.asterisco}> *</Text>
              </Text>
              <SeletorConta valor={role} onMudar={setRole} />
              <TextField
                label={t('name')}
                value={name}
                onChangeText={setName}
                hint={t('nameHint')}
                autoCapitalize="words"
                icone="pessoa"
                obrigatorio
              />
              <CampoTelefone
                label={t('phone')}
                valor={phone}
                onChange={setPhone}
                // Conduzir é para cidadãos de Timor-Leste, e um número
                // timorense é a única parte disso que a app consegue verificar.
                soTimor={motorista}
                hint={t('driverSoTimorTel')}
                obrigatorio
              />
              <TextField
                label={t('email')}
                value={email}
                onChangeText={setEmail}
                hint={t('emailPorque')}
                keyboardType="email-address"
                autoCapitalize="none"
                icone="email"
                obrigatorio
                sucesso={emailCerto}
              />
              <TextField
                label={t('password')}
                value={password}
                onChangeText={setPassword}
                hint={t('passwordHint')}
                secureTextEntry
                autoCapitalize="none"
                icone="cadeado"
                obrigatorio
              />
              {/* O aviso de senhas diferentes aparece no próprio campo, e só
                  depois de a segunda ter sido escrita — a meio da escrita,
                  todas as senhas são diferentes. */}
              <TextField
                label={t('passwordConfirm')}
                value={password2}
                onChangeText={setPassword2}
                hint={t('passwordConfirmHint')}
                secureTextEntry
                autoCapitalize="none"
                icone="cadeado"
                obrigatorio
                error={
                  password2.length > 0 && password !== password2 ? t('errPasswordMismatch') : null
                }
              />
            </CartaoSeccao>
          </View>

          {/* ── ETAPA 2: DADUS VEÍKULU (só motorista) ou REVIZA (passageiro) ── */}
          {motorista ? (
            <View style={etapa !== 1 && styles.escondida}>
              <CartaoSeccao
                icone="carro"
                titulo={t('seccaoVeiculo')}
                subtitulo={t('seccaoVeiculoSub')}
                obrigatorio={t('obrigatoriu')}
              >
                <Text style={styles.rotulo}>
                  {t('vehicleType')}
                  <Text style={styles.asterisco}> *</Text>
                </Text>
                <EscolherTipoVeiculo valor={vType} onEscolher={setVType} />
                {vType === 'carry' ? (
                  <View style={styles.notaCarry}>
                    <Text style={styles.notaCarryTexto}>🛻 {t('carryNota')}</Text>
                  </View>
                ) : null}
                <EscolherMarcaModelo tipo={vType} onEscolher={setVModel} />
                <TextField
                  label={t('vehiclePlate')}
                  value={vPlate}
                  onChangeText={setVPlate}
                  placeholder={t(VEICULOS[vType]?.chaveMatricula || 'vehiclePlatePlaceholderCar')}
                  hint={t('vehiclePlateHint')}
                  autoCapitalize="characters"
                  icone="documento"
                  obrigatorio
                />
                {VEICULOS[vType]?.perguntaLugares ? (
                  <>
                    <Text style={styles.rotulo}>
                      {t('vehicleSeats')}?<Text style={styles.asterisco}> *</Text>
                    </Text>
                    <Text style={styles.ajuda}>{t('vehicleSeatsHelp')}</Text>
                    <EscolherLugares opcoes={LUGARES} valor={vSeats} onEscolher={setVSeats} />
                    <View style={{ height: spacing.md }} />
                  </>
                ) : null}
                <Text style={styles.rotulo}>
                  {t('vehicleColor')}
                  <Text style={styles.asterisco}> *</Text>
                </Text>
                <EscolherCor valor={vColor} onEscolher={setVColor} />
              </CartaoSeccao>
            </View>
          ) : (
            <View style={etapa !== 1 && styles.escondida}>{revisao}</View>
          )}

          {/* ── ETAPA 3: KONFIRMA ─────────────────────────────────── */}
          <View style={etapa !== 2 && styles.escondida}>
            {motorista ? revisao : null}
            {confirmacao}
          </View>

          <Aviso texto={error} style={styles.erro} />

          <Button
            title={ultima ? t('createAccountButton') : t('kontinua')}
            onPress={ultima ? onSubmit : avancar}
            loading={loading}
            variant="marca"
            tamanho="grande"
            iconeDireita={ultima ? undefined : '→'}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('haveAccountQuestion')} </Text>
            <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
              <Text style={styles.footerLink}>{t('signInLink')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    escondida: { display: 'none' },
    rotulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    ajuda: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    notaCarry: {
      backgroundColor: colors.tintaCarry,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
    },
    notaCarryTexto: { ...tipo.pequeno, color: colors.text },
    revLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    revRotulo: { ...tipo.legenda, color: colors.textMuted },
    revValor: { ...tipo.corpoForte, color: colors.text, marginTop: 1 },
    revEditar: { ...tipo.corpoForte, color: colors.teal },
    // A mesma forma da caixa de aceitar os termos, logo abaixo: declarar e
    // consentir são actos da mesma natureza e devem parecer-se.
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
    erro: { marginBottom: spacing.sm },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
    footerText: { ...tipo.corpo, color: colors.textMuted },
    footerLink: { ...tipo.corpoForte, color: colors.coralDark },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
