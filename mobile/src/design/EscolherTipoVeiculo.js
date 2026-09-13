import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { colors, spacing, radius, registarEstilos, paletaEmUso } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';
import { TIPOS_VEICULO, VEICULOS } from '../dados/tiposDeVeiculo.js';

// O SELETOR DO TIPO DE VEÍCULO — sistema de design TGA.
//
// As ilustrações do Simão em três cartões — Motorizada, Kareta, Carry /
// Pickup —, com um círculo de escolha e o nome por baixo. Pedido dele: "é
// melhor utilizar as imagens como ícone no registo". Serve o registo do
// motorista e o formulário do veículo, que são a mesma pergunta.
//
// A COR DO ESCOLHIDO VEM DA TABELA (tinta e acento de cada veículo, em
// dados/tiposDeVeiculo.js): o Carry escolhido fica azul, os outros teal e
// coral. É o que o distingue dos veículos de pessoas sem uma regra à parte.
//
// A imagem vive num quadrado da cor do fundo dela (branco de dia, preto de
// noite) — a mesma moldura do ecrã inicial.
export default function EscolherTipoVeiculo({ valor, onEscolher }) {
  const { t } = useI18n();
  const fundoImagem = paletaEmUso() === 'escuro' ? '#000000' : '#FFFFFF';
  return (
    <View style={styles.linha} accessibilityRole="radiogroup">
      {TIPOS_VEICULO.map((id) => {
        const v = VEICULOS[id];
        const activo = valor === id;
        const acento = colors[v.acento] || colors.teal;
        return (
          <Pressable
            key={id}
            onPress={() => onEscolher(id)}
            style={[
              styles.cartao,
              activo && {
                borderColor: acento,
                borderWidth: 2,
                backgroundColor: colors[v.tinta] || colors.tintaTeal,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={t(v.chaveNome)}
          >
            {activo ? (
              <View style={[styles.visto, { backgroundColor: acento }]}>
                <Icone nome="visto" tamanho={13} cor={colors.onAcento} traco={3} />
              </View>
            ) : null}
            <View style={[styles.foto, { backgroundColor: fundoImagem }]}>
              <Image
                source={v.imagens[paletaEmUso()] || v.imagens.claro}
                style={styles.imagem}
                resizeMode="contain"
              />
            </View>
            <View style={styles.rodape}>
              <View style={[styles.radio, activo && { borderColor: acento }]}>
                {activo ? <View style={[styles.ponto, { backgroundColor: acento }]} /> : null}
              </View>
              <Text style={styles.nome} numberOfLines={2}>
                {t(v.chaveNome)}
              </Text>
            </View>
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
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      padding: 6,
      paddingBottom: spacing.sm,
    },
    visto: {
      position: 'absolute',
      top: 6,
      right: 6,
      zIndex: 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foto: { borderRadius: radius.md, overflow: 'hidden', aspectRatio: 4 / 3 },
    imagem: { width: '100%', height: '100%' },
    rodape: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ponto: { width: 8, height: 8, borderRadius: 4 },
    nome: { ...tipo.corpoForte, fontSize: 13, lineHeight: 17, color: colors.text, flex: 1 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
