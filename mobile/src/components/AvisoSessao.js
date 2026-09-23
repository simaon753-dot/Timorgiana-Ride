import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// A CONTA FOI ABERTA NOUTRO TELEMÓVEL (23/09/2026).
//
// A primeira versão desta protecção cortava a sessão antiga no instante. O
// Simão viu o que isso valia com uma pessoa sentada no banco de trás: o
// motorista perdia o mapa, a conversa, o botão de emergência e o botão de
// concluir a meio do caminho. E quem é cortado é o LEGÍTIMO — quem entra
// por último fica com a conta, por isso num roubo de senha o expulso é o
// dono.
//
// Agora o servidor deixa esta sessão acabar a viagem e manda este aviso. Não
// tem botão de fechar de propósito: é a única coisa que diz à pessoa que a
// conta dela está noutras mãos, e desaparece sozinha quando a viagem
// terminar — nesse momento a sessão acaba mesmo e o ecrã de entrada explica
// o resto.
//
// Vermelho e não cor de laranja: isto não é «o servidor está a acordar», é
// um aviso de segurança. A faixa do servidor lento usa o coral; duas faixas
// da mesma cor a dizer coisas de gravidade diferente ensinam a ignorar as
// duas.
export default function AvisoSessao() {
  const { t } = useI18n();
  const { avisoSessao } = useAuth();

  if (!avisoSessao) return null;

  return (
    <View style={styles.barra} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.titulo}>{t('sessaoAvisoTitulo')}</Text>
      <Text style={styles.texto}>{t('sessaoAvisoTexto')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    barra: {
      backgroundColor: colors.danger,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: 2,
    },
    titulo: { ...tipo.corpoForte, color: colors.white },
    texto: { ...tipo.corpo, color: colors.white },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
