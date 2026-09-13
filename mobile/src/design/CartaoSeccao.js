import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// O CARTÃO DE SECÇÃO — sistema de design TGA.
//
// Uma caixa branca de cantos largos, com um distintivo teal redondo, o
// título em maiúsculas ("1. DADUS PESSOAL"), uma linha a dizer o que se
// pede, e "Obrigatóriu *" à direita quando o é. Os campos vão dentro.
//
// É o que dá ao registo o aspecto de formulário arrumado das referências:
// cada grupo de perguntas numa caixa própria, em vez de uma coluna comprida
// de campos soltos em que ninguém sabe onde acaba uma coisa e começa outra.
export default function CartaoSeccao({ icone, titulo, subtitulo, obrigatorio, children }) {
  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        {icone ? (
          <View style={styles.distintivo}>
            <Icone nome={icone} tamanho={22} cor={colors.onTeal} />
          </View>
        ) : null}
        <View style={styles.textos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>
        {obrigatorio ? (
          <Text style={styles.obrigatorio}>
            {obrigatorio} <Text style={styles.asterisco}>*</Text>
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.md,
      paddingTop: spacing.lg,
      marginBottom: spacing.md,
      ...elevacao.flutuante,
    },
    topo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
    distintivo: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    textos: { flex: 1 },
    titulo: { ...tipo.subtitulo, color: colors.text, letterSpacing: 0.3 },
    subtitulo: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    obrigatorio: { ...tipo.legenda, color: colors.textMuted, marginTop: 3 },
    asterisco: { color: colors.danger },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
