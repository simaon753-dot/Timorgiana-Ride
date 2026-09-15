import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import SeccaoTitulo from '../design/SeccaoTitulo.js';
import Cartao from '../design/Cartao.js';
import Chip, { FilaChips } from '../design/Chip.js';
import { Pastilha, ESTADO } from '../design/painel.js';
import ImagemProtegida from '../design/ImagemProtegida.js';
import VerImagem from '../design/VerImagem.js';
import SeletorSegmentado from '../design/SeletorSegmentado.js';
import Button from './Button.js';
import { api } from '../api/client.js';
import { nomeDaForma } from '../dados/formasPagamento.js';
import { nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';

// PAGAMENTOS DA ASSINATURA — o separador do painel (14/09/26).
//
// Três coisas, pela ordem em que se usam: os pagamentos por confirmar (o
// prazo de 24 horas corre para eles), o que já foi decidido, e as formas de
// pagamento que o motorista vê.
//
// CONFIRMAR É OLHAR PARA O EXTRACTO, não para a fotografia. O comprovativo
// fabrica-se em segundos; o que prova o pagamento é o dinheiro na conta, com
// a referência do motorista (TR0042) e o valor do pacote. Por isso a
// pergunta de confirmação diz exactamente o que procurar.

// Os motivos mais comuns, prontos a tocar. Chaves num mapa literal para o
// verificador de traduções as encontrar.
const MOTIVOS = [
  'admPagMotivoNaoEncontrado',
  'admPagMotivoValor',
  'admPagMotivoReferencia',
  'admPagMotivoIlegivel',
];
const DECISAO = {
  confirmado: [ESTADO.bom, 'admPagConfirmado'],
  recusado: [ESTADO.mau, 'admPagRecusado'],
  cancelado: [ESTADO.neutro, 'admPagCancelado'],
};

export default function GestaoPagamentos({ token, t }) {
  const [d, setD] = useState(null);
  const [formas, setFormas] = useState([]);
  const [ver, setVer] = useState(null);
  const [aRecusar, setARecusar] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [aGravar, setAGravar] = useState(false);
  // Muda a cada troca da imagem do QR, para a pré-visualização ir buscar a nova.
  const [versaoQr, setVersaoQr] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const r = await api.adminPagamentos(token);
      setD(r);
      setFormas(r.formas || []);
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }, [token, t]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function confirmar(p) {
    Alert.alert(
      t('admPagConfirmar'),
      t('admPagConfirmarPergunta', {
        valor: p.valorUsd,
        ref: p.referencia,
        dias: p.dias,
        nome: p.nome,
      }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('admPagConfirmar'),
          onPress: async () => {
            setAGravar(true);
            try {
              await api.adminConfirmarPagamento(token, p.id);
              await carregar();
            } catch (e) {
              Alert.alert(t('errGeneric'), e?.message || '');
            } finally {
              setAGravar(false);
            }
          },
        },
      ]
    );
  }

  async function recusar(p) {
    if (!motivo.trim()) return;
    setAGravar(true);
    try {
      await api.adminRecusarPagamento(token, p.id, motivo.trim());
      setARecusar(null);
      setMotivo('');
      await carregar();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setAGravar(false);
    }
  }

  async function guardarFormas() {
    setAGravar(true);
    try {
      const r = await api.adminFormasPagamento(token, formas);
      setFormas(r.formas || []);
      Alert.alert(t('admPagFormas'), t('admPagGuardado'));
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setAGravar(false);
    }
  }

  // A IMAGEM DO QR (15/09/26). Só mexe no campo temQr da lista local: voltar a
  // pedir as formas ao servidor apagava o que estivesse por guardar nas outras.
  async function carregarQr() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t('errGeneric'), t('errPermissionPhotos'));
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, // um QR que perde nitidez deixa de se ler
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setAGravar(true);
    try {
      await api.adminQr(token, {
        mime: res.assets[0].mimeType || 'image/jpeg',
        base64: res.assets[0].base64,
      });
      setFormas((fs) => fs.map((f) => (f.id === 'tuqr' ? { ...f, temQr: true } : f)));
      setVersaoQr((v) => v + 1);
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setAGravar(false);
    }
  }

  function retirarQr() {
    Alert.alert(t('admPagQrRetirar'), t('admPagQrRetirarPergunta'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('admPagQrRetirar'),
        style: 'destructive',
        onPress: async () => {
          setAGravar(true);
          try {
            await api.adminApagarQr(token);
            setFormas((fs) => fs.map((f) => (f.id === 'tuqr' ? { ...f, temQr: false } : f)));
            setVersaoQr((v) => v + 1);
          } catch (e) {
            Alert.alert(t('errGeneric'), e?.message || '');
          } finally {
            setAGravar(false);
          }
        },
      },
    ]);
  }

  const mudarForma = (id, campo, valor) =>
    setFormas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  if (!d) return <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />;
  const prazo = d.prazoHoras ?? 24;

  return (
    <View>
      <SeccaoTitulo icone="carteira" titulo={t('admPagPorConfirmar')} nota={t('admPagNota')} />
      {!d.pendentes.length ? (
        <Text style={styles.vazio}>{t('admPagVazio')}</Text>
      ) : (
        d.pendentes.map((p) => (
          <Cartao key={p.id} style={styles.cartao}>
            <View style={styles.topo}>
              <Text style={styles.nome} numberOfLines={1}>
                {p.nome}
              </Text>
              <Pastilha
                texto={t('admPagHa', { h: p.horas })}
                estado={p.horas >= prazo ? ESTADO.mau : ESTADO.aviso}
              />
            </View>
            <Text style={styles.meta}>
              {p.telefone} · {nomeDoVeiculo(t, p.tipo)}
            </Text>
            <Text style={styles.valor}>
              {p.dias} {t('assinDias')} · ${p.valorUsd} · {nomeDaForma(p.metodo, t)}
            </Text>
            <Text style={styles.meta}>
              {t('admReferencia')}: <Text style={styles.referencia}>{p.referencia}</Text>
            </Text>

            {p.temComprovativo ? (
              <Pressable
                onPress={() => setVer(p)}
                accessibilityRole="imagebutton"
                accessibilityLabel={t('admVerImagem')}
              >
                <ImagemProtegida
                  caminho={`/admin/pagamentos/${p.id}/comprovativo`}
                  style={styles.comprovativo}
                  resizeMode="contain"
                />
              </Pressable>
            ) : null}

            {aRecusar === p.id ? (
              <View style={styles.recusa}>
                <Text style={styles.rotulo}>{t('admPagMotivo')}</Text>
                <FilaChips>
                  {MOTIVOS.map((k) => (
                    <Chip
                      key={k}
                      texto={t(k)}
                      activo={motivo === t(k)}
                      onPress={() => setMotivo(t(k))}
                    />
                  ))}
                </FilaChips>
                <TextInput
                  style={styles.entrada}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder={t('admPagOutroMotivo')}
                  placeholderTextColor={colors.textMuted}
                  maxLength={200}
                  multiline
                />
                <View style={styles.botoes}>
                  <Button
                    title={t('cancel')}
                    variant="ghost"
                    onPress={() => {
                      setARecusar(null);
                      setMotivo('');
                    }}
                    style={styles.botao}
                  />
                  <Button
                    title={t('admPagConfirmarRecusa')}
                    variant="perigo"
                    disabled={!motivo.trim() || aGravar}
                    onPress={() => recusar(p)}
                    style={styles.botao}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.botoes}>
                <Button
                  title={t('admPagRecusar')}
                  variant="perigoSuave"
                  disabled={aGravar}
                  onPress={() => {
                    setARecusar(p.id);
                    setMotivo('');
                  }}
                  style={styles.botao}
                />
                <Button
                  title={t('admPagConfirmar')}
                  disabled={aGravar}
                  onPress={() => confirmar(p)}
                  style={styles.botao}
                />
              </View>
            )}
          </Cartao>
        ))
      )}

      {d.decididos.length ? (
        <>
          <SeccaoTitulo icone="relogio" titulo={t('admPagDecididos')} />
          <Cartao lista>
            {d.decididos.map((p, i) => {
              const [estado, chave] = DECISAO[p.estado] || DECISAO.cancelado;
              return (
                <View key={p.id} style={[styles.linha, i < d.decididos.length - 1 && styles.traco]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linhaNome} numberOfLines={1}>
                      {p.nome} · {p.dias} {t('assinDias')} · ${p.valorUsd}
                    </Text>
                    <Text style={styles.meta} numberOfLines={2}>
                      {p.referencia} · {nomeDaForma(p.metodo, t)}
                      {p.decididoPor ? ` · ${p.decididoPor}` : ''}
                      {p.motivo ? ` · ${p.motivo}` : ''}
                    </Text>
                  </View>
                  <Pastilha texto={t(chave)} estado={estado} />
                </View>
              );
            })}
          </Cartao>
        </>
      ) : null}

      <SeccaoTitulo icone="engrenagem" titulo={t('admPagFormas')} nota={t('admPagFormasNota')} />
      <Cartao lista>
        {formas.map((f, i) => (
          <View key={f.id} style={[styles.forma, i < formas.length - 1 && styles.traco]}>
            <View style={styles.topo}>
              <Text style={styles.linhaNome}>{nomeDaForma(f.id, t)}</Text>
              <View style={styles.seletor}>
                <SeletorSegmentado
                  opcoes={[
                    { id: 'nao', rotulo: t('admPagDesligada') },
                    { id: 'sim', rotulo: t('admPagLigada') },
                  ]}
                  valor={f.ativo ? 'sim' : 'nao'}
                  onMudar={(v) => mudarForma(f.id, 'ativo', v === 'sim')}
                />
              </View>
            </View>
            <TextInput
              style={styles.entrada}
              value={f.instrucoes}
              onChangeText={(v) => mudarForma(f.id, 'instrucoes', v)}
              placeholder={t('admPagInstrucoes')}
              placeholderTextColor={colors.textMuted}
              maxLength={300}
              multiline
            />
            {f.id === 'tuqr' ? (
              <View style={styles.qr}>
                <Text style={styles.meta}>{t('admPagQrNota')}</Text>
                {f.temQr ? (
                  <ImagemProtegida
                    caminho="/driver/assinatura/qr"
                    chave={versaoQr}
                    style={styles.qrImagem}
                    resizeMode="contain"
                  />
                ) : null}
                <View style={styles.botoes}>
                  <Button
                    title={f.temQr ? t('admPagQrTrocar') : t('admPagQrCarregar')}
                    variant="outline"
                    icone="galeria"
                    disabled={aGravar}
                    onPress={carregarQr}
                    style={styles.botao}
                  />
                  {f.temQr ? (
                    <Button
                      title={t('admPagQrRetirar')}
                      variant="perigoSuave"
                      disabled={aGravar}
                      onPress={retirarQr}
                      style={styles.botao}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </Cartao>
      <Button
        title={t('admPagGuardar')}
        variant="marca"
        loading={aGravar}
        onPress={guardarFormas}
        style={{ marginTop: spacing.md }}
      />

      <VerImagem
        caminho={ver ? `/admin/pagamentos/${ver.id}/comprovativo` : null}
        titulo={ver?.nome}
        legenda={ver ? `${ver.referencia} · $${ver.valorUsd}` : null}
        onFechar={() => setVer(null)}
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    vazio: { ...tipo.pequeno, color: colors.textMuted, marginBottom: spacing.lg },
    cartao: { marginBottom: spacing.md, gap: spacing.xs },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    nome: { ...tipo.corpoForte, color: colors.text, flex: 1 },
    meta: { ...tipo.pequeno, color: colors.textMuted },
    valor: { ...tipo.corpoForte, color: colors.text },
    referencia: { ...tipo.corpoForte, color: colors.teal, letterSpacing: 1 },
    comprovativo: {
      width: '100%',
      height: 200,
      borderRadius: radius.md,
      backgroundColor: colors.paper,
      marginTop: spacing.xs,
    },
    recusa: { marginTop: spacing.sm, gap: spacing.sm },
    rotulo: { ...tipo.corpoForte, color: colors.text },
    entrada: {
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      ...tipo.corpo,
      color: colors.text,
      textAlignVertical: 'top',
    },
    botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    botao: { flex: 1 },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    traco: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    linhaNome: { ...tipo.corpoForte, color: colors.text },
    forma: { padding: spacing.md, gap: spacing.sm },
    seletor: { width: 190 },
    qr: { gap: spacing.sm },
    // Fundo branco sempre, também no tema escuro: é o que o leitor de QR espera.
    qrImagem: {
      width: 180,
      height: 180,
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: radius.md,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
