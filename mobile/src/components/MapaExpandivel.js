import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Ver a nota em RequestRideScreen.js: os mapas de reserva saíram do APK a
// 08/09/2026 e vivem no histórico do git.
import Mapa from './MapaGoogle.js';
import { colors, radius, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Mapa pequeno com um botão para o ver em ecrã inteiro.
//
// Dentro de um cartão o mapa tem de ser baixo, senão empurra para fora do
// ecrã o motorista, o preço e os botões. Mas um mapa baixo não serve para
// perceber o trajeto — daí o botão. São duas necessidades diferentes e
// não há um tamanho que sirva as duas.
export default function MapaExpandivel({
  markers,
  liveMarker,
  liveLabel,
  // Onde centrar quando não há marcadores de viagem — o caso do motorista
  // parado, que só quer ver onde está.
  center,
  height = 190,
  info, // { km, min } da viagem — mostrado sobre o mapa
  aviso, // linha destacada, ex.: quanto falta para o motorista chegar
}) {
  const { t } = useI18n();
  const [aberto, setAberto] = useState(false);

  // O crachá é o mesmo nos dois tamanhos: quem abre o mapa inteiro não
  // deve perder a informação que estava a ver no pequeno.
  const cracha =
    info?.km != null || info?.min != null || aviso ? (
      <View style={styles.cracha} pointerEvents="none">
        {aviso ? <Text style={styles.crachaAviso}>{aviso}</Text> : null}
        {info?.min != null ? (
          <Text style={styles.crachaTexto}>
            {t('tripInfo', { km: info.km ?? '—', min: info.min })}
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <View>
      <View style={styles.caixa}>
        <Mapa
          markers={markers}
          center={center}
          liveMarker={liveMarker}
          liveLabel={liveLabel}
          height={height}
        />
        {cracha}
        <Pressable style={styles.expandir} onPress={() => setAberto(true)} hitSlop={8}>
          <Text style={styles.expandirIcone}>⤢</Text>
        </Pressable>
      </View>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={styles.cheio} edges={['top', 'bottom']}>
          {/* SÓ SE DESENHA QUANDO ESTÁ ABERTO, e isto não é um detalhe.
           *
           * O <Modal> do React Native MONTA OS FILHOS mesmo fechado — a vista
           * existe, apenas não se vê. Ou seja: cada ecrã com mapa montava
           * DOIS mapas, o do cartão e este, e cada um pedia a sua rota ao
           * servidor. Metade das chamadas ao Google eram para um mapa que
           * ninguém estava a ver.
           *
           * Descobri-o a estranhar sete chamadas num dia em que o Simão só
           * abriu a app umas vezes. O contador do /api/health serviu para o
           * que foi feito.
           *
           * Poupa também memória e bateria: um mapa nativo não é barato, e
           * havia sempre um a mais por ecrã. */}
          <View style={{ flex: 1 }}>
            {aberto ? (
              <Mapa
                markers={markers}
                center={center}
                liveMarker={liveMarker}
                liveLabel={liveLabel}
                fill
                // Desce a coluna do mapa em 48 — exactamente o intervalo entre
                // dois botões — para o ✕ ficar no lugar vago no topo dela, e
                // não em cima do primeiro.
                topoDosBotoes={48}
              />
            ) : null}
            {cracha}
            <Pressable style={styles.fechar} onPress={() => setAberto(false)} hitSlop={10}>
              <Text style={styles.fecharIcone}>✕</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: { position: 'relative' },
    cracha: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: 'rgba(28,36,33,0.88)',
      borderRadius: radius.md,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      maxWidth: '80%',
    },
    // Branco fixo, e certo: assenta sobre uma superfície que é escura
    // nos dois temas. Um token de tema aqui trocaria o texto por laranja
    // sobre vermelho.
    crachaAviso: { ...tipo.corpoForte, color: '#FFC7B4' },
    crachaTexto: { ...tipo.corpoForte, color: '#FFFFFF' },
    expandir: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.sm,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    expandirIcone: { fontSize: 17, color: colors.teal, fontWeight: '700' },
    cheio: { flex: 1, backgroundColor: colors.paper },
    // NA MESMA COLUNA DOS BOTÕES DO MAPA, e não por cima deles.
    //
    // Estava em `spacing.md` nas duas medidas, o que o punha praticamente em
    // cima do botão de voltar à minha localização — o primeiro da coluna do
    // mapa, que fica em `spacing.sm`. Ficava escondido e não se podia tocar.
    //
    // Agora partilha a mesma margem direita e o mesmo tamanho, e o mapa desce
    // a coluna dele em 48 para lhe abrir o lugar: lêem-se os quatro como uma
    // coluna só, em vez de um botão empoleirado sobre outro.
    fechar: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 5,
    },
    fecharIcone: { fontSize: 18, color: colors.text, fontWeight: '700' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
