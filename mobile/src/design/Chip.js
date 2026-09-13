import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// A PASTILHA DE FILTRO — "👥 Hotu", "🕐 Hein 0" — sistema de design TGA.
//
// A activa é cheia de teal; as outras são brancas com um fio. A contagem vai
// num círculo à direita, e só quando o servidor a dá: um "0" inventado seria
// pior do que nenhum número. 40 px de altura, com folga para o dedo.
export default function Chip({ icone, texto, contagem, activo, onPress }) {
  const cor = activo ? colors.onTeal : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, activo && styles.activo, pressed && styles.premido]}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
    >
      {icone ? <Icone nome={icone} tamanho={17} cor={cor} /> : null}
      <Text style={[styles.texto, { color: cor }]} numberOfLines={1}>
        {texto}
      </Text>
      {contagem != null ? (
        <View style={[styles.contagem, activo && styles.contagemActiva]}>
          <Text style={[styles.contagemTexto, activo && { color: colors.teal }]}>{contagem}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function FilaChips({ children }) {
  return <View style={styles.fila}>{children}</View>;
}

const criarEstilos = () =>
  StyleSheet.create({
    fila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    activo: { backgroundColor: colors.teal, borderColor: colors.teal },
    premido: { opacity: 0.8 },
    texto: { ...tipo.corpoForte, fontSize: 14 },
    contagem: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tintaTeal,
    },
    contagemActiva: { backgroundColor: colors.onTeal },
    contagemTexto: { ...tipo.legenda, color: colors.teal, fontVariant: ['tabular-nums'] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
