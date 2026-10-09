import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voltar from '../components/Voltar.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import Icone from '../design/Icone.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// CONFIRMAR O NÚMERO COM UM CÓDIGO POR SMS (05/10/2026, pedido do Simão).
//
// Para passageiros e motoristas. Só aparece quando o servidor tem o serviço
// de SMS ligado (`user.telefoneObrigatorio`): sem ele, ninguém podia
// confirmar, e a app não pede o impossível.
//
// Dois passos no mesmo ecrã: «Mandar o código» e depois escrevê-lo. O
// «Mandar outra vez» espera 60 segundos — cada SMS custa dinheiro, e quem
// carrega três vezes seguidas recebe três códigos e confunde-os.
const ESPERA = 60;

export default function ConfirmarTelefoneScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, refreshUser } = useAuth();
  const [mandado, setMandado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [falta, setFalta] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    if (!falta) return undefined;
    const id = setTimeout(() => setFalta((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [falta]);

  const numero = String(user?.phone || '').startsWith('+')
    ? user.phone
    : `+670 ${String(user?.phone || '').replace(/(\d{4})(\d{4})/, '$1 $2')}`;

  async function mandar() {
    setErro(null);
    setOcupado(true);
    try {
      const r = await api.telefoneEnviar(token);
      if (r?.jaEstava) {
        await refreshUser();
        setFeito(true);
        return;
      }
      setMandado(true);
      setFalta(ESPERA);
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setOcupado(false);
    }
  }

  // O 6.º ALGARISMO CONFIRMA SOZINHO (visto no simulador a 05/10/2026): com
  // o teclado aberto, o botão e o erro ficavam escondidos por baixo dele.
  async function confirmar(c = codigo) {
    Keyboard.dismiss();
    setErro(null);
    setOcupado(true);
    try {
      await api.telefoneConfirmar(token, c);
      await refreshUser();
      setFeito(true);
    } catch (e) {
      setErro(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Voltar navigation={navigation} />
          <View style={styles.icone}>
            <Icone nome={feito ? 'visto' : 'telefone'} tamanho={36} cor={colors.teal} />
          </View>
          <Text style={styles.titulo}>
            {feito ? t('telConfirmadoTitulo') : t('telConfirmarTitulo')}
          </Text>
          <Text style={styles.texto}>
            {feito ? t('telConfirmadoTexto') : t('telConfirmarTexto')}
          </Text>
          <View style={styles.numeroCaixa}>
            <Text style={styles.numero} selectable>
              {numero}
            </Text>
          </View>

          {feito ? (
            <Button
              title={t('telContinuar')}
              variant="secondary"
              tamanho="grande"
              onPress={() => navigation.goBack()}
            />
          ) : !mandado ? (
            <Button
              title={t('telMandarCodigo')}
              variant="secondary"
              tamanho="grande"
              loading={ocupado}
              disabled={ocupado}
              onPress={mandar}
            />
          ) : (
            <>
              <TextField
                label={t('telCodigo')}
                value={codigo}
                onChangeText={(v) => {
                  const c = v.replace(/\D/g, '').slice(0, 6);
                  setCodigo(c);
                  if (c.length === 6 && !ocupado) confirmar(c);
                }}
                keyboardType="number-pad"
                placeholder="123456"
                hint={t('telCodigoDica')}
                error={erro || undefined}
              />
              <Button
                title={t('telConfirmar')}
                variant="secondary"
                tamanho="grande"
                loading={ocupado}
                disabled={ocupado || codigo.length < 4}
                onPress={() => confirmar()}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                title={falta ? t('telMandarOutraEm', { s: falta }) : t('telMandarOutra')}
                variant="ghost"
                disabled={!!falta || ocupado}
                onPress={mandar}
              />
            </>
          )}

          {erro && !mandado ? <Text style={styles.erro}>{erro}</Text> : null}
          {!feito ? <Text style={styles.nota}>{t('telNota')}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, gap: spacing.md },
    icone: { alignItems: 'center', marginTop: spacing.xs },
    titulo: { ...tipo.displayPequeno, color: colors.text, textAlign: 'center' },
    texto: { ...tipo.corpo, color: colors.textMuted, textAlign: 'center' },
    numeroCaixa: {
      alignSelf: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    numero: { ...tipo.subtitulo, color: colors.text, fontVariant: ['tabular-nums'] },
    erro: { ...tipo.pequeno, color: colors.danger, textAlign: 'center' },
    nota: { ...tipo.legenda, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
