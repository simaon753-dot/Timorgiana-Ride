import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Logo from '../components/Logo.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import TextField from '../components/TextField.js';
import FormularioVeiculo from '../components/FormularioVeiculo.js';
import Voltar from '../components/Voltar.js';
import { VERSAO_TERMOS_MOTORISTA } from '../termos/index.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paraISO, paraMostrar } from '../lib/datas.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';

// OS TRÊS DOCUMENTOS OBRIGATÓRIOS, e os três valem para carro E motorizada.
// Nenhum deles depende do tipo de veículo: quem conduz uma motorizada precisa
// de registo e de inspecção exactamente como quem conduz um carro.
//
// A fotografia não é um documento — é o retrato da pessoa, e serve para saber
// quem está ao volante. Por isso está na lista mas não caduca.
// Porque é que um documento já verificado está a ser substituído.
//
// Lista fechada e não texto livre. Duas razões: assim contam-se — ao fim de
// um ano sabe-se quantos documentos se perdem em Díli, e isso é informação —
// e assim o motorista escolhe em vez de escrever, que num telemóvel dentro
// de um carro é a diferença entre fazer e desistir.
//
// O 'errado' é o que evita que alguém escolha um motivo falso por não
// encontrar o seu: quem se enganou a fotografar precisa de o poder dizer.
const MOTIVOS = ['caducado', 'perdido', 'danificado', 'errado'];

const TIPOS = [
  { kind: 'photo', label: 'docPhoto' },
  // Quem é a pessoa. A fotografia mostra a cara; isto liga a cara a um nome
  // que o Estado reconhece.
  //
  // NÃO PEDE DATA, ao contrário dos outros três. O bilhete de identidade tem
  // validade, mas o que nos interessa nele é a identidade — e essa não
  // caduca. Suspender a conta de quem tem o BI por renovar seria bloquear
  // alguém por um motivo que não tem que ver com conduzir.
  { kind: 'identity', label: 'docIdentity' },
  { kind: 'licence', label: 'docLicence' },
  { kind: 'vehicle', label: 'docVehicle' },
  // Kartaun Inspesaun. Obrigatório em Timor-Leste, válido um ano, e conduzir
  // com ele caducado dá multa a dobrar se a polícia de trânsito mandar
  // parar. Entrou em 02/09/2026.
  { kind: 'inspection', label: 'docInspection' },
];

