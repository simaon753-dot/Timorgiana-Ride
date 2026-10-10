import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from './Icone.js';
import { tipo } from './tipografia.js';
import { useI18n } from '../i18n/index.js';
import { getBaseUrl } from '../serverUrl.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// DE QUEM É O VEÍCULO (10/10/2026, pedido do Simão). Duas opções, para os três
// veículos (motorizada, carro, pickup):
//   · «Veículo próprio (Ita nian rasik)»;
//   · «Veículo de terceiro (Ema seluk nian)» — e então, nos documentos, pedem-
//     se a identificação do proprietário e a declaração de autorização dele
//     (backend/src/documents.js, DOCS_TERCEIRO; Regulamento de Registo e
//     Inspeção de Veículos, art. 11.º).
// `valor`: true próprio, false de terceiro, null ainda por escolher — e sem
// escolha o formulário não avança.
//
// Os rótulos levam o tétum entre parênteses em qualquer língua da app: foi
// assim que o Simão os escreveu, e é como as pessoas lhes chamam em Díli.
export const urlModeloDeclaracao = () => `${getBaseUrl()}/modelos/declaracao-proprietario`;

export default function EscolherTitularidade({ valor, onEscolher }) {
  const { t } = useI18n();
  const opcoes = [
    { v: true, titulo: t('vProprio'), sub: t('vProprioSub'), icone: 'pessoa' },
    { v: false, titulo: t('vTerceiro'), sub: t('vTerceiroSub'), icone: 'documento' },
  ];
  return (
    <View>
      <View style={styles.lista} accessibilityRole="radiogroup">
        {opcoes.map((o) => {
          const activa = valor === o.v;
          return (
            <Pressable
              key={String(o.v)}
              onPress={() => onEscolher(o.v)}
              style={[styles.opcao, activa && styles.activa]}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
            >
              <View style={[styles.circulo, activa && styles.circuloActivo]}>
                {activa ? <View style={styles.ponto} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{o.titulo}</Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              <Icone nome={o.icone} tamanho={20} cor={activa ? colors.teal : colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
      {/* Só com «de terceiro»: o que vai ser pedido, e o modelo da declaração. */}
      {valor === false ? (
        <View style={styles.nota}>
          <Text style={styles.notaTexto}>{t('vTerceiroNota')}</Text>
          <Pressable
            onPress={() => Linking.openURL(urlModeloDeclaracao())}
            hitSlop={8}
            accessibilityRole="link"
            style={styles.modelo}
          >
            <Icone nome="documento" tamanho={16} cor={colors.teal} />
            <Text style={styles.modeloTexto}>{t('vVerModelo')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    lista: { gap: spacing.sm },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    activa: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    circulo: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circuloActivo: { borderColor: colors.teal },
    ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal },
    titulo: { ...tipo.corpoForte, color: colors.text },
    sub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    nota: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
    },
    notaTexto: { ...tipo.pequeno, color: colors.text },
    modelo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      minHeight: 32,
    },
    modeloTexto: {
      ...tipo.corpoForte,
      fontSize: 14,
      color: colors.teal,
      textDecorationLine: 'underline',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
