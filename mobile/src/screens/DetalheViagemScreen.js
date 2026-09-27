import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Voltar from '../components/Voltar.js';
import StatusBadge from '../components/StatusBadge.js';
import StarRating from '../components/StarRating.js';
import RatingPanel from '../components/RatingPanel.js';
import Icone from '../design/Icone.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// UMA VIAGEM DO HISTÓRICO, ABERTA (27/09/2026).
//
// O histórico era uma lista para ler e mais nada. Duas coisas faltavam, e o
// Simão pediu as duas: avaliar depois (o painel do fim da viagem só existe
// enquanto a viagem está no ecrã — quem o fechava perdia a vez) e reportar
// um problema, com a queixa presa a ESTA viagem para quem a trata saber logo
// quem, quando e por onde.
//
// Vale igual para passageiro e motorista: o servidor diz em que lugar quem
// pergunta esteve nesta viagem (`papel`), e é isso que decide quem se avalia
// e que problemas se podem reportar.
export default function DetalheViagemScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const rideId = route.params?.rideId;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  // Ao VOLTAR do Reportar também: a ocorrência nova tem de aparecer na lista
  // sem a pessoa ter de sair e entrar.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      setErro(false);
      api
        .detalheViagem(token, rideId)
        .then((d) => vivo && setDados(d))
        .catch(() => vivo && setErro(true));
      return () => {
        vivo = false;
      };
    }, [token, rideId])
  );

  async function avaliar(id, estrelas, motivos) {
    try {
      await api.rateRide(token, id, estrelas, motivos);
    } catch (e) {
      Alert.alert(t('detalheErroTitulo'), e?.message || t('detalheErroTexto'));
      throw e;
    }
  }

  if (!dados) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BarraEstado />
        <View style={styles.cabeca}>
          <Voltar navigation={navigation} />
        </View>
        {erro ? (
          <Text style={styles.erro}>{t('detalheErroTexto')}</Text>
        ) : (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xxl }} />
        )}
      </SafeAreaView>
    );
  }

  const r = dados.ride;
  const souMotorista = dados.papel === 'driver';
  // A outra pessoa da viagem: quem conduziu, para quem viajou; quem viajou,
  // para quem conduziu.
  const outro = souMotorista ? r.passenger : r.driver;
  const veiculo = !souMotorista ? r.driver?.vehicle : null;
  const descricaoVeiculo = veiculo
    ? [veiculo.model, veiculo.color, veiculo.plate].filter(Boolean).join(' · ')
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <View style={styles.cabeca}>
        <Voltar navigation={navigation} />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>{t('detalheTitulo')}</Text>

        <View style={styles.cartao}>
          <View style={styles.linhaTopo}>
            <StatusBadge status={r.status} />
            <Text style={styles.preco}>{r.fareUsd != null ? `$${r.fareUsd}` : '—'}</Text>
          </View>
          <Text style={styles.data}>{dataHora(r.createdAt)}</Text>

          {/* O percurso: dois pontos e um traço, a mesma leitura do cartão da
              viagem em curso — recolha em cima, destino em baixo. */}
          <View style={styles.percurso}>
            <View style={styles.trilho}>
              <View style={[styles.ponto, { backgroundColor: colors.teal }]} />
              <View style={styles.traco} />
              <View style={[styles.ponto, { backgroundColor: colors.coral }]} />
            </View>
            <View style={{ flex: 1, gap: spacing.md }}>
              <View>
                <Text style={styles.rotulo}>{t('detalheRecolha')}</Text>
                <Text style={styles.lugar}>{r.originLabel || '—'}</Text>
              </View>
              <View>
                <Text style={styles.rotulo}>{t('detalheDestino')}</Text>
                <Text style={styles.lugar}>{r.destLabel || '—'}</Text>
              </View>
            </View>
          </View>

          {r.distanceKm != null || r.durationMin != null ? (
            <View style={styles.numeros}>
              {r.distanceKm != null ? (
                <View style={styles.numero}>
                  <Icone nome="rota" tamanho={16} cor={colors.textMuted} />
                  <Text style={styles.numeroTexto}>{r.distanceKm} km</Text>
                </View>
              ) : null}
              {r.durationMin != null ? (
                <View style={styles.numero}>
                  <Icone nome="relogio" tamanho={16} cor={colors.textMuted} />
                  <Text style={styles.numeroTexto}>{r.durationMin} min</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {outro?.name ? (
          <View style={styles.cartao}>
            <Text style={styles.rotulo}>
              {souMotorista ? t('detalhePassageiro') : t('detalheMotorista')}
            </Text>
            <Text style={styles.nome}>{outro.name}</Text>
            {descricaoVeiculo ? <Text style={styles.veiculo}>{descricaoVeiculo}</Text> : null}
          </View>
        ) : null}

        {/* A AVALIAÇÃO. Feita: as estrelas que se deram. Por fazer: o mesmo
            painel do fim da viagem. Uma viagem cancelada não se avalia — a
            mesma regra do servidor — e aqui simplesmente não aparece. */}
        {dados.minhaAvaliacao ? (
          <View style={styles.cartao}>
            <Text style={styles.rotulo}>{t('detalheSuaAvaliacao')}</Text>
            <View style={{ marginTop: spacing.xs }}>
              <StarRating value={dados.minhaAvaliacao.estrelas} size={20} readOnly />
            </View>
          </View>
        ) : dados.podeAvaliar ? (
          <RatingPanel ride={r} role={souMotorista ? 'driver' : 'passenger'} aoAvaliar={avaliar} />
        ) : null}

        {dados.ocorrencias.length ? (
          <View style={styles.cartao}>
            <Text style={styles.rotulo}>{t('detalheOcorrencias')}</Text>
            {dados.ocorrencias.map((o) => (
              <View key={o.id} style={styles.ocorrencia}>
                <View style={styles.linhaTopo}>
                  <Text style={styles.ocorrenciaTipo}>{t(chaveDaCategoria(o.categoria))}</Text>
                  <EstadoOcorrencia estado={o.estado} t={t} />
                </View>
                <Text style={styles.data}>{dataHora(o.criadaEm)}</Text>
                {o.descricao ? <Text style={styles.ocorrenciaTexto}>{o.descricao}</Text> : null}
                {o.resposta ? (
                  <View style={styles.resposta}>
                    <Text style={styles.rotulo}>{t('detalheResposta')}</Text>
                    <Text style={styles.ocorrenciaTexto}>{o.resposta}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {dados.podeReportar ? (
          <Pressable
            onPress={() =>
              navigation.navigate('Reportar', {
                rideId: r.id,
                papel: dados.papel,
              })
            }
            style={({ pressed }) => [styles.reportar, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Icone nome="bandeira" tamanho={20} cor={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reportarTitulo}>{t('reportarBotao')}</Text>
              <Text style={styles.reportarDica}>{t('reportarBotaoDica')}</Text>
            </View>
            <Text style={styles.seta}>›</Text>
          </Pressable>
        ) : (
          <Text style={styles.prazo}>
            {t('reportarPrazoPassou', { data: data(dados.reportarAte) })}
          </Text>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// A chave de tradução de uma categoria: `ocor` + o código com a primeira
// letra grande. O verificar-tipos.mjs confere que existe nas três línguas.
export function chaveDaCategoria(c) {
  return 'ocor' + c.charAt(0).toUpperCase() + c.slice(1);
}

// O estado por cor e por palavra — nunca só pela cor, que ao sol não se vê.
function EstadoOcorrencia({ estado, t }) {
  const meta = {
    aberta: { chave: 'ocorEstadoAberta', fundo: colors.tintaCoral, texto: colors.coralDark },
    em_analise: { chave: 'ocorEstadoAnalise', fundo: colors.tintaCoral, texto: colors.coralDark },
    resolvida: { chave: 'ocorEstadoResolvida', fundo: colors.tintaTeal, texto: colors.success },
    arquivada: { chave: 'ocorEstadoArquivada', fundo: colors.paper, texto: colors.textMuted },
  }[estado] || { chave: 'ocorEstadoAberta', fundo: colors.paper, texto: colors.textMuted };
  return (
    <View style={[styles.estado, { backgroundColor: meta.fundo }]}>
      <Text style={[styles.estadoTexto, { color: meta.texto }]}>{t(meta.chave)}</Text>
    </View>
  );
}

function data(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function dataHora(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${data(s)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    cabeca: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    conteudo: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
    titulo: { ...tipo.titulo, color: colors.text },
    erro: { ...tipo.corpo, color: colors.textMuted, textAlign: 'center', margin: spacing.xl },
    cartao: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    linhaTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    preco: { ...tipo.titulo, ...tipo.numero, color: colors.teal },
    data: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },
    percurso: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
    trilho: { alignItems: 'center', paddingTop: 5, paddingBottom: 5 },
    ponto: { width: 10, height: 10, borderRadius: 5 },
    traco: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 3 },
    rotulo: {
      ...tipo.legenda,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    lugar: { ...tipo.corpoForte, color: colors.text },
    numeros: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    numero: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    numeroTexto: { ...tipo.pequeno, color: colors.text },
    nome: { ...tipo.subtitulo, color: colors.text, marginTop: spacing.xs },
    veiculo: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    ocorrencia: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    ocorrenciaTipo: { ...tipo.corpoForte, color: colors.text, flex: 1 },
    ocorrenciaTexto: { ...tipo.pequeno, color: colors.text, marginTop: spacing.xs },
    resposta: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.sm,
    },
    estado: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    estadoTexto: { ...tipo.legenda, fontFamily: tipo.corpoForte.fontFamily },
    reportar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.contornoPerigo,
      padding: spacing.md,
      minHeight: 56,
    },
    reportarTitulo: { ...tipo.corpoForte, color: colors.danger },
    reportarDica: { ...tipo.pequeno, color: colors.textMuted },
    seta: { ...tipo.titulo, color: colors.textMuted },
    prazo: { ...tipo.pequeno, color: colors.textMuted, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
