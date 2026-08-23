import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
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
                <Text style={styles.numero}>{numeros?.[tp.id] || '—'}</Text>
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
    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
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
    titulo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.danger },
    ajuda: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
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
    nome: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
    exemplo: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1, lineHeight: 16 },
    numero: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: colors.danger,
      fontVariant: ['tabular-nums'],
    },
    cancelar: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
    cancelarTexto: { color: colors.textMuted, fontWeight: '700', fontSize: fontSize.md },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
