import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// O CAMPO DE BUSCA — lupa, texto, e o ✕ para limpar quando há alguma coisa
// escrita. Sistema de design TGA. 52 px de altura, fundo branco, raio 20:
// é o mesmo campo no painel dos motoristas, das contas e do registo.
export default function CampoBusca({ valor, onMudar, placeholder }) {
  const { t } = useI18n();
  return (
    <View style={styles.caixa}>
      <Icone nome="lupa" tamanho={20} cor={colors.textMuted} />
      <TextInput
        style={styles.campo}
        value={valor}
        onChangeText={onMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {valor ? (
        <Pressable
          onPress={() => onMudar('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('limparBusca')}
        >
          <Icone nome="fechar" tamanho={18} cor={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    campo: { flex: 1, ...tipo.corpo, color: colors.text, paddingVertical: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
