import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';

// Campo de texto — sistema de design TGA (13/09/26).
//
// O estado de foco marca-se com o TEAL e não com uma sombra ou um brilho:
// é a cor da marca a dizer "é aqui que estás a escrever". O erro usa o
// vermelho e desce a mensagem por baixo, nunca substitui o rótulo — quem
// erra precisa de continuar a ver o que o campo pede.
//
// DAS REFERÊNCIAS TGA vieram três coisas, todas opcionais para os campos que
// já existiam não mudarem de comportamento:
//   · `icone` — o ícone num bloco à esquerda, separado por um traço. Diz o
//     que o campo pede antes de se ler o rótulo.
//   · `obrigatorio` — o asterisco vermelho ao lado do rótulo.
//   · `sucesso` — contorno teal e um visto quando o valor está validado.
// E o rótulo passou a frase normal a negrito ("Naran ofisiál *") em vez de
// maiúsculas pequenas: é o que as referências mostram, e lê-se melhor.
//
// O OLHO DA SENHA é desenhado (Icone 'olho') e não emoji: o emoji muda de
// forma em cada telemóvel, e era o último emoji do registo.
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  optionalLabel,
  icone,
  obrigatorio = false,
  sucesso = false,
  maxLength,
  onBlur,
  autoFocus,
}) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const certo = sucesso && !error;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {obrigatorio ? <Text style={styles.asterisco}> *</Text> : null}
          {optionalLabel ? (
            <Text style={styles.optional}>
              {'  ·  '}
              {optionalLabel}
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          icone && styles.comIcone,
          focused && styles.inputFocused,
          certo && styles.inputCerto,
          error && styles.inputError,
        ]}
      >
        {icone ? (
          <View style={styles.iconeCaixa}>
            <Icone
              nome={icone}
              tamanho={20}
              cor={error ? colors.danger : focused ? colors.teal : colors.textMuted}
            />
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            style={styles.olho}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('senhaMostrar') : t('senhaEsconder')}
          >
            <Icone nome={hidden ? 'olho' : 'olhoFechado'} tamanho={22} cor={colors.textMuted} />
          </Pressable>
        ) : certo ? (
          <View style={styles.olho}>
            <Icone nome="visto" tamanho={18} cor={colors.teal} traco={2.5} />
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    label: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    optional: { ...tipo.legenda, color: colors.textMuted },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    },
    comIcone: { paddingLeft: 0 },
    inputFocused: { borderColor: colors.teal },
    inputCerto: { borderColor: colors.teal },
    inputError: { borderColor: colors.danger },
    iconeCaixa: {
      width: 50,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      marginRight: spacing.md,
    },
    input: { flex: 1, ...tipo.corpo, color: colors.text, paddingVertical: 14 },
    olho: { paddingLeft: spacing.sm, justifyContent: 'center' },
    hint: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },
    errorText: { ...tipo.legenda, color: colors.danger, marginTop: spacing.xs },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
