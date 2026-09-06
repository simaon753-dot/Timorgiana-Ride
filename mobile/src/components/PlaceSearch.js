import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { pesquisarLugares } from '../lib/geocode.js';
import { lerRecentes, guardarRecente } from '../lib/recentes.js';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Caixa de pesquisa com resultados, a flutuar POR CIMA do mapa.
//
// O mapa fica visível de propósito: quem procura "Farol" quer perceber
// onde isso fica em relação a si, e um ecrã branco por cima do mapa
// esconde justamente a informação que ajuda a decidir.
//
// Os resultados ficam LOGO POR BAIXO da barra, encostados ao topo. A
// primeira versão punha-os em baixo e o teclado tapava-os — o teclado sobe
// sempre do fundo, por isso o fundo é o pior sítio para pôr o que a pessoa
// precisa de ler enquanto escreve. Por baixo fica o mapa, e o espaço
// transparente deixa passar o toque: dá para escolher um ponto no mapa sem
// fechar a pesquisa primeiro.
//
// A consulta só parte quando a pessoa pára de escrever: o Nominatim pede
// no máximo cerca de um pedido por segundo, e disparar a cada tecla seria
// abusivo e mais lento.
export default function PlaceSearch({
  placeholder,
  onEscolher,
  onFechar,
  onUsarLocalizacao,
  onEscolherNoMapa,
  rotuloMapa,
}) {
  const { t } = useI18n();
  const { token, user } = useAuth();
  const [termo, setTermo] = useState('');
  const [recentes, setRecentes] = useState([]);
  // FECHADO POR OMISSÃO, e por baixo está o mapa.
  //
  // A lista aberta tapava ruas que ajudam a decidir — foi o que o Simão
  // pediu para resolver. Fechada é uma linha só; quem a quiser abre-a.
  //
  // Não se guarda o estado entre aberturas de propósito: o valor de a fechar
  // é o mapa ficar à vista, e uma lista que se lembra de estar aberta
  // desfazia isso ao fim de duas utilizações sem ninguém perceber porquê.
  const [recentesAbertos, setRecentesAbertos] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [procurou, setProcurou] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    lerRecentes(user?.id).then((r) => vivo && setRecentes(r));
    return () => {
      vivo = false;
    };
  }, [user?.id]);

  // Guarda o sítio e devolve-o a quem nos chamou. Guarda-se ANTES de sair
  // porque este componente desaparece a seguir — a seguir já não há quem
  // guarde nada.
  function escolher(lugar) {
    guardarRecente(user?.id, lugar);
    onEscolher(lugar);
  }

  // Escrever fecha a lista. Sem isto, quem abrisse os recentes, escrevesse
  // três letras e apagasse, encontrava-os abertos outra vez — e o mapa
  // tapado sem ter pedido nada.
  useEffect(() => {
    if (termo.trim().length >= 3 && recentesAbertos) setRecentesAbertos(false);
  }, [termo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (termo.trim().length < 3) {
      setResultados([]);
      setProcurou(false);
      return;
    }
    setAProcurar(true);
    const temporizador = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const rs = await pesquisarLugares(termo, ctrl.signal, token);
      setResultados(rs);
      setProcurou(true);
      setAProcurar(false);
    }, 600);

    return () => clearTimeout(temporizador);
  }, [termo]);

  // O que faz a lista valer a pena ser desenhada.
  //
  // Faltava aqui o "escolher no mapa", e isso explicava uma assimetria que
  // parecia não ter explicação: na RECOLHA funcionava, no DESTINO não.
  //
  // A razão é que "usar a minha localização" só é passado na recolha. Com o
  // campo vazio, era a única coisa que fazia a lista aparecer — e o botão do
  // mapa, que eu tinha posto lá dentro, ia com ela. No destino a lista nunca
  // chegava a ser desenhada.
  //
  // Acrescentei uma linha dentro de uma caixa sem confirmar o que faz a caixa
  // aparecer.
  const aMostrarRecentes = termo.trim().length < 3 && recentes.length > 0;
  const temAlgoParaMostrar =
    aProcurar ||
    resultados.length > 0 ||
    procurou ||
    (onUsarLocalizacao && termo.trim().length < 3) ||
    (onEscolherNoMapa && termo.trim().length < 3) ||
    aMostrarRecentes;

  return (
    // box-none: esta camada não intercepta toques; só os filhos o fazem.
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.barra}>
        <Text style={styles.lupa}>🔎</Text>
        <TextInput
          style={styles.input}
          value={termo}
          onChangeText={setTermo}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
        />
        <Pressable onPress={onFechar} hitSlop={10}>
          <Text style={styles.fechar}>✕</Text>
        </Pressable>
      </View>

      {/* A lista só ocupa espaço quando tem o que mostrar. Sem isto,
          um painel vazio taparia metade do mapa sem razão. */}
      {temAlgoParaMostrar ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
        >
          {/* Primeira opção, sempre visível: a maioria das recolhas é onde a
            pessoa está, e escondê-la atrás de um gesto seria escondê-la. */}
          {/* Escolher no mapa, em vez de escrever.
              Metade dos sítios de Díli não têm nome que se procure — um
              portão, uma esquina, a casa de alguém. Escrever não os encontra;
              apontar, sim. */}
          {onEscolherNoMapa && termo.trim().length < 3 ? (
            <Pressable style={[styles.item, styles.itemMapa]} onPress={onEscolherNoMapa}>
              <Text style={styles.itemIcone}>🗺</Text>
              <Text style={styles.itemNome}>{rotuloMapa}</Text>
            </Pressable>
          ) : null}
          {onUsarLocalizacao && termo.trim().length < 3 ? (
            <Pressable style={[styles.item, styles.itemGps]} onPress={onUsarLocalizacao}>
              <Text style={styles.itemIcone}>🎯</Text>
              <Text style={styles.itemNome}>{t('useMyLocation')}</Text>
            </Pressable>
          ) : null}
          {/* OS RECENTES, e só enquanto não se está a escrever.
              Assim que a pessoa escreve três letras, quer resultados da
              busca — deixar os recentes por cima seria pôr respostas velhas
              à frente da pergunta nova.
              Guarda-se o lugar inteiro, por isso tocar aqui é imediato: já
              tem as coordenadas e não vai perguntar nada a ninguém. */}
          {aMostrarRecentes ? (
            <>
              <Pressable
                style={[styles.item, styles.itemRecentesTitulo]}
                onPress={() => setRecentesAbertos((v) => !v)}
              >
                <Text style={styles.itemIcone}>🕘</Text>
                <Text style={[styles.itemNome, { flex: 1 }]}>{t('recentesTitulo')}</Text>
                <Text style={styles.contaRecentes}>{Math.min(recentes.length, 4)}</Text>
                <Text style={styles.seta}>{recentesAbertos ? '▴' : '▾'}</Text>
              </Pressable>
              {/* QUATRO, e a memória guarda seis.
                  O que limita esta lista não é o que sabemos — é o mapa que
                  está por baixo. O Simão pediu para o painel não o tapar, e
                  cada linha a menos são mais ruas à vista. Os dois sítios
                  mais antigos ficam guardados na mesma; se um dia houver um
                  "ver todos", estão lá. */}
              {(recentesAbertos ? recentes.slice(0, 4) : []).map((r, i) => (
                <Pressable
                  key={`${r.lat},${r.lng},${i}`}
                  style={[styles.item, styles.itemRecente]}
                  onPress={() => escolher(r)}
                >
                  <Text style={styles.itemIcone}>🕘</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNome} numberOfLines={1}>
                      {r.label}
                    </Text>
                    {r.detalhe ? (
                      <Text style={styles.itemDetalhe} numberOfLines={1}>
                        {r.detalhe}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}
          {aProcurar ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
          ) : resultados.length > 0 ? (
            resultados.map((r) => (
              <Pressable key={r.id} style={styles.item} onPress={() => escolher(r)}>
                <Text style={styles.itemIcone}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNome} numberOfLines={1}>
                    {r.label}
                  </Text>
                  {r.detalhe ? (
                    <Text style={styles.itemDetalhe} numberOfLines={1}>
                      {r.detalhe}
                    </Text>
                  ) : null}
                  {/* Um nome que o próprio deu e que ainda ninguém reviu.
                      Dizer-lho evita a confusão de o encontrar hoje, contar a
                      alguém, e essa pessoa não o encontrar. */}
                  {r.porRever ? (
                    <Text style={styles.itemPorRever}>{t('lugarPorRever')}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : procurou ? (
            <Text style={styles.vazio}>{t('searchNothing')}</Text>
          ) : aMostrarRecentes ? null : (
            <Text style={styles.vazio}>{t('searchHint')}</Text>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    // Sem fundo: o que estiver por trás — o mapa — continua à vista.
    wrap: { ...StyleSheet.absoluteFillObject },
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.teal,
      paddingHorizontal: spacing.md,
      margin: spacing.md,
      // Sombra para a barra se destacar do mapa por baixo
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    lupa: { fontSize: 16, marginRight: spacing.sm },
    input: { ...tipo.corpo, flex: 1, paddingVertical: 13, color: colors.text },
    fechar: { fontSize: 18, color: colors.textMuted, paddingLeft: spacing.sm },
    // Cresce com os resultados mas nunca passa de metade do ecrã, para o
    // mapa continuar a ser visível enquanto se escolhe.
    // Encostada ao topo, logo a seguir à barra. Cresce com os resultados
    // até um limite, para o mapa nunca desaparecer por completo.
    lista: {
      maxHeight: '46%',
      flexGrow: 0,
      marginHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(247,244,239,0.96)',
    },
    listaConteudo: { padding: spacing.sm },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemGps: { borderColor: colors.teal, backgroundColor: colors.tintaTeal },
    itemMapa: { backgroundColor: colors.tintaCoral },
    // AS LINHAS DOS RECENTES SÃO MAIS BAIXAS que as dos resultados.
    //
    // Podem ser: um resultado de busca pode trazer uma segunda linha de
    // detalhe e o aviso de "por rever", e precisa do espaço. Um recente é um
    // sítio onde a pessoa já esteve — reconhece-o pelo nome, sem precisar de
    // o ler todo.
    //
    // Quatro linhas mais baixas dão quase um terço de mapa a mais do que
    // seis linhas altas, e é isso que o Simão pediu.
    itemRecente: {
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
      // Recuados, para se ler que pertencem à linha de cima e não são um
      // terceiro atalho a seguir aos outros dois.
      marginLeft: spacing.lg,
    },
    itemRecentesTitulo: { paddingVertical: spacing.sm },
    contaRecentes: {
      ...tipo.legenda,
      color: colors.textMuted,
      marginRight: spacing.sm,
    },
    seta: { ...tipo.pequeno, color: colors.teal, fontWeight: '800' },
    seccao: {
      ...tipo.etiqueta,
      color: colors.textMuted,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xs,
    },
    itemIcone: { fontSize: 18, marginRight: spacing.md },
    itemNome: { ...tipo.subtitulo, color: colors.text },
    itemDetalhe: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
    itemPorRever: { ...tipo.legenda, color: colors.coral, marginTop: 1 },
    vazio: {
      ...tipo.pequeno,
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      lineHeight: 20,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
