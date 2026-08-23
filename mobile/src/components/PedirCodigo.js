import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Onde o motorista escreve o código que o passageiro lhe disse.
//
// Não mostra o código em lado nenhum — ele nunca o recebe. Se o soubesse,
// podia começar viagens sem ninguém no carro, e o código deixava de provar
// o que quer que fosse.
export default function PedirCodigo({ visivel, onFechar, onConfirmar, erro, aEnviar }) {
  const { t } = useI18n();
  const [codigo, setCodigo] = useState('');

  function confirmar() {
    if (codigo.length !== 4) return;
    onConfirmar(codigo);
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <SafeAreaView edges={['bottom']} style={styles.painel}>
          <View style={styles.puxador} />
          <Text style={styles.titulo}>{t('askCodeTitle')}</Text>
          <Text style={styles.ajuda}>{t('askCodeHelp')}</Text>

          <TextInput
            style={styles.campo}
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            placeholder="––––"
            placeholderTextColor={colors.border}
          />

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <View style={styles.botoes}>
            <View style={{ flex: 1 }}>
              <Button title={t('cancel')} variant="ghost" onPress={onFechar} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('askCodeConfirm')}
                onPress={confirmar}
                disabled={codigo.length !== 4}
                loading={aEnviar}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    painel: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    puxador: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    titulo: { ...tipo.titulo, color: colors.text },
    ajuda: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 19 },
    campo: {
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.teal,
      borderRadius: radius.md,
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 38,
      fontWeight: '800',
      letterSpacing: 12,
      textAlign: 'center',
      color: colors.text,
    },
    erro: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
    botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
