import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import Carregando from '../design/Carregando.js';
import Tais from '../design/Tais.js';
import Button from '../components/Button.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { tipo } from '../design/tipografia.js';
import { colors, spacing, registarEstilos } from '../theme.js';

// `semLigacao` (04/10/2026): a app abriu sem conseguir falar com o servidor.
// A sessão continua guardada — tenta-se outra vez, ou entra-se com outra
// conta, que é a única saída que apaga a sessão.
export default function LoadingScreen({ semLigacao = false }) {
  const { t } = useI18n();
  const { restaurar, logout } = useAuth();
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* O logótipo voltou a este ecrã a pedido do Simão (10/10/2026): é o
          que se vê ao abrir a app, logo a seguir ao ícone. */}
      <Logo onTeal />
      {semLigacao ? (
        <View style={styles.semLigacao}>
          <Text style={styles.titulo}>{t('semLigacaoTitulo')}</Text>
          <Text style={styles.texto}>{t('semLigacaoTexto')}</Text>
          <Button title={t('semLigacaoTentar')} onPress={restaurar} />
          {/* Texto claro e não um botão «ghost»: o ghost é teal, e aqui o
              fundo também — ficava invisível. */}
          <Pressable onPress={logout} style={styles.outraConta} accessibilityRole="button">
            <Text style={styles.outraContaTexto}>{t('semLigacaoOutraConta')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: spacing.xl }}>
          <Carregando tamanho={56} sobreEscuro />
        </View>
      )}
      {/* Uma linha de tais no fundo. É a única decoração de todo o ecrã, e
          é o primeiro sítio onde a marca fala sem usar palavras. */}
      <Tais altura={4} sobreEscuro style={styles.tais} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tais: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    semLigacao: {
      alignSelf: 'stretch',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    titulo: { ...tipo.titulo, color: colors.onTeal, textAlign: 'center' },
    texto: {
      ...tipo.pequeno,
      color: colors.onTeal,
      opacity: 0.9,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    outraConta: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    outraContaTexto: {
      ...tipo.corpoForte,
      color: colors.onTeal,
      textDecorationLine: 'underline',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
