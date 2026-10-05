import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// A FAIXA «CONFIRME O SEU NÚMERO» (05/10/2026), no início do passageiro e do
// motorista. Só aparece quando o servidor exige a confirmação por SMS e ela
// ainda não foi feita; um toque abre o ecrã do código.
export default function FaixaTelefone({ navigation }) {
  const { t } = useI18n();
  const { user } = useAuth();
  if (!user?.telefoneObrigatorio) return null;
  return (
    <Pressable
      onPress={() => navigation.navigate('ConfirmarTelefone')}
      style={({ pressed }) => [styles.faixa, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
    >
      <Icone nome="telefone" tamanho={24} cor={colors.coralDark} />
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>{t('telFaixaTitulo')}</Text>
        <Text style={styles.texto}>{t('telFaixaTexto')}</Text>
      </View>
      <Icone nome="seta" tamanho={18} cor={colors.coralDark} traco={2.4} />
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    faixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      minHeight: 56,
    },
    titulo: { ...tipo.corpoForte, color: colors.text },
    texto: { ...tipo.pequeno, color: colors.textMuted },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
