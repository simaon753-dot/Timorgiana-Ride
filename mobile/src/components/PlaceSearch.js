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
export default function PlaceSearch({ placeholder, onEscolher, onFechar, onUsarLocalizacao }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [procurou, setProcurou] = useState(false);
  const abortRef = useRef(null);

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

  const temAlgoParaMostrar =
    aProcurar ||
    resultados.length > 0 ||
    procurou ||
    (onUsarLocalizacao && termo.trim().length < 3);

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
          {onUsarLocalizacao && termo.trim().length < 3 ? (
            <Pressable style={[styles.item, styles.itemGps]} onPress={onUsarLocalizacao}>
              <Text style={styles.itemIcone}>🎯</Text>
              <Text style={styles.itemNome}>{t('useMyLocation')}</Text>
            </Pressable>
          ) : null}
          {aProcurar ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
          ) : resultados.length > 0 ? (
            resultados.map((r) => (
              <Pressable key={r.id} style={styles.item} onPress={() => onEscolher(r)}>
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
                </View>
              </Pressable>
            ))
          ) : procurou ? (
            <Text style={styles.vazio}>{t('searchNothing')}</Text>
          ) : (
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
    itemIcone: { fontSize: 18, marginRight: spacing.md },
    itemNome: { ...tipo.subtitulo, color: colors.text },
    itemDetalhe: { ...tipo.legenda, color: colors.textMuted, marginTop: 1 },
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
