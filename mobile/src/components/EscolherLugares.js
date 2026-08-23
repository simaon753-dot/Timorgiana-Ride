import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';

// Quantos lugares / quantas pessoas. Botões e não uma lista: são poucos
// números e vê-se todos de uma vez, sem abrir nada.
export default function EscolherLugares({ opcoes, valor, onEscolher, maximo }) {
  return (
    <View style={styles.linha}>
      {opcoes.map((n) => {
        const activo = valor === n;
        // Acima do que o carro leva, o número não desaparece — fica
        // apagado. Ver que existe e não dá é mais claro do que não ver.
        const impossivel = maximo != null && n > maximo;
        return (
          <Pressable
            key={n}
            style={[styles.bola, activo && styles.bolaActiva, impossivel && styles.bolaImpossivel]}
            onPress={() => !impossivel && onEscolher(n)}
            disabled={impossivel}
            accessibilityRole="button"
            accessibilityState={{ selected: activo, disabled: impossivel }}
          >
            <Text
              style={[
                styles.numero,
                activo && styles.numeroActivo,
                impossivel && styles.numeroImpossivel,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  linha: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  bola: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolaActiva: { backgroundColor: colors.teal, borderColor: colors.teal },
  bolaImpossivel: { opacity: 0.35 },
  numero: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  numeroActivo: { color: colors.white },
  numeroImpossivel: { color: colors.textMuted },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
