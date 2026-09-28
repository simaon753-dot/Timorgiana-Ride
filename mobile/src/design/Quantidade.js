import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// QUANTOS, COM − E + (29/09/2026).
//
// Era um campo de texto, e pedir «2» obrigava a abrir o teclado numérico para
// escrever um algarismo. Os botões resolvem o caso de todos os dias (1, 2, 3)
// com um toque; o número ao meio continua a poder escrever-se, para quem quer
// 24 garrafas e não 23 toques.
//
// O VALOR É TEXTO, como era no campo: enquanto se escreve pode estar vazio, e
// um número obrigaria a inventar um valor para esse instante. Quem usa o
// valor já o converte e limita (o ecrã da encomenda faz `Math.max(1, …)`).
//
// Altura 54, a mesma do `TextField`: lado a lado, os dois alinham pela base.
export default function Quantidade({ valor, onMudar, min = 1, max = 99, rotulo }) {
  const n = Number(valor) || 0;
  const mudar = (d) => onMudar(String(Math.max(min, Math.min(max, (n || min) + d))));
  return (
    <View style={styles.caixa}>
      <Botao
        icone="menos"
        onPress={() => mudar(-1)}
        desligado={n <= min}
        rotulo={`${rotulo || ''} −`}
      />
      <TextInput
        style={styles.numero}
        value={String(valor)}
        onChangeText={(v) => onMudar(v.replace(/[^0-9]/g, '').slice(0, String(max).length))}
        onBlur={() => {
          // Sai do campo vazio ou a zero: volta ao mínimo, em vez de ficar um
          // artigo com quantidade nenhuma.
          if (!n) onMudar(String(min));
        }}
        keyboardType="number-pad"
        maxLength={String(max).length}
        selectTextOnFocus
        accessibilityLabel={rotulo}
      />
      <Botao
        icone="mais"
        onPress={() => mudar(1)}
        desligado={n >= max}
        rotulo={`${rotulo || ''} +`}
      />
    </View>
  );
}

function Botao({ icone, onPress, desligado, rotulo }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desligado}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desligado }}
      style={({ pressed }) => [
        styles.botao,
        desligado && styles.botaoDesligado,
        pressed && !desligado && styles.premido,
      ]}
    >
      <Icone
        nome={icone}
        tamanho={18}
        cor={desligado ? colors.textMuted : colors.onTeal}
        traco={2.6}
      />
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 54,
      paddingHorizontal: spacing.xs,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
    },
    botao: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teal,
    },
    botaoDesligado: { backgroundColor: colors.border },
    premido: { opacity: 0.8 },
    numero: {
      ...tipo.corpoForte,
      flex: 1,
      minWidth: 28,
      textAlign: 'center',
      color: colors.text,
      paddingVertical: 0,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
