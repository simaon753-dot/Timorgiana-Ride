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
      {/* O círculo com "!" é o da referência TGA: diz "atenção" sem ser o
          vermelho de erro, que fazia cada abertura da app parecer uma avaria. */}
      <View style={styles.icone}>
        <Text style={styles.iconeTexto}>!</Text>
      </View>
      <Text style={styles.texto}>{t('avisoTeste')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    // Discreto de propósito. Não é um erro nem um perigo — é uma condição do
    // serviço. Com a cor de perigo, cada abertura da app parecia uma avaria.
    faixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    icone: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconeTexto: { ...tipo.corpoForte, fontSize: 13, lineHeight: 16, color: colors.danger },
    texto: { ...tipo.pequeno, color: colors.text, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
