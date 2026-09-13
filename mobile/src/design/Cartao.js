import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// O CARTÃO BRANCO — sistema de design TGA. Raio 20, contorno de um fio,
// sombra plana. Com `titulo`, leva um cabeçalho com ícone e um lugar à
// direita (o "Edita", o saldo de dias). Com `lista`, o corpo não tem margem
// interior, para as linhas de menu irem de ponta a ponta com o traço entre
// elas.
export default function Cartao({ icone, titulo, direita, lista = false, children, style }) {
  return (
    <View style={[styles.cartao, style]}>
      {titulo ? (
        <View style={styles.cabeca}>
          {icone ? <Icone nome={icone} tamanho={22} cor={colors.teal} /> : null}
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {direita}
        </View>
      ) : null}
      <View style={lista ? null : styles.corpo}>{children}</View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...elevacao.plana,
    },
    cabeca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    titulo: { ...tipo.subtitulo, color: colors.teal, flex: 1 },
    corpo: { padding: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
