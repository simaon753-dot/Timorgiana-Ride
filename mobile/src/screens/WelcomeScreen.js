import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo.js';
import LanguageToggle from '../components/LanguageToggle.js';
import Button from '../components/Button.js';
import Tais from '../design/Tais.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

// Ecrã de entrada.
//
// Antes era teal de cima a baixo, com os botões pousados directamente
// sobre o fundo. Duas coisas estavam mal, e nenhuma era a cor em si:
//
//   1. Uma parede de uma só cor é o aspecto de quem tem uma cor de marca
//      e a usa em todo o lado. As aplicações de mobilidade que se lêem
//      como caras fazem o contrário — um momento forte de marca, e depois
//      uma superfície calma onde as coisas acontecem.
//   2. Sem separação, o olho não sabia onde acabava a apresentação e
//      começava a decisão. Tudo tinha o mesmo peso.
//
// Agora o ecrã tem duas metades com funções diferentes: em cima a marca
// fala, em baixo o utilizador age. A costura entre as duas é uma linha de
// tais — o único momento cultural do ecrã, e está onde faz sentido: no
// sítio onde a marca entrega o ecrã a quem o usa.
export default function WelcomeScreen({ navigation }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.topo}>
        <Pressable onPress={() => navigation.navigate('Server')} hitSlop={12}>
          <Text style={styles.engrenagem}>⚙</Text>
        </Pressable>
        <LanguageToggle onTeal />
      </View>

      <View style={styles.marca}>
        <Logo onTeal />
        <Text style={styles.titulo}>{t('welcomeTitle')}</Text>
        <Text style={styles.subtitulo}>{t('welcomeSubtitle')}</Text>
      </View>

      {/* O painel sobe do fundo e ganha cantos redondos só em cima: assim
          lê-se como uma superfície que chega, e não como um cartão a
          flutuar no meio do nada. */}
      <View style={[styles.painel, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Tais altura={4} style={styles.costura} />

        {/* Entrar é a acção grande. Depois da primeira semana, quase todos
            os toques neste ecrã são de quem já tem conta — o registo faz-se
            uma vez, a entrada faz-se sempre. */}
        <Button
          title={t('loginTitle')}
          tamanho="grande"
          onPress={() => navigation.navigate('Login')}
        />

        <Text style={styles.rotuloRegisto}>{t('noAccountQuestion')}</Text>

        <View style={styles.registos}>
          <Escolha
            emoji="🧍"
            texto={t('passenger')}
            onPress={() => navigation.navigate('Register', { role: 'passenger' })}
          />
          <Escolha
            emoji="🚗 🛵"
            texto={t('driver')}
            onPress={() => navigation.navigate('Register', { role: 'driver' })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// As duas escolhas de registo. Só o ícone, sem círculo por trás.
//
// O círculo tinha 46 px de largura fixa e o ícone do motorista são DOIS
// emoji: não cabiam, e o Android cortava o segundo — daí a motorizada ter
// desaparecido e ficar só o carro. Sem contentor de largura fixa, o texto
// ocupa o que precisa e os dois aparecem.
function Escolha({ emoji, texto, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.escolha, pressed && styles.premido]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.emoji} numberOfLines={1}>
        {emoji}
      </Text>
      <Text style={styles.escolhaTexto}>{texto}</Text>
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.teal },

    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    engrenagem: { fontSize: 20, color: colors.onTeal, opacity: 0.75 },

    marca: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
    // `onTeal` e não `white`: no tema escuro, `white` é a cor das
    // SUPERFÍCIES (#202825) e não o branco. Passava por 4.53:1 sobre o
    // verde nocturno — por acidente, e por pouco.
    titulo: { ...tipo.display, color: colors.onTeal, marginTop: spacing.xl },
    subtitulo: {
      ...tipo.corpo,
      color: colors.onTeal,
      opacity: 0.82,
      marginTop: spacing.sm,
      maxWidth: 320,
    },

    painel: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl + 8,
      borderTopRightRadius: radius.xl + 8,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      overflow: 'hidden',
      ...elevacao.painel,
    },
    // A linha de tais assenta na aresta do painel. Fica presa ao topo com
    // posição absoluta para não empurrar o conteúdo para baixo.
    costura: { position: 'absolute', top: 0, left: 0, right: 0 },

    rotuloRegisto: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    registos: { flexDirection: 'row', gap: spacing.sm },
    escolha: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      ...elevacao.plana,
    },
    // `lineHeight` fixo para as duas caixas terem a mesma altura mesmo
    // que um emoji tenha métricas diferentes do outro no telemóvel.
    emoji: { fontSize: 26, lineHeight: 34, marginBottom: spacing.xs },
    escolhaTexto: { ...tipo.corpoForte, color: colors.text },

    premido: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
