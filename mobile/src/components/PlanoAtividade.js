import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { paraMostrar } from '../lib/datas.js';

// O PLANO DE ATIVIDADE, no ecrã dos Ganhos (04/10/2026, pedido do Simão).
//
// É a assinatura de sempre, contada como o Simão a desenhou: um dia só se
// gasta quando há pelo menos uma viagem CONCLUÍDA, e dez viagens no mesmo dia
// gastam um dia. A conta é toda do servidor (`dias_contados`, uma linha por
// dia) — este cartão só a mostra; reinstalar a app não devolve dia nenhum.
//
// «23 / 30»: o saldo sobre o lote em curso (ver `planoDe`). Nunca uma data de
// fim — os dias gastam-se ao ritmo do trabalho, não do calendário.
//
// Em período gratuito não há saldo a mostrar: diz-se que os dias já se
// contam, quantos foram, e quanto custará o pacote quando a cobrança
// começar — o preço dito antes de ser cobrado.
//
// Fica abaixo do «Ganhaste hoje» e em cartão branco: importa, mas não pode
// disputar o olhar com o dinheiro do dia.
export default function PlanoAtividade({ plano, diasContados, navigation }) {
  const { t } = useI18n();
  if (!plano) return null;

  const preco = `US$${Number(plano.pacote?.usd ?? 0).toFixed(2)}`;
  const diasPacote = plano.pacote?.dias ?? 30;
  const verPlano = () => navigation.navigate('Assinatura');

  if (plano.gratuito) {
    return (
      <View style={styles.cartao}>
        <View style={styles.topo}>
          <Text style={styles.titulo}>{t('planoTitulo')}</Text>
          <View style={styles.pastilhaGratis}>
            <Text style={styles.pastilhaGratisTexto}>{t('planoGratuito')}</Text>
          </View>
        </View>
        <Text style={styles.texto}>
          {plano.gratuitoAte
            ? t('planoGratuitoAte', { data: paraMostrar(plano.gratuitoAte) })
            : t('planoGratuitoSemData')}
        </Text>
        <View style={styles.linhaNumero}>
          <Text style={styles.numero}>{diasContados ?? 0}</Text>
          <Text style={styles.numeroLegenda}>{t('planoDiasRegistados')}</Text>
        </View>
        <Text style={styles.regra}>{t('planoRegra')}</Text>
        <Text style={styles.regra}>{t('planoPrecoDepois', { preco, dias: diasPacote })}</Text>
        <View style={styles.botao}>
          <Button title={t('planoVer')} variant="outline" onPress={verPlano} />
        </View>
      </View>
    );
  }

  const dias = Math.max(0, plano.dias ?? 0);
  const total = Math.max(dias, plano.total ?? 0);
  const fracao = total > 0 ? dias / total : 0;
  const acabou = dias === 0;
  const pouco = dias > 0 && dias <= 7;

  // Os avisos que o Simão pediu, por faixas: 7, 3, 1 e 0.
  const aviso = acabou
    ? t('planoTerminado')
    : dias === 1
      ? t('planoUltimoDia')
      : dias <= 3
        ? t('planoQuaseAcabar')
        : dias <= 7
          ? t('planoFaltamDias', { n: dias })
          : null;

  return (
    <View style={[styles.cartao, acabou && styles.cartaoAcabou]}>
      <View style={styles.topo}>
        <Text style={styles.titulo}>{t('planoTitulo')}</Text>
        <Text style={styles.preco}>
          {preco} · {t('planoDiasPacote', { n: diasPacote })}
        </Text>
      </View>

      <View style={styles.linhaNumero}>
        <Text style={[styles.numero, acabou && styles.numeroMau]}>
          {dias}
          <Text style={styles.numeroTotal}> / {total}</Text>
        </Text>
      </View>
      <Text style={styles.texto}>{t('planoRestantes', { n: dias })}</Text>

      {/* A barra é o que FALTA: cheia no dia em que se carrega, e vai
          esvaziando com o trabalho. */}
      <View
        style={styles.barraFundo}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: dias }}
      >
        <View
          style={[
            styles.barra,
            pouco && styles.barraPouco,
            { width: `${Math.round(fracao * 100)}%` },
          ]}
        />
      </View>

      {aviso ? <Text style={[styles.aviso, acabou && styles.avisoMau]}>{aviso}</Text> : null}
      {/* Gastou o último dia HOJE: o dia está pago até à meia-noite. */}
      {acabou && plano.hojePago ? <Text style={styles.regra}>{t('planoHojePago')}</Text> : null}
      <Text style={styles.regra}>{t('planoRegra')}</Text>

      <View style={styles.botao}>
        <Button
          title={acabou ? t('planoRenovarPor', { preco }) : t('planoRenovar')}
          variant={acabou ? 'primary' : 'outline'}
          onPress={verPlano}
        />
      </View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: colors.teal,
      padding: spacing.md,
      marginTop: spacing.md,
      ...elevacao.plana,
    },
    cartaoAcabou: { borderColor: colors.danger },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    titulo: { ...tipo.subtitulo, color: colors.text },
    preco: { ...tipo.corpoForte, color: colors.teal, fontVariant: ['tabular-nums'] },
    pastilhaGratis: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    pastilhaGratisTexto: { ...tipo.legenda, color: colors.teal },
    linhaNumero: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    numero: { ...tipo.display, color: colors.text, fontVariant: ['tabular-nums'] },
    numeroMau: { color: colors.danger },
    numeroTotal: { ...tipo.titulo, color: colors.textMuted },
    numeroLegenda: { ...tipo.pequeno, color: colors.textMuted, flexShrink: 1 },
    texto: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    barraFundo: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.paper,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    barra: { height: 10, borderRadius: 5, backgroundColor: colors.teal },
    barraPouco: { backgroundColor: colors.coral },
    aviso: { ...tipo.corpoForte, color: colors.coralDark, marginTop: spacing.sm },
    avisoMau: { color: colors.danger },
    regra: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 17 },
    botao: { marginTop: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
