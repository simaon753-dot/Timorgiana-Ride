import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import SeccaoTitulo from '../design/SeccaoTitulo.js';
import Cartao from '../design/Cartao.js';
import { LinhaInfo, LinhaMenu } from '../design/LinhaMenu.js';
import SeletorSegmentado from '../design/SeletorSegmentado.js';
import { CartaoKPI, ESTADO } from '../design/painel.js';
import Button from './Button.js';
import { api } from '../api/client.js';

// GESTÃO DO CARRY — o separador do painel (14/09/26).
//
// O que o Simão pediu para gerir, pela ordem em que se usa: o serviço está
// ligado? como está a correr? quem conduz? quanto custa? porque é que os
// pedidos são postos de lado?
//
// OS PREÇOS vêm do servidor com os valores de PARTIDA ao lado, e com exemplos
// calculados pelo próprio servidor — pela mesma função que calcula o preço de
// cada viagem. Não há aqui fórmula nenhuma: uma cópia da conta na app seria
// uma segunda conta, e um dia as duas discordavam.

// Os campos, por grupo, com a unidade. As chaves de tradução estão num mapa
// literal para o verificador de traduções as encontrar.
const GRUPOS = [
  {
    titulo: 'admCarryGrupoTarifa',
    campos: [
      ['base', 'admTarifaBase', '$'],
      ['porKm', 'admTarifaPorKm', '$/km'],
      ['porMinuto', 'admTarifaPorMinuto', '$/min'],
      ['minimo', 'admTarifaMinimo', '$'],
      ['minimoPessoas', 'admTarifaMinimoPessoas', '$'],
      ['porParagem', 'admTarifaPorParagem', '$'],
    ],
  },
  {
    titulo: 'admCarryGrupoVolume',
    campos: [
      ['volume.pequeno', 'cargaVolPequeno', '×'],
      ['volume.medio', 'cargaVolMedio', '×'],
      ['volume.grande', 'cargaVolGrande', '×'],
    ],
  },
  {
    titulo: 'admCarryGrupoAjuda',
    campos: [
      ['ajuda.carregar', 'cargaAjudaCarregar', '$'],
      ['ajuda.descarregar', 'cargaAjudaDescarregar', '$'],
      ['ajuda.ambas', 'cargaAjudaAmbas', '$'],
    ],
  },
];
const NOME_CAPACIDADE = {
  pequena: 'capacidadePequena',
  media: 'capacidadeMedia',
  grande: 'capacidadeGrande',
  sem: 'admCarrySemCapacidade',
};
const NOME_VOLUME = {
  pequeno: 'cargaVolPequeno',
  medio: 'cargaVolMedio',
  grande: 'cargaVolGrande',
};
const NOME_AJUDA = {
  nenhuma: 'cargaAjudaNenhuma',
  carregar: 'cargaAjudaCarregar',
  descarregar: 'cargaAjudaDescarregar',
  ambas: 'cargaAjudaAmbas',
};
const NOME_MOTIVO = { agora: 'recusaAgora', incompativel: 'recusaIncompativel' };

