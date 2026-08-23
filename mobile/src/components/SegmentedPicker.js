import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Selector segmentado genérico.
// options: [{ value, label, icon }]
export default function SegmentedPicker({ options, value, onChange }) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.option, active && styles.optionActive]}
          >
            {opt.icon ? <Text style={styles.icon}>{opt.icon}</Text> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.sm },
    option: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    optionActive: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    icon: { fontSize: 24, marginBottom: spacing.xs },
    label: { ...tipo.corpoForte, color: colors.textMuted },
    labelActive: { color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
