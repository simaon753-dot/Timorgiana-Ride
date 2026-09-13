import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import RodapeMarca from '../design/RodapeMarca.js';
import { tipo } from '../design/tipografia.js';
import { VEICULOS, nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

// "O QUE PRETENDE TRANSPORTAR?" — o primeiro passo do Carry (14/09/26).
//
// PORQUE EXISTE. A pergunta bens-ou-pessoas vivia no ecrã de confirmar, ao
// lado do preço. Isso obrigava a escolher o destino antes de saber que tipo
// de pedido se estava a fazer — e são dois pedidos DIFERENTES: um pergunta o
// que vai, o tamanho e as fotografias; o outro pergunta quantas pessoas.
// Misturados no mesmo ecrã, cada um via as perguntas do outro a aparecer e a
// desaparecer.
//
// Por isso é a primeira coisa, sozinha, com duas opções grandes e nada mais:
// sem destino, sem preço, sem campos. Depois desta escolha o fluxo fecha-se —
// quem escolheu pessoas não vê uma única pergunta de carga.
//
// As duas opções têm cores diferentes de propósito: o azul do Carry para os
// bens (é o serviço que o Carry é), o teal da marca para as pessoas.
const OPCOES = [
  {
    modo: 'bens',
    icone: 'caixa',
    titulo: 'carryBensTitulo',
    sub: 'carryBensSub',
    tinta: 'tintaCarry',
    acento: 'acentoCarry',
  },
  {
    modo: 'pessoas',
    icone: 'grupo',
    titulo: 'carryPessoasTitulo',
    sub: 'carryPessoasSub',
    tinta: 'tintaTeal',
    acento: 'teal',
  },
];

export default function EscolherCarryScreen({ navigation }) {
  const { t } = useI18n();
  const carry = VEICULOS.carry;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topo}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={styles.voltar}
          >
            <Icone nome="voltar" tamanho={22} cor={colors.text} traco={2.4} />
          </Pressable>
          <View style={styles.pastilha}>
            <Icone nome={carry.icone} tamanho={18} cor={colors.teal} />
            <Text style={styles.pastilhaTexto}>{nomeDoVeiculo(t, 'carry')}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{t('carryEscolherTitulo')}</Text>
        <Text style={styles.subtitulo}>{t('carryEscolherSub')}</Text>

        {OPCOES.map((o) => (
          <Pressable
            key={o.modo}
            style={({ pressed }) => [
              styles.opcao,
              { backgroundColor: colors[o.tinta] },
              pressed && styles.premido,
            ]}
            onPress={() =>
              navigation.navigate('EscolherDestino', { veiculo: 'carry', modoCarry: o.modo })
            }
            accessibilityRole="button"
            accessibilityLabel={`${t(o.titulo)}. ${t(o.sub)}`}
          >
            <View style={[styles.opcaoIcone, { backgroundColor: colors[o.acento] }]}>
              <Icone nome={o.icone} tamanho={40} cor={colors.onAcento} traco={1.8} />
            </View>
            <View style={styles.opcaoTextos}>
              <Text style={styles.opcaoTitulo}>{t(o.titulo)}</Text>
              <Text style={styles.opcaoSub}>{t(o.sub)}</Text>
            </View>
            <View style={styles.opcaoSeta}>
              <Icone nome="seta" tamanho={20} cor={colors[o.acento]} traco={2.5} />
            </View>
          </Pressable>
        ))}

        <RodapeMarca />
      </ScrollView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    voltar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevacao.plana,
    },
    pastilha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.tintaTeal,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    pastilhaTexto: { ...tipo.corpoForte, color: colors.teal },
    titulo: { ...tipo.display, color: colors.text },
    subtitulo: {
      ...tipo.corpo,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    // Duas opções GRANDES: é a única decisão do ecrã, e toma-se de pé.
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 132,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...elevacao.plana,
    },
    premido: { opacity: 0.9, transform: [{ scale: 0.995 }] },
    opcaoIcone: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    opcaoTextos: { flex: 1 },
    opcaoTitulo: { ...tipo.titulo, color: colors.text },
    opcaoSub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    opcaoSeta: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
