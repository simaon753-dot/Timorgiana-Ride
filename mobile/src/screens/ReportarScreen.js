import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voltar from '../components/Voltar.js';
import Button from '../components/Button.js';
import TextField from '../components/TextField.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { chaveDaCategoria } from './DetalheViagemScreen.js';

// «REPORTAR» — UM PROBLEMA NUMA VIAGEM (27/09/2026).
//
// AS CATEGORIAS, COPIADAS DO SERVIDOR (`backend/src/ocorrencias.js`). Como os
// motivos das estrelas: escritas aqui para o ecrã abrir mesmo com a rede má,
// e o `scripts/verificar-tipos.mjs` impede as duas cópias de divergirem.
//
// A lista é a do LUGAR que quem reporta ocupou nesta viagem: quem conduziu
// não reporta «condução perigosa», quem viajou não reporta «não pagou».
const CATEGORIAS_DO_PASSAGEIRO = [
  'conducaoPerigosa',
  'assedio',
  'cobrancaIndevida',
  'percurso',
  'veiculoDiferente',
  'objetoPerdido',
  'outro',
];
const CATEGORIAS_DO_MOTORISTA = [
  'ameaca',
  'assedio',
  'naoPagou',
  'danos',
  'objetoPerdido',
  'outro',
];

const DESCRICAO_MAX = 1000;
const DESCRICAO_MIN_OUTRO = 10;

export default function ReportarScreen({ navigation, route }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const { rideId, papel } = route.params || {};
  const lista = papel === 'driver' ? CATEGORIAS_DO_MOTORISTA : CATEGORIAS_DO_PASSAGEIRO;
  const [categoria, setCategoria] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  const faltaDescricao = categoria === 'outro' && descricao.trim().length < DESCRICAO_MIN_OUTRO;
  const podeEnviar = !!categoria && !faltaDescricao && !aEnviar;

  async function enviar() {
    if (!podeEnviar) return;
    setAEnviar(true);
    try {
      await api.reportar(token, rideId, categoria, descricao.trim());
      // Uma confirmação que diz o que acontece a seguir, e não só «enviado»:
      // quem reporta um assédio precisa de saber que alguém vai ler.
      Alert.alert(t('reportarEnviadoTitulo'), t('reportarEnviadoTexto'), [
        { text: t('reportarFechar'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setAEnviar(false);
      Alert.alert(t('detalheErroTitulo'), e?.message || t('detalheErroTexto'));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.cabeca}>
          <Voltar navigation={navigation} />
        </View>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>{t('reportarTitulo')}</Text>
          <Text style={styles.texto}>{t('reportarTexto')}</Text>

          {/* EM PERIGO AGORA, isto não serve: uma ocorrência é lida por uma
              pessoa, não é uma chamada de emergência. Dito antes da lista,
              onde se lê. */}
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>{t('reportarEmergencia')}</Text>
          </View>

          <Text style={styles.pergunta}>{t('reportarQueAconteceu')}</Text>
          <View style={styles.lista} accessibilityRole="radiogroup">
            {lista.map((c) => {
              const escolhida = categoria === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategoria(c)}
                  style={[styles.opcao, escolhida && styles.opcaoEscolhida]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: escolhida }}
                >
                  <View style={[styles.circulo, escolhida && styles.circuloEscolhido]}>
                    {escolhida ? <View style={styles.circuloMiolo} /> : null}
                  </View>
                  <Text style={styles.opcaoTexto}>{t(chaveDaCategoria(c))}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label={t('reportarDescricao')}
            optionalLabel={categoria === 'outro' ? null : t('rateOpcional')}
            obrigatorio={categoria === 'outro'}
            value={descricao}
            onChangeText={setDescricao}
            placeholder={t('reportarDescricaoDica')}
            multiline
            linhas={5}
            maxLength={DESCRICAO_MAX}
            hint={`${descricao.length}/${DESCRICAO_MAX}`}
          />

          <Text style={styles.privado}>{t('reportarPrivado')}</Text>

          <Button
            title={t('reportarEnviar')}
            onPress={enviar}
            loading={aEnviar}
            disabled={!podeEnviar}
            tamanho="grande"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    cabeca: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    conteudo: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
    titulo: { ...tipo.titulo, color: colors.text },
    texto: { ...tipo.corpo, color: colors.textMuted },
    aviso: {
      backgroundColor: colors.tintaPerigo,
      borderColor: colors.contornoPerigo,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    avisoTexto: { ...tipo.pequeno, color: colors.text },
    pergunta: { ...tipo.corpoForte, color: colors.text, marginTop: spacing.xs },
    lista: {
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 52,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    opcaoEscolhida: { backgroundColor: colors.tintaTeal },
    opcaoTexto: { ...tipo.corpo, color: colors.text, flex: 1 },
    circulo: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circuloEscolhido: { borderColor: colors.teal },
    circuloMiolo: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal },
    privado: { ...tipo.pequeno, color: colors.textMuted },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
