import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// EM FASE DE TESTE — dito à pessoa, e não só sabido por nós.
//
// A app vai para as mãos dos primeiros motoristas e passageiros antes de
// alguma vez ter feito uma viagem a sério. Vai haver falhas; não é uma
// possibilidade, é uma certeza.
//
// Dizê-lo muda o que acontece quando uma aparece. Quem foi avisado tenta
// outra vez e conta o que viu; quem não foi conclui que a app não presta e
// desinstala — e essa pessoa não volta.
//
// FICA SEMPRE À VISTA, sem botão de fechar. Um aviso que se fecha é um aviso
// que só a primeira pessoa lê, e cada instalação nova é uma pessoa nova.
//
// PARA TIRAR, quando deixar de ser verdade: pôr `EM_TESTE` a `false`. Uma
// linha, e desaparece dos dois ecrãs — que é como deve ser uma coisa
// temporária.
export const EM_TESTE = true;

export default function AvisoTeste() {
  const { t } = useI18n();
  if (!EM_TESTE) return null;
  return (
    <View style={styles.faixa}>
      <Text style={styles.texto}>{t('avisoTeste')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    // Discreto de propósito. Não é um erro nem um perigo — é uma condição do
    // serviço. Com a cor de perigo, cada abertura da app parecia uma avaria.
    faixa: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    texto: { ...tipo.legenda, color: colors.text, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
