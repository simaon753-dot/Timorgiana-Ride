import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CORES } from '../dados/veiculos.js';
import { colors, spacing, fontSize, radius } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// Cores em amostras. O quadrado não precisa de língua nenhuma, e é por ele
// que a maioria vai escolher — mais depressa do que a ler dez nomes.
//
// Guarda-se o CÓDIGO da cor ('branco'), não a palavra: assim o passageiro
// lê "Branco" e o motorista lê "Mutin", cada um na sua língua.
export default function EscolherCor({ valor, onEscolher }) {
  const { t } = useI18n();

  return (
    <View style={styles.grelha}>
      {CORES.map((c) => {
        const activa = valor === c.id;
        return (
          <Pressable
            key={c.id}
            style={[styles.item, activa && styles.itemActivo]}
            onPress={() => onEscolher(c.id)}
            accessibilityRole="button"
            accessibilityLabel={t(`cor_${c.id}`)}
          >
            <View style={[styles.amostra, { backgroundColor: c.hex }]}>
              {activa ? (
                <Text style={[styles.visto, { color: escuro(c.hex) ? '#FFF' : '#111' }]}>✓</Text>
              ) : null}
            </View>
            <Text style={[styles.nome, activa && styles.nomeActivo]} numberOfLines={1}>
              {t(`cor_${c.id}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// O visto tem de se ver tanto sobre branco como sobre preto. Luminância
// aproximada chega para decidir de que cor o desenhar.
function escuro(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

const styles = StyleSheet.create({
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemActivo: { borderColor: colors.teal, backgroundColor: '#F0F5F4' },
  amostra: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visto: { fontWeight: '900', fontSize: 16 },
  nome: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  nomeActivo: { color: colors.teal, fontWeight: '700' },
});
