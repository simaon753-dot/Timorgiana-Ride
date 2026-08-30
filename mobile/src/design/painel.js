import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, elevacao, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';

// Peças de dashboard.
//
// Um painel não se lê de cima a baixo como um documento — percorre-se com
// os olhos à procura do que está mal. Isso muda o que a interface tem de
// fazer: o estado tem de ser reconhecível ANTES de ser lido.
//
// Daí três regras que estas peças aplicam:
//
//   1. O estado tem forma, não só número. Uma pastilha, uma barra de cor,
//      um ponto — coisas que se apanham pelo canto do olho.
//   2. A cor de aviso é SEPARADA da cor da marca. O coral da
//      TimorgianaRide é destaque; o vermelho é problema. Se forem a mesma
//      coisa, deixa de haver forma de gritar.
//   3. Nada de emoji. Um 🟢 muda de desenho conforme o telemóvel, não se
//      alinha com o texto e não recebe a cor do tema. As formas aqui são
//      desenhadas com bordas e fundos, e obedecem ao tema.

// ── Semáforo de estado ───────────────────────────────────────────────
//
// Quatro níveis e não mais. Com cinco, ninguém distingue o terceiro do
// quarto — e um painel onde não se distinguem os níveis é um painel sem
// níveis nenhuns.
export const ESTADO = {
  bom: 'bom',
  aviso: 'aviso',
  mau: 'mau',
  neutro: 'neutro',
};

function corDoEstado(estado) {
  if (estado === ESTADO.bom) return colors.success;
  if (estado === ESTADO.aviso) return colors.coral;
  if (estado === ESTADO.mau) return colors.danger;
  return colors.textMuted;
}

// Ponto de estado. Substitui o 🟢 — mesma leitura, mas segue o tema e
// alinha-se com o texto.
export function Ponto({ estado = ESTADO.neutro, tamanho = 8 }) {
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: corDoEstado(estado),
      }}
    />
  );
}

// Pastilha de estado: cor + palavra. A cor sozinha não chega — quem não
// distingue verde de vermelho fica sem informação nenhuma.
export function Pastilha({ texto, estado = ESTADO.neutro }) {
  const cor = corDoEstado(estado);
  return (
    <View style={[styles.pastilha, { borderColor: cor }]}>
      <Ponto estado={estado} tamanho={6} />
      <Text style={[styles.pastilhaTexto, { color: cor }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

// ── Cartão de métrica ────────────────────────────────────────────────
//
// O número grande, o rótulo pequeno, e uma barra de estado à esquerda
// quando o valor exige atenção. A barra é o que faz um painel de oito
// números render um olhar em vez de oito.
export function Metrica({ valor, etiqueta, estado, nota }) {
  const temEstado = estado && estado !== ESTADO.neutro;
  return (
    <View
      style={[
        styles.metrica,
        temEstado && { borderLeftWidth: 3, borderLeftColor: corDoEstado(estado) },
      ]}
    >
      <Text style={[styles.metricaValor, temEstado && { color: corDoEstado(estado) }]}>
        {valor ?? '—'}
      </Text>
      <Text style={styles.metricaEtiqueta} numberOfLines={2}>
        {etiqueta}
      </Text>
      {nota ? <Text style={styles.metricaNota}>{nota}</Text> : null}
    </View>
  );
}

// ── Painel de secção ─────────────────────────────────────────────────
export function Bloco({ titulo, accao, children }) {
  return (
    <View style={styles.bloco}>
      {titulo ? (
        <View style={styles.blocoTopo}>
          <Text style={styles.blocoTitulo}>{titulo}</Text>
          {accao}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ── Esqueleto de carregamento ────────────────────────────────────────
//
// Em vez de um círculo a girar no meio do ecrã. O esqueleto diz o que
// vem aí e não desloca nada quando os dados chegam — girar num ecrã vazio
// só diz "espera", e não diz pelo quê.
export function Esqueleto({ linhas = 3, altura = 56 }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: linhas }).map((_, i) => (
        <View key={i} style={[styles.esqueleto, { height: altura }]} />
      ))}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    pastilha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      alignSelf: 'flex-start',
    },
    pastilhaTexto: { ...tipo.legenda, fontVariant: ['tabular-nums'] },

    metrica: {
      flex: 1,
      minWidth: 92,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      ...elevacao.plana,
    },
    // Números tabulares: num painel que se actualiza, o valor não pode
    // saltar de posição só por passar de 9 para 10.
    metricaValor: {
      ...tipo.display,
      color: colors.text,
      fontVariant: ['tabular-nums'],
      lineHeight: 38,
    },
    metricaEtiqueta: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    metricaNota: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs, opacity: 0.8 },

    bloco: { marginBottom: spacing.lg },
    blocoTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    blocoTitulo: { ...tipo.etiqueta, color: colors.textMuted },

    esqueleto: {
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      opacity: 0.6,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
