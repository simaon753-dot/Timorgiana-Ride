import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voltar from '../components/Voltar.js';
import BarraEstado from '../design/BarraEstado.js';
import Carregando from '../design/Carregando.js';
import ImagemProtegida from '../design/ImagemProtegida.js';
import Aviso from '../design/Aviso.js';
import { tipo } from '../design/tipografia.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Detalhe de administração: uma conta ou uma viagem, por inteiro.
//
// O painel mostrava listas e parava aí. Quem administra precisa de
// perguntar "e esta viagem, o que aconteceu?" — e a resposta estava
// espalhada por sete tabelas sem forma de lá chegar.
//
// Um ecrã só para os dois casos, e não dois ecrãs: a estrutura é a mesma
// (cabeçalho, secções, listas que levam a outro detalhe) e separá-los
// duplicava tudo para mudar meia dúzia de campos.
export default function AdminDetalheScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { tipoAlvo, id } = route.params || {};
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [conversa, setConversa] = useState(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r =
        tipoAlvo === 'viagem'
          ? await api.adminViagem(token, id)
          : await api.adminUtilizador(token, id);
      setDados(r);
    } catch (e) {
      setErro(e?.message || t('errGeneric'));
    }
  }, [token, id, tipoAlvo, t]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Ler a conversa exige confirmação, e não por burocracia: é o momento
  // em que alguém abre a conversa privada de duas pessoas. A confirmação
  // diz o que vai acontecer — incluindo que fica registado — para que a
  // decisão seja tomada com a informação toda.
  function abrirConversa(n) {
    Alert.alert(t('admConversaTitulo'), t('admConversaExplica'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('admLer'),
        onPress: async () => {
          try {
            const r = await api.adminMensagens(token, id);
            setConversa(r.mensagens || []);
          } catch (e) {
            setErro(e?.message || t('errGeneric'));
          }
        },
      },
    ]);
    return n;
  }

  const v = dados?.viagem;
  const c = dados?.conta;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Voltar navigation={navigation} />
        <Text style={styles.titulo}>
          {tipoAlvo === 'viagem' ? `${t('admDetalheViagem')} #${id}` : t('admDetalheConta')}
        </Text>

        <Aviso texto={erro} style={{ marginBottom: spacing.md }} />

        {!dados && !erro ? (
          <View style={styles.aCarregar}>
            <Carregando tamanho={52} />
          </View>
        ) : null}

        {v ? (
          <DetalheViagem
            v={v}
            t={t}
            navigation={navigation}
            onConversa={abrirConversa}
            conversa={conversa}
          />
        ) : null}
        {c ? <DetalheConta d={dados} t={t} navigation={navigation} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Viagem ────────────────────────────────────────────────────────────
function DetalheViagem({ v, t, navigation, onConversa, conversa }) {
  return (
    <>
      <Seccao titulo={t('destination')}>
        <Linha rotulo={t('pickupPoint')} valor={v.origem?.nome} />
        <Linha rotulo={t('dropoffPoint')} valor={v.destino?.nome} />
        <Linha
          rotulo={t('fareLabel')}
          valor={v.preco != null ? `$${v.preco}` : t('fareToAgree')}
          forte
        />
        <Linha rotulo="km" valor={v.km != null ? `${v.km} km` : '—'} />
        <Linha rotulo={t('admPedida')} valor={quando(v.pedida)} />
        <Linha rotulo={t('admComecou')} valor={quando(v.comecou)} />
        {v.codigoRecolha ? (
          <Linha rotulo={t('admCodigoRecolha')} valor={v.codigoRecolha} forte />
        ) : null}
        {v.cancelamento ? (
          <Linha
            rotulo={t('cancelRide')}
            valor={`${v.cancelamento.por} · ${v.cancelamento.motivo ? t(`cancelReason_${v.cancelamento.motivo}`) : '—'}`}
            mau
          />
        ) : null}
      </Seccao>

      {/* Os dois participantes levam a mais detalhe: quem investiga uma
          viagem quase sempre acaba a olhar para uma das pessoas. */}
      <Seccao titulo={t('passenger')}>
        <Pessoa p={v.passageiro} t={t} navigation={navigation} />
      </Seccao>
      {v.motorista ? (
        <Seccao titulo={t('driver')}>
          <Pessoa p={v.motorista} t={t} navigation={navigation} />
          <Linha rotulo={t('vehiclePlate')} valor={v.motorista.veiculo?.matricula} />
          <Linha rotulo={t('vehicleModel')} valor={v.motorista.veiculo?.modelo} />
        </Seccao>
      ) : null}

      {v.avaliacoes?.length ? (
        <Seccao titulo={t('admAvaliacoesRecebidas')}>
          {v.avaliacoes.map((a, i) => (
            <Linha key={i} rotulo={`${a.de} → ${a.para}`} valor={'⭐'.repeat(a.estrelas)} />
          ))}
        </Seccao>
      ) : null}

      <Seccao titulo="💬">
        {conversa ? (
          <>
            <Text style={styles.registado}>{t('admConversaAviso')}</Text>
            {conversa.length === 0 ? (
              <Text style={styles.vazio}>{t('admSemConversa')}</Text>
            ) : (
              conversa.map((m) => (
                <View key={m.id} style={styles.mensagem}>
                  <Text style={styles.mensagemDe}>
                    {m.de} · {quando(m.quando)}
                  </Text>
                  <Text style={styles.mensagemTexto}>{m.texto}</Text>
                </View>
              ))
            )}
          </>
        ) : v.nMensagens > 0 ? (
          <Pressable style={styles.botaoConversa} onPress={() => onConversa(v.nMensagens)}>
            <Text style={styles.botaoConversaTexto}>
              {t('admVerConversa', { n: v.nMensagens })}
            </Text>
            <Text style={styles.registado}>{t('admConversaAviso')}</Text>
          </Pressable>
        ) : (
          <Text style={styles.vazio}>{t('admSemConversa')}</Text>
        )}
      </Seccao>
    </>
  );
}

// ── Conta ─────────────────────────────────────────────────────────────
function DetalheConta({ d, t, navigation }) {
  const c = d.conta;
  return (
    <>
      <Seccao titulo={c.name}>
        <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)}>
          <Linha rotulo={t('phone')} valor={c.phone} forte />
        </Pressable>
        {c.email ? <Linha rotulo={t('email')} valor={c.email} /> : null}
        <Linha rotulo={t('admDesde')} valor={quando(c.desde)} />
        <Linha rotulo={t('admUltimaVez')} valor={quando(c.ultimaVez)} />
        {c.ratingAvg ? (
          <Linha
            rotulo={t('admAvaliacoesRecebidas')}
            valor={`⭐ ${Number(c.ratingAvg).toFixed(1)} (${c.ratingCount})`}
          />
        ) : null}
        {c.vehicle ? (
          <Linha
            rotulo={t('vehicleSection')}
            valor={`${c.vehicle.model || ''} · ${c.vehicle.plate || ''}`.trim()}
          />
        ) : null}
      </Seccao>

      {/* Numa disputa, "aceitou os termos?" é a primeira pergunta — e não
          estava visível em lado nenhum. */}
      <Seccao titulo={t('admTermos')}>
        <Linha
          rotulo={t('passenger')}
          valor={
            c.termos?.passageiro
              ? `v${c.termos.passageiro.versao} · ${quando(c.termos.passageiro.quando)}`
              : t('admTermosNao')
          }
          mau={!c.termos?.passageiro}
        />
        <Linha
          rotulo={t('driver')}
          valor={
            c.termos?.motorista
              ? `v${c.termos.motorista.versao} · ${quando(c.termos.motorista.quando)}`
              : t('admTermosNao')
          }
        />
        {c.decisao ? (
          <Linha
            rotulo={t('admDecisao')}
            valor={`${c.decisao.motivo || '—'} · ${quando(c.decisao.quando)}`}
          />
        ) : null}
      </Seccao>

      {d.documentos?.length ? (
        <Seccao titulo={t('adminDocs')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tira}>
            {d.documentos.map((doc) => (
              <View key={doc.id} style={styles.docCaixa}>
                <ImagemProtegida caminho={`/admin/documents/${doc.id}`} style={styles.doc} />
                <Text style={[styles.docNome, doc.caducado && styles.mauTexto]}>
                  {doc.tipo}
                  {doc.caducado ? ' ⚠' : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Seccao>
      ) : null}

      {d.turnos?.length ? (
        <Seccao titulo={t('admTurnosFoto')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tira}>
            {d.turnos.map((tn) => (
              <View key={tn.id} style={styles.docCaixa}>
                <ImagemProtegida caminho={`/admin/turnos/${tn.id}/foto`} style={styles.doc} />
                <Text style={styles.docNome}>{tn.dia}</Text>
              </View>
            ))}
          </ScrollView>
        </Seccao>
      ) : null}

      <Seccao titulo={t('admHistorico')}>
        {d.viagens?.length ? (
          d.viagens.map((v) => (
            <Pressable
              key={v.id}
              style={styles.item}
              onPress={() => navigation.push('AdminDetalhe', { tipoAlvo: 'viagem', id: v.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitulo} numberOfLines={1}>
                  {v.destino || '—'}
                </Text>
                <Text style={styles.itemMeta}>
                  {v.papel} · {quando(v.quando)} · {v.estado}
                </Text>
              </View>
              <Text style={styles.itemValor}>{v.preco != null ? `$${v.preco}` : '—'}</Text>
              <Text style={styles.seta}>›</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.vazio}>{t('admNadaAqui')}</Text>
        )}
      </Seccao>

      {d.emergencias?.length ? (
        <Seccao titulo={t('admEmergencias')}>
          {d.emergencias.map((s) => (
            <Linha
              key={s.id}
              rotulo={`${s.tipo || 'SOS'} · ${quando(s.quando)}`}
              valor={s.resolvido ? '✓' : '⚠'}
              mau={!s.resolvido}
            />
          ))}
        </Seccao>
      ) : null}
    </>
  );
}

function Pessoa({ p, t, navigation }) {
  return (
    <Pressable
      style={styles.item}
      onPress={() => navigation.push('AdminDetalhe', { tipoAlvo: 'utilizador', id: p.id })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitulo}>{p.nome}</Text>
        <Text style={styles.itemMeta}>
          {p.telefone}
          {p.estrelas ? ` · ⭐ ${Number(p.estrelas).toFixed(1)}` : ''}
        </Text>
      </View>
      <Text style={styles.seta}>›</Text>
    </Pressable>
  );
}

function Seccao({ titulo, children }) {
  return (
    <View style={styles.seccao}>
      <Text style={styles.seccaoTitulo}>{titulo}</Text>
      <View style={styles.caixa}>{children}</View>
    </View>
  );
}

function Linha({ rotulo, valor, forte, mau }) {
  if (!valor) return null;
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={[styles.linhaValor, forte && styles.linhaForte, mau && styles.mauTexto]}>
        {valor}
      </Text>
    </View>
  );
}

// Data curta e local. O ISO completo do servidor é ilegível de relance, e
// este ecrã é para ler de relance.
function quando(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
    titulo: { ...tipo.displayPequeno, color: colors.text, marginVertical: spacing.md },
    aCarregar: { alignItems: 'center', paddingVertical: spacing.xxl },

    seccao: { marginBottom: spacing.lg },
    seccaoTitulo: { ...tipo.etiqueta, color: colors.textMuted, marginBottom: spacing.sm },
    caixa: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },

    linha: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    linhaRotulo: { ...tipo.pequeno, color: colors.textMuted, flexShrink: 0 },
    linhaValor: { ...tipo.corpoForte, color: colors.text, flex: 1, textAlign: 'right' },
    linhaForte: { ...tipo.subtitulo, color: colors.teal },
    mauTexto: { color: colors.danger },

    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    itemTitulo: { ...tipo.corpoForte, color: colors.text },
    itemMeta: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    itemValor: { ...tipo.corpoForte, color: colors.teal },
    seta: { fontSize: 22, color: colors.textMuted },

    tira: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    docCaixa: { marginRight: spacing.sm, alignItems: 'center' },
    doc: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.tintaTeal },
    docNome: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },

    botaoConversa: { padding: spacing.md, alignItems: 'center' },
    botaoConversaTexto: { ...tipo.corpoForte, color: colors.teal },
    registado: {
      ...tipo.legenda,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xs,
    },
    mensagem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    mensagemDe: { ...tipo.legenda, color: colors.textMuted },
    mensagemTexto: { ...tipo.corpo, color: colors.text },
    vazio: { ...tipo.pequeno, color: colors.textMuted, padding: spacing.md, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
