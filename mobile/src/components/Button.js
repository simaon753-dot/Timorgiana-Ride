import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';

// variant: 'primary' (coral) | 'secondary' (teal) | 'outline' | 'ghost'
export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant] || VARIANTS.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.label, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: colors.coral, fg: colors.white, border: colors.coral },
  secondary: { bg: colors.teal, fg: colors.onTeal, border: colors.teal },
  outline: { bg: 'transparent', fg: colors.teal, border: colors.teal },
  ghost: { bg: 'transparent', fg: colors.teal, border: 'transparent' },
};

const criarEstilos = () =>
  StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  label: { fontSize: fontSize.md, fontWeight: '700' },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
