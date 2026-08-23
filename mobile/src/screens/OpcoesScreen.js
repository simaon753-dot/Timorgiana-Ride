import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Voltar from '../components/Voltar.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useTema } from '../context/TemaContext.js';

// Opções: como a aplicação se comporta.
//
// Separado do perfil porque são coisas de natureza diferente. O perfil
// responde a "quem sou e o que conduzo"; isto responde a "como quero que
// a app funcione". Juntá-los obrigava a passar por cima de definições
// para chegar aos dados, e vice-versa.
export default function OpcoesScreen({ navigation }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tema, setTema } = useTema();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={tema === 'escuro' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Voltar navigation={navigation} />
        <Text style={styles.titulo}>{t('settingsTitle')}</Text>

        {/* A cor vem primeiro porque é a definição com efeito imediato e
            visível — vê-se a escolha a acontecer no próprio ecrã. */}
        <Seccao titulo={t('themeTitle')}>
          <View style={styles.temas}>
            {[
              { id: 'claro', rotulo: t('themeLight'), fundo: '#F7F4EF', tinta: '#0E5C54' },
              { id: 'escuro', rotulo: t('themeDark'), fundo: '#101A18', tinta: '#4FB3A5' },
            ].map((op) => {
              const activo = tema === op.id;
              return (
                <Pressable
                  key={op.id}
                  style={[styles.tema, activo && styles.temaActivo]}
                  onPress={() => setTema(op.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                >
                  {/* Amostra em vez de só o nome: escolhe-se uma cor a
                      olhar para ela, não a ler a palavra. */}
                  <View style={[styles.amostra, { backgroundColor: op.fundo }]}>
                    <View style={[styles.amostraBarra, { backgroundColor: op.tinta }]} />
                  </View>
                  <Text style={[styles.temaNome, activo && styles.temaNomeActivo]}>
                    {op.rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Seccao>

        <Seccao titulo={t('language')}>
          <View style={styles.linha}>
            <LanguageToggle />
          </View>
        </Seccao>

        <Seccao titulo={t('profileApp')}>
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
          <Item texto={t('profileEmergency')} destaque onPress={() => Linking.openURL('tel:112')} />
        </Seccao>

        {user?.isAdmin ? (
          <Seccao titulo={t('admin')}>
            <Item texto={t('adminTitle')} onPress={() => navigation.navigate('Admin')} />
          </Seccao>
        ) : null}

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

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { padding: spacing.lg, paddingBottom: spacing.xxl },
    titulo: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
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
    linha: { padding: spacing.md, alignItems: 'flex-start' },
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

    temas: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
    tema: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.border,
    },
    temaActivo: { borderColor: colors.teal },
    amostra: {
      width: 62,
      height: 44,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'flex-end',
      padding: 6,
    },
    amostraBarra: { height: 8, borderRadius: 4 },
    temaNome: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
    temaNomeActivo: { color: colors.teal, fontWeight: '800' },

    rodape: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginTop: spacing.lg,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