// Ecrã que o motorista vê enquanto a conta não está aprovada. Sem isto,
// alguém acabado de registar via a lista de pedidos vazia e concluía que
// a app estava avariada — em vez de perceber que falta ser aprovado.
export default function DriverPendingScreen({ navigation }) {
  const { t } = useI18n();
  const { user, token, logout, refreshUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(null);
  const [validades, setValidades] = useState({}); // que documento está a enviar
  const [error, setError] = useState(null);
  // O que está à espera de confirmação: a fotografia escolhida e a data
  // escrita, antes de irem para o servidor.
  const [porConfirmar, setPorConfirmar] = useState(null);
  // Que documento está a ser desbloqueado para substituição, e com que
  // motivo. Enquanto for `null`, os documentos verificados estão fechados.
  const [aAtualizar, setAAtualizar] = useState(null);
  const [motivos, setMotivos] = useState({});
  const [loading, setLoading] = useState(true);

  const rejected = user?.driverStatus === 'rejected';
  // O ecrã dizia "Conta em análise" mesmo depois de aprovada, porque só
  // conhecia dois estados: recusado e tudo o resto. Quem tinha acabado de ser
  // aprovado no painel voltava aqui e lia que continuava à espera — e não há
  // maneira de distinguir isso de a aprovação não ter funcionado.
  const aprovado = user?.driverStatus === 'approved';

  // QUEM PODE MEXER NUM DOCUMENTO, e é aqui que está a decisão toda.
  //
  // O Simão pediu que, depois de aprovado, o motorista deixasse de poder
  // substituir documentos — para ninguém trocar o que foi verificado. Está
  // certo, mas cumprido à letra deixava-o preso: o cartão de inspeção caduca
  // todos os anos, e sem poder substituí-lo a conta ficava suspensa PARA
  // SEMPRE. O aviso de quinze dias passaria a avisar sobre uma coisa que
  // ninguém pode resolver, e a regra que escrevemos — "a conta volta sozinha
  // assim que enviar o documento renovado" — deixava de ter caminho.
  //
  // Por isso: fechado depois de aprovado, com DUAS aberturas.
  //
  // 1. O documento caducou ou está a caducar → botão de renovar. É a
  //    renovação legítima, e é a única altura em que faz sentido.
  //
  // 2. A conta foi recusada → tudo aberto. É a saída para o engano honesto:
  //    fotografia tremida, documento errado, data mal escrita. O Simão
  //    recusa, o motorista corrige, ele aprova. Sem telefonema.
  //
  //    Antes, um motorista recusado nem sequer via a lista de documentos —
  //    lia que não foi aprovado e não tinha o que fazer a seguir. Isso era
  //    um beco sem saída, e passa a não ser.
  //
  // 3. O motorista carregou em "Atualizar" e escolheu um motivo. É a
  //    abertura que o Simão pediu a 02/09/2026: um documento pode perder-se
  //    ou estragar-se em qualquer altura, e não só quando está a caducar.
  //    Continua a não ser um gesto livre — obriga a dizer porquê, e o motivo
  //    fica guardado e aparece no painel marcado por rever.
  function podeMexer(doc, kind) {
    if (!aprovado) return true;
    if (!doc) return true;
    if (motivos[kind]) return true;
    return !!doc.expirado || !!doc.aExpirar;
  }

  const carregar = useCallback(async () => {
    try {
      const { documents } = await api.driverStatus(token);
      setDocs(documents || []);
    } catch {
      /* sem rede — mostra o que já tem */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Enquanto espera, verifica de tempos a tempos se já foi decidido.
  // Não usamos socket aqui: o motorista por aprovar nem entra nas salas.
  useEffect(() => {
    if (rejected) return;
    const id = setInterval(refreshUser, 20000);
    return () => clearInterval(id);
  }, [refreshUser, rejected]);

  // A fotografia do motorista não caduca; tudo o resto sim. Não se pergunta
  // uma data que não existe.
  function precisaValidade(kind) {
    return kind !== 'photo' && kind !== 'identity';
  }

  // Guardar só a data, sem mexer na fotografia.
  //
  // O caminho existe para os documentos que já estão na conta e ficaram sem
  // validade — obrigar a refotografar uma carta de condução só para
  // escrever uma data seria trabalho que não serve para nada.
  async function guardarData(kind) {
    setError(null);
    const d = paraISO(validades[kind]);
    if (!d) return setError(t('docExpiryRequired'));
    setBusy(kind);
    try {
      await api.definirValidadeDoc(token, kind, d);
      await carregar();
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setBusy(null);
    }
  }

  async function enviar(kind) {
    setError(null);
    // A data é lida como está no documento — "22/12/2026" no Kartaun
    // Inspesaun — e convertida aqui. Ver src/lib/datas.js.
    const validade = precisaValidade(kind) ? paraISO(validades[kind]) : null;
    if (precisaValidade(kind) && !validade) return setError(t('docExpiryRequired'));
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(t('errPermissionPhotos'));

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6, // comprime: os documentos não precisam de qualidade máxima
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;

    // MOSTRA ANTES DE ENVIAR, e não envia já.
    //
    // Um documento fotografado com pressa dentro de um carro sai tremido,
    // cortado ou de cabeça para baixo, e quem o tirou não vê a miniatura —
    // vê a lista a dizer "✓ Enviado" e fica descansado. Só descobre quando
    // alguém o recusa, dias depois.
    //
    // A data vai junto na mesma janela porque é a outra coisa que se engana:
    // o cartão tem três datas, e a que interessa é a da validade.
    setPorConfirmar({
      kind,
      mime: res.assets[0].mimeType || 'image/jpeg',
      base64: res.assets[0].base64,
      expiresOn: validade,
      motivo: motivos[kind] || null,
    });
  }

  async function confirmarEnvio() {
    const c = porConfirmar;
    if (!c) return;
    setPorConfirmar(null);
    setBusy(c.kind);
    try {
      await api.uploadDocument(token, {
        kind: c.kind,
        mime: c.mime,
        base64: c.base64,
        ...(c.expiresOn ? { expiresOn: c.expiresOn } : {}),
        ...(c.motivo ? { motivo: c.motivo } : {}),
      });
      // O documento voltou a fechar-se: substituir outra vez obriga a
      // escolher o motivo outra vez.
      setMotivos((m) => ({ ...m, [c.kind]: undefined }));
      await carregar();
    } catch (e) {
      setError(e?.message === 'NETWORK' ? t('errNetwork') : e?.message || t('errGeneric'));
    } finally {
      setBusy(null);
    }
  }

  const enviados = docs.map((d) => d.kind);
  const completo = TIPOS.every((tp) => enviados.includes(tp.kind));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Voltar navigation={navigation} />
          <View style={styles.topBarDireita}>
            {user?.isAdmin ? (
              <Pressable onPress={() => navigation.navigate('Admin')} style={styles.adminLink}>
                <Text style={styles.adminLinkText}>⚙</Text>
              </Pressable>
            ) : null}
            <LanguageToggle />
          </View>
        </View>

        {/* Sem veículo declarado, não há documentos a pedir: primeiro
            diz-se o que se conduz. É este o caminho de quem se registou
            como passageiro e mais tarde quis conduzir. */}
        {!user?.vehicle?.plate ? (
          <FormularioVeiculo onPronto={carregar} />
        ) : (
          <>
            <View
              style={[
                styles.card,
                rejected && styles.cardRejected,
                aprovado && styles.cardAprovado,
              ]}
            >
              <Text style={styles.icon}>{rejected ? '⛔' : aprovado ? '✓' : '⏳'}</Text>
              <Text style={styles.title}>
                {rejected ? t('rejectedTitle') : aprovado ? t('approvedTitle') : t('pendingTitle')}
              </Text>
              <Text style={styles.explain}>
                {rejected
                  ? t('rejectedExplain')
                  : aprovado
                    ? t('approvedExplain')
                    : t('pendingExplain')}
              </Text>
            </View>

            {/* A LISTA APARECE SEMPRE, incluindo a quem foi recusado.
                Antes, um motorista recusado lia que não foi aprovado e não
                via documento nenhum — sem nada que pudesse corrigir. Era um
                beco sem saída que só se resolvia por telefone. */}
            <>
              <Text style={styles.hint}>{aprovado ? t('docHintAprovado') : t('docHint')}</Text>

              {loading ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
              ) : (
                TIPOS.map((tp) => {
                  const enviado = enviados.includes(tp.kind);
                  const doc = docs.find((d) => d.kind === tp.kind);
                  return (
                    <View key={tp.kind}>
                      <View style={styles.docRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docName}>{t(tp.label)}</Text>
                          <Text style={[styles.docState, enviado && styles.docStateOk]}>
                            {enviado ? `✓ ${t('docSent')}` : t('docMissing')}
                          </Text>
                          {/* Substituído e ainda por confirmar. Dizê-lo
                          evita o telefonema de quem enviou o documento novo
                          e não sabe se chegou. */}
                          {doc?.porRever ? (
                            <Text style={styles.docPorRever}>{t('docPorConfirmar')}</Text>
                          ) : null}
                          {/* Um documento enviado e sem data conta como
                          fora de ordem — é o que impede a regra de ser
                          decorativa. Dizê-lo aqui evita que alguém veja
                          "✓ enviado" e conclua que está tratado. */}
                          {enviado && precisaValidade(tp.kind) && !doc?.expiresOn ? (
                            <Text style={[styles.docValidade, styles.docValidadeMa]}>
                              {t('docSemValidade')}
                            </Text>
                          ) : null}
                          {doc?.expiresOn ? (
                            <Text
                              style={[
                                styles.docValidade,
                                doc.expirado && styles.docValidadeMa,
                                doc.aExpirar && styles.docValidadeAviso,
                              ]}
                            >
                              {doc.expirado
                                ? t('docExpired')
                                : doc.aExpirar
                                  ? t('docExpiringSoon')
                                  : `${t('docExpiry')} ${paraMostrar(doc.expiresOn)}`}
                            </Text>
                          ) : null}
                        </View>
                        {/* Sem botão quando o documento está fechado. Não
                              apagado nem cinzento: ausente. Um botão que não
                              faz nada convida a carregar, e obriga a
                              explicar porque é que não fez nada. */}
                        {podeMexer(doc, tp.kind) ? (
                          <Pressable
                            style={[styles.docBtn, enviado && styles.docBtnSecondary]}
                            onPress={() => enviar(tp.kind)}
                            disabled={busy === tp.kind}
                          >
                            <Text
                              style={[styles.docBtnText, enviado && styles.docBtnTextSecondary]}
                            >
                              {busy === tp.kind
                                ? t('docSending')
                                : !enviado
                                  ? t('docSend')
                                  : aprovado
                                    ? t('docRenovar')
                                    : t('docReplace')}
                            </Text>
                          </Pressable>
                        ) : (
                          <View style={styles.docFechadoCaixa}>
                            <Text style={styles.docFechado}>{t('docVerificado')}</Text>
                            <Pressable onPress={() => setAAtualizar(tp.kind)} hitSlop={8}>
                              <Text style={styles.docAtualizarLink}>{t('docAtualizar')}</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {/* A data pede-se ANTES de escolher a fotografia: com o
                      selector de imagens aberto o teclado não cabe, e
                      pedi-la depois obrigaria a repetir tudo se estivesse
                      errada. */}
                      {precisaValidade(tp.kind) && podeMexer(doc, tp.kind) ? (
                        <View style={styles.validadeCaixa}>
                          <TextField
                            label={t('docExpiry')}
                            value={validades[tp.kind] || ''}
                            onChangeText={(v) =>
                              setValidades((a) => ({
                                ...a,
                                // Barras, traços e pontos: quem tem o
                                // cartão na mão copia o que lá está, e o
                                // que lá está tem barras.
                                [tp.kind]: v.replace(/[^\d/\-.]/g, '').slice(0, 10),
                              }))
                            }
                            placeholder="22/12/2026"
                            keyboardType="numbers-and-punctuation"
                          />
                          <Text style={styles.validadeAjuda}>{t('docExpiryHelp')}</Text>
                          {enviado && !doc?.expiresOn ? (
                            <Pressable
                              style={styles.docBtn}
                              onPress={() => guardarData(tp.kind)}
                              disabled={busy === tp.kind}
                            >
                              <Text style={styles.docBtnText}>{t('docGuardarData')}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Text style={[styles.status, completo && styles.statusOk]}>
                {completo ? t('docsComplete') : t('docsIncomplete')}
              </Text>
            </>

            <View style={{ flex: 1, minHeight: spacing.xl }} />
            {/* Os termos de motorista vêm DEPOIS dos documentos, de propósito:
            falam de seguro e de documentos válidos, e aceitá-los antes de
            os entregar seria aceitar no abstracto. */}
            {completo && user?.driverTermsVersion !== VERSAO_TERMOS_MOTORISTA ? (
              <View style={styles.termosCaixa}>
                <Text style={styles.termosTexto}>{t('driverTermsPending')}</Text>
                <View style={{ height: spacing.sm }} />
                <Button
                  title={t('driverTermsRead')}
                  onPress={() => navigation.navigate('Termos', { quem: 'driver', aceitavel: true })}
                />
              </View>
            ) : completo ? (
              <Text style={styles.termosFeitos}>{t('driverTermsDone')}</Text>
            ) : null}

            <View style={{ height: spacing.lg }} />
          </>
        )}
      </ScrollView>

      {/* Escolher o motivo antes de desbloquear.
          O documento só se abre depois de dito porquê — e o motivo segue com
          a fotografia, para o painel poder mostrar "substituído: perdido"
          em vez de só "mudou". */}
      <Modal
        visible={!!aAtualizar}
        transparent
        animationType="slide"
        onRequestClose={() => setAAtualizar(null)}
      >
        <Pressable style={styles.motivoFundo} onPress={() => setAAtualizar(null)} />
        <View style={styles.motivoFolha}>
          <View style={styles.motivoPega} />
          <Text style={styles.motivoTitulo}>{t('docAtualizarTitulo')}</Text>
          <Text style={styles.motivoExplica}>{t('docAtualizarExplica')}</Text>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m}
              style={styles.motivoItem}
              onPress={() => {
                setMotivos((x) => ({ ...x, [aAtualizar]: m }));
                setAAtualizar(null);
              }}
            >
              <Text style={styles.motivoItemTexto}>
                {t('motivo' + m.charAt(0).toUpperCase() + m.slice(1))}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Ver antes de enviar. */}
      <Modal
        visible={!!porConfirmar}
        transparent
        animationType="fade"
        onRequestClose={() => setPorConfirmar(null)}
      >
        <View style={styles.confFundo}>
          <View style={styles.confCaixa}>
            <Text style={styles.confTitulo}>{t('docConfirmarTitulo')}</Text>
            <Text style={styles.confNome}>
              {porConfirmar
                ? t(TIPOS.find((x) => x.kind === porConfirmar.kind)?.label || 'docPhoto')
                : ''}
            </Text>
            {porConfirmar ? (
              <Image
                source={{ uri: `data:${porConfirmar.mime};base64,${porConfirmar.base64}` }}
                style={styles.confImagem}
                resizeMode="contain"
              />
            ) : null}
            {porConfirmar?.expiresOn ? (
              <Text style={styles.confData}>
                {t('docExpiry')} {paraMostrar(porConfirmar.expiresOn)}
              </Text>
            ) : null}
            <Text style={styles.confAviso}>{t('docConfirmarAviso')}</Text>
            <View style={styles.confBotoes}>
              <Pressable style={styles.confRefazer} onPress={() => setPorConfirmar(null)}>
                <Text style={styles.confRefazerTexto}>{t('docConfirmarRefazer')}</Text>
              </Pressable>
              <Pressable style={styles.confEnviar} onPress={confirmarEnvio}>
                <Text style={styles.confEnviarTexto}>{t('docConfirmarEnviar')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    docValidade: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    docValidadeAviso: { color: colors.coralDark, fontWeight: '700' },
    docValidadeMa: { color: colors.danger, fontWeight: '700' },
    validadeCaixa: { marginTop: -spacing.xs, marginBottom: spacing.sm },
    validadeAjuda: { fontSize: 11, color: colors.textMuted, marginTop: -spacing.sm },
    termosCaixa: {
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.coral,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    termosTexto: { ...tipo.corpoForte, color: colors.text },
    termosFeitos: {
      ...tipo.corpoForte,
      color: colors.success,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    scroll: { flexGrow: 1, padding: spacing.lg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    topBarDireita: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    adminLink: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
    },
    adminLinkText: { fontSize: 18, color: colors.teal },
    card: {
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    cardRejected: { backgroundColor: colors.tintaPerigo, borderColor: colors.contornoPerigo },
    cardAprovado: { borderColor: colors.teal },
    icon: { fontSize: 38, marginBottom: spacing.sm },
    title: { ...tipo.titulo, color: colors.text, textAlign: 'center' },
    explain: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 21,
    },
    hint: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    docName: { ...tipo.subtitulo, color: colors.text },
    docState: { ...tipo.legenda, color: colors.textMuted, marginTop: 2 },
    docStateOk: { color: colors.success, fontWeight: '600' },
    docBtn: {
      backgroundColor: colors.coral,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
    },
    docBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.teal },
    docBtnText: { ...tipo.corpoForte, color: colors.white },
    docBtnTextSecondary: { color: colors.teal },
    docFechado: { ...tipo.pequeno, color: colors.teal, paddingHorizontal: spacing.sm },
    docPorRever: { ...tipo.legenda, color: colors.coral },
    docFechadoCaixa: { alignItems: 'flex-end', paddingHorizontal: spacing.sm, gap: 2 },
    docAtualizarLink: { ...tipo.legenda, color: colors.coral, textDecorationLine: 'underline' },
    motivoFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    motivoFolha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    motivoPega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    motivoTitulo: { ...tipo.subtitulo, color: colors.text },
    motivoExplica: { ...tipo.pequeno, color: colors.textMuted, marginBottom: spacing.sm },
    motivoItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    motivoItemTexto: { ...tipo.corpo, color: colors.text },
    confFundo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    confCaixa: {
      backgroundColor: colors.paper,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    confTitulo: { ...tipo.subtitulo, color: colors.text },
    confNome: { ...tipo.corpoForte, color: colors.teal },
    confImagem: {
      width: '100%',
      height: 260,
      borderRadius: radius.md,
      backgroundColor: colors.border,
    },
    confData: { ...tipo.corpoForte, color: colors.text },
    confAviso: { ...tipo.pequeno, color: colors.textMuted },
    confBotoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    confRefazer: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    confRefazerTexto: { ...tipo.corpoForte, color: colors.textMuted },
    confEnviar: {
      flex: 1,
      backgroundColor: colors.coral,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    confEnviarTexto: { ...tipo.corpoForte, color: '#22100A' },
    error: { ...tipo.pequeno, color: colors.danger, marginTop: spacing.sm },
    status: {
      ...tipo.pequeno,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    statusOk: { color: colors.success, fontWeight: '600' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
