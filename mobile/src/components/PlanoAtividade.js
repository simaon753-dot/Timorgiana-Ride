import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo, FAMILIAS } from '../design/tipografia.js';
import { paraMostrar } from '../lib/datas.js';

// O PLANO DE ATIVIDADE, no ecrã dos Ganhos (04/10/2026, pedido do Simão;
// compacto como na imagem dele a 05/10/2026).
//
// É a assinatura de sempre, contada como o Simão a desenhou: um dia só se
// gasta quando há pelo menos uma viagem CONCLUÍDA, e dez viagens no mesmo dia
// gastam um dia. A conta é toda do servidor (`dias_contados`, uma linha por
// dia) — este cartão só a mostra; reinstalar a app não devolve dia nenhum.
//
// «23 / 30»: o saldo sobre o lote em curso (ver `planoDe`). «Ativado em» é o
// dia do último carregamento — uma data de INÍCIO. Nunca uma data de fim: os
// dias gastam-se ao ritmo do trabalho, não do calendário.
//
// Em período gratuito não há saldo a mostrar: diz-se que os dias já se
// contam, quantos foram, e quanto custará o pacote quando a cobrança começar.
//
// Fundo de tinta teal e não teal cheio: importa, mas não pode disputar o
// olhar com o dinheiro do dia, que fica no cartão de cima.
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
          <Icone nome="calendario" tamanho={26} cor={colors.teal} />
          <View style={styles.titulos}>
            <Text style={styles.titulo} numberOfLines={1}>
              {t('planoTitulo')}
            </Text>
            <Text style={styles.subtitulo} numberOfLines={1}>
              {t('ganhosDiasAtividade', { n: diasPacote })}
            </Text>
          </View>
          <View style={styles.pastilhaGratis}>
            <Text style={styles.pastilhaGratisTexto} numberOfLines={1}>
              {t('planoGratuito')}
            </Text>
          </View>
        </View>
        <Text style={styles.texto}>
          {plano.gratuitoAte
            ? t('planoGratuitoAte', { data: paraMostrar(plano.gratuitoAte) })
            : t('planoGratuitoSemData')}
        </Text>
        <Text style={styles.forte}>
          {diasContados ?? 0} {t('planoDiasRegistados')}
        </Text>
        <Text style={styles.regra}>{t('planoRegra')}</Text>
        <View style={styles.rodape}>
          <Text style={[styles.regra, { flex: 1 }]}>
            {t('planoPrecoDepois', { preco, dias: diasPacote })}
          </Text>
          <BotaoPequeno texto={t('planoVer')} contorno onPress={verPlano} />
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
        <Icone nome="calendario" tamanho={26} cor={acabou ? colors.danger : colors.teal} />
        <View style={styles.titulos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {t('planoTitulo')}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {t('ganhosDiasAtividade', { n: diasPacote })}
          </Text>
        </View>
        <Text style={styles.preco} numberOfLines={1}>
          {preco}
        </Text>
      </View>

      {/* A barra é o que FALTA: cheia no dia em que se carrega, e vai
          esvaziando com o trabalho. */}
      <View style={styles.linhaBarra}>
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
        <Text style={[styles.contador, acabou && styles.contadorMau]}>
          {dias} / {total}
        </Text>
      </View>

      <Text style={styles.forte}>{t('planoRestantes', { n: dias })}</Text>
      {aviso ? <Text style={[styles.aviso, acabou && styles.avisoMau]}>{aviso}</Text> : null}
      {/* Gastou o último dia HOJE: o dia está pago até à meia-noite. */}
      {acabou && plano.hojePago ? <Text style={styles.regra}>{t('planoHojePago')}</Text> : null}
      <Text style={styles.regra}>{t('planoRegra')}</Text>

      <View style={styles.rodape}>
        <View style={{ flex: 1 }}>
          {plano.ativadoEm ? (
            <Text style={styles.regra}>
              {t('planoAtivadoEm', { data: paraMostrar(plano.ativadoEm) })}
            </Text>
          ) : null}
          <Text style={styles.regra}>{t('planoTerminaApos', { n: total })}</Text>
        </View>
        <BotaoPequeno
          texto={acabou ? t('planoRenovarPor', { preco }) : t('planoRenovar')}
          onPress={verPlano}
        />
      </View>
    </View>
  );
}

// O «Renovar plano» da imagem: pequeno, coral, ao canto. 40 px de altura e
// folga à volta, para o dedo o acertar sem olhar duas vezes.
function BotaoPequeno({ texto, onPress, contorno = false }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.botao,
        contorno && styles.botaoContorno,
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[styles.botaoTexto, contorno && styles.botaoTextoContorno]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginTop: spacing.sm,
      gap: 4,
    },
    cartaoAcabou: { backgroundColor: colors.tintaPerigo },
    topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    titulos: { flex: 1, minWidth: 0 },
    titulo: { ...tipo.corpoForte, fontSize: 16, color: colors.text },
    subtitulo: { ...tipo.legenda, color: colors.textMuted },
    preco: {
      fontFamily: FAMILIAS.forte,
      fontSize: 20,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    pastilhaGratis: {
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    pastilhaGratisTexto: { ...tipo.legenda, color: colors.teal },
    linhaBarra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    barraFundo: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.white,
      overflow: 'hidden',
    },
    barra: { height: 10, borderRadius: 5, backgroundColor: colors.teal },
    barraPouco: { backgroundColor: colors.coral },
    contador: {
      fontFamily: FAMILIAS.forte,
      fontSize: 17,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    contadorMau: { color: colors.danger },
    texto: { ...tipo.pequeno, color: colors.text },
    forte: { ...tipo.corpoForte, fontSize: 14, color: colors.text },
    aviso: { ...tipo.corpoForte, fontSize: 14, color: colors.coralDark },
    avisoMau: { color: colors.danger },
    regra: { ...tipo.legenda, color: colors.textMuted, lineHeight: 16 },
    rodape: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    botao: {
      backgroundColor: colors.coral,
      borderRadius: radius.pill,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '55%',
    },
    botaoContorno: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.teal,
    },
    // Texto escuro sobre o coral: branco fica abaixo do contraste mínimo.
    botaoTexto: { ...tipo.corpoForte, fontSize: 14, color: '#22100A' },
    botaoTextoContorno: { color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
