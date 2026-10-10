import React, { useEffect, useState, useCallback } from 'react';
import { VEICULOS } from '../dados/tiposDeVeiculo.js';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { encolherFoto } from '../lib/encolherFoto.js';
import Button from '../components/Button.js';
import LanguageToggle from '../components/LanguageToggle.js';
import TextField from '../components/TextField.js';
import FormularioVeiculo from '../components/FormularioVeiculo.js';
import { urlModeloDeclaracao } from '../design/EscolherTitularidade.js';
import Voltar from '../components/Voltar.js';
import { VERSAO_TERMOS_MOTORISTA } from '../termos/index.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paraISO, paraMostrar } from '../lib/datas.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo, FAMILIAS } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import Etapas from '../design/Etapas.js';

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
  // O VERSO DA CARTA (14/09/26): é lá que estão as categorias — mota pequena ou
  // grande, carro, pickup. Sem ele, quem aprova não sabe se a pessoa pode
  // conduzir o veículo que registou. Obrigatório; sem data (a validade está na
  // frente).
  { kind: 'cartaverso', label: 'docCartaverso', nota: 'docCartaversoNota' },
  { kind: 'vehicle', label: 'docVehicle' },
  // Kartaun Inspesaun. Obrigatório em Timor-Leste, válido um ano, e conduzir
  // com ele caducado dá multa a dobrar se a polícia de trânsito mandar
  // parar. Entrou em 02/09/2026.
  { kind: 'inspection', label: 'docInspection' },
  // O CERTIFICADO DE REGISTO CRIMINAL (09/10/2026). Obrigatório para um
  // registo novo; a quem já está aprovado fica pedido, sem o parar.
  { kind: 'registocriminal', label: 'docRegistocriminal', nota: 'docRegistocriminalNota' },
  // A fotografia do Carry, com a matrícula à vista (14/09/26). Opcional, sem
  // validade, e só para quem conduz um Carry: é ela que mostra ao
  // administrador o tamanho real da caixa que o motorista declarou.
  { kind: 'fotoveiculo', label: 'docFotoveiculo', soCarry: true },
  // AS QUATRO FOTOGRAFIAS DO VEÍCULO (04/10/2026), sempre pela CÂMARA — uma
  // da galeria pode ser de outro carro, de outro dia. Contam para o registo
  // novo estar completo; a quem já está aprovado ficam pedidas, sem o parar.
  { kind: 'veiculofrente', label: 'docVeiculofrente', nota: 'docVeiculoMatricula', camera: true },
  { kind: 'veiculotras', label: 'docVeiculotras', nota: 'docVeiculoMatricula', camera: true },
  { kind: 'veiculoesquerda', label: 'docVeiculoesquerda', camera: true },
  { kind: 'veiculodireita', label: 'docVeiculodireita', camera: true },
  // VEÍCULO DE TERCEIRO (10/10/2026): só a quem disse, no registo, que o
  // veículo é de outra pessoa (user.vehicle.proprio === false). Obrigatórios
  // para esse registo — e, no servidor, também para trabalhar.
  {
    kind: 'idproprietario',
    label: 'docIdproprietario',
    nota: 'docIdproprietarioNota',
    soTerceiro: true,
  },
  {
    kind: 'autorizacaoproprietario',
    label: 'docAutorizacaoproprietario',
    nota: 'docAutorizacaoproprietarioNota',
    soTerceiro: true,
    modelo: true,
  },
  // O CARTÃO DO SEGURO (10/10/2026): OPCIONAL por agora, com validade. Quem o
  // envia ganha o selo «Seguro ✓» que o passageiro vê; passa a obrigatório
  // numa data que o Simão fixará (backend/src/documents.js, SEGURO).
  { kind: 'seguro', label: 'docSeguro', nota: 'docSeguroNota', opcional: true },
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
  //
  // 4. O painel pediu a correção DESTE documento (04/10/2026). Quem aprova já
  //    disse o que está mal; obrigar a escolher um motivo por cima seria
  //    perguntar o que já se sabe.
  function podeMexer(doc, kind) {
    if (!aprovado) return true;
    if (!doc) return true;
    if (doc.correcao) return true;
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

  // Enquanto espera, verifica de tempos a tempos se já foi decidido — e se
  // alguém pediu a correção de um documento (04/10/2026), que só se vê na
  // lista. Não usamos socket aqui: o motorista por aprovar nem entra nas
  // salas. Quem já está aprovado e só veio ver os papéis não precisa disto.
  useEffect(() => {
    if (aprovado) return;
    const id = setInterval(() => {
      refreshUser();
      carregar();
    }, 20000);
    return () => clearInterval(id);
  }, [refreshUser, carregar, aprovado]);

  // Ao voltar a este ecrã (de uma notificação, dos termos), a lista fresca.
  // A conta também: a decisão pode ter mudado desde a última vez.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        carregar();
        refreshUser();
      }),
    [navigation, carregar, refreshUser]
  );

  // A fotografia do motorista não caduca; tudo o resto sim. Não se pergunta
  // uma data que não existe.
  function precisaValidade(kind) {
    return (
      kind !== 'photo' &&
      kind !== 'identity' &&
      kind !== 'fotoveiculo' &&
      kind !== 'cartaverso' &&
      // Os papéis do proprietário (10/10/2026) não têm validade a pedir.
      kind !== 'idproprietario' &&
      kind !== 'autorizacaoproprietario' &&
      !TIPOS.find((tp) => tp.kind === kind)?.camera
    );
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
    // As fotografias do veículo só pela câmara de trás; o resto, da galeria.
    const pelaCamera = !!TIPOS.find((tp) => tp.kind === kind)?.camera;
    const perm = pelaCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted)
      return setError(t(pelaCamera ? 'errCameraPermission' : 'errPermissionPhotos'));

    const opcoes = {
      mediaTypes: ['images'],
      quality: 0.6, // comprime: os documentos não precisam de qualidade máxima
      base64: true,
    };
    const res = pelaCamera
      ? await ImagePicker.launchCameraAsync({ ...opcoes, cameraType: ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync(opcoes);
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
    // Encolhida aqui, antes de entrar em memória: a partir deste ponto ela é
    // copiada mais duas vezes (o JSON do pedido e a pré-visualização).
    const pequena = await encolherFoto(res.assets[0].uri, {
      base64Original: res.assets[0].base64,
    });
    setPorConfirmar({
      kind,
      mime: 'image/jpeg',
      base64: pequena.base64,
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
  // Os OBRIGATÓRIOS: a fotografia do Carry é opcional e só para o Carry.
  // Com ela na conta, ninguém ficava «completo» — e a frase de baixo dizia
  // «Faltam documentos» a motoristas aprovados com tudo entregue.
  // As fotografias do veículo contam para quem ainda se está a registar; a
  // quem já foi aprovado não se exige o que não existia quando se registou.
  const deTerceiro = user?.vehicle?.proprio === false;
  const completo = TIPOS.filter(
    (tp) =>
      !tp.soCarry && !tp.opcional && (!aprovado || !tp.camera) && (!tp.soTerceiro || deTerceiro)
  ).every((tp) => enviados.includes(tp.kind));
  const termosOk = user?.driverTermsVersion === VERSAO_TERMOS_MOTORISTA;
  const aCorrigir = docs.filter((d) => d.correcao);

  // O ESTADO DO REGISTO, em palavras de quem o vive (04/10/2026). Antes eram
  // três: recusado, aprovado, e «em análise» para tudo o resto — incluindo
  // quem estava SUSPENSO, que lia «conta em análise» sem perceber porquê, e
  // quem ainda não tinha enviado nada, a quem ninguém estava a analisar.
  const suspenso = user?.driverStatus === 'suspended';
  const estado = suspenso
    ? 'suspenso'
    : rejected
      ? 'recusado'
      : aCorrigir.length
        ? 'correcao'
        : aprovado
          ? 'aprovado'
          : !completo || !termosOk
            ? 'incompleto'
            : 'analise';
  const ESTADOS = {
    incompleto: { icone: '📝', titulo: 'regIncompletoTitulo', texto: 'regIncompletoTexto' },
    analise: { icone: '⏳', titulo: 'pendingTitle', texto: 'regAnaliseTexto' },
    correcao: { icone: '✏️', titulo: 'regCorrecaoTitulo', texto: 'regCorrecaoTexto' },
    aprovado: { icone: '✓', titulo: 'approvedTitle', texto: 'approvedExplain' },
    recusado: { icone: '⛔', titulo: 'rejectedTitle', texto: 'regRecusadoTexto' },
    suspenso: { icone: '⏸', titulo: 'regSuspensoTitulo', texto: 'regSuspensoTexto' },
  };
  const e = ESTADOS[estado];
  // Em que passo vai, para quem ainda não foi aprovado: veículo (já feito,
  // senão estaria no formulário), documentos, termos, análise.
  const passo = !completo ? 1 : !termosOk ? 2 : 3;

  // VOLTAR A PEDIR A ANÁLISE depois de uma recusa. Corrigir os documentos não
  // bastava: a conta ficava «recusada», na lista dos recusados, e ninguém no
  // painel sabia que havia papéis novos para ver.
  const [aReenviar, setAReenviar] = useState(false);
  async function reenviar() {
    setError(null);
    setAReenviar(true);
    try {
      await api.reenviarRegisto(token);
      await refreshUser();
    } catch (err) {
      setError(err?.message === 'NETWORK' ? t('errNetwork') : err?.message || t('errGeneric'));
    } finally {
      setAReenviar(false);
    }
  }

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
            <Text style={styles.cabecalho}>{t('regEstadoTitulo')}</Text>
            <View
              style={[
                styles.card,
                (estado === 'recusado' || estado === 'suspenso') && styles.cardRejected,
                estado === 'aprovado' && styles.cardAprovado,
              ]}
            >
              <Text style={styles.icon}>{e.icone}</Text>
              <Text style={styles.title}>{t(e.titulo)}</Text>
              <Text style={styles.explain}>
                {estado === 'correcao' ? t(e.texto, { n: aCorrigir.length }) : t(e.texto)}
              </Text>
              {/* O MOTIVO, que existia no servidor e nunca chegava aqui:
                  quem era recusado lia «não aprovada» e tinha de telefonar
                  para saber porquê. */}
              {(estado === 'recusado' || estado === 'suspenso') && user?.driverStatusMotivo ? (
                <View style={styles.motivoCaixa}>
                  <Text style={styles.motivoRotulo}>{t('regMotivo')}</Text>
                  <Text style={styles.motivoTexto}>{user.driverStatusMotivo}</Text>
                </View>
              ) : null}
            </View>

            {estado === 'incompleto' || estado === 'analise' || estado === 'correcao' ? (
              <View style={styles.etapas}>
                <Etapas
                  etapas={[
                    t('regEtapaVeiculo'),
                    t('regEtapaDocumentos'),
                    t('regEtapaTermos'),
                    t('regEtapaAnalise'),
                  ]}
                  actual={estado === 'correcao' ? 1 : passo}
                />
              </View>
            ) : null}

            {/* A LISTA APARECE SEMPRE, incluindo a quem foi recusado.
                Antes, um motorista recusado lia que não foi aprovado e não
                via documento nenhum — sem nada que pudesse corrigir. Era um
                beco sem saída que só se resolvia por telefone. */}
            <>
              <Text style={styles.hint}>
                {aprovado && !aCorrigir.length ? t('docHintAprovado') : t('docHint')}
              </Text>

              {loading ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
              ) : (
                TIPOS.filter(
                  // A fotografia única do Carry (14/09) deu lugar às quatro:
                  // só aparece a quem já a tinha enviado.
                  (tp) =>
                    (!tp.soTerceiro || deTerceiro) &&
                    (!tp.soCarry ||
                      (VEICULOS[user?.vehicle?.type]?.perguntaCarga && enviados.includes(tp.kind)))
                ).map((tp) => {
                  const enviado = enviados.includes(tp.kind);
                  const doc = docs.find((d) => d.kind === tp.kind);
                  return (
                    <View key={tp.kind}>
                      <View style={styles.docRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docName}>
                            {t(tp.label)}
                            {tp.opcional ? (
                              <Text style={styles.docOpcional}> · {t('docOpcional')}</Text>
                            ) : null}
                          </Text>
                          {tp.nota ? <Text style={styles.docNota}>{t(tp.nota)}</Text> : null}
                          {/* O modelo da declaração, para levar ao dono e
                              assinar (10/10/2026). */}
                          {tp.modelo ? (
                            <Pressable
                              onPress={() => Linking.openURL(urlModeloDeclaracao())}
                              hitSlop={8}
                              accessibilityRole="link"
                            >
                              <Text style={styles.docModelo}>{t('vVerModelo')}</Text>
                            </Pressable>
                          ) : null}
                          <Text style={[styles.docState, enviado && styles.docStateOk]}>
                            {enviado ? `✓ ${t('docSent')}` : t('docMissing')}
                          </Text>
                          {/* A correção pedida pelo painel, com o motivo
                          escrito por quem aprova. É a frase que diz o que
                          fazer — sem ela, o documento parecia aceite. */}
                          {doc?.correcao ? (
                            <View style={styles.docCorrecao}>
                              <Text style={styles.docCorrecaoRotulo}>{t('docCorrigir')}</Text>
                              <Text style={styles.docCorrecaoTexto}>{doc.correcao}</Text>
                            </View>
                          ) : null}
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
                                  : doc?.correcao
                                    ? t('docEnviarDeNovo')
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

              {/* «Aguarda a nossa análise» só a quem está mesmo à espera: a um
                  motorista aprovado, recusado ou com correções seria falso. */}
              {!completo || estado === 'analise' ? (
                <Text style={[styles.status, completo && styles.statusOk]}>
                  {completo ? t('docsComplete') : t('docsIncomplete')}
                </Text>
              ) : null}

              {/* Recusado, com tudo entregue e os termos aceites: o pedido de
                  nova análise. Antes disso o botão não aparece — reenviar com
                  um papel em falta era voltar a ser recusado. */}
              {estado === 'recusado' && completo && termosOk ? (
                <View style={styles.reenviarCaixa}>
                  <Text style={styles.reenviarTexto}>{t('regReenviarExplica')}</Text>
                  <Button
                    title={t('regReenviar')}
                    onPress={reenviar}
                    loading={aReenviar}
                    disabled={aReenviar}
                  />
                </View>
              ) : null}
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
    cabecalho: { ...tipo.etiqueta, color: colors.textMuted, marginBottom: spacing.sm },
    motivoCaixa: {
      alignSelf: 'stretch',
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    motivoRotulo: { ...tipo.legenda, color: colors.textMuted },
    motivoTexto: { ...tipo.corpoForte, color: colors.text, marginTop: 2 },
    etapas: { marginTop: spacing.lg },
    docCorrecao: {
      backgroundColor: colors.tintaPerigo,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginTop: spacing.xs,
      marginRight: spacing.sm,
    },
    docCorrecaoRotulo: { ...tipo.legenda, fontFamily: FAMILIAS.forte, color: colors.danger },
    docCorrecaoTexto: { ...tipo.legenda, color: colors.text, marginTop: 1 },
    reenviarCaixa: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    reenviarTexto: { ...tipo.pequeno, color: colors.text },
    cardAprovado: { borderColor: colors.teal },
    icon: { fontSize: 30, marginBottom: spacing.sm },
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
    docNota: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    docOpcional: { ...tipo.legenda, color: colors.teal },
    docModelo: {
      ...tipo.pequeno,
      color: colors.teal,
      textDecorationLine: 'underline',
      marginTop: 4,
      paddingVertical: 4,
    },
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
