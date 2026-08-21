import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OSMMap from './OSMMap.js';
import { colors, radius, spacing, fontSize } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// Mapa pequeno com um botão para o ver em ecrã inteiro.
//
// Dentro de um cartão o mapa tem de ser baixo, senão empurra para fora do
// ecrã o motorista, o preço e os botões. Mas um mapa baixo não serve para
// perceber o trajeto — daí o botão. São duas necessidades diferentes e
// não há um tamanho que sirva as duas.
export default function MapaExpandivel({ markers, liveMarker, liveLabel, height = 190, rodape }) {
  const { t } = useI18n();
  const [aberto, setAberto] = useState(false);

  return (
    <View>
      <View style={styles.caixa}>
        <OSMMap markers={markers} liveMarker={liveMarker} liveLabel={liveLabel} height={height} />
        <Pressable style={styles.expandir} onPress={() => setAberto(true)} hitSlop={8}>
          <Text style={styles.expandirIcone}>⤢</Text>
        </Pressable>
      </View>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={styles.cheio} edges={['top', 'bottom']}>
          {/* O mapa é remontado aqui — é um mapa novo, com espaço para
              mostrar o trajeto inteiro em vez da faixa do cartão. */}
          <View style={{ flex: 1 }}>
            <OSMMap markers={markers} liveMarker={liveMarker} liveLabel={liveLabel} fill />
            <Pressable style={styles.fechar} onPress={() => setAberto(false)} hitSlop={10}>
              <Text style={styles.fecharIcone}>✕</Text>
            </Pressable>
          </View>
          {rodape ? <View style={styles.rodape}>{rodape}</View> : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { position: 'relative' },
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
  fechar: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
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
  rodape: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
