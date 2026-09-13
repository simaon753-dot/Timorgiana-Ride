import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// O CABEÇALHO DOS ECRÃS EMPILHADOS — sistema de design TGA (14/09/26).
//
// "← Fila" à esquerda, título e subtítulo, e um lugar à direita (o sino do
// painel, a roda dentada do perfil). Um só componente para as definições, o
// perfil, o painel e o detalhe de conta: quatro cabeçalhos escritos à mão
// acabavam com quatro alturas e quatro setas diferentes.
//
// `centrado` põe o título ao meio, como no painel; sem ele, o título fica
// grande à esquerda, como nas definições. As duas pontas têm a MESMA largura
// quando é centrado, senão o título descaía para o lado mais leve.
//
// A saída tem 44 px de altura no mínimo e o texto "Fila" ao lado da seta: no
// iPhone não há botão de sistema, e um ecrã sem saída visível prende a pessoa.
export default function CabecalhoEcra({ navigation, titulo, subtitulo, direita, centrado = true }) {
  const { t } = useI18n();
  const ponta = centrado ? { width: 84 } : null;
  return (
    <View style={styles.barra}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={10}
        style={[styles.voltar, ponta]}
        accessibilityRole="button"
        accessibilityLabel={t('back')}
      >
        <Icone nome="voltar" tamanho={24} cor={colors.teal} traco={2.4} />
        {centrado ? <Text style={styles.voltarTexto}>{t('back')}</Text> : null}
      </Pressable>
      <View style={[styles.textos, centrado && styles.textosCentro]}>
        <Text style={centrado ? styles.titulo : styles.tituloGrande} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      <View style={[styles.direita, ponta]}>{direita}</View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    voltarTexto: { ...tipo.subtitulo, color: colors.teal },
    textos: { flex: 1 },
    textosCentro: { alignItems: 'center' },
    titulo: { ...tipo.titulo, color: colors.text },
    tituloGrande: { ...tipo.displayPequeno, color: colors.text },
    subtitulo: { ...tipo.pequeno, color: colors.textMuted },
    direita: { alignItems: 'flex-end', justifyContent: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
