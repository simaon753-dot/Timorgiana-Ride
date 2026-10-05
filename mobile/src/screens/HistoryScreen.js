import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BarraTopo from '../components/BarraTopo.js';
import Button from '../components/Button.js';
import CartaoViagem, { CartaoViagemEsqueleto } from '../components/CartaoViagem.js';
import Chip from '../design/Chip.js';
import Icone from '../design/Icone.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useModo } from '../context/ModoContext.js';
import { api } from '../api/client.js';
import { hojeEmDili, segundaDaSemana } from '../lib/periodos.js';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// AS SUAS VIAGENS (05/10/2026, pedido do Simão).
//
// O histórico das viagens desta conta, como passageiro e como motorista: as
// concluídas e as canceladas depois de haver motorista. Vem do servidor aos
// bocados de 20 — com centenas de viagens, pedir tudo de uma vez era esperar
// pela rede de Díli por coisas que ninguém vai ver —, e os filtros pedem ao
// servidor só o período (Hoje, Esta semana a começar à segunda, Este mês).
//
// Ao voltar de uma viagem aberta, a lista NÃO recomeça: só essa viagem é
// relida, para a avaliação ou a queixa que lá se fez aparecerem no cartão sem
// perder o sítio onde se ia.
const PAGINA = 20;
const FILTROS = ['todas', 'hoje', 'semana', 'mes'];

function desdeDe(filtro) {
  const hoje = hojeEmDili();
  if (filtro === 'hoje') return hoje;
  if (filtro === 'semana') return segundaDaSemana(hoje);
  if (filtro === 'mes') return `${hoje.slice(0, 8)}01`;
  return null;
}

export default function HistoryScreen({ navigation }) {
  const { t } = useI18n();
  const { token, user } = useAuth();
  const { modo } = useModo();
  const [filtro, setFiltro] = useState('todas');
  const [viagens, setViagens] = useState([]);
  const [mais, setMais] = useState(false);
  const [estado, setEstado] = useState('carregar'); // carregar | pronto | erro
  const [aMais, setAMais] = useState(false);
  const [aRefrescar, setARefrescar] = useState(false);
  const aberta = useRef(null);
  const pedido = useRef(0);

  const primeira = useCallback(
    async (comRoda = true) => {
      const n = ++pedido.current;
      if (comRoda) setEstado('carregar');
      try {
        const r = await api.historicoPagina(token, { limite: PAGINA, desde: desdeDe(filtro) });
        if (n !== pedido.current) return;
        setViagens(r.rides || []);
        setMais(!!r.mais);
        setEstado('pronto');
      } catch {
        if (n === pedido.current) setEstado('erro');
      }
    },
    [token, filtro]
  );

  useEffect(() => {
    primeira();
  }, [primeira]);

  async function seguinte() {
    if (!mais || aMais || estado !== 'pronto' || !viagens.length) return;
    setAMais(true);
    const n = pedido.current;
    try {
      const r = await api.historicoPagina(token, {
        limite: PAGINA,
        desde: desdeDe(filtro),
        antes: viagens[viagens.length - 1].id,
      });
      if (n !== pedido.current) return;
      setViagens((v) => [...v, ...(r.rides || []).filter((x) => !v.some((y) => y.id === x.id))]);
      setMais(!!r.mais);
    } catch {
      /* fica como estava; ao chegar outra vez ao fim tenta de novo */
    } finally {
      setAMais(false);
    }
  }

  // Ao voltar do detalhe: só a viagem que se abriu.
  useFocusEffect(
    useCallback(() => {
      const id = aberta.current;
      if (!id) return undefined;
      aberta.current = null;
      let vivo = true;
      api
        .detalheViagem(token, id)
        .then((d) => {
          if (!vivo) return;
          setViagens((v) =>
            v.map((x) =>
              x.id === id
                ? {
                    ...x,
                    myStars: d.minhaAvaliacao?.estrelas ?? x.myStars ?? null,
                    reportada: x.reportada || (d.ocorrencias?.length ?? 0) > 0,
                  }
                : x
            )
          );
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, [token])
  );

  const abrir = (r, avaliar = false) => {
    aberta.current = r.id;
    navigation.navigate('DetalheViagem', { rideId: r.id, avaliar });
  };

  async function refrescar() {
    setARefrescar(true);
    await primeira(false);
    setARefrescar(false);
  }

  const cabecalho = (
    <View style={styles.filtros}>
      {FILTROS.map((f) => (
        <Chip
          key={f}
          texto={t(`historyFiltro_${f}`)}
          activo={filtro === f}
          onPress={() => setFiltro(f)}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <BarraTopo
        navigation={navigation}
        titulo={t('historyTitle')}
        subtitulo={t('historySubtitulo')}
      />

      {estado === 'carregar' ? (
        <View style={styles.lista}>
          {cabecalho}
          {[0, 1, 2].map((i) => (
            <CartaoViagemEsqueleto key={i} />
          ))}
        </View>
      ) : estado === 'erro' ? (
        <View style={styles.lista}>
          {cabecalho}
          <View style={styles.vazio}>
            <Icone nome="aviso" tamanho={40} cor={colors.textMuted} />
            <Text style={styles.vazioTitulo}>{t('historyErro')}</Text>
            <View style={styles.vazioBotao}>
              <Button title={t('historyTentar')} variant="secondary" onPress={() => primeira()} />
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={viagens}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <CartaoViagem
              r={item}
              eu={user?.id}
              onAbrir={() => abrir(item)}
              onAvaliar={() => abrir(item, true)}
            />
          )}
          ListHeaderComponent={cabecalho}
          contentContainerStyle={styles.lista}
          onEndReached={seguinte}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={aRefrescar} onRefresh={refrescar} tintColor={colors.teal} />
          }
          ListFooterComponent={
            aMais ? (
              <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.md }} />
            ) : (
              <View style={{ height: spacing.md }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Icone nome="rota" tamanho={44} cor={colors.teal} />
              <Text style={styles.vazioTitulo}>
                {filtro === 'todas' ? t('historyVazioTitulo') : t('historyVazioPeriodo')}
              </Text>
              {filtro === 'todas' ? (
                <Text style={styles.vazioTexto}>{t('historyVazioTexto')}</Text>
              ) : null}
              {/* «Fazer uma viagem» só a quem está no modo de passageiro: o
                  motorista não pede viagens daqui. */}
              {filtro === 'todas' && modo !== 'motorista' ? (
                <View style={styles.vazioBotao}>
                  <Button
                    title={t('historyFazerViagem')}
                    variant="secondary"
                    onPress={() => navigation.navigate('Inicio')}
                  />
                </View>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
    filtros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    vazio: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
    vazioTitulo: {
      ...tipo.subtitulo,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    vazioTexto: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    vazioBotao: { marginTop: spacing.lg, alignSelf: 'stretch' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
