import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Logo from './Logo.js';
import { colors, spacing, fontSize, registarEstilos } from '../theme.js';
import { useAuth } from '../context/AuthContext.js';

// Barra de cima: a marca à esquerda, a pessoa à direita.
//
// O avatar leva as iniciais em vez de um ícone genérico — num serviço onde
// duas pessoas se encontram na rua, ver o próprio nome ali confirma logo
// que se está na conta certa. Já perdemos tempo com pedidos feitos da
// conta errada.
export default function BarraTopo({ navigation, titulo }) {
  const { user } = useAuth();
  const iniciais = (user?.name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.barra}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : <Logo size="sm" />}

      <Pressable
        onPress={() => navigation.navigate('PerfilTab')}
        style={styles.avatar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={user?.name}
      >
        <Text style={styles.iniciais}>{iniciais}</Text>
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
  iniciais: { color: colors.onTeal, fontWeight: '800', fontSize: 14 },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
