import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';

// Aviso — erro, informação ou confirmação.
//
// Os erros estavam espalhados como linhas vermelhas soltas por baixo dos
// formulários. Uma linha de texto vermelho num ecrã cheio de texto não se
// vê no momento em que é preciso vê-la: quando alguém acabou de falhar a
// entrada e está a olhar para o botão, não para o espaço acima dele.
//
// Aqui o aviso tem fundo, contorno e uma barra de cor à esquerda. A barra
// faz o trabalho todo — é o que se detecta pelo canto do olho.
const TIPOS = {
  erro: { cor: () => colors.danger, sinal: '!' },
  aviso: { cor: () => colors.coral, sinal: '!' },
  info: { cor: () => colors.teal, sinal: 'i' },
  sucesso: { cor: () => colors.success, sinal: '✓' },
};

export default function Aviso({ tipoAviso = 'erro', texto, style }) {
  if (!texto) return null;
  const def = TIPOS[tipoAviso] || TIPOS.erro;
  const cor = def.cor();

  return (
    <View
      style={[styles.caixa, { borderColor: cor }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.barra, { backgroundColor: cor }]} />
      <Text style={[styles.sinal, { color: cor }]}>{def.sinal}</Text>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingRight: spacing.md,
      paddingLeft: spacing.md,
      overflow: 'hidden',
    },
    barra: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    sinal: { ...tipo.corpoForte, width: 18, textAlign: 'center', marginRight: spacing.xs },
    // `flex: 1` para o texto quebrar em vez de empurrar a caixa para fora
    // do ecrã — mensagens do servidor podem ser compridas.
    texto: { ...tipo.pequeno, color: colors.text, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
