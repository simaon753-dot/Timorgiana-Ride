import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Logo from './Logo.js';
import { colors, spacing, fontSize, radius } from '../theme.js';
import { useAuth } from '../context/AuthContext.js';
import { useModo } from '../context/ModoContext.js';
import { useI18n } from '../i18n/index.js';

// Barra de cima: a marca à esquerda, a pessoa à direita.
//
// O avatar leva as iniciais em vez de um ícone genérico — num serviço onde
// duas pessoas se encontram na rua, ver o próprio nome ali confirma logo
// que se está na conta certa. Já perdemos tempo com pedidos feitos da
// conta errada.
export default function BarraTopo({ navigation, titulo }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { modo, setModo, podeConduzir } = useModo();
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

      {/* Só aparece a quem pode fazer as duas coisas. Para a esmagadora
          maioria — que só pede viagens — este interruptor seria uma
          pergunta sem sentido. */}
      {podeConduzir ? (
        <View style={styles.modo}>
          {['passageiro', 'motorista'].map((m) => (
            <Pressable
              key={m}
              onPress={() => setModo(m)}
              style={[styles.modoOpcao, modo === m && styles.modoOpcaoActiva]}
            >
              <Text style={[styles.modoTexto, modo === m && styles.modoTextoActivo]}>
                {m === 'passageiro' ? t('modeRide') : t('modeDrive')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={() => navigation.navigate('Perfil')}
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

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titulo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  modo: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 2,
    marginHorizontal: spacing.sm,
  },
  modoOpcao: { paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  modoOpcaoActiva: { backgroundColor: colors.teal },
  modoTexto: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  modoTextoActivo: { color: colors.onTeal },
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
