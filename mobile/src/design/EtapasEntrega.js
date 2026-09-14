import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import Icone from './Icone.js';
import { useI18n } from '../i18n/index.js';

// A LINHA DO TEMPO DE UMA ENTREGA DE BENS — sistema de design TGA (14/09/26).
//
// Oito passos, na vertical: numa viagem de pessoas bastam quatro na
// horizontal (EtapasViagem), mas uma mudança tem carregar, levar e descarregar
// — e oito bolas numa linha não cabem num telemóvel de 360 px.
//
// AS HORAS VÊM DO SERVIDOR, marcadas pelo motorista em cada etapa. Um passo
// conta como feito quando tem hora OU quando um passo depois dele já tem —
// se o motorista se esqueceu de carregar num botão, a entrega não fica
// "parada" num passo que já passou.
//
// O PAGAMENTO vai com a entrega: é em dinheiro, ao motorista, à porta.
function hhmm(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EtapasEntrega({ ride, avaliado = false }) {
  const { t } = useI18n();
  const concluida = ride.status === 'completed';
  const passos = [
    { chave: 'etapaPedidu', icone: 'visto', hora: ride.createdAt },
    { chave: 'etapaMotoristaDalan', icone: 'carry', hora: ride.acceptedAt },
    { chave: 'entregaChegou', icone: 'pin', hora: ride.aChegarEm },
    { chave: 'entregaCarregamento', icone: 'caixa', hora: ride.startedAt },
    { chave: 'entregaTransporte', icone: 'rota', hora: ride.carregadaEm },
    { chave: 'entregaDescarga', icone: 'caixa', hora: ride.noDestinoEm },
    {
      chave: 'entregaConcluidaEtapa',
      icone: 'bandeira',
      hora: concluida ? ride.updatedAt : null,
      nota:
        ride.fareUsd != null
          ? t('entregaPagamentoNota', { preco: `$${Number(ride.fareUsd).toFixed(2)}` })
          : null,
    },
    { chave: 'entregaAvaliacao', icone: 'estrela', hora: null, feito: avaliado },
  ];
  let ultimoFeito = -1;
  passos.forEach((p, i) => {
    if (p.hora || p.feito) ultimoFeito = i;
  });
  const actual = ultimoFeito + 1;

  return (
    <View style={styles.caixa}>
      <Text style={styles.titulo}>{t('entregaTitulo')}</Text>
      {passos.map((p, i) => {
        const feito = i <= ultimoFeito;
        const agora = i === actual && ride.status !== 'cancelled';
        const ultimo = i === passos.length - 1;
        return (
          <View key={p.chave} style={styles.linha}>
            <View style={styles.coluna}>
              <View style={[styles.bola, feito && styles.bolaFeita, agora && styles.bolaAgora]}>
                <Icone
                  nome={feito ? 'visto' : p.icone}
                  tamanho={16}
                  cor={feito ? colors.onTeal : agora ? colors.teal : colors.textMuted}
                  traco={feito ? 3 : 2}
                />
              </View>
              {ultimo ? null : <View style={[styles.traco, feito && styles.tracoFeito]} />}
            </View>
            <View style={[styles.textos, !ultimo && styles.textosAfastados]}>
              <Text style={[styles.nome, (feito || agora) && styles.nomeActivo]}>{t(p.chave)}</Text>
              {p.nota && (agora || feito) ? <Text style={styles.nota}>{p.nota}</Text> : null}
            </View>
            <Text style={styles.hora}>{feito ? hhmm(p.hora) || '' : ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

const BOLA = 30;
const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      backgroundColor: colors.white,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      marginVertical: spacing.md,
    },
    titulo: { ...tipo.corpoForte, color: colors.teal, marginBottom: spacing.sm },
    linha: { flexDirection: 'row', gap: spacing.sm },
    coluna: { width: BOLA, alignItems: 'center' },
    bola: {
      width: BOLA,
      height: BOLA,
      borderRadius: BOLA / 2,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bolaFeita: { backgroundColor: colors.teal, borderColor: colors.teal },
    bolaAgora: { borderColor: colors.teal, borderWidth: 3 },
    traco: { flex: 1, width: 2, minHeight: 12, backgroundColor: colors.border, marginVertical: 2 },
    tracoFeito: { backgroundColor: colors.teal },
    textos: { flex: 1, paddingTop: 5 },
    textosAfastados: { paddingBottom: spacing.sm },
    nome: { ...tipo.pequeno, color: colors.textMuted },
    nomeActivo: { ...tipo.corpoForte, fontSize: 14, color: colors.text },
    nota: { ...tipo.legenda, color: colors.teal, marginTop: 1 },
    hora: {
      ...tipo.legenda,
      color: colors.textMuted,
      paddingTop: 7,
      fontVariant: ['tabular-nums'],
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
