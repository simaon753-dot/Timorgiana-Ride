import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import Button from '../components/Button.js';

// O ESTADO VAZIO — sistema de design TGA. Um desenho, uma frase que diz O QUE
// falta, uma que diz porquê ou o que vem a seguir, e às vezes uma acção.
//
// Nunca um ecrã em branco nem só "Sem dados": uma lista vazia lê-se como "não
// carregou", e a pessoa volta a tentar em vez de perceber que está tudo bem.
//
// A imagem (as ilustrações dos veículos) vai num quadrado da cor do fundo
// DELA, como em todo o lado — ver SISTEMA.md. Sem imagem, um ícone grande e
// fino, sozinho.
export default function EstadoVazio({ imagem, icone, titulo, texto, accao, onAccao }) {
  return (
    <View style={styles.caixa}>
      {imagem ? (
        <View style={styles.imagemCaixa}>
          <Image source={imagem} style={styles.imagem} resizeMode="contain" />
        </View>
      ) : icone ? (
        <View style={styles.icone}>
          <Icone nome={icone} tamanho={56} cor={colors.teal} traco={1.5} />
        </View>
      ) : null}
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      {accao ? (
        <View style={styles.accao}>
          <Button title={accao} variant="secondary" onPress={onAccao} />
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    imagemCaixa: {
      width: 160,
      height: 110,
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF',
    },
    imagem: { width: 160, height: 110 },
    icone: { marginBottom: spacing.md },
    titulo: { ...tipo.subtitulo, color: colors.text, textAlign: 'center' },
    texto: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    accao: { marginTop: spacing.lg, alignSelf: 'stretch', paddingHorizontal: spacing.xl },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
