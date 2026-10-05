import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icone from '../design/Icone.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';
import { tipo, FAMILIAS } from '../design/tipografia.js';

// UMA VIAGEM NO HISTÓRICO (05/10/2026, pedido do Simão).
//
// Pela ordem do que se procura: o estado e o preço; de onde para onde; com
// quem; quando; em quê; e a avaliação. O cartão inteiro abre o detalhe.
//
// As estrelas são as que ESTA pessoa deu — nunca cinco estrelas por omissão.
// Sem avaliação, numa viagem concluída, aparece «Avaliar viagem», que abre o
// detalhe já com o painel de avaliar. Numa cancelada não há nada a avaliar.
export default function CartaoViagem({ r, eu, onAbrir, onAvaliar }) {
  const { t } = useI18n();
  const souMotorista = r.driver?.id === eu;
  // A outra pessoa: no ecrã de quem conduziu, o passageiro; no de quem
  // viajou, o motorista.
  const com = souMotorista ? r.passenger?.name : r.driver?.name;
  const veiculo = VEICULOS[r.vehicleType || r.driver?.vehicle?.type] || VEICULOS.car;
  const modelo = r.driver?.vehicle?.model || null;
  const concluida = r.status === 'completed';

  const estado = r.reportada
    ? {
        icone: 'aviso',
        cor: colors.coralDark,
        fundo: colors.tintaCoral,
        texto: t('viagemReportada'),
      }
    : concluida
      ? { icone: 'visto', cor: colors.teal, fundo: colors.tintaTeal, texto: t('viagemConcluida') }
      : {
          icone: 'fechar',
          cor: colors.danger,
          fundo: colors.tintaPerigo,
          texto: t('viagemCancelada'),
        };

  const quando = dataHora(r.concluidaEm || r.createdAt);

  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [styles.cartao, pressed && styles.premido]}
      accessibilityRole="button"
      accessibilityLabel={[
        estado.texto,
        r.originLabel,
        r.destLabel,
        r.fareUsd != null ? `$${r.fareUsd}` : null,
        quando.data,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={t('historyVerDetalhe')}
    >
      {/* 1. Estado e preço */}
      <View style={styles.topo}>
        <View style={[styles.estado, { backgroundColor: estado.fundo }]}>
          <Icone nome={estado.icone} tamanho={14} cor={estado.cor} traco={2.6} />
          <Text style={[styles.estadoTexto, { color: estado.cor }]} numberOfLines={1}>
            {estado.texto}
          </Text>
        </View>
        <View style={styles.precoCaixa}>
          <Text
            style={[styles.preco, !concluida && styles.precoApagado]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {r.fareUsd != null ? `$${Number(r.fareUsd).toFixed(2)}` : '—'}
          </Text>
          <Icone nome="seta" tamanho={18} cor={colors.textMuted} traco={2.4} />
        </View>
      </View>

      {/* 2. De onde para onde: recolha teal em cima, destino coral em baixo */}
      <View style={styles.percurso}>
        {/* Cada bolinha ao lado do NOME do seu sítio; o tracejado desce da
            recolha até ao destino, por mais linhas que a morada ocupe. */}
        <View style={styles.linhaLugar}>
          <View style={styles.trilho}>
            <View style={[styles.ponto, { backgroundColor: colors.teal }]} />
            <View style={styles.tracejado}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.traco} />
              ))}
            </View>
          </View>
          <Lugar texto={r.originLabel} vazio={t('detalheRecolha')} />
        </View>
        <View style={styles.linhaLugar}>
          <View style={styles.trilho}>
            <View style={[styles.ponto, { backgroundColor: colors.coral }]} />
          </View>
          <Lugar texto={r.destLabel} vazio={t('detalheDestino')} />
        </View>
      </View>

      {/* 3. Com quem */}
      {com ? (
        <Text style={styles.com} numberOfLines={1}>
          {t('withLabel')}: <Text style={styles.comNome}>{com}</Text>
        </Text>
      ) : null}

      {/* 4–6. Quando, em quê, a avaliação */}
      <View style={styles.rodape}>
        <View style={styles.info}>
          <Icone nome="calendario" tamanho={18} cor={colors.textMuted} />
          <View style={styles.infoTextos}>
            <Text style={styles.infoForte} numberOfLines={1}>
              {quando.data}
            </Text>
            <Text style={styles.infoFraco} numberOfLines={1}>
              {quando.hora}
            </Text>
          </View>
        </View>
        <View style={[styles.info, styles.infoVeiculo]}>
          <Icone nome={veiculo.icone} tamanho={20} cor={colors.textMuted} />
          <View style={styles.infoTextos}>
            <Text style={styles.infoForte} numberOfLines={1}>
              {t(veiculo.chaveNome)}
            </Text>
            {modelo ? (
              <Text style={styles.infoFraco} numberOfLines={1}>
                {modelo}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.avaliacao}>
          {r.myStars != null ? (
            <View
              style={styles.estrelas}
              accessible
              accessibilityLabel={t('historyEstrelas', { n: r.myStars })}
            >
              <Text style={styles.estrelasTexto} maxFontSizeMultiplier={1.2}>
                {'★'.repeat(r.myStars)}
                <Text style={styles.estrelasVazias}>{'★'.repeat(5 - r.myStars)}</Text>
              </Text>
              <Text style={styles.nota} maxFontSizeMultiplier={1.2}>
                {Number(r.myStars).toFixed(1)}
              </Text>
            </View>
          ) : concluida ? (
            <Pressable
              onPress={onAvaliar}
              hitSlop={10}
              style={styles.avaliar}
              accessibilityRole="button"
            >
              <Text style={styles.avaliarTexto} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                ☆ {t('historyAvaliar')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// O nome do sítio em forte e o resto da morada em cinzento, por baixo:
// «ATM BNU, Rua X, Díli» → «ATM BNU» + «Rua X, Díli».
function Lugar({ texto, vazio }) {
  const [principal, ...resto] = String(texto || '').split(',');
  return (
    <View style={styles.lugar}>
      <Text style={styles.lugarPrincipal} numberOfLines={1}>
        {principal?.trim() || vazio}
      </Text>
      {resto.length ? (
        <Text style={styles.lugarResto} numberOfLines={1}>
          {resto.join(',').trim()}
        </Text>
      ) : null}
    </View>
  );
}

// A data e a hora como se escrevem em Timor-Leste. Aceita o ISO do Postgres
// e o formato antigo do SQLite, e nunca mostra «Invalid Date».
export function dataHora(s) {
  if (!s) return { data: '', hora: '' };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return { data: m ? `${m[3]}/${m[2]}/${m[1]}` : '', hora: '' };
  }
  const dois = (n) => String(n).padStart(2, '0');
  return {
    data: `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${dois(d.getHours())}:${dois(d.getMinutes())}`,
  };
}

// O lugar-tipo enquanto o histórico carrega: a mesma altura do cartão, para
// nada saltar quando os dados chegam.
export function CartaoViagemEsqueleto() {
  return (
    <View style={[styles.cartao, styles.esqueleto]} accessibilityElementsHidden>
      <View style={styles.topo}>
        <View style={[styles.osso, { width: 130, height: 22 }]} />
        <View style={[styles.osso, { width: 60, height: 22 }]} />
      </View>
      <View style={[styles.osso, { width: '70%', height: 14, marginTop: spacing.md }]} />
      <View style={[styles.osso, { width: '55%', height: 14, marginTop: spacing.md }]} />
      <View style={[styles.osso, { width: '40%', height: 12, marginTop: spacing.md }]} />
      <View style={[styles.osso, { width: '100%', height: 30, marginTop: spacing.md }]} />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm + 4,
      ...elevacao.plana,
    },
    premido: { opacity: 0.85 },
    topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      flexShrink: 1,
    },
    estadoTexto: { ...tipo.corpoForte, fontSize: 13 },
    precoCaixa: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
    preco: {
      fontFamily: FAMILIAS.forte,
      fontSize: 20,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    precoApagado: { color: colors.textMuted, textDecorationLine: 'line-through' },

    percurso: { marginTop: spacing.md },
    linhaLugar: { flexDirection: 'row', gap: spacing.sm },
    trilho: { width: 12, alignItems: 'center', paddingTop: 6 },
    ponto: { width: 10, height: 10, borderRadius: 5 },
    tracejado: { flex: 1, justifyContent: 'space-evenly', paddingVertical: 3, minHeight: 14 },
    traco: { width: 2, height: 3, borderRadius: 1, backgroundColor: colors.border },
    lugar: { flex: 1, minWidth: 0, paddingBottom: spacing.sm },
    lugarPrincipal: { ...tipo.corpoForte, color: colors.text },
    lugarResto: { ...tipo.legenda, color: colors.textMuted },

    com: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.sm },
    comNome: { ...tipo.corpoForte, fontSize: 13.5, color: colors.text },

    rodape: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    info: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
    infoVeiculo: { flex: 1.1 },
    infoTextos: { flex: 1, minWidth: 0 },
    infoForte: { ...tipo.legenda, color: colors.text },
    infoFraco: { ...tipo.legenda, fontSize: 11, color: colors.textMuted },
    avaliacao: { alignItems: 'flex-end', minWidth: 96 },
    estrelas: { alignItems: 'flex-end' },
    estrelasTexto: { fontSize: 14, letterSpacing: 1, color: colors.star },
    estrelasVazias: { color: colors.border },
    nota: { ...tipo.legenda, fontSize: 11, color: colors.textMuted },
    avaliar: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.teal,
    },
    avaliarTexto: { ...tipo.corpoForte, fontSize: 12.5, color: colors.teal },

    esqueleto: { opacity: 0.8 },
    osso: { backgroundColor: colors.paper, borderRadius: radius.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
