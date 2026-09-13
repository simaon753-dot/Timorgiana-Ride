import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// AS LINHAS DE UM CARTÃO — sistema de design TGA.
//
// LinhaMenu: ícone, título, uma frase por baixo e a seta — leva a outro sítio
// (Termu, Servidór, Painel). 56 px de altura no mínimo: toca-se de pé, com o
// telemóvel numa mão.
//
// LinhaInfo: ícone, rótulo discreto à esquerda e o VALOR forte à direita —
// mostra uma coisa (Telefone 74192857). Pode ter toque (ligar) ou não.
//
// O ícone vai SOZINHO, sem disco de cor por trás (regra do Simão). O vermelho
// é só para o que é perigo de facto (Emerjénsia); o resto é teal.
//
// `ultimo` tira o traço de baixo: o último traço encostava ao contorno do
// cartão e ficavam duas linhas coladas.
export function LinhaMenu({ icone, titulo, subtitulo, onPress, perigo, ultimo, direita }) {
  const cor = perigo ? colors.danger : colors.teal;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.linha, !ultimo && styles.traco, pressed && styles.premida]}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      {icone ? <Icone nome={icone} tamanho={24} cor={cor} /> : null}
      <View style={styles.textos}>
        <Text style={[styles.titulo, perigo && { color: colors.danger }]}>{titulo}</Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {direita}
      {onPress ? <Icone nome="seta" tamanho={18} cor={colors.textMuted} traco={2.4} /> : null}
    </Pressable>
  );
}

export function LinhaInfo({ icone, rotulo, valor, onPress, forte, mau, ultimo, extra }) {
  if (valor == null || valor === '') return null;
  const conteudo = (
    <>
      {icone ? <Icone nome={icone} tamanho={22} cor={colors.teal} /> : null}
      <Text style={styles.rotulo} numberOfLines={1}>
        {rotulo}
      </Text>
      <View style={styles.valorCaixa}>
        <Text
          style={[styles.valor, forte && styles.valorForte, mau && { color: colors.danger }]}
          numberOfLines={2}
        >
          {valor}
        </Text>
        {extra}
      </View>
      {onPress ? <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.linha, !ultimo && styles.traco]}>{conteudo}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linha, !ultimo && styles.traco, pressed && styles.premida]}
      accessibilityRole="button"
    >
      {conteudo}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    traco: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    premida: { backgroundColor: colors.tintaTeal },
    textos: { flex: 1 },
    titulo: { ...tipo.corpoForte, color: colors.text },
    subtitulo: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    rotulo: { ...tipo.pequeno, color: colors.textMuted, flexShrink: 0, maxWidth: '45%' },
    valorCaixa: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    valor: { ...tipo.corpoForte, color: colors.text, textAlign: 'right', flexShrink: 1 },
    valorForte: { color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
