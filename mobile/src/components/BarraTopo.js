import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Logo from './Logo.js';
import { colors, spacing, fontSize, registarEstilos, elevacao, radius } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useAuth } from '../context/AuthContext.js';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';

// Barra de cima: a marca à esquerda, o perfil à direita.
//
// Levou iniciais durante algum tempo, com a ideia de confirmar a conta de
// relance. Na prática o Simão preferiu o ícone: com três línguas e nomes
// timorenses longos, duas letras dizem menos do que uma silhueta que toda
// a gente reconhece como "eu".
//
// Sem círculo por trás. O emoji 👤 é uma silhueta CLARA, e sobre o círculo
// teal escuro quase desaparecia — parecia uma mancha. Sozinho lê-se nos
// dois temas; a falta de fundo compensa-se com tamanho, e a área de toque
// mantém-se pelo hitSlop.
// `motoristaOnline` (true/false) mostra a pastilha "Motorista · Online" da
// referência em vez do círculo do perfil; sem ela (passageiro), fica o círculo.
// As duas levam ao Perfil.
export default function BarraTopo({ navigation, titulo, motoristaOnline }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const motorista = motoristaOnline === true || motoristaOnline === false;
  return (
    <View style={styles.barra}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : <Logo size="sm" />}

      {motorista ? (
        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          style={styles.pastilha}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('driver')} · ${t(motoristaOnline ? 'estadoOnline' : 'estadoOffline')}`}
        >
          <View style={styles.pastilhaIcone}>
            <Icone nome="volante" tamanho={20} cor={colors.teal} />
            <View
              style={[
                styles.ponto,
                { backgroundColor: motoristaOnline ? colors.success : colors.textMuted },
              ]}
            />
          </View>
          <View>
            <Text style={styles.pastilhaNome}>{t('driver')}</Text>
            <Text style={styles.pastilhaEstado}>
              {t(motoristaOnline ? 'estadoOnline' : 'estadoOffline')}
            </Text>
          </View>
          <Icone nome="seta" tamanho={16} cor={colors.textMuted} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          style={styles.avatar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={user?.name}
        >
          <Icone nome="pessoa" tamanho={24} cor={colors.teal} />
        </Pressable>
      )}
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
    titulo: { ...tipo.titulo, color: colors.text },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevacao.plana,
    },
    pastilha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: spacing.md,
      minHeight: 48,
      ...elevacao.plana,
    },
    pastilhaIcone: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ponto: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.white,
    },
    pastilhaNome: { ...tipo.corpoForte, color: colors.text, lineHeight: 18 },
    pastilhaEstado: { ...tipo.legenda, color: colors.textMuted },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
