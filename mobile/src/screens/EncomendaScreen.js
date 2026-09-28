import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { encolherFoto } from '../lib/encolherFoto.js';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import Cartao from '../design/Cartao.js';
import Quantidade from '../design/Quantidade.js';
import FotosPedido from '../design/FotosPedido.js';
import RodapeMarca from '../design/RodapeMarca.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import EscolherPonto from '../components/EscolherPonto.js';
import { tipo } from '../design/tipografia.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { nomeDoLugar, rotuloCoordenadas } from '../lib/geocode.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';

// ENCOMENDA — o primeiro passo do jastip (20/09/2026).
//
// PORQUE É UM ECRÃ À PARTE, e não mais perguntas no ecrã do preço: uma
// encomenda define-se por coisas que nenhuma viagem pergunta — o que comprar e
// até quanto gastar. E define-se ANTES de haver preço, porque é o teto que
// decide a taxa do serviço.
//
// OS DOIS LUGARES PERGUNTAM-SE AQUI, e é a diferença que mais confunde se
// ficar por explicar: numa encomenda a ORIGEM é a LOJA (é lá que o motorista
// vai comprar) e o DESTINO é onde entregar. Numa viagem normal a origem é
// quem pede; aqui, não.
//
// A LISTA POR LINHAS (21/09/2026), depois da primeira encomenda a sério. O
// Simão viu o problema à primeira: uma caixa de texto solta produz «2 kg de
// arroz e óleo», e o motorista fica a decidir dentro da loja coisas que não
// são dele — que marca, que tamanho, quantos. O que ele decide mal é dinheiro
// dele adiantado, e uma discussão à porta do carro no fim.
//
// Por isso cada artigo tem QUANTOS e O QUÊ, e um detalhe para a marca ou o
// tamanho. E a loja passou a ter NOME além do ponto: um ponto no mapa diz onde
// é, não diz qual é — num mercado de Díli são coisas muito diferentes.

const TETOS = [5, 10, 15, 25, 50];
const dolares = (v) => `$${Number(v || 0).toFixed(2)}`;
const MAX_FOTOS = 2;
const artigoVazio = () => ({
  chave: String(Date.now() + Math.random()),
  nome: '',
  quantos: '1',
  detalhe: '',
});

