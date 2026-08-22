import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LanguageToggle from '../components/LanguageToggle.js';
import { colors, spacing, fontSize, radius } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';

// Perfil: tudo o que é sobre a PESSOA e não sobre a viagem.
//
// Antes isto estava espalhado — a língua no canto do ecrã principal, o
// servidor num ícone do ecrã de entrada, o histórico num botão, o terminar
// sessão no fundo de uma lista. Juntar num sítio só faz com que se
// encontre, que é metade do trabalho de uma definição.
export default function PerfilScreen({ navigation }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();

  const motorista = user?.role === 'driver';
  const iniciais = (user?.name || '?')
    .trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  function sair() {
    Alert.alert(t('logoutConfirm'), t('logoutConfirmExplain'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cabecalho}>
          <View style={styles.avatar}>
            <Text style={styles.iniciais}>{iniciais}</Text>
          </View>
          <Text style={styles.nome}>{user?.name}</Text>
          <Text style={styles.telefone}>{user?.phone}</Text>
          <View style={styles.crachas}>
            <Text style={styles.cracha}>{motorista ? t('driver') : t('passenger')}</Text>
            {user?.ratingAvg ? (
              <Text style={styles.cracha}>
                ⭐ {Number(user.ratingAvg).toFixed(1)}
                {user.ratingCount ? ` (${user.ratingCount})` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {motorista && user?.vehicle?.plate ? (
          <View style={styles.veiculo}>
            <Text style={styles.veiculoRotulo}>{t('vehicleSection')}</Text>
            <Text style={styles.veiculoTexto}>
              {user.vehicle.type === 'motorbike' ? t('vehicleMotorbike') : t('vehicleCar')}
              {user.vehicle.model ? ` · ${user.vehicle.model}` : ''} · {user.vehicle.plate}
            </Text>
          </View>
        ) : null}

        <Seccao titulo={t('profileApp')}>
          <Linha esquerda={t('language')} direita={<LanguageToggle />} />
          <Item
            texto={t('termsTitle')}
            onPress={() => navigation.navigate('Termos', { quem: user?.role })}
          />
          <Item texto={t('serverSettings')} onPress={() => navigation.navigate('Server')} />
        </Seccao>

        <Seccao titulo={t('profileHelp')}>
          <Item
            texto={t('profileCallSupport')}
            onPress={() => Linking.openURL('tel:+67074192857')}
          />
          <Item
            texto={t('profileEmergency')}
            destaque
            onPress={() => Linking.openURL('tel:112')}
          />
        </Seccao>

        {user?.isAdmin ? (
          <Seccao titulo={t('admin')}>
            <Item texto={t('adminTitle')} onPress={() => navigation.navigate('Admin')} />
          </Seccao>
        ) : null}

        <Pressable style={styles.sair} onPress={sair}>
          <Text style={styles.sairTexto}>{t('logout')}</Text>
        </Pressable>

        <Text style={styles.rodape}>TimorgianaRide · Díli</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Seccao({ titulo, children }) {
  return (
    <View style={styles.seccao}>
      <Text style={styles.seccaoTitulo}>{titulo}</Text>
      <View style={styles.caixa}>{children}</View>
    </View>
  );
}

function Item({ texto, onPress, destaque }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Text style={[styles.itemTexto, destaque && styles.itemDestaque]}>{texto}</Text>
      <Text style={styles.seta}>›</Text>
    </Pressable>
  );
}

function Linha({ esquerda, direita }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTexto}>{esquerda}</Text>
      {direita}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cabecalho: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: { color: colors.onTeal, fontWeight: '800', fontSize: 26 },
  nome: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  telefone: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  crachas: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cracha: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.teal,
    overflow: 'hidden',
  },
  veiculo: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  veiculoRotulo: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '700' },
  veiculoTexto: { fontSize: fontSize.md, color: colors.text, marginTop: 2, fontWeight: '600' },
  seccao: { marginBottom: spacing.lg },
  seccaoTitulo: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  caixa: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemTexto: { fontSize: fontSize.md, color: colors.text },
  itemDestaque: { color: colors.danger, fontWeight: '700' },
  seta: { fontSize: 22, color: colors.textMuted },
  sair: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  sairTexto: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },
  rodape: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.lg,
  },
});
