import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';

// ESCOLHER UMA DE POUCAS — Português | Tétum | English, Claro | Escuro.
// Sistema de design TGA. Todas as opções à vista, a escolhida cheia de teal:
// com duas ou três opções, uma lista que abre esconde o que se pode escolher.
// 48 px de altura por opção.
export default function SeletorSegmentado({ opcoes, valor, onMudar }) {
  return (
    <View style={styles.fundo} accessibilityRole="radiogroup">
      {opcoes.map((o) => {
        const activa = o.id === valor;
        return (
          <Pressable
            key={o.id}
            onPress={() => onMudar(o.id)}
            style={[styles.opcao, activa && styles.activa]}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
          >
            <Text style={[styles.texto, activa && styles.textoActivo]} numberOfLines={1}>
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
    activa: { backgroundColor: colors.teal },
    texto: { ...tipo.corpoForte, color: colors.textMuted },
    textoActivo: { color: colors.onTeal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
