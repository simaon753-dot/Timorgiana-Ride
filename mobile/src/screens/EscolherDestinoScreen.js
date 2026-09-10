import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarraEstado from '../design/BarraEstado.js';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import PlaceSearch from '../components/PlaceSearch.js';
import EscolherPonto from '../components/EscolherPonto.js';
import { FIXOS, lerFixos, guardarFixo, destinosRecentes } from '../lib/lugares.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

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
  const { t } = useI18n();
  const { token } = useAuth();
  const veiculo = route?.params?.veiculo || 'car';

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
    navigation.navigate('RequestRide', { veiculo, ...(destino ? { destino } : {}) });
  }

  async function guardarLugarEm(id, lugar) {
    if (!id) return;
    setFixos(await guardarFixo(id, lugar));
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
        <View style={styles.topo}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={styles.voltar}
          >
            <View style={styles.voltarSeta}>
              <Icone nome="seta" tamanho={20} cor={colors.text} />
            </View>
          </Pressable>
          {/* O VEÍCULO ESCOLHIDO, à vista e não só na memória do programa.
              Quem chega a este ecrã acabou de escolher; quem lá chega
              distraído, ou volta a ele minutos depois, precisa de ver o que
              escolheu antes de dizer para onde vai. */}
          <View style={styles.veiculoEscolhido}>
            <Icone
              nome={veiculo === 'motorbike' ? 'mota' : 'carro'}
              tamanho={18}
              cor={colors.teal}
            />
            <Text style={styles.veiculoTexto}>
              {veiculo === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar')}
            </Text>
          </View>
        </View>

        <Text style={styles.titulo}>{t('whereTo')}</Text>

        <Pressable
          style={({ pressed }) => [styles.barraDestino, pressed && styles.premido]}
          onPress={() => irPara(null)}
          accessibilityRole="button"
        >
          <Icone nome="pin" tamanho={20} cor={colors.tealLight} />
          <Text style={styles.barraTexto}>{t('procurarDestino')}</Text>
          <Icone nome="seta" tamanho={18} cor={colors.textMuted} />
        </Pressable>

        {/* Casa e trabalho. Um toque leva lá; o lápis muda o sítio.
            O lápis existe porque a alternativa era um toque longo — e um
            gesto que ninguém descobre é funcionalidade que não existe. */}
        <View style={styles.lugares}>
          {FIXOS.map((f) => {
            const lugar = fixos[f.id];
            return (
              <Pressable
                key={f.id}
                style={({ pressed }) => [styles.lugar, pressed && styles.premido]}
                onPress={() => (lugar ? irPara(lugar) : setADefinir(f.id))}
                accessibilityRole="button"
              >
                <View style={styles.lugarIcone}>
                  <Icone
                    nome={f.id === 'casa' ? 'casa' : 'carteira'}
                    tamanho={20}
                    cor={colors.teal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lugarNome}>{t(f.chave)}</Text>
                  <Text style={styles.lugarMorada} numberOfLines={1}>
                    {lugar ? lugar.label : t('lugarDefinir')}
                  </Text>
                </View>
                {lugar ? (
                  // `stopPropagation` porque a linha inteira já é um botão que
                  // leva ao sítio. Sem isto, tocar no lápis pedia a viagem em
                  // vez de abrir a edição — e a casa ficava impossível de
                  // mudar depois de definida. Um botão dentro de outro botão
                  // precisa sempre disto; não é um caso especial, é a regra.
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setADefinir(f.id);
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('lugarDefinir')}
                  >
                    <Text style={styles.lugarLapis}>✎</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {recentes.length > 0 ? (
          <>
            <Text style={styles.recentesTitulo}>{t('lugarRecentes')}</Text>
            {recentes.map((r, i) => (
              <Pressable
                key={`${r.lat},${r.lng},${i}`}
                style={({ pressed }) => [styles.recente, pressed && styles.premido]}
                onPress={() => irPara(r)}
                accessibilityRole="button"
              >
                <View style={styles.recenteIcone}>
                  <Icone nome="relogio" tamanho={18} cor={colors.textMuted} />
                </View>
                <Text style={styles.recenteTexto} numberOfLines={1}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={{ flex: 1, minHeight: spacing.xl }} />
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
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },

    topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    voltar: { padding: 2 },
    // A seta do voltar é a mesma do avançar, virada. Um só desenho para as
    // duas direcções — duas figuras separadas divergiam à primeira alteração.
    voltarSeta: { transform: [{ scaleX: -1 }] },
    veiculoEscolhido: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.tintaTeal,
      paddingVertical: 7,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    veiculoTexto: { ...tipo.pequeno, color: colors.teal, fontWeight: '700' },

    titulo: { ...tipo.titulo, color: colors.text, marginBottom: spacing.md },

    barraDestino: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 56,
      ...elevacao.cartao,
    },
    barraTexto: { ...tipo.corpo, color: colors.textMuted, flex: 1 },
    premido: { opacity: 0.6 },

    lugares: { marginTop: spacing.lg, gap: spacing.sm },
    lugar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      padding: spacing.md,
      minHeight: 64,
      ...elevacao.cartao,
    },
    lugarIcone: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lugarNome: { ...tipo.corpo, color: colors.text, fontWeight: '700' },
    lugarMorada: { ...tipo.pequeno, color: colors.textMuted, marginTop: 1 },
    lugarLapis: { fontSize: 17, color: colors.textMuted, paddingHorizontal: 4 },

    recentesTitulo: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    recente: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.xs,
      minHeight: 52,
    },
    recenteIcone: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.paper,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recenteTexto: { ...tipo.corpo, color: colors.text, flex: 1 },

    pesquisaSobreposta: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
