import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import { nomeDoVeiculo, veiculo as tipoDoVeiculo } from '../dados/tiposDeVeiculo.js';
import { tipo } from '../design/tipografia.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherPonto from '../components/EscolherPonto.js';
import {
  FIXOS,
  lerFixos,
  guardarFixo,
  destinosRecentes,
  esconderRecente,
  esconderTodosRecentes,
} from '../lib/lugares.js';
import RodapeMarca from '../design/RodapeMarca.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, elevacao, registarEstilos, paletaEmUso } from '../theme.js';

// A costa de Díli com o Cristo Rei, recortada da referência do Simão — a
// mesma do ecrã inicial.
const DILI = require('../../assets/entrada/dili.webp');

// PARA ONDE VAI — o segundo passo de pedir uma viagem.
//
// PORQUE EXISTE COMO ECRÃ PRÓPRIO. Isto vivia todo no ecrã inicial: a
// saudação, a barra de procura, a casa, o trabalho e os recentes, tudo numa
// página. O Simão pediu para separar o pedido em dois passos — primeiro o
// veículo, depois o destino —, e um passo que é um ecrã tem uma coisa que um
// bloco no meio de outro ecrã não tem: um botão de voltar que funciona.
//
// Quem escolheu a mota por engano carrega em voltar e escolhe o carro. Se
// isto fosse um estado dentro do ecrã inicial, o botão de voltar do Android
// saía da aplicação — e é o gesto que toda a gente faz primeiro.
//
// O VEÍCULO VEM NO CAMINHO e não num sítio à parte, porque é uma escolha em
// curso e não uma preferência guardada. Quem sai daqui a meio não deixou nada
// decidido; da próxima vez volta a escolher, que é o correcto — hoje pode
// querer mota e amanhã carro.
export default function EscolherDestinoScreen({ navigation, route }) {
  // A pesquisa sobreposta é uma camada absoluta e não herda o espaço da
  // moldura segura: sem isto a barra ficava por cima das horas (16/09/2026).
  const margensEcra = useSafeAreaInsets();
  const { t } = useI18n();
  const { token } = useAuth();
  const veiculo = route?.params?.veiculo || 'car';
  // No Carry, o que se escolheu transportar no passo anterior (bens ou
  // pessoas). Segue para o ecrã seguinte, que abre já no fluxo certo.
  const modoCarry = route?.params?.modoCarry || null;

  const [fixos, setFixos] = useState({});
  const [recentes, setRecentes] = useState([]);
  const [aDefinir, setADefinir] = useState(null);
  const [aApontar, setAApontar] = useState(null);

  // Recarrega ao voltar a este ecrã: um destino acabado de usar tem de
  // aparecer nos recentes sem obrigar a reabrir a aplicação.
  useEffect(() => {
    const actualizar = () => {
      lerFixos().then(setFixos);
      destinosRecentes(token).then(setRecentes);
    };
    actualizar();
    return navigation.addListener('focus', actualizar);
  }, [navigation, token]);

  // O VEÍCULO SEGUE COM O DESTINO. Sem isto, o ecrã seguinte não saberia o
  // que a pessoa escolheu no primeiro passo e ela teria de o dizer outra vez
  // — que é exactamente o passo a mais que separar os ecrãs devia evitar.
  function irPara(destino) {
    navigation.navigate('RequestRide', {
      veiculo,
      ...(modoCarry ? { modoCarry } : {}),
      ...(destino ? { destino } : {}),
    });
  }

  async function guardarLugarEm(id, lugar) {
    if (!id) return;
    setFixos(await guardarFixo(id, lugar));
  }

  // Esconde a sugestão e tira-a já do ecrã, sem esperar pela releitura do
  // histórico: quem toca no ✕ quer ver aquilo desaparecer nesse instante.
  async function removerRecente(label) {
    setRecentes((lista) => lista.filter((r) => r.label !== label));
    await esconderRecente(label);
    destinosRecentes(token).then(setRecentes);
  }

  async function limparRecentes() {
    setRecentes([]);
    await esconderTodosRecentes(token);
  }

  async function guardarLugar(lugar) {
    const id = aDefinir;
    setADefinir(null);
    await guardarLugarEm(id, lugar);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* O CABEÇALHO DA REFERÊNCIA: voltar redondo, o veículo escolhido numa
            pastilha, a pergunta grande, e Díli por trás, encostada à direita
            — a mesma ilustração do ecrã inicial, para os dois passos se lerem
            como um só pedido. A imagem vem PRIMEIRO para ficar por baixo. */}
        <View style={styles.heroi}>
          <Image
            source={DILI}
            style={styles.dili}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
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
            {/* O VEÍCULO ESCOLHIDO, à vista e não só na memória do programa:
                quem lá chega distraído, ou volta minutos depois, precisa de
                ver o que escolheu antes de dizer para onde vai. No Carry, vai
                também o que se escolheu transportar. */}
            <View style={styles.veiculoEscolhido}>
              <Icone nome={tipoDoVeiculo(veiculo).icone} tamanho={18} cor={colors.teal} />
              <Text style={styles.veiculoTexto}>
                {nomeDoVeiculo(t, veiculo)}
                {modoCarry
                  ? ` · ${t(modoCarry === 'pessoas' ? 'carryModoPessoas' : 'carryModoBens')}`
                  : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.titulo}>{t('whereTo')}</Text>
          <Text style={styles.subtitulo}>{t('destinoSub')}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cartao, styles.cartaoProcura, pressed && styles.premido]}
          onPress={() => irPara(null)}
          accessibilityRole="button"
        >
          <Icone nome="pin" tamanho={30} cor={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={styles.procuraTitulo}>{t('procurarDestino')}</Text>
            <Text style={styles.procuraSub}>{t('procurarDestinoSub')}</Text>
          </View>
          <Icone nome="seta" tamanho={20} cor={colors.text} traco={2.4} />
        </Pressable>

        {/* Casa e trabalho. Um toque leva lá; o lápis muda o sítio.
            O lápis existe porque a alternativa era um toque longo — e um
            gesto que ninguém descobre é funcionalidade que não existe. */}
        {FIXOS.map((f) => {
          const lugar = fixos[f.id];
          return (
            <Pressable
              key={f.id}
              style={({ pressed }) => [styles.cartao, pressed && styles.premido]}
              onPress={() => (lugar ? irPara(lugar) : setADefinir(f.id))}
              accessibilityRole="button"
            >
              {/* O ícone é o emoji de `FIXOS` — 🏠 e 💼 dizem casa e trabalho
                  melhor do que qualquer desenho que eu escolhesse. Sozinho,
                  sem disco por trás. */}
              <Text style={styles.lugarIcone}>{f.icone}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.lugarNome}>{t(f.chave)}</Text>
                <Text style={styles.lugarMorada} numberOfLines={1}>
                  {lugar ? lugar.label : t('lugarDefinir')}
                </Text>
              </View>
              {lugar ? (
                // `stopPropagation` porque a linha inteira já é um botão que
                // leva ao sítio: sem isto, tocar no lápis pedia a viagem em vez
                // de abrir a edição. Um botão dentro de outro botão precisa
                // sempre disto; não é um caso especial, é a regra.
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setADefinir(f.id);
                  }}
                  hitSlop={8}
                  style={styles.lapis}
                  accessibilityRole="button"
                  accessibilityLabel={t('lugarDefinir')}
                >
                  <Icone nome="lapis" tamanho={20} cor={colors.text} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}

        {recentes.length > 0 ? (
          <>
            <View style={styles.recentesTopo}>
              <Icone nome="relogio" tamanho={20} cor={colors.textMuted} />
              <Text style={styles.recentesTitulo}>{t('lugarRecentes')}</Text>
              <Pressable
                onPress={limparRecentes}
                hitSlop={10}
                accessibilityRole="button"
                style={styles.limpar}
              >
                <Text style={styles.limparTexto}>{t('limparTudo')}</Text>
              </Pressable>
            </View>
            {recentes.map((r, i) => (
              <Pressable
                key={`${r.lat},${r.lng},${i}`}
                style={({ pressed }) => [styles.cartao, pressed && styles.premido]}
                onPress={() => irPara(r)}
                accessibilityRole="button"
              >
                <Icone nome="relogio" tamanho={24} cor={colors.teal} />
                <Text style={styles.recenteTexto} numberOfLines={2}>
                  {r.label}
                </Text>
                {/* TIRAR DA LISTA — e não apagar a viagem. Os recentes são
                    calculados do histórico; a viagem aconteceu e fica. O que
                    sai daqui é a sugestão. `stopPropagation` pela mesma regra
                    do lápis. */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    removerRecente(r.label);
                  }}
                  hitSlop={10}
                  style={styles.lapis}
                  accessibilityRole="button"
                  accessibilityLabel={t('removerRecente')}
                >
                  <Icone nome="fechar" tamanho={20} cor={colors.textMuted} />
                </Pressable>
              </Pressable>
            ))}
          </>
        ) : null}

        <RodapeMarca />
      </ScrollView>

      <EscolherPonto
        visivel={!!aApontar}
        titulo={t(FIXOS.find((f) => f.id === aApontar)?.chave || 'lugarDefinir')}
        onFechar={() => setAApontar(null)}
        onEscolher={(lugar) => {
          const qual = aApontar;
          setAApontar(null);
          if (qual) guardarLugarEm(qual, lugar);
        }}
      />

      {aDefinir ? (
        <View style={styles.pesquisaSobreposta}>
          <PlaceSearch
            margemTopo={margensEcra.top}
            placeholder={t(FIXOS.find((f) => f.id === aDefinir)?.chave)}
            onEscolher={guardarLugar}
            onFechar={() => setADefinir(null)}
            rotuloMapa={t('escolherNoMapa')}
            onEscolherNoMapa={() => {
              // Guarda-se QUAL se estava a definir antes de fechar a
              // pesquisa: fechá-la limpa o `aDefinir`, e sem isto o mapa
              // abria sem saber se era a casa ou o trabalho.
              setAApontar(aDefinir);
              setADefinir(null);
            }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

    heroi: { minHeight: 200, marginBottom: spacing.md },
    // No escuro o céu claro da ilustração lia-se como um rectângulo; mais
    // transparente, fica paisagem de fundo.
    dili: {
      position: 'absolute',
      top: -spacing.sm,
      right: -spacing.lg,
      width: '72%',
      aspectRatio: 914 / 506,
      opacity: paletaEmUso() === 'escuro' ? 0.5 : 1,
    },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    voltar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevacao.plana,
    },
    veiculoEscolhido: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.tintaTeal,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    // corpoForte e não pequeno + fontWeight: pedir negrito a uma família que
    // não o tem faz o Android cair numa letra de substituição.
    veiculoTexto: { ...tipo.corpoForte, color: colors.teal },
    titulo: { ...tipo.display, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },

    cartao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 72,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      ...elevacao.plana,
    },
    cartaoProcura: { minHeight: 84, marginBottom: spacing.md },
    procuraTitulo: { ...tipo.subtitulo, color: colors.text },
    procuraSub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    premido: { opacity: 0.7 },
    lugarIcone: { fontSize: 26, width: 32, textAlign: 'center' },
    lugarNome: { ...tipo.corpoForte, color: colors.text },
    lugarMorada: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    // O lápis e o ✕ num círculo: são botões, e o círculo é o alvo do dedo.
    lapis: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.paper,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentesTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    recentesTitulo: { ...tipo.etiqueta, color: colors.textMuted, flex: 1 },
    limpar: { minHeight: 36, justifyContent: 'center' },
    limparTexto: { ...tipo.corpoForte, color: colors.teal },
    recenteTexto: { ...tipo.corpoForte, color: colors.text, flex: 1 },

    // A pesquisa cobre o ecrã enquanto se define um lugar. Sem isto ficava
    // atrás do conteúdo e a lista de resultados era inalcançável.
    pesquisaSobreposta: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.paper,
      zIndex: 10,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
