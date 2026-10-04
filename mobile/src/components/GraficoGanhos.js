import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SeletorSegmentado from '../design/SeletorSegmentado.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo, FAMILIAS } from '../design/tipografia.js';
import { agrupar, contagem, diaMes, diaDaSemana } from '../lib/periodos.js';

// O GRÁFICO DOS GANHOS: diário, semanal ou mensal, do período escolhido
// (04/10/2026).
//
// No diário aparece CADA dia de calendário, incluindo os de $0.00 — um dia
// parado também é informação, e o Simão pediu-o. Um dia a zero tem uma
// barra rasa, não um buraco: assim vê-se que existiu.
//
// O VALOR POR CIMA DE CADA BARRA (05/10/2026, da imagem do Simão): lê-se o
// gráfico sem tocar em nada. Tocar numa barra continua a dizer as viagens e
// os dias de atividade dela, numa linha por baixo.
//
// Barras de <View> e não uma biblioteca de gráficos: uma biblioteca nova é
// uma peça a mais no APK, e isto são rectângulos. Com muitos dias o gráfico
// desliza para o lado, e abre no fim — o mais recente é o que se quer ver.
const ALTURA = 96;
const LARGURA = { dia: 42, semana: 54, mes: 56 };

export default function GraficoGanhos({ porDia }) {
  const { t } = useI18n();
  const [modo, setModo] = useState('dia');
  const grupos = useMemo(() => agrupar(porDia || [], modo), [porDia, modo]);
  const [escolhido, setEscolhido] = useState(null);
  const rolo = useRef(null);

  // Ao mudar os dados ou o modo, escolhe-se o mais recente.
  useEffect(() => {
    setEscolhido(grupos.length ? grupos[grupos.length - 1].chave : null);
  }, [grupos]);

  const maximo = Math.max(1, ...grupos.map((g) => g.valor));
  const nomesMes = t('mesesCurtos').split(',');
  const nomesDia = t('semanaCurtaDomingo').split(',');
  const g = grupos.find((x) => x.chave === escolhido);

  const rotulo = (x) => (modo === 'mes' ? nomesMes[Number(x.chave.slice(5, 7)) - 1] : diaMes(x.de));
  const titulo = (x) =>
    modo === 'dia'
      ? `${nomesDia[diaDaSemana(x.de)]}, ${diaMes(x.de)}`
      : modo === 'semana'
        ? `${diaMes(x.de)} – ${diaMes(x.ate)}`
        : `${nomesMes[Number(x.chave.slice(5, 7)) - 1]} ${x.chave.slice(0, 4)}`;
  // Sem cêntimos acima de $100, para o número caber por cima da barra.
  const curto = (v) => (v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`);

  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        <Text style={styles.titulo} numberOfLines={1}>
          {t('tabEarnings')}
        </Text>
        <View style={styles.seletor}>
          <SeletorSegmentado
            compacto
            opcoes={[
              { id: 'dia', rotulo: t('ganhosDiario') },
              { id: 'semana', rotulo: t('ganhosSemanal') },
              { id: 'mes', rotulo: t('ganhosMensal') },
            ]}
            valor={modo}
            onMudar={setModo}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        ref={rolo}
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => rolo.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={styles.barras}
      >
        {grupos.map((x) => {
          const activa = x.chave === escolhido;
          const altura = x.valor > 0 ? Math.max(4, (x.valor / maximo) * ALTURA) : 2;
          return (
            <Pressable
              key={x.chave}
              onPress={() => setEscolhido(x.chave)}
              style={[styles.coluna, { width: LARGURA[modo] }]}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={`${titulo(x)}: $${x.valor.toFixed(2)}`}
            >
              <View style={styles.zonaBarra}>
                <Text
                  style={[styles.valor, activa && styles.valorActivo]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                >
                  {curto(x.valor)}
                </Text>
                <View
                  style={[
                    styles.barra,
                    { height: altura },
                    x.valor > 0 ? styles.barraCheia : styles.barraZero,
                    activa && x.valor > 0 && styles.barraActiva,
                  ]}
                />
              </View>
              <Text
                style={[styles.rotulo, activa && styles.rotuloActivo]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
              >
                {rotulo(x)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {g ? (
        <Text style={styles.info} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {titulo(g)} · {contagem(t, g.viagens, 'ganhosUmaViagem', 'earningsTrips')} ·{' '}
          {contagem(t, g.dias, 'ganhosUmDiaAtividade', 'ganhosDiasAtividade')}
        </Text>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.md,
    },
    topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    titulo: { ...tipo.subtitulo, color: colors.text, flex: 1 },
    // 240: «Semanal» inteiro a 13 pt, com folga para a letra maior do Android.
    seletor: { width: 240, maxWidth: '72%' },
    barras: {
      alignItems: 'flex-end',
      paddingTop: spacing.sm,
      flexGrow: 1,
      justifyContent: 'center',
    },
    coluna: { alignItems: 'center' },
    zonaBarra: { height: ALTURA + 18, justifyContent: 'flex-end', alignItems: 'center' },
    valor: {
      fontFamily: FAMILIAS.forte,
      fontSize: 10,
      color: colors.text,
      marginBottom: 2,
      fontVariant: ['tabular-nums'],
    },
    valorActivo: { color: colors.coralDark },
    barra: { width: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    barraCheia: { backgroundColor: colors.teal },
    barraZero: { backgroundColor: colors.border },
    barraActiva: { backgroundColor: colors.coral },
    rotulo: {
      ...tipo.legenda,
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
    },
    rotuloActivo: { color: colors.text },
    info: {
      ...tipo.legenda,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
