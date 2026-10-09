import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import Logo from '../components/Logo.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

// «TORNE-SE MOTORISTA HAKAT» (09/10/2026, maqueta do Simão).
//
// Aparece entre o botão «Motorista» da entrada e o formulário de registo:
// antes de pedir dados a alguém, diz-lhe o que vai acontecer e o que vai
// precisar. Quem chega ao formulário sem saber que lhe vão pedir a carta
// frente e verso e quatro fotografias do carro desiste a meio.
//
// O FUNDO É O CREME DA APP (pedido dele, 09/10/2026 — a 1.ª versão era teal,
// como a entrada). O cartão dos passos é branco, para se destacar do creme.
// O logótipo vai com as cores dele, sem mexer (pedido dele, 08/10/2026).
// Os TRÊS veículos da app: carro, motorizada e pickup.
//
// OS REQUISITOS SÃO OS QUE A APP PEDE MESMO (backend/src/documents.js e a
// declaração de cidadania do registo). Se a lista de documentos mudar, esta
// muda com ela — uma promessa aqui que o registo não cumpre é pior do que
// nenhuma.
const FIGURA = {
  carro: require('../../assets/icones/veiculo-carro.png'),
  mota: require('../../assets/icones/veiculo-mota.png'),
  carry: require('../../assets/icones/veiculo-carry.png'),
};

const PASSOS = [
  { icone: 'pessoa', texto: 'introMotPasso1' },
  { icone: 'documento', texto: 'introMotPasso2' },
  { icone: 'escudo', texto: 'introMotPasso3' },
  { icone: 'rota', texto: 'introMotPasso4' },
];

const REQUISITOS = [
  'introMotReq1',
  'introMotReq2',
  'introMotReq3',
  'introMotReq4',
  'introMotReq5',
  'introMotReq6',
];

export default function IntroMotoristaScreen({ navigation }) {
  const { t } = useI18n();
  const [verRequisitos, setVerRequisitos] = useState(false);

  return (
    <View style={styles.fundo}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Os dois arcos da maqueta: coral em cima à esquerda, a estrada
            tracejada em teal à direita, sobre o creme. Por trás de tudo. */}
        <Path d="M -10 14 Q 18 12 30 -4" stroke={colors.coral} strokeWidth="5" fill="none" />
        <Path
          d="M 112 6 Q 70 16 84 40"
          stroke={colors.teal}
          strokeOpacity="0.22"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style={colors.paper === '#000000' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.voltar}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Icone nome="voltar" tamanho={24} cor={colors.teal} />
          </Pressable>

          <View style={styles.marca}>
            <Logo />
            <View style={styles.veiculos} accessible={false}>
              <Image source={FIGURA.carro} style={styles.carro} resizeMode="contain" />
              <Image source={FIGURA.mota} style={styles.mota} resizeMode="contain" />
              <Image source={FIGURA.carry} style={styles.carry} resizeMode="contain" />
            </View>
            <Text style={styles.titulo} accessibilityRole="header">
              {t('introMotTitulo')}
            </Text>
            <Text style={styles.subtitulo}>{t('introMotSub')}</Text>
          </View>

          <View style={styles.cartao}>
            <View style={styles.cartaoTopo}>
              <View style={styles.traco} />
              <Text style={styles.cartaoTitulo}>{t('introMotComo')}</Text>
            </View>
            {PASSOS.map((p) => (
              <View key={p.texto} style={styles.passo}>
                <View style={styles.passoIcone}>
                  <Icone nome={p.icone} tamanho={22} cor={colors.coralDark} />
                </View>
                <Text style={styles.passoTexto}>{t(p.texto)}</Text>
              </View>
            ))}

            {verRequisitos ? (
              <View style={styles.requisitos}>
                <Text style={styles.requisitosTitulo}>{t('introMotReqTitulo')}</Text>
                {REQUISITOS.map((r) => (
                  <View key={r} style={styles.requisito}>
                    <Icone nome="visto" tamanho={16} cor={colors.teal} />
                    <Text style={styles.requisitoTexto}>{t(r)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => navigation.navigate('Register', { role: 'driver' })}
            style={({ pressed }) => [styles.botao, pressed && styles.premido]}
            accessibilityRole="button"
          >
            <Text style={styles.botaoTexto}>{t('introMotComecar')}</Text>
            <Icone nome="seta" tamanho={22} cor={colors.onAcento} />
          </Pressable>

          <Pressable
            onPress={() => setVerRequisitos((v) => !v)}
            style={({ pressed }) => [styles.botaoContorno, pressed && styles.premido]}
            accessibilityRole="button"
            accessibilityState={{ expanded: verRequisitos }}
          >
            <Text style={styles.botaoContornoTexto}>
              {t(verRequisitos ? 'introMotEsconder' : 'introMotRequisitos')}
            </Text>
          </Pressable>

          <View style={styles.nota}>
            <Icone nome="escudo" tamanho={22} cor={colors.coralDark} />
            <View style={styles.notaLinha} />
            <Text style={styles.notaTexto}>{t('introMotNota')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: colors.paper },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
    voltar: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
    marca: { alignItems: 'center', marginTop: spacing.sm },
    veiculos: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    // As proporções dos ficheiros: carro 192×66, mota 192×120, pickup 192×75.
    carro: { width: 64, height: 22, tintColor: colors.teal },
    mota: { width: 45, height: 28, tintColor: colors.teal },
    carry: { width: 64, height: 25, tintColor: colors.teal },
    titulo: {
      ...tipo.displayPequeno,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    subtitulo: {
      ...tipo.corpo,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    cartao: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginTop: spacing.xl,
      ...elevacao.plana,
    },
    cartaoTopo: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    traco: {
      width: 4,
      height: 24,
      borderRadius: 2,
      backgroundColor: colors.coral,
      marginRight: spacing.sm,
    },
    cartaoTitulo: { ...tipo.titulo, color: colors.text },
    passo: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    passoIcone: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    passoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    requisitos: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    requisitosTitulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    requisito: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    requisitoTexto: { ...tipo.pequeno, color: colors.text, flex: 1 },
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.coral,
      borderRadius: 999,
      paddingVertical: 16,
      marginTop: spacing.xl,
    },
    botaoTexto: { ...tipo.botao, color: colors.onAcento, fontSize: 18, lineHeight: 24 },
    botaoContorno: {
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.teal,
      paddingVertical: 14,
      marginTop: spacing.md,
    },
    botaoContornoTexto: { ...tipo.botao, color: colors.teal, fontSize: 17, lineHeight: 22 },
    premido: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    nota: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.sm,
    },
    notaLinha: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    notaTexto: { ...tipo.pequeno, color: colors.textMuted, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
