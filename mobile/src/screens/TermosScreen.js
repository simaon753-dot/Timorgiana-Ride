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
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from '../termos/versao.js';
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

  // ACEITA O DOCUMENTO QUE ESTÁ NO ECRÃ.
  //
  // Estava a gravar SEMPRE os termos de motorista, fosse qual fosse o
  // documento aberto. Quem lesse a política de privacidade e carregasse em
  // aceitar ficava com os termos de motorista aceites e a privacidade por
  // aceitar — um consentimento registado no sítio errado, que é pior do que
  // não ficar registado nenhum: parece que se perguntou uma coisa e
  // perguntou-se outra.
  //
  // São três documentos e três colunas, e cada um tem de ir para a sua.
  async function aceitar() {
    setAGravar(true);
    try {
      if (ePrivacidade) {
        await api.aceitarTermos(token, { privacyVersion: VERSAO_PRIVACIDADE });
      } else if (quem === 'driver') {
        await api.acceptDriverTerms(token, VERSAO_TERMOS_MOTORISTA);
      } else {
        await api.aceitarTermos(token, { termsVersion: VERSAO_TERMOS });
      }
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
            {/* O RÓTULO VEM DAS TRADUÇÕES, e não do documento.
             *
             * Estava `doc.aceitar`, e campo nenhum dos termos se chama assim —
             * eles têm `aceitarCurto`, que é a frase da caixa de registo, com
             * as marcas ** à volta da parte clicável. O botão recebia
             * `undefined` e desenhava-se cor de laranja, sem palavra nenhuma
             * lá dentro. O Simão encontrou-o ao aceitar os termos de motorista.
             *
             * Pelas traduções, o rótulo passa a estar coberto pelo verificador
             * que confere as 445 chaves nas três línguas — o mesmo campo não
             * pode voltar a desaparecer sem alguém dar por isso. */}
            <Button title={t('termosAceitar')} onPress={aceitar} loading={aGravar} />
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
