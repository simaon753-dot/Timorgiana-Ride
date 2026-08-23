import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';

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
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  optional: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputFocused: { borderColor: colors.teal },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, paddingVertical: 14, fontSize: fontSize.md, color: colors.text },
  toggle: { fontSize: 18, paddingLeft: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  errorText: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.xs },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
