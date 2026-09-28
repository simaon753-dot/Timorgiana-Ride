import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';

// AS FOTOGRAFIAS DE UM PEDIDO — a encomenda e a carga do Pickup (29/09/2026).
//
// Os dois ecrãs tinham cada um a sua maneira: a encomenda um botão teal cheio
// com 📷, e retirava-se uma fotografia tocando-lhe, sem nada que o dissesse; o
// Pickup dois botões. Agora é um componente só, e retirar tem um ✕ à vista.
//
// `accoes` é UMA ou DUAS: a encomenda tenta a câmara e cai na galeria (uma
// acção), o Pickup deixa escolher (duas). Com uma, a área tracejada ocupa a
// largura toda; com duas, ficam lado a lado.
//
// A área tracejada desaparece ao chegar a `max`: um botão que não pode fazer
// nada não fica no ecrã a prometer.
export default function FotosPedido({ fotos, max, onRetirar, accoes, rotuloFoto, rotuloRetirar }) {
  const cheio = fotos.length >= max;
  return (
    <View>
      {fotos.length ? (
        <View style={styles.grelha}>
          {fotos.map((f, n) => (
            <View key={f.uri} style={styles.miniatura}>
              <Image
                source={{ uri: f.uri }}
                style={styles.imagem}
                resizeMode="cover"
                accessibilityLabel={`${rotuloFoto} ${n + 1}`}
              />
              <Pressable
                onPress={() => onRetirar(f)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`${rotuloRetirar} ${n + 1}`}
                style={styles.retirar}
              >
                <Icone nome="fechar" tamanho={14} cor={colors.white} traco={3} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {!cheio ? (
        <View style={styles.accoes}>
          {accoes.map((a) => (
            <Pressable
              key={a.rotulo}
              onPress={a.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.juntar,
                accoes.length === 1 && styles.juntarLargo,
                pressed && styles.premido,
              ]}
            >
              <Icone nome={a.icone} tamanho={24} cor={colors.teal} />
              <Text style={styles.juntarTexto}>{a.rotulo}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    miniatura: { width: 88, height: 88 },
    imagem: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.border },
    // O ✕ num círculo escuro por cima da fotografia: a fotografia pode ser de
    // qualquer cor, e só um fundo próprio garante que o ✕ se vê.
    retirar: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', // fixo de propósito: fica sobre a fotografia, não sobre o tema
    },
    accoes: { flexDirection: 'row', gap: spacing.sm },
    juntar: {
      flex: 1,
      minHeight: 76,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.teal,
      borderRadius: radius.lg,
      backgroundColor: colors.tintaTeal,
      paddingVertical: spacing.sm,
    },
    juntarLargo: { flexDirection: 'row', minHeight: 60, gap: spacing.sm },
    premido: { opacity: 0.8 },
    juntarTexto: { ...tipo.corpoForte, color: colors.teal },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
