import React, { useCallback, useEffect, useState } from 'react';
import { nomeDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { ordenarDocumentos } from '../dados/documentos.js';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CabecalhoEcra from '../design/CabecalhoEcra.js';
import Cartao from '../design/Cartao.js';
import { LinhaInfo } from '../design/LinhaMenu.js';
import Avatar from '../design/Avatar.js';
import BotaoAccao from '../design/BotaoAccao.js';
import CartaoVeiculo from '../design/CartaoVeiculo.js';
import Chip, { FilaChips } from '../design/Chip.js';
import Icone from '../design/Icone.js';
import { Pastilha, ESTADO } from '../design/painel.js';
import BarraEstado from '../design/BarraEstado.js';
import Carregando from '../design/Carregando.js';
import ImagemProtegida from '../design/ImagemProtegida.js';
import VerImagem from '../design/VerImagem.js';
import Aviso from '../design/Aviso.js';
import { tipo } from '../design/tipografia.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import Button from '../components/Button.js';
import { nomeDaForma } from '../dados/formasPagamento.js';
import { paraMostrar } from '../lib/datas.js';

// Detalhe de administração: uma conta ou uma viagem, por inteiro.
//
// O painel mostrava listas e parava aí. Quem administra precisa de
// perguntar "e esta viagem, o que aconteceu?" — e a resposta estava
// espalhada por sete tabelas sem forma de lá chegar.
//
// Um ecrã só para os dois casos, e não dois ecrãs: a estrutura é a mesma
// (cabeçalho, secções, listas que levam a outro detalhe) e separá-los
// duplicava tudo para mudar meia dúzia de campos.
// Num mapa e não montado letra a letra: uma chave de tradução construída em
// tempo de execução escapa ao verificador. Ver scripts/verificar-tipos.mjs.
const MOTIVO_TEXTO = {
  caducado: 'motivoCaducado',
  perdido: 'motivoPerdido',
  danificado: 'motivoDanificado',
  errado: 'motivoErrado',
};

const NOME_DO_DOC = {
  licence: 'docLicence',
  cartaverso: 'docCartaverso',
  vehicle: 'docVehicle',
  inspection: 'docInspection',
  identity: 'docIdentity',
  photo: 'docPhoto',
  fotoveiculo: 'docFotoveiculo',
};

export default function AdminDetalheScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { tipoAlvo, id } = route.params || {};
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  // A imagem que está aberta em grande, ou nada. Vive AQUI e não dentro do
  // cartão de cada documento: um visualizador por documento seria um Modal por
  // documento, todos montados ao mesmo tempo.
  const [imagem, setImagem] = useState(null);

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

  const v = dados?.viagem;
  const c = dados?.conta;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BarraEstado />
      <CabecalhoEcra
        navigation={navigation}
        titulo={tipoAlvo === 'viagem' ? `${t('admDetalheViagem')} #${id}` : t('admDetalheConta')}
        subtitulo="TimorgianaRide · Díli"
      />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Aviso texto={erro} style={{ marginBottom: spacing.md }} />

        {!dados && !erro ? (
          <View style={styles.aCarregar}>
            <Carregando tamanho={52} />
          </View>
        ) : null}

        {v ? <DetalheViagem v={v} t={t} navigation={navigation} /> : null}
        {c ? (
          <DetalheConta
            d={dados}
            t={t}
            navigation={navigation}
            token={token}
            onMudou={carregar}
            verImagem={setImagem}
          />
        ) : null}
      </ScrollView>

      <VerImagem
        caminho={imagem?.caminho}
        titulo={imagem?.titulo}
        legenda={imagem?.legenda}
        onFechar={() => setImagem(null)}
      />
    </SafeAreaView>
  );
}

