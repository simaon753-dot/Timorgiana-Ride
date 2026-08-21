import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, radius, spacing, fontSize } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { getApiUrl } from '../serverUrl.js';
import { abrirNoMapa } from '../lib/mapaLink.js';
import Button from '../components/Button.js';

// Painel do administrador. Existe para uma coisa só: aprovar motoristas e
// ver pedidos de ajuda sem precisar de um computador. Quem gere o serviço
// anda na rua, não à secretária.
export default function AdminScreen({ navigation }) {
  const { t } = useI18n();
  const { token } = useAuth();

  const [resumo, setResumo] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aDecidir, setADecidir] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [r, d, s] = await Promise.all([
        api.adminResumo(token),
        api.adminDrivers(token, 'pending'),
        api.adminSos(token),
      ]);
      setResumo(r.resumo);
      setPendentes(d.drivers || []);
      setAlertas(s.alertas || []);
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setACarregar(false);
    }
  }, [token, t]);

  useEffect(() => {
    carregar();
    // Recarrega sempre que se volta a este ecrã — o estado muda por fora,
    // quando um motorista envia documentos ou alguém pede ajuda.
    return navigation.addListener('focus', carregar);
  }, [carregar, navigation]);

  async function decidir(motorista, decisao) {
    setADecidir(motorista.id);
    try {
      await api.adminDecidir(token, motorista.id, decisao);
      setPendentes((antes) => antes.filter((m) => m.id !== motorista.id));
      Alert.alert(decisao === 'approved' ? t('adminApproved') : t('adminRejected'), motorista.name);
      carregar();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    } finally {
      setADecidir(null);
    }
  }

  function confirmarRecusa(motorista) {
    Alert.alert(t('adminRejectTitle'), t('adminRejectExplain'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('adminReject'), style: 'destructive', onPress: () => decidir(motorista, 'rejected') },
    ]);
  }

  async function resolverAlerta(id) {
    try {
      await api.adminResolverSos(token, id);
      setAlertas((antes) => antes.filter((a) => a.id !== id));
      carregar();
    } catch (e) {
      Alert.alert(t('errGeneric'), e?.message || '');
    }
  }

  if (aCarregar) {
    return (
      <SafeAreaView style={styles.centro}>
        <ActivityIndicator color={colors.teal} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ecra} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={colors.teal} />}
      >
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.voltar}>‹ {t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>{t('adminTitle')}</Text>
        </View>

        {/* Os alertas vêm primeiro, sempre. Se alguém pediu ajuda, é a
            única coisa que importa neste ecrã. */}
        {alertas.length > 0 && (
          <View style={styles.blocoSos}>
            <Text style={styles.tituloSos}>🚨 {t('adminSosTitle')} ({alertas.length})</Text>
            {alertas.map((a) => (
              <View key={a.id} style={styles.cartaoSos}>
                <Text style={styles.sosNome}>{a.quem}</Text>
                <Text style={styles.sosMeta}>
                  {new Date(a.quando).toLocaleString('pt-PT')}
                  {a.destino ? ` · ${a.destino}` : ''}
                </Text>
                <View style={styles.linhaAcoes}>
                  {a.telefone ? (
                    <TouchableOpacity
                      style={styles.accaoSos}
                      onPress={() => Linking.openURL(`tel:${a.telefone}`)}
                    >
                      <Text style={styles.accaoSosTexto}>📞 {a.telefone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {a.lat != null && a.lng != null ? (
                    <TouchableOpacity
                      style={styles.accaoSos}
                      onPress={() => abrirNoMapa(Linking, a.lat, a.lng)}
                    >
                      <Text style={styles.accaoSosTexto}>🗺 {t('adminSosMap')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => resolverAlerta(a.id)}>
                  <Text style={styles.resolver}>✓ {t('adminSosResolve')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {resumo && (
          <View style={styles.numeros}>
            <Numero valor={resumo.aprovados} etiqueta={t('adminDrivers')} />
            <Numero valor={resumo.disponiveis} etiqueta={t('adminOnline')} destaque />
            <Numero valor={resumo.viagens24h} etiqueta={t('adminRides24h')} />
            <Numero valor={resumo.esperando} etiqueta={t('adminWaiting')} />
          </View>
        )}

        <Text style={styles.seccao}>
          {t('adminPending')} {pendentes.length > 0 ? `(${pendentes.length})` : ''}
        </Text>

        {pendentes.length === 0 ? (
          <Text style={styles.vazio}>{t('adminNoPending')}</Text>
        ) : (
          pendentes.map((m) => (
            <View key={m.id} style={styles.cartao}>
              <Text style={styles.nome}>{m.name}</Text>
              <Text style={styles.meta}>
                {m.phone} · {m.vehicleType === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar')}
                {m.vehiclePlate ? ` · ${m.vehiclePlate}` : ''}
              </Text>
              {m.vehicleModel ? <Text style={styles.meta}>{m.vehicleModel}</Text> : null}

              {m.documents?.length ? (
                <>
                  <Text style={styles.docsRotulo}>{t('adminDocs')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docs}>
                    {m.documents.map((d) => (
                      <Image
                        key={d.id}
                        source={{
                          uri: `${getApiUrl()}/admin/documents/${d.id}`,
                          headers: { Authorization: `Bearer ${token}` },
                        }}
                        style={styles.doc}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.semDocs}>⚠ {t('adminNoDocs')}</Text>
              )}

              <View style={styles.botoes}>
                <View style={styles.metade}>
                  <Button
                    title={t('adminReject')}
                    variant="ghost"
                    onPress={() => confirmarRecusa(m)}
                    disabled={aDecidir === m.id}
                  />
                </View>
                <View style={styles.metade}>
                  <Button
                    title={t('adminApprove')}
                    onPress={() => decidir(m, 'approved')}
                    loading={aDecidir === m.id}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Numero({ valor, etiqueta, destaque }) {
  return (
    <View style={styles.numero}>
      <Text style={[styles.numeroValor, destaque && { color: colors.coral }]}>{valor ?? '–'}</Text>
      <Text style={styles.numeroEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ecra: { flex: 1, backgroundColor: colors.paper },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cabecalho: { marginBottom: spacing.lg },
  voltar: { color: colors.teal, fontSize: fontSize.md, marginBottom: spacing.sm },
  titulo: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },

  blocoSos: {
    backgroundColor: '#FDECEA',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  tituloSos: { fontWeight: '800', color: colors.danger, fontSize: fontSize.md, marginBottom: spacing.sm },
  cartaoSos: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sosNome: { fontWeight: '700', color: colors.text, fontSize: fontSize.md },
  sosMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  linhaAcoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  accaoSos: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  accaoSosTexto: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  resolver: { color: colors.teal, fontWeight: '700', marginTop: spacing.sm, fontSize: fontSize.sm },

  numeros: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  numero: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  numeroValor: { fontSize: fontSize.xl, fontWeight: '800', color: colors.teal },
  numeroEtiqueta: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  seccao: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  vazio: { color: colors.textMuted, fontSize: fontSize.sm },
  cartao: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nome: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  docsRotulo: { marginTop: spacing.md, fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  docs: { marginTop: spacing.sm },
  doc: {
    width: 96,
    height: 96,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    backgroundColor: '#EEE',
  },
  semDocs: { marginTop: spacing.sm, color: colors.danger, fontSize: fontSize.sm },
  botoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metade: { flex: 1 },
});
