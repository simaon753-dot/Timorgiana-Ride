import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icone from '../design/Icone.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, radius, elevacao, registarEstilos } from '../theme.js';

// «REQUISITOS PARA SER MOTORISTA» (09/10/2026, maqueta do Simão).
//
// Abre-se em «Ver requisitos», no ecrã «Torne-se motorista HAKAT», e SOBE DO
// FUNDO (pedido dele): uma folha creme por cima do ecrã, que se fecha no ✕,
// ao tocar fora ou com o «voltar» do Android.
//
// O QUE DIZ TEM DE SER O QUE A APP PEDE. Decidido com ele a 09/10/2026:
//   • o registo criminal passou a documento obrigatório de um registo novo
//     (backend/src/documents.js, REGISTO_CRIMINAL);
//   • a licença de transporte aparece «quando legalmente exigida» — ainda não
//     há regime para plataformas, e a app não a pede;
//   • o SEGURO NÃO é requisito da HAKAT: é obrigatório por lei e do motorista,
//     e a empresa não o verifica (Regulamento de Admissão, art. 3.º-A). A
//     maqueta dizia o contrário; ficou como nos documentos.
// Se um destes mudar, muda também o Regulamento de Admissão (juridico/d1).
const DOCUMENTOS = [
  { icone: 'pessoa', titulo: 'reqDoc1Titulo', texto: 'reqDoc1Texto' },
  { icone: 'volante', titulo: 'reqDoc2Titulo', texto: 'reqDoc2Texto' },
  { icone: 'escudo', titulo: 'reqDoc3Titulo', texto: 'reqDoc3Texto' },
  { icone: 'pasta', titulo: 'reqDoc4Titulo', texto: 'reqDoc4Texto' },
  { icone: 'camera', titulo: 'reqDoc5Titulo', texto: 'reqDoc5Texto' },
  { icone: 'documento', titulo: 'reqDoc6Titulo', texto: 'reqDoc6Texto' },
];
const CONDICOES = ['reqCond1', 'reqCond2', 'reqCond3', 'reqCond4'];

export default function RequisitosMotorista({ visivel, aoFechar, aoComecar }) {
  const { t } = useI18n();
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={styles.cortina}>
        {/* Tocar no escuro de cima fecha a folha. */}
        <Pressable style={styles.fora} onPress={aoFechar} accessibilityLabel={t('reqFechar')} />
        <View style={[styles.folha, { paddingBottom: bottom + spacing.md }]}>
          <View style={styles.pega} />
          <View style={styles.topo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} accessibilityRole="header">
                {t('reqTitulo')}
              </Text>
              <Text style={styles.subtitulo}>{t('reqSub')}</Text>
            </View>
            <Pressable
              onPress={aoFechar}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('reqFechar')}
            >
              <Icone nome="fechar" tamanho={24} cor={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>{t('reqDocsTitulo')}</Text>
              {DOCUMENTOS.map((d, i) => (
                <View key={d.titulo} style={[styles.doc, i > 0 && styles.docSeparado]}>
                  <View style={styles.docIcone}>
                    <Icone nome={d.icone} tamanho={20} cor={colors.coralDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docNumero}>
                      {t('reqNumero', { n: String(i + 1).padStart(2, '0') })}
                    </Text>
                    <Text style={styles.docTitulo}>{t(d.titulo)}</Text>
                    <Text style={styles.docTexto}>{t(d.texto)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>{t('reqCondTitulo')}</Text>
              {CONDICOES.map((c) => (
                <View key={c} style={styles.condicao}>
                  <Icone nome="visto" tamanho={18} cor={colors.coralDark} />
                  <Text style={styles.condicaoTexto}>{t(c)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.info}>
              <Icone nome="info" tamanho={20} cor={colors.teal} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitulo}>{t('reqInfoTitulo')}</Text>
                <Text style={styles.infoTexto}>{t('reqInfoTexto')}</Text>
                <Text style={[styles.infoTexto, { marginTop: spacing.xs }]}>
                  {t('reqInfoSeguro')}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={aoComecar}
              style={({ pressed }) => [styles.botao, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
            >
              <Text style={styles.botaoTexto}>{t('reqComecar')}</Text>
              <Icone nome="seta" tamanho={20} cor={colors.onAcento} />
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    cortina: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    // O que fica à vista do ecrã de trás: um pouco, para se saber que está lá.
    fora: { flex: 1, minHeight: 60 },
    folha: {
      maxHeight: '92%',
      backgroundColor: colors.paper,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: spacing.sm,
    },
    pega: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    topo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    titulo: { ...tipo.displayPequeno, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.textMuted, marginTop: spacing.xs },
    conteudo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
    cartao: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...elevacao.plana,
    },
    cartaoTitulo: { ...tipo.titulo, color: colors.teal, marginBottom: spacing.sm },
    doc: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
    docSeparado: { borderTopWidth: 1, borderTopColor: colors.border },
    docIcone: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.tintaCoral,
      borderWidth: 1,
      borderColor: colors.contornoCoral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docNumero: {
      ...tipo.legenda,
      color: colors.coralDark,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    docTitulo: { ...tipo.corpoForte, color: colors.text, marginTop: 2 },
    docTexto: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2 },
    condicao: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    condicaoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    info: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.tintaTeal,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    infoTitulo: { ...tipo.corpoForte, color: colors.text },
    infoTexto: { ...tipo.pequeno, color: colors.text, marginTop: 2 },
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.coral,
      borderRadius: 999,
      paddingVertical: 16,
      marginTop: spacing.sm,
    },
    botaoTexto: { ...tipo.botao, color: colors.onAcento, fontSize: 17, lineHeight: 22 },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
