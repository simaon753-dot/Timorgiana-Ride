import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// O TÍTULO DE UMA SECÇÃO — "🌐 LIAN · Escolhe o teu idioma" — sistema de
// design TGA. Ícone sozinho (sem disco), a etiqueta em maiúsculas, e à direita
// uma nota discreta OU uma acção ("Haree hotu ›"), nunca as duas.
export default function SeccaoTitulo({ icone, titulo, nota, accao, onAccao }) {
  return (
    <View style={styles.linha}>
      {icone ? <Icone nome={icone} tamanho={20} cor={colors.teal} /> : null}
      <Text style={styles.titulo} numberOfLines={1}>
        {titulo}
      </Text>
      {accao ? (
        <Pressable onPress={onAccao} hitSlop={10} style={styles.accao} accessibilityRole="button">
          <Text style={styles.accaoTexto}>{accao}</Text>
          <Icone nome="seta" tamanho={14} cor={colors.teal} traco={2.5} />
        </Pressable>
      ) : nota ? (
        <Text style={styles.nota} numberOfLines={1}>
          {nota}
        </Text>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    titulo: { ...tipo.etiqueta, color: colors.text, flex: 1 },
    nota: { ...tipo.legenda, color: colors.textMuted, flexShrink: 1 },
    accao: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
    accaoTexto: { ...tipo.corpoForte, fontSize: 13, color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
