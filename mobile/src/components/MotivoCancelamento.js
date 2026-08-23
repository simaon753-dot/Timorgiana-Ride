import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';

// Motivos possíveis, por papel. São os mesmos códigos que o servidor
// aceita — texto livre não se conta, e o objectivo é ver padrões: se
// metade dos motoristas cancela por "passageiro não aparece", isso muda o
// produto, não é uma queixa isolada.
const MOTIVOS = {
  passenger: ['mudei_de_ideias', 'motorista_demora', 'enganei_destino', 'outro_transporte', 'outro'],
  driver: ['longe_demais', 'passageiro_nao_aparece', 'problema_veiculo', 'destino_inacessivel', 'outro'],
};

export default function MotivoCancelamento({ visivel, papel, aCaminho, onFechar, onConfirmar }) {
  const { t } = useI18n();
  const [escolhido, setEscolhido] = useState(null);
  const lista = MOTIVOS[papel === 'driver' ? 'driver' : 'passenger'];

  function confirmar() {
    onConfirmar(escolhido || 'outro');
    setEscolhido(null);
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <SafeAreaView edges={['bottom']} style={styles.painel}>
          <View style={styles.puxador} />
          <Text style={styles.titulo}>{t('cancelWhyTitle')}</Text>
          {/* O aviso muda conforme já haja motorista a caminho: cancelar
              antes de alguém aceitar não custa nada a ninguém. */}
          <Text style={styles.aviso}>
            {aCaminho ? t('cancelConfirmAccepted') : t('cancelConfirmRequested')}
          </Text>

          <ScrollView style={styles.lista}>
            {lista.map((m) => (
              <Pressable
                key={m}
                style={[styles.opcao, escolhido === m && styles.opcaoEscolhida]}
                onPress={() => setEscolhido(m)}
              >
                <View style={[styles.bola, escolhido === m && styles.bolaEscolhida]} />
                <Text style={[styles.opcaoTexto, escolhido === m && styles.opcaoTextoEscolhida]}>
                  {t(`cancelReason_${m}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.botoes}>
            <View style={{ flex: 1 }}>
              <Button title={t('cancelKeep')} variant="ghost" onPress={onFechar} />
            </View>
            <View style={{ flex: 1 }}>
              {/* Só activo depois de escolher: um cancelamento sem motivo
                  não ensina nada a ninguém. */}
              <Button title={t('cancelYes')} onPress={confirmar} disabled={!escolhido} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  painel: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    maxHeight: '82%',
  },
  puxador: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  titulo: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  aviso: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 19 },
  lista: { marginTop: spacing.md, flexGrow: 0 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  opcaoEscolhida: { borderColor: colors.teal, backgroundColor: '#F0F5F4' },
  bola: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  bolaEscolhida: { borderColor: colors.teal, borderWidth: 6 },
  opcaoTexto: { flex: 1, fontSize: fontSize.md, color: colors.text },
  opcaoTextoEscolhida: { fontWeight: '700' },
  botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
