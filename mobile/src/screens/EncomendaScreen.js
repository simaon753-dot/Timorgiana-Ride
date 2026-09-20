import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
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
    setFotos((f) =>
      [...f, { uri: r.assets[0].uri, base64: r.assets[0].base64 }].slice(0, MAX_FOTOS)
    );
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
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
          <View style={styles.aviso}>
            <Icone nome="info" tamanho={18} cor={colors.textMuted} />
            <Text style={styles.avisoTexto}>{t('encomendaIndisponivel')}</Text>
          </View>
        ) : (
          <>
            {faltaEmail ? (
              <View style={styles.aviso}>
                <Icone nome="aviso" tamanho={18} cor={colors.danger} />
                <View style={styles.avisoTextos}>
                  <Text style={styles.avisoTexto}>{t('encomendaEmailFalta')}</Text>
                  <Button
                    title={t('encomendaIrPerfil')}
                    variant="ghost"
                    onPress={() => navigation.navigate('Perfil')}
                  />
                </View>
              </View>
            ) : !podePedir ? (
              <View style={styles.aviso}>
                <Icone nome="aviso" tamanho={18} cor={colors.danger} />
                <Text style={styles.avisoTexto}>
                  {t('encomendaFaltam', {
                    n: regras.viagensMinimas,
                    feitas: regras.viagensFeitas,
                  })}
                </Text>
              </View>
            ) : null}

            <Text style={styles.seccao}>{t('encomendaArtigos')}</Text>
            {itens.map((i, n) => (
              <Artigo
                key={i.chave}
                artigo={i}
                podeRetirar={itens.length > 1}
                onMudar={(campo, valor) => mudarArtigo(i.chave, campo, valor)}
                onRetirar={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}
                numero={n + 1}
                t={t}
              />
            ))}
            {itens.length < maxItens ? (
              <Button
                title={t('encomendaJuntarArtigo')}
                variant="secondary"
                icone="+"
                onPress={() => setItens((l) => [...l, artigoVazio()])}
              />
            ) : (
              <Text style={styles.nota}>{t('encomendaMaxItens', { n: maxItens })}</Text>
            )}

            <Text style={styles.seccao}>{t('encomendaFoto')}</Text>
            <Text style={styles.nota}>{t('encomendaFotoNota')}</Text>
            {fotos.length ? (
              <View style={styles.fotos}>
                {fotos.map((f, n) => (
                  <Pressable
                    key={f.uri}
                    onPress={() => setFotos((l) => l.filter((x) => x.uri !== f.uri))}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('encomendaFoto')} ${n + 1}`}
                  >
                    <Image source={{ uri: f.uri }} style={styles.foto} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {fotos.length < MAX_FOTOS ? (
              <Button
                title={t('encomendaFotoJuntar')}
                variant="secondary"
                icone="📷"
                onPress={juntarFotografia}
              />
            ) : null}

            <Text style={styles.seccao}>{t('encomendaTeto')}</Text>
            <Text style={styles.nota}>{t('encomendaTetoNota')}</Text>
            <View style={styles.tetos}>
              {TETOS.filter((v) => v <= regras.tetoMax).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setTeto(v)}
                  style={[styles.teto, teto === v && styles.tetoActivo]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: teto === v }}
                >
                  <Text style={[styles.tetoTexto, teto === v && styles.tetoTextoActivo]}>
                    {dolares(v)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {taxa != null ? (
              <>
                <Text style={styles.taxa}>{t('encomendaTaxa', { v: dolares(taxa) })}</Text>
                <Text style={styles.nota}>{t('encomendaTaxaNota')}</Text>
              </>
            ) : null}

            <Text style={styles.seccao}>{t('encomendaOndeComprar')}</Text>
            <TextField
              label={t('encomendaLojaNome')}
              value={loja}
              onChangeText={setLoja}
              placeholder={t('encomendaLojaExemplo')}
              maxLength={80}
              obrigatorio
            />
            <Text style={styles.nota}>{t('encomendaLojaPonto')}</Text>
            <Lugar lugar={lojaPonto} onEscolher={() => setAApontar('loja')} icone="pin" t={t} />

            <Text style={styles.seccao}>{t('encomendaOndeEntregar')}</Text>
            <Lugar lugar={entrega} onEscolher={() => setAApontar('entrega')} icone="casa" t={t} />
            <Button
              title={t('useMyLocation')}
              variant="ghost"
              icone="📍"
              loading={aLocalizar}
              onPress={usarAMinhaLocalizacao}
            />

            <Button
              title={t('encomendaContinuar')}
              onPress={continuar}
              disabled={!pronto}
              style={styles.continuar}
            />
          </>
        )}

        <RodapeMarca />
      </ScrollView>

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

// Uma linha da lista: quantos, o quê, e o detalhe que evita a pergunta.
//
// A QUANTIDADE À ESQUERDA e estreita, o nome a ocupar o resto: é a ordem em
// que a frase se diz («dois arrozes»), e a caixa pequena diz sozinha que ali
// vai um número e não uma descrição.
function Artigo({ artigo, podeRetirar, onMudar, onRetirar, numero, t }) {
  return (
    <View style={styles.artigo}>
      <View style={styles.artigoTopo}>
        <View style={styles.artigoQuantos}>
          <TextField
            label={t('encomendaArtigoQuantos')}
            value={String(artigo.quantos)}
            onChangeText={(v) => onMudar('quantos', v.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
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
      />
      {podeRetirar ? (
        <Pressable onPress={onRetirar} hitSlop={8} accessibilityRole="button">
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

function Lugar({ lugar, onEscolher, icone, t }) {
  return (
    <Pressable style={styles.lugar} onPress={onEscolher} accessibilityRole="button">
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
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
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
    titulo: { ...tipo.display, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
    roda: { marginTop: spacing.xl },
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    avisoTextos: { flex: 1, gap: spacing.xs },
    avisoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    seccao: {
      ...tipo.subtitulo,
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    nota: { ...tipo.legenda, color: colors.textMuted, marginBottom: spacing.sm },
    // Cada artigo num cartão: com as caixas soltas umas debaixo das outras,
    // cinco artigos liam-se como quinze campos sem princípio nem fim.
    artigo: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    artigoTopo: { flexDirection: 'row', gap: spacing.sm },
    artigoQuantos: { width: 92 },
    artigoNome: { flex: 1 },
    retirar: { ...tipo.corpoForte, color: colors.danger, marginTop: spacing.xs },
    fotos: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    foto: { width: 96, height: 96, borderRadius: radius.md },
    tetos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    teto: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.border,
    },
    tetoActivo: { borderColor: colors.acentoCarry, backgroundColor: colors.tintaCarry },
    tetoTexto: { ...tipo.corpoForte, color: colors.textMuted },
    tetoTextoActivo: { color: colors.text },
    taxa: { ...tipo.corpoForte, color: colors.text, marginTop: spacing.md },
    lugar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    lugarTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    lugarVazio: { color: colors.textMuted },
    continuar: { marginTop: spacing.xl },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
