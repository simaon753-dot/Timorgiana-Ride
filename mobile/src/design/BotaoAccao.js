import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// O BOTÃO DE UMA GRELHA DE ACÇÕES — "📞 Telefone 75684566", "Remata viajen"
// — sistema de design TGA (14/09/26, da referência da viagem do motorista).
//
// Ícone + título + (opcional) uma segunda linha, em 56 px de altura: é o
// alvo de quem conduz, com o telemóvel preso ao tablier.
//
// Quatro variantes e o peso de cada uma é deliberado:
//   cheio          — a acção de trabalho (Iha dalan ona, Hahú ona viajen,
//                    Viajen remata ona). Teal. A única cheia na grelha.
//   contorno       — a acção ao lado (Mensajen). Fio teal.
//   perigoContorno — o que não se pode carregar sem querer (Kansela). Fio
//                    vermelho: vê-se, mas não chama o dedo.
// A emergência não passa por aqui: é o SosButton, com o seu próprio fluxo.
//
// Duas formas (16/09/2026): `grande` para a acção de trabalho, sozinha na
// linha; `empilhado` para três botões lado a lado, com o ícone por cima.
const VARIANTES = () => ({
  cheio: { fundo: colors.teal, tinta: colors.onTeal, borda: colors.teal },
  contorno: { fundo: colors.white, tinta: colors.teal, borda: colors.teal },
  perigoContorno: { fundo: colors.white, tinta: colors.danger, borda: colors.danger },
});

export default function BotaoAccao({
  icone,
  titulo,
  sub,
  variante = 'contorno',
  onPress,
  contagem,
  loading = false,
  grande = false,
  empilhado = false,
}) {
  const v = VARIANTES()[variante] || VARIANTES().contorno;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.botao,
        grande && styles.grande,
        empilhado && styles.empilhado,
        { backgroundColor: v.fundo, borderColor: v.borda },
        pressed && styles.premido,
      ]}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${titulo} ${sub}` : titulo}
    >
      {loading ? (
        <ActivityIndicator color={v.tinta} />
      ) : (
        <>
          {icone ? <Icone nome={icone} tamanho={grande ? 26 : 22} cor={v.tinta} /> : null}
          <View style={[styles.textos, empilhado && styles.textosEmpilhados]}>
            <Text
              style={[
                styles.titulo,
                grande && styles.tituloGrande,
                empilhado && styles.tituloEmpilhado,
                { color: v.tinta },
              ]}
              numberOfLines={1}
            >
              {titulo}
            </Text>
            {sub ? (
              <Text
                style={[styles.sub, empilhado && styles.subEmpilhado, { color: v.tinta }]}
                numberOfLines={1}
              >
                {sub}
              </Text>
            ) : null}
          </View>
          {contagem > 0 ? (
            <View style={[styles.contagem, empilhado && styles.contagemCanto]}>
              <Text style={styles.contagemTexto}>{contagem}</Text>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    botao: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 56,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
    },
    premido: { opacity: 0.8 },
    // A ACÇÃO DE TRABALHO, sozinha na linha, mais alta e com letra maior:
    // é a que o motorista carrega em todas as viagens (Simão, 16/09/2026).
    grande: { minHeight: 68 },
    tituloGrande: { fontSize: 19, lineHeight: 26 },
    // TRÊS NUMA LINHA: ícone por cima do texto. Com o ícone ao lado, num terço
    // da largura, "Telefone" e o número eram cortados.
    //
    // LETRA FIXA, 13, e sem encolher automático. O `adjustsFontSizeToFit` (com
    // mínimo de 80%) deixou "Mensagem" e "Emergência" minúsculos no iPhone,
    // muito abaixo do mínimo, quando o texto não tinha largura definida (visto
    // pelo Simão a 16/09/2026). 13 cabe num terço mesmo nos Android estreitos;
    // o texto ocupa a largura toda do botão e fica centrado.
    empilhado: {
      flexDirection: 'column',
      gap: 4,
      minHeight: 64,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    textosEmpilhados: { alignItems: 'center', alignSelf: 'stretch' },
    tituloEmpilhado: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
    subEmpilhado: { textAlign: 'center' },
    contagemCanto: { position: 'absolute', top: 6, right: 6 },
    textos: { flexShrink: 1 },
    titulo: { ...tipo.corpoForte, fontSize: 16 },
    sub: { ...tipo.pequeno, fontVariant: ['tabular-nums'] },
    contagem: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 5,
      backgroundColor: colors.coral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Texto escuro sobre o coral: branco fica a 2,8:1.
    contagemTexto: { ...tipo.legenda, color: '#22100A' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