export default function EncomendaScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [regras, setRegras] = useState(null);
  const [itens, setItens] = useState([artigoVazio()]);
  const [teto, setTeto] = useState(null);
  const [loja, setLoja] = useState('');
  const [lojaPonto, setLojaPonto] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [aApontar, setAApontar] = useState(null); // 'loja' | 'entrega'
  const [aLocalizar, setALocalizar] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .regrasDaEncomenda(token)
      .then((r) => {
        if (!vivo) return;
        setRegras(r);
        // O teto começa no maior que a regra permite dos valores redondos: é
        // o que as pessoas escolhem quase sempre, e baixá-lo é um toque.
        const possiveis = TETOS.filter((v) => v <= r.tetoMax);
        setTeto(possiveis[possiveis.length - 1] ?? r.tetoMax);
      })
      .catch(() => vivo && setRegras({ erro: true }));
    return () => {
      vivo = false;
    };
  }, [token]);

  // A minha localização, para o caso normal: entregar onde estou.
  async function usarAMinhaLocalizacao() {
    setALocalizar(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      const nome = await nomeDoLugar(lat, lng, pos.coords.accuracy, token);
      setEntrega({ lat, lng, label: nome || rotuloCoordenadas(lat, lng) });
    } finally {
      setALocalizar(false);
    }
  }

  // A FOTOGRAFIA TENTA A CÂMARA PRIMEIRO. Quem está a encomendar está quase
  // sempre a olhar para a embalagem vazia que quer repetir; a galeria fica
  // para quem recebeu a fotografia de outra pessoa.
  async function juntarFotografia() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    const r = permissao.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    const pequena = await encolherFoto(r.assets[0].uri, { base64Original: r.assets[0].base64 });
    setFotos((f) => [...f, pequena].slice(0, MAX_FOTOS));
  }

  function mudarArtigo(chave, campo, valor) {
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)));
  }

  const taxa = escalaoDe(regras, teto);
  const maxItens = regras?.maxItens || 15;
  const artigosFeitos = itens.filter((i) => i.nome.trim());
  const podePedir = !!regras && !regras.erro && regras.podePedir;
  // O EMAIL POR CONFIRMAR TEM RESPOSTA PRÓPRIA, e não se mistura com as
  // viagens que faltam: uma resolve-se esperando, a outra resolve-se agora,
  // com um toque no perfil. Dizer as duas com a mesma frase era esconder a
  // que tem solução.
  const faltaEmail = !!regras && !regras.erro && regras.exigeEmail && !regras.emailConfirmado;
  const pronto =
    podePedir && artigosFeitos.length > 0 && teto && loja.trim() && lojaPonto && entrega;

  function continuar() {
    navigation.navigate('RequestRide', {
      jastip: {
        itens: artigosFeitos.map((i) => ({
          nome: i.nome.trim(),
          quantos: Math.max(1, Math.min(99, Number(i.quantos) || 1)),
          detalhe: i.detalhe.trim(),
        })),
        loja: loja.trim(),
        teto,
        fotos: fotos.map((f) => ({ base64: f.base64 })),
      },
      origem: lojaPonto,
      destino: entrega,
    });
  }

  // O QUE FALTA PARA CONTINUAR, dito por baixo do botão (29/09/2026). O botão
  // desligado não dizia porquê, e numa lista de cinco blocos a pessoa ficava
  // a procurar o que se esqueceu. Os nomes são os títulos dos próprios blocos.
  const faltam = [
    !artigosFeitos.length && t('encomendaArtigos'),
    !loja.trim() && t('encomendaLojaNome'),
    !lojaPonto && t('encomendaOndeComprar'),
    !entrega && t('encomendaOndeEntregar'),
  ].filter(Boolean);

  // A DISPOSIÇÃO (29/09/2026): cada pergunta no seu cartão, pela ordem em que
  // se decide — o quê, como é, até quanto, onde comprar, onde entregar — e o
  // botão FIXO em baixo, fora da lista. Antes as secções eram títulos soltos e
  // o botão vivia no fim da lista, onde só se chegava depois de tudo.
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topo}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              style={styles.voltar}
            >
              <Icone nome="voltar" tamanho={22} cor={colors.text} traco={2.4} />
            </Pressable>
            <View style={styles.pastilha}>
              <Icone nome="caixa" tamanho={18} cor={colors.acentoCarry} />
              <Text style={styles.pastilhaTexto}>{t('encomendaTitulo')}</Text>
            </View>
          </View>

          <Text style={styles.titulo}>{t('encomendaTitulo')}</Text>
          <Text style={styles.subtitulo}>{t('encomendaExplica')}</Text>

          {regras == null ? (
            <ActivityIndicator style={styles.roda} color={colors.teal} />
          ) : regras.erro || !regras.ativo ? (
            <View style={styles.estado}>
              <Icone nome="info" tamanho={20} cor={colors.textMuted} />
              <Text style={styles.estadoTexto}>{t('encomendaIndisponivel')}</Text>
            </View>
          ) : (
            <>
              {faltaEmail ? (
                <View style={styles.estado}>
                  <Icone nome="aviso" tamanho={20} cor={colors.coralDark} />
                  <View style={styles.estadoTextos}>
                    <Text style={styles.estadoTexto}>{t('encomendaEmailFalta')}</Text>
                    <Button
                      title={t('encomendaIrPerfil')}
                      variant="ghost"
                      onPress={() => navigation.navigate('Perfil')}
                    />
                  </View>
                </View>
              ) : !podePedir ? (
                <View style={styles.estado} accessibilityRole="text">
                  <Icone nome="aviso" tamanho={20} cor={colors.coralDark} />
                  <FraseComNumeros
                    texto={t('encomendaFaltam', { n: '§n§', feitas: '§f§' })}
                    n={regras.viagensMinimas}
                    feitas={regras.viagensFeitas}
                  />
                </View>
              ) : null}

              <Cartao icone="caixa" titulo={t('encomendaArtigos')}>
                {itens.map((i, n) => (
                  <Artigo
                    key={i.chave}
                    artigo={i}
                    podeRetirar={itens.length > 1}
                    onMudar={(campo, valor) => mudarArtigo(i.chave, campo, valor)}
                    onRetirar={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}
                    numero={n + 1}
                    primeiro={n === 0}
                    t={t}
                  />
                ))}
                {itens.length < maxItens ? (
                  <Button
                    title={t('encomendaJuntarArtigo')}
                    variant="outline"
                    iconeNome="mais"
                    onPress={() => setItens((l) => [...l, artigoVazio()])}
                  />
                ) : (
                  <Text style={styles.nota}>{t('encomendaMaxItens', { n: maxItens })}</Text>
                )}
              </Cartao>

              <Cartao icone="camera" titulo={t('encomendaFoto')}>
                <Text style={styles.nota}>{t('encomendaFotoNota')}</Text>
                <FotosPedido
                  fotos={fotos}
                  max={MAX_FOTOS}
                  onRetirar={(f) => setFotos((l) => l.filter((x) => x.uri !== f.uri))}
                  accoes={[
                    {
                      icone: 'camera',
                      rotulo: t('encomendaFotoJuntar'),
                      onPress: juntarFotografia,
                    },
                  ]}
                  rotuloFoto={t('encomendaFoto')}
                  rotuloRetirar={t('cargaFotoRemover')}
                />
              </Cartao>

              {/* O TETO E A TAXA NUM CARTÃO SÓ: a taxa sai do teto, e lidos
                  juntos vê-se porquê. A taxa vai discreta, à direita — não
                  pode competir com o preço da viagem, que vem no ecrã a seguir. */}
              <Cartao icone="carteira" titulo={t('encomendaTeto')}>
                <Text style={styles.nota}>{t('encomendaTetoNota')}</Text>
                <View style={styles.tetos}>
                  {TETOS.filter((v) => v <= regras.tetoMax).map((v) => {
                    const activo = teto === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setTeto(v)}
                        style={[styles.teto, activo && styles.tetoActivo]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activo }}
                      >
                        {/* O visto, e não só a cor: quem não distingue o
                            teal do cinzento sabe na mesma qual está escolhido. */}
                        {activo ? (
                          <Icone nome="visto" tamanho={14} cor={colors.teal} traco={3} />
                        ) : null}
                        <Text style={[styles.tetoTexto, activo && styles.tetoTextoActivo]}>
                          {dolares(v)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {taxa != null ? (
                  <View style={styles.taxa}>
                    <Icone nome="dinheiro" tamanho={20} cor={colors.teal} />
                    <View style={styles.flex}>
                      <Text style={styles.taxaRotulo}>{t('encomendaTaxaRotulo')}</Text>
                      <Text style={styles.taxaNota}>{t('encomendaTaxaNota')}</Text>
                    </View>
                    <Text style={styles.taxaValor}>{dolares(taxa)}</Text>
                  </View>
                ) : null}
              </Cartao>

              <Cartao icone="loja" titulo={t('encomendaOndeComprar')}>
                <TextField
                  label={t('encomendaLojaNome')}
                  value={loja}
                  onChangeText={setLoja}
                  placeholder={t('encomendaLojaExemplo')}
                  maxLength={80}
                  icone="loja"
                  obrigatorio
                />
                <Text style={styles.rotulo}>{t('encomendaLojaPonto')}</Text>
                <Lugar lugar={lojaPonto} onEscolher={() => setAApontar('loja')} icone="pin" t={t} />
              </Cartao>

              <Cartao icone="casa" titulo={t('encomendaOndeEntregar')}>
                <Lugar
                  lugar={entrega}
                  onEscolher={() => setAApontar('entrega')}
                  icone="casa"
                  t={t}
                />
                <Pressable
                  onPress={usarAMinhaLocalizacao}
                  disabled={aLocalizar}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ busy: aLocalizar }}
                  style={({ pressed }) => [styles.aMinha, pressed && styles.premido]}
                >
                  {aLocalizar ? (
                    <ActivityIndicator size="small" color={colors.teal} />
                  ) : (
                    <Icone nome="pin" tamanho={18} cor={colors.teal} />
                  )}
                  <Text style={styles.aMinhaTexto}>{semPino(t('useMyLocation'))}</Text>
                </Pressable>
              </Cartao>
            </>
          )}

          <RodapeMarca />
        </ScrollView>

        {/* O BOTÃO FIXO, fora da lista. Só aparece quando a encomenda está
            disponível para esta conta: sem isso, um botão que nunca liga
            ficava a ocupar o fundo do ecrã a prometer. */}
        {regras && !regras.erro && regras.ativo ? (
          <View style={styles.rodape}>
            {podePedir && faltam.length ? (
              <Text style={styles.faltam} numberOfLines={2}>
                {t('faltaParaContinuar', { lista: faltam.join(' · ') })}
              </Text>
            ) : null}
            <Button
              title={t('encomendaContinuar')}
              onPress={continuar}
              disabled={!pronto}
              tamanho="grande"
              iconeNomeDireita="seta"
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <EscolherPonto
        visivel={!!aApontar}
        titulo={aApontar === 'loja' ? t('encomendaOndeComprar') : t('encomendaOndeEntregar')}
        onFechar={() => setAApontar(null)}
        onEscolher={(lugar) => {
          if (aApontar === 'loja') setLojaPonto(lugar);
          else setEntrega(lugar);
          setAApontar(null);
        }}
      />
    </SafeAreaView>
  );
}

