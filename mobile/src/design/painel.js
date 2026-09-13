import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';
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

// ── Cartão de KPI (14/09/26, das referências do painel) ─────────────
//
// Ícone sozinho, o número grande, o rótulo, e por baixo uma faixa com uma
// frase curta que dá contexto ("Pedidu iha fila agora"). A faixa leva a tinta
// do estado: um número mau fica vermelho E a faixa rosada, para se apanhar
// pelo canto do olho. Com `onPress`, leva a seta e abre a secção onde se age.
export function CartaoKPI({ icone, valor, etiqueta, nota, estado = ESTADO.neutro, onPress }) {
  const alerta = estado === ESTADO.mau || estado === ESTADO.aviso;
  const cor = alerta ? corDoEstado(estado) : colors.teal;
  const fundo =
    estado === ESTADO.mau
      ? colors.tintaPerigo
      : estado === ESTADO.aviso
        ? colors.tintaCoral
        : colors.tintaTeal;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.kpi, pressed && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.kpiTopo}>
        <Icone nome={icone} tamanho={26} cor={cor} />
        <View style={styles.kpiTextos}>
          <Text style={[styles.kpiValor, alerta && { color: cor }]} numberOfLines={1}>
            {valor ?? '—'}
          </Text>
          <Text style={styles.metricaEtiqueta} numberOfLines={2}>
            {etiqueta}
          </Text>
        </View>
        {onPress ? <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} /> : null}
      </View>
      {nota ? (
        <View style={[styles.kpiNota, { backgroundColor: fundo }]}>
          <Text style={styles.kpiNotaTexto} numberOfLines={2}>
            {nota}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── A tarifa, com a conta à vista ────────────────────────────────────
//
// A referência pedia "Tarifa ba pasajeiru / Komisaun plataforma / Motorista
// simu" — e mostrava uma comissão de 15% que NÃO existe. A TimorgianaRide não
// cobra comissão: vive das assinaturas dos motoristas, e os termos dizem-no.
// A conta fica, porque é boa pergunta; a comissão sai a $0.00, porque é a
// verdade. Um painel da própria empresa a mostrar receita que ela não tem
// seria o pior sítio para errar.
export function CartaoTarifa({ total, etiqueta }) {
  const { t } = useI18n();
  const v = (n) => `$${Number(n || 0).toFixed(2)}`;
  return (
    <View style={styles.tarifa}>
      <View style={styles.kpiTopo}>
        <Icone nome="carteira" tamanho={30} cor={colors.teal} />
        <View style={styles.kpiTextos}>
          <Text style={styles.kpiValor}>{v(total)}</Text>
          <Text style={styles.metricaEtiqueta}>{etiqueta}</Text>
        </View>
      </View>
      <View style={styles.tarifaConta}>
        <LinhaConta rotulo={t('admTarifaPassageiro')} valor={v(total)} />
        <LinhaConta rotulo={t('admTarifaComissao')} valor={v(0)} />
        <View style={styles.tarifaTraco} />
        <LinhaConta rotulo={t('admTarifaMotorista')} valor={v(total)} forte />
      </View>
      <Text style={styles.metricaNota}>{t('admTarifasNota')}</Text>
    </View>
  );
}

function LinhaConta({ rotulo, valor, forte }) {
  return (
    <View style={styles.contaLinha}>
      <Text style={[styles.contaRotulo, forte && styles.contaForte]}>{rotulo}</Text>
      <Text style={[styles.contaValor, forte && styles.contaForte]}>{valor}</Text>
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
      // Cresce para ocupar a linha, mas parte de 46% — assim cabem DUAS
      // por linha e nunca quatro. Com `flex: 1` e quatro cartões, cada um
      // exigia 92 pt e o conjunto pedia 368 num ecrã com 288: o quarto
      // ficava fora do ecrã e as palavras partiam-se a meio.
      flexGrow: 1,
      flexBasis: '46%',
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

    kpi: {
      flexGrow: 1,
      flexBasis: '46%',
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      ...elevacao.plana,
    },
    kpiTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    kpiTextos: { flex: 1 },
    kpiValor: {
      ...tipo.displayPequeno,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    kpiNota: { borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: spacing.sm },
    kpiNotaTexto: { ...tipo.legenda, color: colors.text },
    tarifa: {
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      marginTop: spacing.sm,
      ...elevacao.plana,
    },
    tarifaConta: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 4,
    },
    tarifaTraco: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.teal,
      marginVertical: 4,
    },
    contaLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    contaRotulo: { ...tipo.pequeno, color: colors.text, flex: 1 },
    contaValor: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    contaForte: { color: colors.teal, fontSize: 16 },

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
