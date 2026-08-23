import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Campo de texto.
//
// O estado de foco marca-se com o TEAL e não com uma sombra ou um brilho:
// é a cor da marca a dizer "é aqui que estás a escrever". O erro usa o
// vermelho e desce a mensagem por baixo, nunca substitui o rótulo — quem
// erra precisa de continuar a ver o que o campo pede.

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
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {optionalLabel ? <Text style={styles.optional}>  ·  {optionalLabel}</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.inputRow, focused && styles.inputFocused, error && styles.inputError]}>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Text style={styles.toggle}>{hidden ? '👁' : '🙈'}</Text>
          </Pressable>
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
  label: { ...tipo.etiqueta, color: colors.textMuted, marginBottom: spacing.sm },
  optional: { ...tipo.legenda, color: colors.textMuted, textTransform: 'none', letterSpacing: 0 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  inputFocused: { borderColor: colors.teal },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, ...tipo.corpo, color: colors.text, paddingVertical: 14 },
  toggle: { fontSize: 18, paddingLeft: spacing.sm },
  hint: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },
  errorText: { ...tipo.legenda, color: colors.danger, marginTop: spacing.xs },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
