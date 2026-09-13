import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';

// O INDICADOR DE ETAPAS — sistema de design TGA.
//
// Três círculos ligados por um traço, com o nome de cada etapa por baixo.
// A etapa feita leva ✓, a actual fica teal cheia, as seguintes ficam por
// preencher. O traço enche-se até à etapa actual: é o que diz, de relance,
// quanto falta.
//
// As etapas RECEBEM-SE e não se decidem aqui. O passageiro tem "Dadus
// Pessoal → Reviza Dadus → Konfirma"; o motorista tem "Dadus Pessoal →
// Dadus Veíkulu → Konfirma". O componente não sabe nada de contas — só
// desenha a lista que lhe dão.
//
// O traço é UM só, por trás dos círculos, e não um por cada intervalo:
// assim começa e acaba exactamente no centro do primeiro e do último, seja
// qual for a largura do nome de cada etapa.
const CIRCULO = 34;

export default function Etapas({ etapas, actual }) {
  const n = etapas.length;
  const margem = `${50 / n}%`;
  const feito = n > 1 ? (actual / (n - 1)) * (100 - 100 / n) : 0;

  return (
    <View
      style={styles.bloco}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: n, now: actual + 1, text: etapas[actual] }}
    >
      <View style={[styles.traco, { left: margem, right: margem }]} />
      <View style={[styles.traco, styles.tracoFeito, { left: margem, width: `${feito}%` }]} />
      <View style={styles.linha}>
        {etapas.map((nome, i) => {
          const passada = i < actual;
          const agora = i === actual;
          return (
            <View key={nome} style={styles.etapa}>
              <View
                style={[
                  styles.circulo,
                  passada && styles.circuloFeito,
                  agora && styles.circuloAgora,
                ]}
              >
                <Text style={[styles.numero, (passada || agora) && styles.numeroActivo]}>
                  {passada ? '✓' : i + 1}
                </Text>
              </View>
              <Text
                style={[styles.nome, (passada || agora) && styles.nomeActivo]}
                numberOfLines={1}
              >
                {nome}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginVertical: spacing.md },
    linha: { flexDirection: 'row' },
    etapa: { flex: 1, alignItems: 'center' },
    traco: {
      position: 'absolute',
      top: CIRCULO / 2 - 1.5,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    tracoFeito: { backgroundColor: colors.teal },
    circulo: {
      width: CIRCULO,
      height: CIRCULO,
      borderRadius: CIRCULO / 2,
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circuloFeito: { backgroundColor: colors.teal, borderColor: colors.teal },
    circuloAgora: { backgroundColor: colors.teal, borderColor: colors.tintaTeal, borderWidth: 4 },
    numero: { ...tipo.corpoForte, color: colors.textMuted, lineHeight: 18 },
    numeroActivo: { color: colors.onTeal },
    nome: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.xs },
    nomeActivo: { ...tipo.corpoForte, fontSize: 13.5, color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
