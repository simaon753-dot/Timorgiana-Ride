import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { textoTermos, VERSAO_TERMOS_MOTORISTA } from '../termos/index.js';
import { textoPrivacidade } from '../termos/privacidade.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

// Ecrã dos termos. Recebe por parâmetro quem os vai ler ('passenger' ou
// 'driver') e, se vier `onAceitar`, mostra o botão de aceitar no fim.
//
// O botão fica NO FIM do texto, não no topo: para carregar nele é preciso
// ter percorrido o documento. Não garante leitura, mas evita o aceitar
// reflexo antes de o texto sequer aparecer.
export default function TermosScreen({ navigation, route }) {
  const { t, lang } = useI18n();
  const { token, refreshUser } = useAuth();
  const quem = route?.params?.quem === 'driver' ? 'driver' : 'passenger';
  // O ecrã grava a aceitação sozinho em vez de receber uma função por
  // parâmetro: o React Navigation espera parâmetros serializáveis, e
  // funções não o são.
  const aceitavel = route?.params?.aceitavel === true;
  const [aGravar, setAGravar] = useState(false);
  // O mesmo ecrã mostra os dois documentos: têm a mesma forma (título,
  // subtítulo, secções) e duplicar o ecrã só para trocar a fonte do texto
  // seria duplicar também todas as correcções futuras.
  const ePrivacidade = route?.params?.documento === 'privacidade';
  const doc = ePrivacidade ? textoPrivacidade(lang) : textoTermos(lang, quem);

  async function aceitar() {
    setAGravar(true);
    try {
      await api.acceptDriverTerms(token, VERSAO_TERMOS_MOTORISTA);
      await refreshUser();
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setAGravar(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <View style={styles.topo}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.voltar}>‹ {t('back')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>{doc.titulo}</Text>
        <Text style={styles.subtitulo}>{doc.subtitulo}</Text>
        <Text style={styles.versao}>{doc.atualizado}</Text>

        {doc.seccoes.map((s, i) => (
          <View key={i} style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>{s.titulo}</Text>
            <Paragrafos texto={s.texto} />
          </View>
        ))}

        {aceitavel ? (
          <View style={styles.aceitarCaixa}>
            <Button title={doc.aceitar} onPress={aceitar} loading={aGravar} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// O texto usa **negrito** para destacar o que importa mesmo — o botão de
// emergência, o "NÃO cobre". Interpretado aqui em vez de se instalar uma
// biblioteca de markdown para dois asteriscos.
function Paragrafos({ texto }) {
  return texto.split('\n\n').map((p, i) => (
    <Text key={i} style={styles.paragrafo}>
      {p.split('**').map((parte, j) =>
        j % 2 === 1 ? (
          <Text key={j} style={styles.forte}>
            {parte}
          </Text>
        ) : (
          parte
        )
      )}
    </Text>
  ));
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    topo: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    voltar: { ...tipo.subtitulo, color: colors.teal },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
    titulo: { ...tipo.displayPequeno, color: colors.text },
    subtitulo: { ...tipo.corpo, color: colors.text, marginTop: spacing.xs },
    versao: { ...tipo.legenda, color: colors.textMuted, marginTop: spacing.xs },
    seccao: { marginTop: spacing.lg },
    seccaoTitulo: { ...tipo.subtitulo, color: colors.teal, marginBottom: spacing.xs },
    paragrafo: { ...tipo.pequeno, lineHeight: 21, color: colors.text, marginBottom: spacing.sm },
    forte: { fontWeight: '800' },
    aceitarCaixa: {
      marginTop: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.lg,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
