import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Logo from '../components/Logo.js';
import LanguageToggle from '../components/LanguageToggle.js';
import Icone from '../design/Icone.js';
import Tais from '../design/Tais.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

const FUNDO = require('../../assets/entrada/fundo.jpg');

// A MENTA do "Bem-VINDO", e porque é um literal.
//
// A paleta clara não tem nenhum verde claro: nenhum outro ecrã tem fundo
// escuro, e um verde para ler SOBRE escuro nunca fez falta. Este não é
// inventado — é o `tealLight` da paleta ESCURA, que a marca já usa
// exactamente para isso. Dá 5,71:1 sobre o fundo, bem acima do mínimo.
const MENTA = '#4FD4AC';

// Ecrã de entrada, seguindo a maqueta que o Simão trouxe.
//
// O QUE MUDOU. Era teal chapado de cima a baixo com dois emojis a servir de
// ilustração. Passa a ter uma fotografia da costa por baixo de um véu verde,
// o logótipo em cima, a chamada em laranja ao meio, e dois cartões brancos
// com desenho a sério.
//
// O VÉU É UM DEGRADÉ E NÃO UMA COR CHAPADA, e é o que faz a coisa funcionar:
// forte em cima para o logótipo e o texto se lerem, fraco a meio para a
// fotografia aparecer, forte outra vez em baixo para os cartões assentarem.
// Um véu de opacidade única ou tapava a fotografia ou deixava o texto
// ilegível — não há valor que faça as duas coisas.
//
// O TAIS FICOU. A maqueta não o tem, mas era o único momento cultural do
// ecrã e não havia razão para o perder: passou a ser a linha do "ainda não
// tem conta?", que na maqueta é um traço qualquer. Segue-se o desenho e
// ganha-se o significado.
export default function WelcomeScreen({ navigation }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={FUNDO} style={styles.fundo} resizeMode="cover">
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
        <Defs>
          <LinearGradient id="veu" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.teal} stopOpacity="0.97" />
            <Stop offset="0.34" stopColor={colors.teal} stopOpacity="0.72" />
            <Stop offset="0.5" stopColor={colors.teal} stopOpacity="0.42" />
            <Stop offset="0.68" stopColor={colors.teal} stopOpacity="0.88" />
            <Stop offset="1" stopColor={colors.teal} stopOpacity="0.99" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#veu)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="light" />

        <View style={styles.topo}>
          <Pressable
            onPress={() => navigation.navigate('Server')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('serverSettings')}
          >
            <Icone nome="engrenagem" tamanho={22} cor={colors.onTeal} />
          </Pressable>
          <LanguageToggle onTeal />
        </View>

        <View style={styles.marca}>
          <Logo onTeal />
          {/* "Bem-" branco e "vindo" em menta, como na maqueta. Numa só linha
              de texto e não em dois blocos: assim as duas metades partilham a
              linha de base e a palavra não se parte ao mudar de língua. */}
          <Text style={styles.titulo}>
            {primeiraMetade(t('welcomeTitle'))}
            <Text style={{ color: MENTA }}>{segundaMetade(t('welcomeTitle'))}</Text>
          </Text>
          <Text style={styles.subtitulo}>{t('welcomeSubtitle')}</Text>
        </View>

        {/* O espaço onde a fotografia respira. Sem conteúdo de propósito: é o
            único sítio do ecrã onde o véu abre. */}
        <View style={styles.janela} />

        <View style={[styles.baixo, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* A CHAMADA, feita aqui e não com o <Button> comum.
              A maqueta tem uma seta dentro de um círculo à esquerda do texto,
              e o <Button> só aceita ícones que sejam texto. A tinta escura
              sobre o coral é a mesma que ele usa — branco sobre este laranja
              dá 2,82:1 e não se lê. */}
          <Pressable
            style={({ pressed }) => [styles.chamada, pressed && styles.premido]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
          >
            <View style={styles.chamadaCirculo}>
              <Icone nome="seta" tamanho={18} cor={colors.coral} />
            </View>
            <Text style={styles.chamadaTexto}>{t('loginTitle')}</Text>
            <Icone nome="seta" tamanho={16} cor="#22100A" />
          </Pressable>

          <View style={styles.separador}>
            <Tais altura={3} style={styles.separadorLinha} />
            <Text style={styles.separadorTexto}>{t('noAccountQuestion')}</Text>
            <Tais altura={3} style={styles.separadorLinha} />
          </View>

          {/* OS DOIS CARTÕES VOLTARAM AOS ANTERIORES, por decisão do Simão.
              Eu tinha-lhes posto as ilustrações da maqueta. Saíram de um
              ficheiro de 887 px de largura e, recortadas, ficaram com 179 —
              esticadas no telemóvel dele, que tem 1440. Ao lado de texto
              nítido, viam-se moles.
              O emoji é desenhado pelo sistema e é sempre nítido, em qualquer
              tamanho. Aqui ganha à ilustração, e ganha por uma razão que não
              tem nada a ver com desenho. */}
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

          <View style={styles.lema}>
            <Icone nome="pin" tamanho={14} cor={colors.onTeal} />
            <Text style={styles.lemaTexto}>{t('lemaEntrada')}</Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// A palavra do título parte-se a meio para a segunda metade ir a menta.
// Em português "Bem-vindo" parte-se no hífen; nas outras línguas parte-se ao
// meio das letras, que é o que a maqueta faz visualmente.
function primeiraMetade(s) {
  const i = s.indexOf('-');
  return i > 0 ? s.slice(0, i + 1) : s.slice(0, Math.ceil(s.length / 2));
}
function segundaMetade(s) {
  const i = s.indexOf('-');
  return i > 0 ? s.slice(i + 1) : s.slice(Math.ceil(s.length / 2));
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
    fundo: { flex: 1, backgroundColor: colors.teal },
    safe: { flex: 1 },

    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },

    marca: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
    titulo: { ...tipo.display, color: colors.onTeal, marginTop: spacing.lg },
    subtitulo: {
      ...tipo.corpo,
      color: colors.onTeal,
      opacity: 0.86,
      marginTop: spacing.sm,
      maxWidth: 330,
    },

    janela: { flex: 1, minHeight: spacing.xl },

    baixo: { paddingHorizontal: spacing.lg },

    chamada: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.coral,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 60,
      ...elevacao.painel,
    },
    chamadaCirculo: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Tinta escura e não branca: ver a nota junto ao botão.
    chamadaTexto: { ...tipo.subtitulo, color: '#22100A', flex: 1, textAlign: 'center' },

    separador: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    separadorLinha: { flex: 1, opacity: 0.55 },
    separadorTexto: { ...tipo.pequeno, color: colors.onTeal, opacity: 0.9 },

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
    // `lineHeight` fixo para as duas caixas terem a mesma altura mesmo que um
    // emoji tenha métricas diferentes do outro no telemóvel.
    emoji: { fontSize: 26, lineHeight: 34, marginBottom: spacing.xs },
    escolhaTexto: { ...tipo.corpoForte, color: colors.text },

    lema: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: spacing.lg,
    },
    lemaTexto: {
      ...tipo.legenda,
      color: colors.onTeal,
      opacity: 0.75,
      letterSpacing: 1.6,
    },

    premido: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
