import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme.js';

// Estrelas selecionáveis (ou só de leitura). value 0–5.
export default function StarRating({ value = 0, onChange, size = 40, readOnly = false }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={readOnly}
          onPress={() => onChange && onChange(n)}
          hitSlop={6}
          style={styles.star}
        >
          <Text style={{ fontSize: size, color: n <= value ? colors.star : colors.border }}>
            {n <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  star: { paddingHorizontal: 4 },
});
