import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// O SELETOR DO TIPO DE CONTA — sistema de design TGA.
//
// Dois cartões lado a lado, "Pasajeiru — Husu transporte" e "Motorista —
// Halo rendimentu". O escolhido fica com contorno teal, fundo teal claro e um
// visto no canto, como nas referências.
//
// Cartões e não o interruptor de duas metades que havia: é a primeira
// pergunta do registo e decide o resto dele — o motorista tem uma etapa a
// mais, a do veículo. Uma decisão com consequências merece ver-se como duas
// opções com nome e explicação, não como um interruptor que se toca sem ler.
export default function SeletorConta({ valor, onMudar }) {
  const { t } = useI18n();
  const opcoes = [
    { id: 'passenger', icone: 'pessoa', nome: t('passenger'), nota: t('pasajeiruNota') },
    { id: 'driver', icone: 'volante', nome: t('driver'), nota: t('motoristaNota') },
  ];
  return (
    <View style={styles.linha} accessibilityRole="radiogroup">
      {opcoes.map((o) => {
        const activo = valor === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onMudar(o.id)}
            style={[styles.cartao, activo && styles.cartaoActivo]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${o.nome}. ${o.nota}`}
          >
            {activo ? (
              <View style={styles.visto}>
                <Icone nome="visto" tamanho={14} cor={colors.onTeal} traco={3} />
              </View>
            ) : null}
            <Icone nome={o.icone} tamanho={34} cor={activo ? colors.teal : colors.text} />
            <Text style={[styles.nome, activo && styles.nomeActivo]}>{o.nome}</Text>
            <Text style={[styles.nota, activo && styles.notaActiva]}>{o.nota}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    linha: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    cartao: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      minHeight: 120,
      justifyContent: 'center',
    },
    cartaoActivo: { borderColor: colors.teal, borderWidth: 2, backgroundColor: colors.tintaTeal },
    visto: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nome: { ...tipo.subtitulo, color: colors.text, marginTop: spacing.sm },
    nomeActivo: { color: colors.text },
    nota: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    notaActiva: { color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
