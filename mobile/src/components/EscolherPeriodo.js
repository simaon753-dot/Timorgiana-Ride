import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button.js';
import MolduraModal from '../design/MolduraModal.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { diaDaSemana, somarDias } from '../lib/periodos.js';
import { paraMostrar } from '../lib/datas.js';

// O «PERSONALIZADO» DOS GANHOS: um calendário para escolher o primeiro e o
// último dia (04/10/2026).
//
// Feito aqui, e não com o seletor de datas do sistema: esse é uma peça nativa
// que não está no APK, e obrigaria a compilar outro. Este é só desenho — vai
// pelo ar como o resto do ecrã.
//
// Primeiro toque: o primeiro dia. Segundo: o último (se for antes do
// primeiro, trocam). Terceiro: recomeça. Os dias depois de hoje não se tocam —
// não há ganhos no futuro.
export default function EscolherPeriodo({ visivel, hoje, inicial, aoFechar, aoEscolher }) {
  const { t } = useI18n();
  const [de, setDe] = useState(inicial?.de || null);
  const [ate, setAte] = useState(inicial?.ate || null);
  const [mes, setMes] = useState((inicial?.ate || hoje).slice(0, 7));

  // Cada vez que abre, começa do período em vigor.
  useEffect(() => {
    if (!visivel) return;
    setDe(inicial?.de || null);
    setAte(inicial?.ate || null);
    setMes((inicial?.ate || hoje).slice(0, 7));
  }, [visivel]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomesMes = t('mesesNomes').split(',');
  const nomesDia = t('semanaCurta').split(','); // a começar à segunda

  // As casas do mês: brancos antes do dia 1 até à segunda-feira, e os dias.
  const casas = useMemo(() => {
    const primeiro = `${mes}-01`;
    const brancos = (diaDaSemana(primeiro) + 6) % 7;
    const lista = Array.from({ length: brancos }, () => null);
    let d = primeiro;
    while (d.slice(0, 7) === mes) {
      lista.push(d);
      d = somarDias(d, 1);
    }
    return lista;
  }, [mes]);

  const mudarMes = (n) => {
    const [a, m] = mes.split('-').map(Number);
    const novo = new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
    if (novo <= hoje.slice(0, 7)) setMes(novo);
  };

  const tocar = (d) => {
    if (!de || (de && ate)) {
      setDe(d);
      setAte(null);
    } else if (d < de) {
      setAte(de);
      setDe(d);
    } else {
      setAte(d);
    }
  };

  const [ano, numMes] = mes.split('-').map(Number);
  const podeAvancar = mes < hoje.slice(0, 7);

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <Pressable style={styles.fundo} onPress={aoFechar} accessibilityLabel={t('cancel')} />
      <MolduraModal style={styles.folha} edges={['bottom']}>
        <View style={styles.pega} />
        <Text style={styles.titulo}>{t('ganhosPeriodoTitulo')}</Text>
        <Text style={styles.dica}>{t('ganhosPeriodoDica')}</Text>

        <View style={styles.cabecalhoMes}>
          <Pressable
            onPress={() => mudarMes(-1)}
            style={styles.seta}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('ganhosMesAnterior')}
          >
            <Text style={styles.setaTexto}>‹</Text>
          </Pressable>
          <Text style={styles.nomeMes}>
            {nomesMes[numMes - 1]} {ano}
          </Text>
          <Pressable
            onPress={() => mudarMes(1)}
            style={[styles.seta, !podeAvancar && styles.setaDesligada]}
            disabled={!podeAvancar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('ganhosMesSeguinte')}
          >
            <Text style={styles.setaTexto}>›</Text>
          </Pressable>
        </View>

        <View style={styles.grelha}>
          {nomesDia.map((n) => (
            <Text key={n} style={styles.diaSemana}>
              {n}
            </Text>
          ))}
          {casas.map((d, i) => {
            if (!d) return <View key={`b${i}`} style={styles.casa} />;
            const futuro = d > hoje;
            const ponta = d === de || d === ate;
            const dentro = de && ate && d > de && d < ate;
            return (
              <Pressable
                key={d}
                style={styles.casa}
                onPress={() => tocar(d)}
                disabled={futuro}
                accessibilityRole="button"
                accessibilityState={{ selected: ponta || !!dentro, disabled: futuro }}
                accessibilityLabel={paraMostrar(d)}
              >
                <View style={[styles.circulo, dentro && styles.dentro, ponta && styles.ponta]}>
                  <Text
                    style={[
                      styles.numero,
                      futuro && styles.numeroFuturo,
                      d === hoje && styles.numeroHoje,
                      ponta && styles.numeroPonta,
                    ]}
                  >
                    {Number(d.slice(8, 10))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.escolhido}>
          {de ? `${paraMostrar(de)}  →  ${paraMostrar(ate || de)}` : t('ganhosPeriodoNada')}
        </Text>
        <View style={styles.botoes}>
          <View style={{ flex: 1 }}>
            <Button title={t('cancel')} variant="outline" onPress={aoFechar} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t('ganhosAplicar')}
              variant="secondary"
              disabled={!de}
              onPress={() => aoEscolher({ de, ate: ate || de })}
            />
          </View>
        </View>
      </MolduraModal>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    folha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
    },
    pega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    titulo: { ...tipo.subtitulo, color: colors.text },
    dica: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    cabecalhoMes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    seta: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
    },
    setaDesligada: { opacity: 0.35 },
    setaTexto: { ...tipo.titulo, color: colors.teal, marginTop: -3 },
    nomeMes: { ...tipo.corpoForte, color: colors.text },
    grelha: { flexDirection: 'row', flexWrap: 'wrap' },
    diaSemana: {
      ...tipo.legenda,
      width: `${100 / 7}%`,
      textAlign: 'center',
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    casa: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
    circulo: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dentro: { backgroundColor: colors.tintaTeal },
    ponta: { backgroundColor: colors.teal },
    numero: { ...tipo.corpo, color: colors.text, fontVariant: ['tabular-nums'] },
    numeroFuturo: { color: colors.border },
    numeroHoje: { ...tipo.corpoForte, color: colors.coralDark },
    numeroPonta: { ...tipo.corpoForte, color: colors.onTeal },
    escolhido: {
      ...tipo.corpoForte,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.md,
      fontVariant: ['tabular-nums'],
    },
    botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
