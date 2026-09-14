import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Chip, { FilaChips } from './Chip.js';
import TextField from '../components/TextField.js';
import { CARROCERIAS, CAPACIDADES } from '../dados/veiculos.js';
import { useI18n } from '../i18n/index.js';

// CARROÇARIA, CAPACIDADE E ANO do Carry — sistema de design TGA (14/09/26).
//
// Um só componente para os três sítios onde se pergunta: o registo, o
// formulário do veículo, e o aviso a quem se registou antes destes campos. A
// mesma pergunta tem de ter o mesmo aspecto nos três.
//
// A CAPACIDADE vem em cartões com uma nota, como o tamanho da carga no pedido:
// é ela que decide que pedidos chegam ao motorista, e as duas escalas têm de
// se ler da mesma maneira dos dois lados.
export default function DadosCarga({
  carroceria,
  onCarroceria,
  capacidade,
  onCapacidade,
  ano,
  onAno,
}) {
  const { t } = useI18n();
  return (
    <View>
      <Text style={styles.rotulo}>
        {t('carroceriaTitulo')}
        <Text style={styles.asterisco}> *</Text>
      </Text>
      <FilaChips>
        {CARROCERIAS.map((c) => (
          <Chip
            key={c.id}
            texto={t(c.chave)}
            activo={carroceria === c.id}
            onPress={() => onCarroceria(c.id)}
          />
        ))}
      </FilaChips>

      <Text style={styles.rotulo}>
        {t('capacidadeTitulo')}
        <Text style={styles.asterisco}> *</Text>
      </Text>
      <View style={styles.capacidades}>
        {CAPACIDADES.map((c) => {
          const activa = capacidade === c.id;
          return (
            <Pressable
              key={c.id}
              style={[styles.capacidade, activa && styles.capacidadeActiva]}
              onPress={() => onCapacidade(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
            >
              <Text style={[styles.capNome, activa && styles.capNomeActivo]}>{t(c.chave)}</Text>
              <Text style={styles.capNota}>{t(c.nota)}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label={t('anoVeiculo')}
        value={ano}
        onChangeText={(x) => onAno(x.replace(/[^\d]/g, ''))}
        placeholder="2018"
        keyboardType="number-pad"
        maxLength={4}
        hint={t('anoVeiculoHint')}
        icone="calendario"
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    rotulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    asterisco: { color: colors.danger },
    capacidades: { gap: spacing.sm, marginBottom: spacing.md },
    capacidade: {
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 56,
      justifyContent: 'center',
    },
    capacidadeActiva: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    capNome: { ...tipo.corpoForte, color: colors.text },
    capNomeActivo: { color: colors.teal },
    capNota: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