// ── Viagem ────────────────────────────────────────────────────────────
// SALTAR DE UM DETALHE PARA OUTRO SEM EMPILHAR.
//
// Estava `navigation.push`, que ACRESCENTA sempre um ecrã — mesmo sendo o
// mesmo ecrã. Da viagem ia-se ao passageiro, do passageiro a outra viagem, e
// dessa outra vez ao mesmo passageiro; cada toque punha mais um por cima. O
// Simão gravou-se a fazê-lo: aos 17 segundos do vídeo vê-se a Viagem #63 a
// deslizar para fora com outra Viagem #63 por baixo.
//
// E depois pagava-se a subida toda à descida: seis toques para entrar eram
// seis no Voltar para sair.
//
// Com `replace`, o detalhe é UM ecrã por onde se anda. Pode saltar-se de
// viagem para pessoa e de pessoa para viagem as vezes que forem precisas —
// por baixo continua a estar a lista de onde se veio, e um Voltar leva lá.
// Foi exactamente o que ele pediu: "depois de clicar no botão voltar uma vez,
// volta ao principal".
function abrirDetalhe(navigation, tipoAlvo, id) {
  navigation.replace('AdminDetalhe', { tipoAlvo, id });
}

function DetalheViagem({ v, t, navigation }) {
  return (
    <>
      <Seccao icone="pin" titulo={t('destination')}>
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
      <Seccao icone="pessoa" titulo={t('passenger')}>
        <Pessoa p={v.passageiro} t={t} navigation={navigation} />
      </Seccao>
      {v.motorista ? (
        <Seccao icone="volante" titulo={t('driver')}>
          <Pessoa p={v.motorista} t={t} navigation={navigation} />
          <Linha rotulo={t('vehiclePlate')} valor={v.motorista.veiculo?.matricula} />
          <Linha rotulo={t('vehicleModel')} valor={v.motorista.veiculo?.modelo} />
        </Seccao>
      ) : null}

      {v.avaliacoes?.length ? (
        <Seccao icone="estrela" titulo={t('admAvaliacoesRecebidas')}>
          {v.avaliacoes.map((a, i) => (
            <Linha key={i} rotulo={`${a.de} → ${a.para}`} valor={'★'.repeat(a.estrelas)} />
          ))}
        </Seccao>
      ) : null}

      {/* Só o NÚMERO de mensagens, nunca o conteúdo.
          A administração não lê o que passageiro e motorista escrevem um
          ao outro. Quem pode monitorizar pode ser acusado de não ter
          monitorizado; sem acesso, essa pergunta não existe. E numa
          queixa a prova não desaparece — está no telemóvel de quem se
          queixa, e é essa pessoa que decide mostrá-la.
          O número é sinal útil: uma viagem com quarenta mensagens diz
          alguma coisa sem revelar nada. */}
      {v.nMensagens > 0 ? (
        <Seccao icone="mensagem" titulo={t('acaoMensajen')}>
          <Linha rotulo={t('admMensagensN')} valor={String(v.nMensagens)} />
          <Text style={styles.registado}>{t('admMensagensPrivadas')}</Text>
        </Seccao>
      ) : null}
    </>
  );
}

