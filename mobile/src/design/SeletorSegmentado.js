import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';

// ESCOLHER UMA DE POUCAS — Português | Tétum | English, Claro | Escuro.
// Sistema de design TGA. Todas as opções à vista, a escolhida cheia de teal:
// com duas ou três opções, uma lista que abre esconde o que se pode escolher.
// 48 px de altura por opção.
//
// `compacto` (05/10/2026): 36 px, para caber ao lado de um título — o do
// gráfico dos Ganhos. Continua com a folga do dedo pelo `hitSlop`.
export default function SeletorSegmentado({ opcoes, valor, onMudar, compacto = false }) {
  return (
    <View style={[styles.fundo, compacto && styles.fundoCompacto]} accessibilityRole="radiogroup">
      {opcoes.map((o) => {
        const activa = o.id === valor;
        return (
          <Pressable
            key={o.id}
            onPress={() => onMudar(o.id)}
            hitSlop={compacto ? 6 : 0}
            style={[styles.opcao, compacto && styles.opcaoCompacta, activa && styles.activa]}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
          >
            <Text
              style={[styles.texto, compacto && styles.textoCompacto, activa && styles.textoActivo]}
              numberOfLines={1}
              maxFontSizeMultiplier={compacto ? 1.2 : undefined}
            >
              {o.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: {
      flexDirection: 'row',
      backgroundColor: colors.paper,
      borderRadius: radius.pill,
      padding: 4,
    },
    opcao: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: 6,
    },
    fundoCompacto: { padding: 3 },
    opcaoCompacta: { minHeight: 32, paddingHorizontal: 8 },
    textoCompacto: { fontSize: 13 },
    activa: { backgroundColor: colors.teal },
    texto: { ...tipo.corpoForte, color: colors.textMuted },
    textoActivo: { color: colors.onTeal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