// O «📍» do princípio de `useMyLocation` sai só aqui: ao lado vai o pino
// desenhado, e dois pinos seguidos diziam a mesma coisa duas vezes. O texto
// fica igual nos dicionários, porque outros ecrãs o mostram tal como está.
const semPino = (s) => String(s).replace(/^📍\s*/, '');

// A frase das viagens que faltam, com os dois números em destaque. O texto
// vem inteiro da tradução, com marcas no lugar dos números; assim a ordem das
// palavras de cada língua não é tocada, e os números ganham peso sem que
// ninguém tenha de voltar a traduzir nada.
function FraseComNumeros({ texto, n, feitas }) {
  const partes = String(texto).split('§');
  return (
    <Text style={styles.estadoTexto}>
      {partes.map((p, i) =>
        p === 'n' ? (
          <Text key={i} style={styles.numeroForte}>
            {n}
          </Text>
        ) : p === 'f' ? (
          <Text key={i} style={[styles.numeroForte, styles.numeroFeitas]}>
            {feitas}
          </Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}

// Uma linha da lista: quantos, o quê, e o detalhe que evita a pergunta.
//
// A QUANTIDADE À ESQUERDA, o nome a ocupar o resto: é a ordem em que a frase
// se diz («dois arrozes»). Os artigos separam-se por um traço, e não cada um
// no seu cartão: são uma lista, e cartões dentro de um cartão liam-se como
// perguntas diferentes.
function Artigo({ artigo, podeRetirar, onMudar, onRetirar, numero, primeiro, t }) {
  return (
    <View style={[styles.artigo, !primeiro && styles.artigoSeguinte]}>
      <View style={styles.artigoTopo}>
        <View style={styles.artigoQuantos}>
          <Text style={styles.rotulo}>{t('encomendaArtigoQuantos')}</Text>
          <Quantidade
            valor={artigo.quantos}
            onMudar={(v) => onMudar('quantos', v)}
            rotulo={`${t('encomendaArtigoQuantos')} ${numero}`}
          />
        </View>
        <View style={styles.artigoNome}>
          <TextField
            label={`${t('encomendaArtigoNome')} ${numero}`}
            value={artigo.nome}
            onChangeText={(v) => onMudar('nome', v)}
            placeholder={t('encomendaArtigoExemplo')}
            maxLength={60}
          />
        </View>
      </View>
      <TextField
        label={t('encomendaArtigoDetalhe')}
        value={artigo.detalhe}
        onChangeText={(v) => onMudar('detalhe', v)}
        placeholder={t('encomendaArtigoDetalheExemplo')}
        maxLength={60}
        icone="lapis"
      />
      {podeRetirar ? (
        <Pressable
          onPress={onRetirar}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.retirarLinha}
        >
          <Icone nome="fechar" tamanho={16} cor={colors.danger} traco={2.6} />
          <Text style={styles.retirar}>{t('encomendaRetirarArtigo')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// O escalão em que este teto cai — a mesma conta que o servidor faz, só para
// mostrar o valor ANTES de pedir. Quem cobra é o servidor.
function escalaoDe(regras, teto) {
  if (!regras || regras.erro || !Array.isArray(regras.escaloes) || teto == null) return null;
  const e =
    regras.escaloes.find((x) => teto <= x.ate) || regras.escaloes[regras.escaloes.length - 1];
  return e ? e.taxa : null;
}

// A LINHA INTEIRA RESPONDE AO TOQUE, e não só a seta: é a forma de um campo,
// e é assim que se lê.
function Lugar({ lugar, onEscolher, icone, t }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.lugar, lugar && styles.lugarPosto, pressed && styles.premido]}
      onPress={onEscolher}
      accessibilityRole="button"
    >
      <Icone nome={icone} tamanho={20} cor={lugar ? colors.teal : colors.textMuted} />
      <Text style={[styles.lugarTexto, !lugar && styles.lugarVazio]} numberOfLines={2}>
        {lugar ? lugar.label : t('lugarDefinir')}
      </Text>
      <Icone nome="seta" tamanho={18} cor={colors.textMuted} traco={2.5} />
    </Pressable>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    voltar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pastilha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.tintaCarry,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    pastilhaTexto: { ...tipo.corpoForte, color: colors.text },
    titulo: { ...tipo.displayPequeno, color: colors.text },
    subtitulo: {
      ...tipo.pequeno,
      color: colors.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    roda: { marginTop: spacing.xl },
    // O ESTADO DA CONTA, num cartão calmo: tinta coral e não vermelho. Faltar
    // viagens não é um erro — é um caminho, e diz-se quanto falta.
    estado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.tintaCoral,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    estadoTextos: { flex: 1, gap: spacing.xs },
    estadoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    numeroForte: { ...tipo.corpoForte, color: colors.text },
    numeroFeitas: { color: colors.coralDark },
    nota: { ...tipo.pequeno, color: colors.textMuted, marginBottom: spacing.sm },
    rotulo: { ...tipo.corpoForte, color: colors.text, marginBottom: spacing.xs },
    artigo: {},
    artigoSeguinte: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    artigoTopo: { flexDirection: 'row', gap: spacing.sm },
    artigoQuantos: { width: 136, marginBottom: spacing.md },
    artigoNome: { flex: 1 },
    retirarLinha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
    },
    retirar: { ...tipo.corpoForte, color: colors.danger },
    tetos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    teto: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tetoActivo: { borderWidth: 2, borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    tetoTexto: { ...tipo.corpoForte, color: colors.textMuted },
    tetoTextoActivo: { color: colors.teal },
    taxa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    taxaRotulo: { ...tipo.corpoForte, color: colors.text },
    taxaNota: { ...tipo.legenda, color: colors.textMuted },
    taxaValor: { ...tipo.corpoForte, color: colors.teal },
    lugar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 54,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    lugarPosto: { borderColor: colors.teal },
    lugarTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    lugarVazio: { color: colors.textMuted },
    aMinha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 44,
      marginTop: spacing.sm,
    },
    aMinhaTexto: { ...tipo.corpoForte, color: colors.teal },
    premido: { opacity: 0.8 },
    rodape: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.paper,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    faltam: {
      ...tipo.legenda,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
