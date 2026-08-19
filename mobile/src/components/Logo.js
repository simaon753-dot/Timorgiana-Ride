import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius } from '../theme.js';

// Wordmark TimorgianaRide. onTeal=true para fundo escuro.
export default function Logo({ size = 'lg', onTeal = false }) {
  const big = size === 'lg';
  const baseColor = onTeal ? colors.onTeal : colors.teal;
  return (
    <View style={styles.row}>
      <View style={[styles.mark, big ? styles.markLg : styles.markSm]}>
        <Text style={[styles.markText, big ? styles.markTextLg : styles.markTextSm]}>T</Text>
      </View>
      <Text style={[styles.word, { fontSize: big ? fontSize.xl : fontSize.lg, color: baseColor }]}>
        Timorgiana<Text style={{ color: colors.coral }}>Ride</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mark: {
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: radius.md,
  },
  markLg: { width: 44, height: 44 },
  markSm: { width: 32, height: 32, borderRadius: radius.sm },
  markText: { color: colors.white, fontWeight: '900' },
  markTextLg: { fontSize: 26 },
  markTextSm: { fontSize: 18 },
  word: { fontWeight: '800', letterSpacing: 0.2 },
});
