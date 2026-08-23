import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Button from '../components/Button.js';

// Estado vazio.
//
// Um ecrã sem nada é o momento em que uma app parece avariada. Antes cada
// lista aqui mostrava uma linha cinzenta a dizer "sem viagens" — o que
// informa mas não ajuda, e parece um erro.
//
// Três partes, sempre pela mesma ordem: um sinal, o que se passa, e o que
// fazer a seguir. A terceira é a que distingue um estado vazio de uma
// mensagem de erro.
export default function Vazio({ sinal = '·', titulo, texto, accao, onAccao }) {
  return (
    <View style={styles.caixa}>
      <Text style={styles.sinal}>{sinal}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      {accao && onAccao ? (
        <Button title={accao} onPress={onAccao} variant="outline" style={styles.botao} />
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    sinal: { fontSize: 40, marginBottom: spacing.sm, opacity: 0.55 },
    titulo: { ...tipo.subtitulo, color: colors.text, textAlign: 'center' },
    texto: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      maxWidth: 280,
    },
    botao: { marginTop: spacing.lg, minWidth: 200 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
