import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagemProtegida from './ImagemProtegida.js';
import { tipo } from './tipografia.js';
import { spacing } from '../theme.js';

// UMA IMAGEM EM GRANDE.
//
// No painel do telemóvel os documentos apareciam em quadrados de 92 pixels e
// não se podia tocar neles. Noventa e dois pixels chegam para saber que há uma
// fotografia; não chegam para ler o número de uma carta de condução nem para
// comparar a data escrita à mão com a que está impressa no cartão — que é o
// trabalho todo de quem aprova um motorista.
//
// Quem verifica documentos num telemóvel precisa de os ver do tamanho do
// ecrã. Foi o Simão a dar por isso a tentar aprovar alguém.
//
// FUNDO PRETO E FIXO, não do tema. Um documento fotografado tem fundos claros
// e escuros conforme o papel e a luz; o preto é o único que não desaparece
// contra nenhum deles, e é o que qualquer visualizador de fotografias usa.
export default function VerImagem({ caminho, titulo, legenda, onFechar }) {
  return (
    <Modal visible={!!caminho} animationType="fade" onRequestClose={onFechar} transparent={false}>
      <View style={estilos.fundo}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Tocar em qualquer sítio fecha. Numa imagem em ecrã inteiro é o
              gesto que toda a gente tenta primeiro, e o ✕ fica na mesma para
              quem procura um botão. */}
          <Pressable style={{ flex: 1 }} onPress={onFechar}>
            {caminho ? (
              <ImagemProtegida caminho={caminho} style={estilos.imagem} resizeMode="contain" />
            ) : null}
          </Pressable>

          {titulo || legenda ? (
            <View style={estilos.rodape} pointerEvents="none">
              {titulo ? <Text style={estilos.titulo}>{titulo}</Text> : null}
              {legenda ? <Text style={estilos.legenda}>{legenda}</Text> : null}
            </View>
          ) : null}

          <Pressable style={estilos.fechar} onPress={onFechar} hitSlop={12}>
            <Text style={estilos.fecharIcone}>✕</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' },
  imagem: { flex: 1, width: '100%' },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  titulo: { ...tipo.subtitulo, color: '#FFFFFF' },
  legenda: { ...tipo.corpo, color: '#D6D2CC', marginTop: 2 },
  fechar: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fecharIcone: { fontSize: 18, color: '#1C2421', fontWeight: '700' },
});