// ── Conta ─────────────────────────────────────────────────────────────
function DetalheConta({ d, t, navigation, token, onMudou, verImagem }) {
  const [filtroV, setFiltroV] = useState('todas');
  // Confirmar um documento substituído. Recarrega a seguir, para a marca
  // "por confirmar" desaparecer sem ter de sair e voltar ao ecrã.
  async function marcarRevisto(id) {
    try {
      await api.adminDocRevisto(token, id);
      onMudou?.();
    } catch {
      /* sem rede: o botão continua lá para a próxima */
    }
  }

  const c = d.conta;
  // O histórico filtra-se aqui, sobre o que já veio: é a lista desta pessoa.
  const viagensVisiveis = (d.viagens || []).filter(
    (v) => filtroV === 'todas' || v.estado === filtroV
  );
  return (
    <>
      {/* O CARTÃO DA PESSOA: o rosto (a fotografia de turno mais recente,
          quando é motorista), o nome, o papel, as estrelas com o número de
          avaliações — aqui fica, porque quem administra tem de pesar a média
          com quantas pessoas a deram — e desde quando é membro. */}
      <View style={styles.perfil}>
        <Avatar
          nome={c.name}
          tamanho={76}
          online={!!c.online}
          caminho={d.turnos?.[0] ? `/admin/turnos/${d.turnos[0].id}/foto` : undefined}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.perfilNome} numberOfLines={2}>
            {c.name}
          </Text>
          <View style={styles.papeis}>
            {c.isAdmin ? <Papel icone="coroa" texto={t('admPapelAdmin')} /> : null}
            {c.driverStatus ? (
              <Papel icone="volante" texto={t('admPapelMotorista')} />
            ) : (
              <Papel icone="pessoa" texto={t('admPapelPassageiro')} />
            )}
          </View>
          {c.ratingAvg ? (
            <View style={styles.estrelas}>
              <Icone nome="estrela" tamanho={15} cor={colors.coral} />
              <Text style={styles.estrelasTexto}>
                {Number(c.ratingAvg).toFixed(1)} ({c.ratingCount})
              </Text>
            </View>
          ) : null}
          <Text style={styles.perfilDesde}>{t('admMembroDesde', { data: dia(c.desde) })}</Text>
        </View>
      </View>
      {/* Mensajen abre as SMS do telefone: a administração não lê nem
          escreve no chat das viagens, que é entre passageiro e motorista. */}
      <View style={styles.perfilAccoes}>
        <BotaoAccao
          icone="telefone"
          titulo={t('acaoLiga')}
          variante="cheio"
          onPress={() => Linking.openURL(`tel:${c.phone}`)}
        />
        <BotaoAccao
          icone="mensagem"
          titulo={t('acaoMensajen')}
          onPress={() => Linking.openURL(`sms:${c.phone}`)}
        />
      </View>

      <Seccao icone="pessoa" titulo={t('perfilInfo')}>
        <LinhaInfo
          icone="telefone"
          rotulo={t('phone')}
          valor={c.phone}
          forte
          onPress={() => Linking.openURL(`tel:${c.phone}`)}
        />
        <LinhaInfo icone="email" rotulo={t('email')} valor={c.email} />
        <LinhaInfo icone="calendario" rotulo={t('admDesde')} valor={quando(c.desde)} />
        <LinhaInfo
          icone="relogio"
          rotulo={t('admUltimaVez')}
          valor={quando(c.ultimaVez) || '—'}
          extra={c.online ? <Pastilha texto={t('admAtivoAgora')} estado={ESTADO.bom} /> : null}
        />
        <LinhaInfo
          icone="estrela"
          rotulo={t('admAvaliacoesRecebidas')}
          valor={c.ratingAvg ? `${Number(c.ratingAvg).toFixed(1)} (${c.ratingCount})` : null}
          ultimo
        />
      </Seccao>

      {c.vehicle ? (
        <View style={styles.bloco}>
          <CartaoVeiculo veiculo={c.vehicle} titulo={t('vehicleSection')} />
        </View>
      ) : null}

      {/* Numa disputa, "aceitou os termos?" é a primeira pergunta — e não
          estava visível em lado nenhum. */}
      {c.vehicle ? <Assinatura c={c} t={t} token={token} onMudou={onMudou} /> : null}

      <Seccao icone="documento" titulo={t('admTermos')}>
        <Linha
          icone="pessoa"
          rotulo={t('passenger')}
          valor={
            c.termos?.passageiro
              ? `v${c.termos.passageiro.versao} · ${quando(c.termos.passageiro.quando)}`
              : t('admTermosNao')
          }
          mau={!c.termos?.passageiro}
        />
        <Linha
          icone="volante"
          rotulo={t('driver')}
          valor={
            c.termos?.motorista
              ? `v${c.termos.motorista.versao} · ${quando(c.termos.motorista.quando)}`
              : t('admTermosNao')
          }
        />
        {c.decisao ? (
          <Linha
            icone="proibido"
            rotulo={t('admDecisao')}
            valor={`${c.decisao.motivo || '—'} · ${quando(c.decisao.quando)}`}
          />
        ) : null}
      </Seccao>

      {/* ANTES dos documentos, e não depois. Quem aprova lê a declaração

          e a seguir olha para o bilhete de identidade — é essa ordem que

          faz a confrontação acontecer. Ao contrário, olha-se para cinco

          fotografias e só no fim se descobre o que era preciso confirmar. */}

      {d.conta?.cidadaoTL ? (
        <Seccao icone="bandeira" titulo={t('admCidadania')}>
          <Linha
            rotulo={t('admCidadaniaDeclarou')}

            valor={d.conta.cidadaoTL.declarou ? t('admCidadaniaSim') : t('admCidadaniaNao')}

            forte

            mau={!d.conta.cidadaoTL.declarou}
          />

          <Linha rotulo={t('admQuando')} valor={quando(d.conta.cidadaoTL.quando)} />
        </Seccao>
      ) : null}

      {d.documentos?.length ? (
        <Seccao icone="pasta" titulo={t('adminDocs')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tira}>
            {ordenarDocumentos(d.documentos, 'tipo').map((doc) => (
              <View key={doc.id} style={styles.docCaixa}>
                {/* TOCAR ABRE EM GRANDE. Noventa e dois pixels dizem que há
                    uma fotografia; não deixam ler o número de uma carta nem
                    conferir a data impressa contra a que o motorista escreveu
                    — que é o trabalho de quem aprova. */}
                <Pressable
                  onPress={() =>
                    verImagem({
                      caminho: `/admin/documents/${doc.id}`,
                      titulo: NOME_DO_DOC[doc.tipo] ? t(NOME_DO_DOC[doc.tipo]) : doc.tipo,
                      legenda: doc.validade ? paraMostrar(doc.validade) : t('docSemValidade'),
                    })
                  }
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('admVerImagem')}
                >
                  <ImagemProtegida caminho={`/admin/documents/${doc.id}`} style={styles.doc} />
                </Pressable>
                <Text style={[styles.docNome, doc.caducado && styles.mauTexto]}>
                  {NOME_DO_DOC[doc.tipo] ? t(NOME_DO_DOC[doc.tipo]) : doc.tipo}
                </Text>
                {/* A DATA AO LADO DA FOTOGRAFIA, e não é detalhe de arrumação.
                    A validade é escrita pelo próprio motorista: ele fotografa
                    o cartão e escreve a data que quiser, e a app não sabe ler
                    o cartão. Quem verifica é quem está aqui — mas só consegue
                    verificar se vir as duas coisas ao mesmo tempo. */}
                <Text style={[styles.docValidade, doc.caducado && styles.mauTexto]}>
                  {doc.validade ? paraMostrar(doc.validade) : t('docSemValidade')}
                </Text>
                {/* Substituído depois de já ter sido verificado, e ainda por
                    confirmar. É exactamente o caso que o Simão quis vigiar ao
                    fechar os documentos: o motorista pode trocá-los, mas tem
                    de dizer porquê e alguém tem de olhar. */}
                {/* No verso, o que confirmar: as categorias para o veículo que
                    a pessoa registou. */}
                {doc.tipo === 'cartaverso' && c.vehicle ? (
                  <Text style={styles.docMotivo}>
                    {t('admConfirmarCategorias', { veiculo: nomeDoVeiculo(t, c.vehicle.type) })}
                  </Text>
                ) : null}
                {doc.porRever ? (
                  <>
                    <Text style={styles.docMotivo}>
                      {t(MOTIVO_TEXTO[doc.motivo] || 'admDocPorRever')}
                    </Text>
                    <Pressable
                      style={styles.docRevisto}
                      onPress={() => marcarRevisto(doc.id)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.docRevistoTexto}>{t('admDocConfirmar')}</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </Seccao>
      ) : null}

      {d.turnos?.length ? (
        <Seccao icone="camera" titulo={t('admTurnosFoto')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tira}>
            {d.turnos.map((tn) => (
              <View key={tn.id} style={styles.docCaixa}>
                <Pressable
                  onPress={() =>
                    verImagem({
                      caminho: `/admin/turnos/${tn.id}/foto`,
                      titulo: t('admTurnosFoto'),
                      legenda: tn.dia,
                    })
                  }
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('admVerImagem')}
                >
                  <ImagemProtegida caminho={`/admin/turnos/${tn.id}/foto`} style={styles.doc} />
                </Pressable>
                <Text style={styles.docNome}>{tn.dia}</Text>
              </View>
            ))}
          </ScrollView>
        </Seccao>
      ) : null}

      <Seccao icone="rota" titulo={t('admHistorico')}>
        {d.viagens?.length ? (
          <View style={styles.chips}>
            <FilaChips>
              {FILTROS_VIAGEM.map(([f, chave]) => (
                <Chip
                  key={f}
                  texto={t(chave)}
                  activo={filtroV === f}
                  onPress={() => setFiltroV(f)}
                />
              ))}
            </FilaChips>
          </View>
        ) : null}
        {viagensVisiveis.length ? (
          viagensVisiveis.map((v) => (
            <Pressable
              key={v.id}
              style={styles.item}
              onPress={() => abrirDetalhe(navigation, 'viagem', v.id)}
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
              <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.vazio}>{t('admNadaAqui')}</Text>
        )}
      </Seccao>

      {d.emergencias?.length ? (
        <Seccao icone="sirene" titulo={t('admEmergencias')}>
          {d.emergencias.map((s) => (
            <Linha
              key={s.id}
              rotulo={`${s.tipo || 'SOS'} · ${quando(s.quando)}`}
              valor={s.resolvido ? t('admSosResolvido') : t('admSosAberto')}
              mau={!s.resolvido}
            />
          ))}
        </Seccao>
      ) : null}
    </>
  );
}

const FILTROS_VIAGEM = [
  ['todas', 'admFiltroTodos'],
  ['completed', 'admConcluidas'],
  ['cancelled', 'statusCancelled'],
];

function Papel({ icone, texto }) {
  return (
    <View style={styles.papel}>
      <Icone nome={icone} tamanho={14} cor={colors.teal} />
      <Text style={styles.papelTexto}>{texto}</Text>
    </View>
  );
}

function Pessoa({ p, t, navigation }) {
  return (
    <Pressable style={styles.item} onPress={() => abrirDetalhe(navigation, 'utilizador', p.id)}>
      <Avatar nome={p.nome} tamanho={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitulo}>{p.nome}</Text>
        <Text style={styles.itemMeta}>
          {p.telefone}
          {p.estrelas ? ` · ★ ${Number(p.estrelas).toFixed(1)}` : ''}
        </Text>
      </View>
      <Icone nome="seta" tamanho={16} cor={colors.textMuted} traco={2.4} />
    </Pressable>
  );
}

// Cada secção é um Cartao do sistema de design, com ícone no cabeçalho; cada
// linha é uma LinhaInfo. Mantêm os nomes antigos para o resto do ficheiro não
// ter de mudar — e para as duas coisas nunca divergirem do resto da app.
function Seccao({ icone, titulo, direita, children }) {
  return (
    <Cartao icone={icone} titulo={titulo} direita={direita} lista>
      {children}
    </Cartao>
  );
}

function Linha({ icone, rotulo, valor, forte, mau }) {
  return <LinhaInfo icone={icone} rotulo={rotulo} valor={valor} forte={forte} mau={mau} />;
}

// Só o dia, para o "membro desde".
function dia(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    conteudo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    aCarregar: { alignItems: 'center', paddingVertical: spacing.xxl },
    perfil: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.xl,
      padding: spacing.md,
    },
    perfilNome: { ...tipo.titulo, color: colors.text },
    papeis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    papel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.white,
      borderRadius: radius.pill,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    papelTexto: { ...tipo.legenda, color: colors.teal },
    estrelas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    estrelasTexto: { ...tipo.corpoForte, color: colors.text },
    perfilDesde: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    perfilAccoes: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    bloco: { marginTop: -spacing.md, marginBottom: spacing.md },
    chips: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

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

    tira: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    docCaixa: { marginRight: spacing.sm, alignItems: 'center' },
    doc: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.tintaTeal },
    docNome: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    docValidade: { ...tipo.legenda, color: colors.textMuted, textAlign: 'center' },
    docMotivo: {
      ...tipo.legenda,
      color: colors.coral,
      textAlign: 'center',
      marginTop: 2,
    },
    docRevisto: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.teal,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    docRevistoTexto: { ...tipo.legenda, color: colors.teal, textAlign: 'center' },

    registado: {
      ...tipo.legenda,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xs,
    },
    vazio: { ...tipo.pequeno, color: colors.textMuted, padding: spacing.md, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});

// Carregar dias, do lado de quem recebe o dinheiro.
//
// Fica no ecrã da conta e não numa página à parte de propósito: quem
// confirma que a transferência entrou é a mesma pessoa que está a olhar
// para o motorista. Separar as duas coisas obrigaria a procurar o nome
// outra vez noutro sítio — e é aí que se carregam dias na conta errada.
//
// Os pacotes vêm do servidor por outra razão: o preço muda, e não pode
// mudar em três sítios.
// Os motivos por que os termos mandam devolver. A desactivação por falta
// grave não está aqui de propósito: os termos excluem-na.
const MOTIVOS_DEVOLUCAO = [
  ['encerramento', 'admDevMotivoEncerramento'],
  ['desativacao', 'admDevMotivoDesativacao'],
  ['fim_servico', 'admDevMotivoFim'],
];

function Assinatura({ c, t, token, onMudou }) {
  const [aGravar, setAGravar] = useState(false);
  const [metodo, setMetodo] = useState('escritorio');
  const [dev, setDev] = useState(null);
  const [motivoDev, setMotivoDev] = useState(null);

  // Do servidor, sempre. Tinha-os escrito aqui à mão e isso punha o preço
  // em dois sítios — o do motorista vindo do servidor, o do administrador
  // escrito na app. Bastava mudar um pacote para os dois discordarem, e
  // quem descobre uma discordância dessas é sempre o cliente.
  const PACOTES = c.pacotes ?? [];
  const METODOS = c.formasPagamento ?? [];

  function carregarDias(p) {
    // Confirmação porque isto é dinheiro. Um toque a mais numa lista de
    // botões pequenos não pode dar dias a quem não pagou.
    Alert.alert(t('admCarregarDias'), t('admConfirmarCarga', { dias: p.dias }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('admCarregarDias'),
        onPress: async () => {
          setAGravar(true);
          try {
            await api.adminCarregar(token, c.id, {
              dias: p.dias,
              valorUsd: p.usd,
              metodo,
            });
            onMudou?.();
          } catch (e) {
            Alert.alert(t('errGeneric'), e?.message || '');
          } finally {
            setAGravar(false);
          }
        },
      },
    ]);
  }

  // A DEVOLUÇÃO (14/09/26): o servidor calcula — os dias mais antigos
  // gastam-se primeiro, por isso os que sobram são os mais recentes, ao preço
  // por dia a que foram pagos. Aqui só se mostra a conta e se escolhe o motivo.
  async function calcularDevolucao() {
    try {
      setDev(await api.adminDevolucao(token, c.id));
      setMotivoDev(null);
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }

  function registarDevolucao() {
    if (!dev || !motivoDev) return;
    Alert.alert(
      t('admDevRegistar'),
      t('admDevConfirmar', { valor: dev.valorUsd.toFixed(2), dias: dev.dias }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('admDevRegistar'),
          style: 'destructive',
          onPress: async () => {
            setAGravar(true);
            try {
              await api.adminRegistarDevolucao(token, c.id, motivoDev);
              setDev(null);
              onMudou?.();
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

  return (
    <Seccao
      icone="carteira"
      titulo={t('admAssinatura')}
      direita={
        <View style={estilosAssin.saldo}>
          <Text style={estilosAssin.saldoRotulo}>{t('admDiasSaldo')}</Text>
          <Text style={estilosAssin.saldoValor}>{c.dias ?? 0}</Text>
        </View>
      }
    >
      <View style={estilosAssin.corpo}>
        {c.referencia ? (
          <Text style={estilosAssin.rotulo}>
            {t('admReferencia')}: <Text style={estilosAssin.referencia}>{c.referencia}</Text>
          </Text>
        ) : null}
        <Text style={estilosAssin.rotulo}>{t('admFormaPagamento')}</Text>
        <View style={estilosAssin.linha}>
          {METODOS.map((m) => (
            <Chip
              key={m}
              texto={nomeDaForma(m, t)}
              activo={metodo === m}
              onPress={() => setMetodo(m)}
            />
          ))}
        </View>

        <View style={estilosAssin.linha}>
          {PACOTES.map((p) => (
            <Pressable
              key={p.dias}
              disabled={aGravar}
              onPress={() => carregarDias(p)}
              style={[estilosAssin.pacote, aGravar && { opacity: 0.5 }]}
            >
              <Text style={estilosAssin.pacoteDias}>{t('admMaisDias', { n: p.dias })}</Text>
              <Text style={estilosAssin.pacoteUsd}>${p.usd}</Text>
            </Pressable>
          ))}
        </View>

        <View style={estilosAssin.devolucao}>
          {!dev ? (
            <Button
              title={t('admDevCalcular')}
              variant="ghost"
              disabled={aGravar}
              onPress={calcularDevolucao}
            />
          ) : !dev.dias ? (
            <Text style={estilosAssin.nota}>{t('admDevSemDias')}</Text>
          ) : (
            <>
              <Text style={estilosAssin.devTitulo}>
                {t('admDevResultado', { dias: dev.dias, valor: dev.valorUsd.toFixed(2) })}
              </Text>
              {dev.partes
                .filter((x) => x.porDia > 0)
                .map((x, i) => (
                  <Text key={i} style={estilosAssin.nota}>
                    {t('admDevParte', {
                      dias: x.dias,
                      porDia: x.porDia.toFixed(2),
                      quando: x.quando ? paraMostrar(x.quando) : '—',
                    })}
                  </Text>
                ))}
              {dev.oferecidos ? (
                <Text style={estilosAssin.nota}>
                  {t('admDevOferecidos', { n: dev.oferecidos })}
                </Text>
              ) : null}
              <FilaChips>
                {MOTIVOS_DEVOLUCAO.map(([id, chave]) => (
                  <Chip
                    key={id}
                    texto={t(chave)}
                    activo={motivoDev === id}
                    onPress={() => setMotivoDev(id)}
                  />
                ))}
              </FilaChips>
              <Text style={estilosAssin.nota}>{t('admDevNota')}</Text>
              <Button
                title={t('admDevRegistar')}
                variant="perigo"
                disabled={!motivoDev || aGravar}
                onPress={registarDevolucao}
              />
            </>
          )}
        </View>
      </View>
    </Seccao>
  );
}

const criarEstilosAssin = () =>
  StyleSheet.create({
    corpo: { padding: spacing.md },
    referencia: { ...tipo.corpoForte, color: colors.teal, letterSpacing: 1 },
    devolucao: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    devTitulo: { ...tipo.corpoForte, color: colors.text },
    nota: { ...tipo.pequeno, color: colors.textMuted },
    saldo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: spacing.md,
    },
    saldoRotulo: { ...tipo.legenda, color: colors.teal },
    saldoValor: { ...tipo.titulo, color: colors.teal },
    rotulo: { ...tipo.legenda, color: colors.textMuted },
    linha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    pacote: {
      flexGrow: 1,
      flexBasis: '28%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.teal,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      minHeight: 64,
    },
    pacoteDias: { ...tipo.corpoForte, color: colors.teal },
    pacoteUsd: { ...tipo.legenda, color: colors.textMuted },
  });

let estilosAssin = criarEstilosAssin();
registarEstilos(() => {
  estilosAssin = criarEstilosAssin();
});
