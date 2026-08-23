import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Logo from './Logo.js';
import { colors, spacing, fontSize, registarEstilos } from '../theme.js';
import { useAuth } from '../context/AuthContext.js';

// Barra de cima: a marca à esquerda, o perfil à direita.
//
// Levou iniciais durante algum tempo, com a ideia de confirmar a conta de
// relance. Na prática o Simão preferiu o ícone: com três línguas e nomes
// timorenses longos, duas letras dizem menos do que uma silhueta que toda
// a gente reconhece como "eu".
export default function BarraTopo({ navigation, titulo }) {
  const { user } = useAuth();
  return (
    <View style={styles.barra}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : <Logo size="sm" />}

      <Pressable
        onPress={() => navigation.navigate('Perfil')}
        style={styles.avatar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={user?.name}
      >
        <Text style={styles.iniciais}>👤</Text>
      </Pressable>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titulo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: { fontSize: 19, lineHeight: 23 },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