function hora(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GestaoCarry({ token, t, navigation }) {
  const [dados, setDados] = useState(null);
  const [valores, setValores] = useState({});
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState(null);

  const aplicar = useCallback((d) => {
    setDados((antes) => ({ ...(antes || {}), ...d }));
    setValores(
      Object.fromEntries(
        Object.entries(d.tarifa || {}).map(([k, v]) => [k, v == null ? '' : String(v)])
      )
    );
  }, []);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      aplicar(await api.adminCarry(token));
    } catch (e) {
      setErro(e?.message || t('errGeneric'));
    }
  }, [token, t, aplicar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudarEstado(ativo) {
    if (ativo === dados?.ativo) return;
    Alert.alert(
      t(ativo ? 'admCarryLigado' : 'admCarryDesligado'),
      t(ativo ? 'admCarryConfirmarLigar' : 'admCarryConfirmarDesligar'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('admCarryConfirmar'),
          onPress: async () => {
            try {
              await api.adminCarryAtivo(token, ativo);
              carregar();
            } catch (e) {
              Alert.alert(t('errGeneric'), e?.message || '');
            }
          },
        },
      ]
    );
  }

  // Grava os preços. Confirma antes, porque isto muda o preço de todos os
  // pedidos seguintes — e diz o que se vai gravar, não só "tem a certeza?".
  function guardar(repor = false) {
    const envio = {};
    if (!repor) {
      for (const [k, v] of Object.entries(valores)) {
        const n = Number(String(v).replace(',', '.'));
        if (!Number.isFinite(n)) return setErro(t('admCarryValorInvalido'));
        envio[k] = n;
      }
    }
    Alert.alert(
      t(repor ? 'admCarryRepor' : 'admCarryGuardar'),
      t(repor ? 'admCarryConfirmarRepor' : 'admCarryConfirmarGuardar'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('admCarryConfirmar'),
          onPress: async () => {
            setAGravar(true);
            setErro(null);
            try {
              await api.adminCarryTarifa(token, envio);
              await carregar();
              Alert.alert(t('admCarryGuardado'));
            } catch (e) {
              setErro(e?.message || t('errGeneric'));
            } finally {
              setAGravar(false);
            }
          },
        },
      ]
    );
  }

  if (!dados) {
    return erro ? (
      <Text style={styles.erro}>{erro}</Text>
    ) : (
      <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
    );
  }

  const p = dados.pedidos7d || {};
  const recusas = Object.fromEntries((dados.recusas7d || []).map((r) => [r.motivo, r.n]));

  return (
    <>
      <SeccaoTitulo icone="carry" titulo={t('admCarryEstado')} />
      <Cartao>
        <SeletorSegmentado
          opcoes={[
            { id: true, rotulo: t('admCarryLigado') },
            { id: false, rotulo: t('admCarryDesligado') },
          ]}
          valor={dados.ativo}
          onMudar={mudarEstado}
        />
        <Text style={styles.nota}>{t('admCarryEstadoNota')}</Text>
      </Cartao>

      <SeccaoTitulo icone="grafico" titulo={t('admCarry7dias')} />
      <View style={styles.numeros}>
        <CartaoKPI icone="rota" valor={p.total ?? 0} etiqueta={t('admCarryPedidos')} />
        <CartaoKPI icone="bandeira" valor={p.concluidas ?? 0} etiqueta={t('admCarryConcluidas')} />
        <CartaoKPI
          icone="fechar"
          valor={p.canceladas ?? 0}
          etiqueta={t('admCarryCanceladas')}
          estado={p.canceladas > 0 ? ESTADO.aviso : ESTADO.neutro}
        />
        <CartaoKPI
          icone="relogio"
          valor={p.sem_resposta ?? 0}
          etiqueta={t('admCarrySemResposta')}
          estado={p.sem_resposta > 0 ? ESTADO.mau : ESTADO.neutro}
        />
      </View>

      <SeccaoTitulo icone="volante" titulo={t('admCarryMotoristas')} />
      <Cartao lista>
        {(dados.motoristas || []).length ? (
          dados.motoristas.map((m, i) => (
            <LinhaInfo
              key={m.capacidade}
              icone="carry"
              rotulo={t(NOME_CAPACIDADE[m.capacidade] || 'admCarrySemCapacidade')}
              valor={`${m.n} · ${t('admCarryOnline', { n: m.online })}`}
              mau={m.capacidade === 'sem'}
              ultimo={i === dados.motoristas.length - 1}
            />
          ))
        ) : (
          <LinhaMenu icone="carry" titulo={t('admCarrySemMotoristas')} ultimo />
        )}
      </Cartao>

      <SeccaoTitulo icone="carteira" titulo={t('admCarryPrecos')} nota={t('admCarryPrecosNota')} />
      {dados.atualizado?.em ? (
        <Text style={styles.atualizado}>
          {t('admCarryAtualizado', {
            nome: dados.atualizadoPorNome || '—',
            data: hora(dados.atualizado.em),
          })}
        </Text>
      ) : null}
      {GRUPOS.map((g) => (
        <Cartao key={g.titulo} titulo={t(g.titulo)} lista>
          {g.campos.map(([chave, rotulo, unidade], i) => {
            const padrao = dados.padrao?.[chave];
            const mudado = padrao != null && Number(valores[chave]) !== Number(padrao);
            return (
              <View key={chave} style={[styles.campo, i < g.campos.length - 1 && styles.traco]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campoRotulo}>{t(rotulo)}</Text>
                  <Text style={[styles.campoPadrao, mudado && styles.campoMudado]}>
                    {t('admCarryPadrao', { v: padrao ?? '—' })}
                  </Text>
                </View>
                <Text style={styles.unidade}>{unidade}</Text>
                <TextInput
                  style={[styles.entrada, mudado && styles.entradaMudada]}
                  value={valores[chave] ?? ''}
                  onChangeText={(x) => setValores((v) => ({ ...v, [chave]: x }))}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel={t(rotulo)}
                />
              </View>
            );
          })}
        </Cartao>
      ))}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <Button
        title={t('admCarryGuardar')}
        variant="marca"
        onPress={() => guardar(false)}
        loading={aGravar}
      />
      <View style={{ height: spacing.sm }} />
      <Button title={t('admCarryRepor')} variant="ghost" onPress={() => guardar(true)} />

      {/* OS EXEMPLOS saem do servidor, calculados com os preços em vigor:
          depois de gravar, recarregam e mostram o efeito real. */}
      <SeccaoTitulo icone="info" titulo={t('admCarryExemplos')} />
      <Cartao lista>
        {(dados.exemplos || []).map((x, i) => (
          <LinhaInfo
            key={i}
            rotulo={
              x.pessoas
                ? `${x.km} km · ${x.min} min · ${t('admCarryExemploPessoas', { n: x.pessoas })}`
                : `${x.km} km · ${t(NOME_VOLUME[x.volume])} · ${t(NOME_AJUDA[x.ajuda])}${
                    x.paragens ? ` · ${t('admCarryParagensN', { n: x.paragens })}` : ''
                  }`
            }
            valor={`$${Number(x.preco).toFixed(2)}`}
            forte
            ultimo={i === dados.exemplos.length - 1}
          />
        ))}
      </Cartao>

      <SeccaoTitulo
        icone="fechar"
        titulo={t('admCarryRecusas')}
        nota={`${t('recusaIncompativel')}: ${recusas.incompativel || 0} · ${t('recusaAgora')}: ${recusas.agora || 0}`}
      />
      <Cartao lista>
        {(dados.ultimasRecusas || []).length ? (
          dados.ultimasRecusas.map((r, i) => (
            <LinhaMenu
              key={`${r.rideId}-${i}`}
              icone={r.motivo === 'incompativel' ? 'caixa' : 'relogio'}
              titulo={`${r.motorista || '—'} · ${t(NOME_MOTIVO[r.motivo] || 'recusaAgora')}`}
              subtitulo={`${r.destino || '—'}${r.volume ? ` · ${t(NOME_VOLUME[r.volume])}` : ''} · ${hora(r.quando)}`}
              perigo={r.motivo === 'incompativel'}
              onPress={() =>
                navigation.navigate('AdminDetalhe', { tipoAlvo: 'viagem', id: r.rideId })
              }
              ultimo={i === dados.ultimasRecusas.length - 1}
            />
          ))
        ) : (
          <LinhaMenu icone="visto" titulo={t('admCarrySemRecusas')} ultimo />
        )}
      </Cartao>
    </>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    nota: { ...tipo.pequeno, color: colors.textMuted, marginTop: spacing.sm },
    numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    atualizado: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 60,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    traco: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    campoRotulo: { ...tipo.corpoForte, color: colors.text },
    campoPadrao: { ...tipo.legenda, color: colors.textMuted },
    campoMudado: { color: colors.coralDark },
    unidade: { ...tipo.pequeno, color: colors.textMuted, minWidth: 34, textAlign: 'right' },
    entrada: {
      width: 84,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      textAlign: 'right',
      ...tipo.corpoForte,
      color: colors.text,
      backgroundColor: colors.paper,
    },
    entradaMudada: { borderColor: colors.coral },
    erro: { ...tipo.pequeno, color: colors.danger, marginVertical: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
