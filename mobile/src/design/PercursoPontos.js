import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// PARTIDA → PARAGENS → DESTINO, com pinos ligados por um traço — sistema de
// design TGA (14/09/26). O mesmo nos dois lados: o motorista lê-o no pedido
// antes de aceitar, o passageiro na viagem.
//
// AS PARAGENS DITAS POR EXTENSO, entre a partida e o destino. Os pinos já
// estão no mapa, mas um mapa pequeno não diz quantas são nem por que ordem.
// Duas entregas em vez de uma mudam o tempo do trabalho, e isso tem de se
// ler de relance. Vão mais pequenas: são o caminho, não as pontas.
//
// O traço é contínuo e não tracejado como na referência: o Android não
// desenha tracejado num só lado de uma caixa, e um traço que só aparece em
// metade dos telemóveis é pior do que um traço simples em todos.
export default function PercursoPontos({ partida, destino, paragens = [], notaPartida }) {
  const { t } = useI18n();
  const pontos = [
    partida
      ? { chave: 'p', rotulo: t('originField'), nome: partida, nota: notaPartida, cor: colors.teal }
      : null,
    ...paragens.map((p, i) => ({
      chave: `m${i}-${p.lat},${p.lng}`,
      nome: `${i + 1}. ${p.label}`,
      cor: colors.textMuted,
      pequeno: true,
    })),
    { chave: 'd', rotulo: t('destination'), nome: destino, cor: colors.coral },
  ].filter(Boolean);

  return (
    <View style={styles.bloco}>
      {pontos.map((p, i) => (
        <View key={p.chave} style={styles.linha}>
          <View style={styles.coluna}>
            <Icone nome="pin" tamanho={p.pequeno ? 16 : 22} cor={p.cor} />
            {i < pontos.length - 1 ? <View style={styles.traco} /> : null}
          </View>
          <View style={[styles.textos, i < pontos.length - 1 && styles.textosAfastados]}>
            {p.rotulo ? <Text style={styles.rotulo}>{p.rotulo}</Text> : null}
            <Text style={p.pequeno ? styles.nomePequeno : styles.nome} numberOfLines={2}>
              {p.nome}
            </Text>
            {p.nota ? <Text style={styles.nota}>{p.nota}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    bloco: { marginVertical: spacing.sm },
    linha: { flexDirection: 'row', gap: spacing.sm },
    coluna: { width: 24, alignItems: 'center' },
    traco: {
      flex: 1,
      width: 2,
      minHeight: 10,
      borderRadius: 1,
      backgroundColor: colors.border,
      marginVertical: 3,
    },
    textos: { flex: 1 },
    textosAfastados: { paddingBottom: spacing.sm },
    rotulo: { ...tipo.legenda, color: colors.textMuted },
    nome: { ...tipo.corpoForte, color: colors.text },
    nomePequeno: { ...tipo.pequeno, color: colors.text },
    nota: { ...tipo.legenda, color: colors.teal, marginTop: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
