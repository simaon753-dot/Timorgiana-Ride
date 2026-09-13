import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { colors, spacing, registarEstilos, elevacao, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';
import Logo from '../components/Logo.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useI18n } from '../i18n/index.js';

// O CABEÇALHO DO REGISTO — sistema de design TGA.
//
// Botão de voltar redondo à esquerda, o logótipo ao centro, a língua à
// direita; por baixo o título grande e a frase. A ilustração é OPCIONAL e
// fica por trás, encostada à direita: o cabeçalho funciona sem ela, e ela
// entra quando houver uma imagem de Díli que sirva.
//
// Só o logótipo e não o lema das referências: o Simão escolheu assim
// (13/09/26) — "Moris, Muda, Hamutuk" aparecia nas imagens, mas não é dele.
export default function CabecalhoRegisto({ onVoltar, titulo, subtitulo, ilustracao }) {
  const { t } = useI18n();
  return (
    <View style={styles.bloco}>
      {ilustracao ? (
        <Image source={ilustracao} style={styles.ilustracao} resizeMode="contain" />
      ) : null}
      <View style={styles.topo}>
        <Pressable
          onPress={onVoltar}
          style={styles.voltar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Text style={styles.voltarTexto}>‹</Text>
        </Pressable>
        <Logo size="sm" />
        <View style={styles.lingua}>
          <LanguageToggle compacto />
        </View>
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
    ilustracao: {
      position: 'absolute',
      top: spacing.lg,
      right: -spacing.lg,
      width: '72%',
      aspectRatio: 914 / 506,
      opacity: paletaEmUso() === 'escuro' ? 0.5 : 1,
    },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    voltar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevacao.plana,
    },
    voltarTexto: { fontSize: 30, lineHeight: 32, color: colors.text, marginTop: -3 },
    lingua: { borderRadius: 22, backgroundColor: colors.white, ...elevacao.plana },
    titulo: { ...tipo.display, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, marginTop: 2 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
