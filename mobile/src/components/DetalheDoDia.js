import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './Button.js';
import MolduraModal from '../design/MolduraModal.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { diaDaSemana, horasMinutos } from '../lib/periodos.js';
import { paraMostrar } from '../lib/datas.js';

// O DETALHE DE UM DIA DOS GANHOS (04/10/2026): o resumo do dia e cada viagem.
//
// As canceladas aparecem também, marcadas, e sem valor: não renderam, mas
// aconteceram — e é delas que o motorista se lembra quando o dia correu mal.
// O dia de atividade diz se foi CONSUMIDO, que é o que lhe gasta o plano.
export default function DetalheDoDia({ dia, semHoras, aoFechar }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!dia) return undefined;
    let vivo = true;
    setD(null);
    setErro(null);
    api
      .ganhosDoDia(token, dia)
      .then((r) => vivo && setD(r))
      .catch((e) => vivo && setErro(e?.message === 'NETWORK' ? t('errNetwork') : t('errGeneric')));
    return () => {
      vivo = false;
    };
  }, [dia, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomesDia = t('semanaLonga').split(',');

  return (
    <Modal visible={!!dia} animationType="slide" onRequestClose={aoFechar}>
      <MolduraModal style={styles.safe}>
        <View style={styles.cabecalho}>
          <Text style={styles.etiqueta}>{t('ganhosDetalheDia')}</Text>
          <Text style={styles.titulo}>
            {dia ? `${nomesDia[diaDaSemana(dia)]}, ${paraMostrar(dia)}` : ''}
          </Text>
        </View>

        {!d && !erro ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        ) : erro ? (
          <Text style={styles.erro}>{erro}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.conteudo}>
            <View style={styles.grelha}>
              <Numero rotulo={t('ganhosDoDia')} valor={`$${d.valor.toFixed(2)}`} forte />
              <Numero rotulo={t('ganhosViagens')} valor={String(d.viagens)} />
              <Numero
                rotulo={t('ganhosHorasOnline')}
                valor={semHoras ? '—' : horasMinutos(d.minutosOnline)}
              />
              <Numero rotulo={t('ganhosKm')} valor={`${d.km.toFixed(1)} km`} />
            </View>
            <View style={[styles.diaAtividade, d.conta && styles.diaAtividadeConta]}>
              <Text style={styles.diaAtividadeRotulo}>{t('ganhosDiaAtividade')}</Text>
              <Text style={[styles.diaAtividadeValor, d.conta && styles.diaAtividadeValorConta]}>
                {!d.conta
                  ? t('ganhosNaoConsumido')
                  : d.gratuito
                    ? t('ganhosConsumidoGratis')
                    : t('ganhosConsumido')}
              </Text>
            </View>

            <Text style={styles.seccao}>{t('ganhosViagensDoDia')}</Text>
            {d.lista?.length ? (
              d.lista.map((v) => <LinhaViagem key={v.id} v={v} t={t} />)
            ) : (
              <Text style={styles.vazio}>{t('ganhosSemViagensDia')}</Text>
            )}
          </ScrollView>
        )}

        <View style={styles.rodape}>
          <Button title={t('reportarFechar')} variant="outline" onPress={aoFechar} />
        </View>
      </MolduraModal>
    </Modal>
  );
}

function Numero({ rotulo, valor, forte }) {
  return (
    <View style={styles.numero}>
      <Text style={styles.numeroRotulo} numberOfLines={2}>
        {rotulo}
      </Text>
      <Text style={[styles.numeroValor, forte && styles.numeroForte]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function LinhaViagem({ v, t }) {
  const concluida = v.estado === 'completed';
  const veiculo = VEICULOS[v.veiculo];
  return (
    <View style={styles.viagem}>
      <View style={styles.viagemTopo}>
        <Text style={styles.viagemHora}>{v.hora}</Text>
        <View style={[styles.estado, !concluida && styles.estadoCancelada]}>
          <Text style={[styles.estadoTexto, !concluida && styles.estadoTextoCancelada]}>
            {concluida ? t('ganhosConcluida') : t('ganhosCancelada')}
          </Text>
        </View>
        <Text style={[styles.viagemValor, !concluida && styles.viagemValorNada]}>
          {concluida ? `$${Number(v.valor ?? 0).toFixed(2)}` : '—'}
        </Text>
      </View>
      {v.origem ? (
        <Text style={styles.percurso} numberOfLines={2}>
          {v.origem}
        </Text>
      ) : null}
      {v.destino ? (
        <Text style={styles.percurso} numberOfLines={2}>
          → {v.destino}
        </Text>
      ) : null}
      <Text style={styles.viagemNota}>
        {[
          veiculo ? t(veiculo.chaveNome) : null,
          v.km != null ? `${v.km.toFixed(1)} km` : null,
          v.referencia,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    cabecalho: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    etiqueta: { ...tipo.etiqueta, color: colors.textMuted },
    titulo: { ...tipo.displayPequeno, color: colors.text, marginTop: 2 },
    conteudo: { padding: spacing.lg, paddingTop: spacing.sm },
    erro: { ...tipo.pequeno, color: colors.danger, textAlign: 'center', marginTop: spacing.xl },
    grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    numero: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    numeroRotulo: { ...tipo.legenda, color: colors.textMuted },
    numeroValor: {
      ...tipo.subtitulo,
      color: colors.text,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    numeroForte: { color: colors.teal },
    diaAtividade: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.xs,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    diaAtividadeConta: { backgroundColor: colors.tintaTeal },
    diaAtividadeRotulo: { ...tipo.corpo, color: colors.text },
    diaAtividadeValor: { ...tipo.corpoForte, color: colors.textMuted },
    diaAtividadeValorConta: { color: colors.teal },
    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    vazio: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    viagem: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 2,
    },
    viagemTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
    viagemHora: { ...tipo.corpoForte, color: colors.text, fontVariant: ['tabular-nums'] },
    estado: {
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    estadoCancelada: { backgroundColor: colors.tintaPerigo },
    estadoTexto: { ...tipo.legenda, color: colors.teal },
    estadoTextoCancelada: { color: colors.danger },
    viagemValor: {
      ...tipo.corpoForte,
      color: colors.text,
      marginLeft: 'auto',
      fontVariant: ['tabular-nums'],
    },
    viagemValorNada: { color: colors.textMuted },
    percurso: { ...tipo.pequeno, color: colors.text },
    viagemNota: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    rodape: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
