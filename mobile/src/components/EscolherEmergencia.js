import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Que tipo de emergência.
//
// Desenhado para quem está assustado e com pressa: três alvos grandes, um
// ícone que se reconhece sem ler, e o número à vista. Ninguém decide bem
// com medo — a escolha tem de caber num relance.
//
// A ordem não é arbitrária. Crime e violência primeiro porque é a
// emergência mais provável dentro de um carro com um desconhecido, e a
// que mais depressa piora.
// Números embutidos, iguais aos do servidor.
//
// Existem para o caso de não haver rede no momento em que fazem falta —
// que é precisamente quando fazem mais falta. Ficam AQUI, ao lado do
// selector, e não copiados em cada ecrã que os usa: uma tabela destas em
// dois sítios acaba com um número actualizado num e desactualizado no
// outro, e ninguém dá por isso até alguém precisar.
export const NUMEROS_RESERVA = {
  medica: '110',
  medicaAlternativa: '3311044',
  policia: '112',
  protecao: '115',
};

export const TIPOS_EMERGENCIA = [
  { id: 'policia', icone: '🚔', chave: 'emgCrime', ajuda: 'emgCrimeHelp' },
  { id: 'medica', icone: '🚑', chave: 'emgMedical', ajuda: 'emgMedicalHelp' },
  { id: 'protecao', icone: '🚒', chave: 'emgFire', ajuda: 'emgFireHelp' },
];

export default function EscolherEmergencia({ visivel, numeros, onFechar, onEscolher }) {
  const { t } = useI18n();

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <SafeAreaView edges={['bottom']} style={styles.painel}>
          <View style={styles.puxador} />
          <Text style={styles.titulo}>{t('emgTitle')}</Text>
          <Text style={styles.ajuda}>{t('emgHelp')}</Text>

          <View style={styles.lista}>
            {TIPOS_EMERGENCIA.map((tp) => (
              <Pressable
                key={tp.id}
                style={styles.opcao}
                onPress={() => onEscolher(tp.id)}
                accessibilityRole="button"
              >
                <Text style={styles.icone}>{tp.icone}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>{t(tp.chave)}</Text>
                  <Text style={styles.exemplo}>{t(tp.ajuda)}</Text>
                </View>
                {/* O número à vista: se a app falhar a marcar, a pessoa
                    ainda o pode marcar à mão. */}
                <View style={styles.numeros}>
                  <Text style={styles.numero}>{numeros?.[tp.id] || '—'}</Text>
                  {/* A ambulância tem duas linhas: o número curto e o fixo
                      do serviço. Um número que não atende vale zero numa
                      emergência, e é aí que ninguém se lembra de procurar
                      o alternativo — por isso está aqui, à partida. */}
                  {tp.id === 'medica' && numeros?.medicaAlternativa ? (
                    <Text style={styles.alternativo}>
                      {t('emgAlso', { n: numeros.medicaAlternativa })}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.cancelar} onPress={onFechar}>
            <Text style={styles.cancelarTexto}>{t('cancel')}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    painel: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    puxador: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    titulo: { ...tipo.titulo, color: colors.danger },
    ajuda: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
    lista: { marginTop: spacing.md, gap: spacing.sm },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.danger,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    icone: { fontSize: 30 },
    nome: { ...tipo.subtitulo, color: colors.text },
    exemplo: { ...tipo.legenda, color: colors.textMuted, marginTop: 1, lineHeight: 16 },
    numeros: { alignItems: 'flex-end' },
    alternativo: {
      ...tipo.legenda,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    numero: { ...tipo.titulo, color: colors.danger, fontVariant: ['tabular-nums'] },
    cancelar: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    cancelarTexto: { ...tipo.subtitulo, color: colors.textMuted },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
