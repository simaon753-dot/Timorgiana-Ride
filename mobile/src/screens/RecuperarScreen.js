import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voltar from '../components/Voltar.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import Aviso from '../design/Aviso.js';
import Logo from '../components/Logo.js';
import { useI18n } from '../i18n/index.js';
import { api } from '../api/client.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

// Recuperar o acesso com um código dado pelo administrador.
//
// PORQUE NÃO HÁ AQUI UM "ENVIAR SMS". Uma mensagem para Timor-Leste custa
// $0,26 e obriga a manter viva uma conta de facturação com cartão — que é o
// que já falhou uma vez neste projecto e deixou o mapa do Google desligado.
// Um serviço em que ninguém consegue criar conta porque um cartão expirou é
// pior do que um serviço sem SMS.
//
// Quem esquece a palavra-passe telefona. O código diz-se nessa chamada, e
// quem atende já sabe com quem está a falar.
//
// E O ADMINISTRADOR NUNCA FICA A SABER A SENHA. Podia simplesmente definir
// uma e dizê-la — era mais simples. Mas passava a haver alguém que sabe a
// palavra-passe de outra pessoa, e no dia em que houvesse uma disputa sobre
// uma viagem ou um pagamento feito nesta conta, isso estragava qualquer
// explicação. Assim ele prova que falou com a pessoa, e mais nada.
export default function RecuperarScreen({ navigation }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  async function enviar() {
    setErro(null);
    if (phone.replace(/[\s()-]/g, '').length < 7) return setErro(t('errPhoneRequired'));
    if (codigo.trim().length !== 6) return setErro(t('recCodigoInvalido'));
    if (password.length < 6) return setErro(t('errPasswordShort'));
    if (password !== password2) return setErro(t('errPasswordMismatch'));
    setAEnviar(true);
    try {
      await api.recuperar({ phone: phone.trim(), codigo: codigo.trim(), password });
      setFeito(true);
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setAEnviar(false);
    }
  }

  if (feito) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BarraEstado />
        <View style={styles.centro}>
          <Text style={styles.icone}>✓</Text>
          <Text style={styles.titulo}>{t('recFeitoTitulo')}</Text>
          <Text style={styles.explica}>{t('recFeitoTexto')}</Text>
          <Button
            title={t('loginButton')}
            onPress={() => navigation.navigate('Login')}
            tamanho="grande"
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Voltar navigation={navigation} />
          <Logo />
          <Text style={styles.titulo}>{t('recTitulo')}</Text>
          {/* Diz COMO se obtém o código, e não só que é preciso um. Sem isto,
              quem chega aqui fica a olhar para uma caixa vazia sem saber o
              que lá pôr — e é justamente quem já não consegue entrar. */}
          <Text style={styles.explica}>{t('recComo')}</Text>

          <TextField
            label={t('phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <TextField
            label={t('recCodigo')}
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="000000"
          />
          <TextField
            label={t('recNovaSenha')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextField
            label={t('recConfirmar')}
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
            erro={password2.length > 0 && password !== password2 ? t('errPasswordMismatch') : null}
          />

          <Aviso texto={erro} style={{ marginTop: spacing.sm }} />

          <Button
            title={t('recGuardar')}
            onPress={enviar}
            loading={aEnviar}
            tamanho="grande"
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { padding: spacing.lg, gap: spacing.sm },
    centro: { flex: 1, justifyContent: 'center', padding: spacing.lg },
    icone: { fontSize: 46, color: colors.teal, textAlign: 'center' },
    titulo: { ...tipo.display, color: colors.text, marginTop: spacing.md },
    explica: { ...tipo.corpo, color: colors.textMuted, marginBottom: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
