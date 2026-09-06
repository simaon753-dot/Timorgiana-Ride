import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import TextField from './TextField.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// A faixa que pede a confirmação do email.
//
// É UMA FAIXA E NÃO UMA PORTA. Quem se regista entra e usa a app; isto fica
// aqui até confirmar. Bloquear a entrada punha um serviço de correio no
// caminho de quem se está a inscrever — e na rede de Díli isso são
// utilizadores perdidos à porta, por uma funcionalidade que só serve num dia
// mau.
//
// MAS NÃO DESAPARECE. É o único mecanismo que apanha um endereço bem escrito
// e errado: `simao@gmial.com` é válido, existe, e não é dele. Nenhuma
// verificação de formato o distingue — só o código, que nunca chega. Uma
// faixa que se pudesse fechar deixava esse caso invisível para sempre.
//
// E POR ISSO TEM O "ESCREVI MAL". Quem percebe que o código não vem precisa
// de poder trocar o endereço; sem isso, um engano de uma letra tornava a
// conta irrecuperável.
export default function ConfirmarEmail() {
  const { t } = useI18n();
  const { user, token, refreshUser } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [aMudar, setAMudar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [erro, setErro] = useState(null);

  if (!user || user.emailConfirmado) return null;

  async function correr(fn) {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setErro(e?.message || t('errGeneric'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View style={styles.caixa}>
      <Text style={styles.titulo}>✉️ {t('emailPorConfirmar')}</Text>
      <Text style={styles.email}>{user.email || '—'}</Text>
      <Text style={styles.nota}>{t('emailPorConfirmarNota')}</Text>

      {aMudar ? (
        <>
          <TextField
            label={t('email')}
            value={novoEmail}
            onChangeText={setNovoEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable
            style={styles.botao}
            disabled={ocupado || !novoEmail.trim()}
            onPress={() =>
              correr(async () => {
                await api.mudarEmail(token, novoEmail.trim());
                setNovoEmail('');
                setAMudar(false);
                setAviso(t('emailCodigoEnviado'));
                await refreshUser();
              })
            }
          >
            <Text style={styles.botaoTexto}>{t('lugarGuardar')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextField
            label={t('emailCodigo')}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.botao, (ocupado || codigo.trim().length < 4) && styles.botaoInativo]}
            disabled={ocupado || codigo.trim().length < 4}
            onPress={() =>
              correr(async () => {
                await api.confirmarEmail(token, codigo.trim());
                setCodigo('');
                await refreshUser();
              })
            }
          >
            {ocupado ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.botaoTexto}>{t('emailConfirmar')}</Text>
            )}
          </Pressable>
        </>
      )}

      <View style={styles.linhaAcoes}>
        <Pressable
          onPress={() =>
            correr(async () => {
              await api.reenviarEmail(token);
              setAviso(t('emailCodigoEnviado'));
            })
          }
          hitSlop={8}
        >
          <Text style={styles.accao}>{t('emailReenviar')}</Text>
        </Pressable>
        <Pressable onPress={() => setAMudar((v) => !v)} hitSlop={8}>
          <Text style={styles.accao}>{aMudar ? t('cancel') : t('emailMudar')}</Text>
        </Pressable>
      </View>

      {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.coral,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    titulo: { ...tipo.subtitulo, color: colors.text },
    email: { ...tipo.corpoForte, color: colors.teal, marginTop: 2 },
    nota: { ...tipo.pequeno, color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm },
    botao: {
      backgroundColor: colors.teal,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    botaoInativo: { opacity: 0.5 },
    botaoTexto: { ...tipo.corpoForte, color: colors.white },
    linhaAcoes: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    accao: { ...tipo.pequeno, color: colors.teal, fontWeight: '700' },
    aviso: { ...tipo.pequeno, color: colors.success, marginTop: spacing.sm },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
