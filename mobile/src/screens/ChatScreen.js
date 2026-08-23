import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRides } from '../context/RideContext.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

export default function ChatScreen({ navigation }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeRide, messages, sendMessage, markChatRead } = useRides();
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  // Quem é "o outro" depende do meu lugar NESTA viagem, não do papel do
  // registo. A mesma conta pode conduzir uma viagem e ser passageira na
  // seguinte, e olhar para o papel mostrava-lhe o próprio nome.
  const souMotorista = activeRide?.driver?.id === user?.id;
  const other = souMotorista ? activeRide?.passenger?.name : activeRide?.driver?.name;

  // Marcar como lidas sempre que o ecrã está aberto e chegam mensagens
  useEffect(() => {
    markChatRead();
  }, [markChatRead, messages.length]);

  // Rolar para o fim quando chega/envia uma mensagem
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length]);

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await sendMessage(body);
    } catch {
      setText(body); // repõe o texto se falhar
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.ladoEsquerdo}>
          <Text style={styles.back} numberOfLines={1}>
            ‹ {t('back')}
          </Text>
        </Pressable>
        <View style={styles.centro}>
          <Text style={styles.title} numberOfLines={1}>
            {t('chatTitle')}
          </Text>
          {other ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {other}
            </Text>
          ) : null}
        </View>
        <View style={styles.ladoDireito} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.list}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>{t('chatEmpty')}</Text>
          ) : (
            messages.map((m) => {
              // Mensagem do serviço: não é de nenhum dos dois, por isso
              // não leva balão nem lado. O corpo traz um código e o texto
              // é escolhido aqui — assim cada um lê na sua língua.
              if (m.kind === 'sistema') {
                return (
                  <Text key={m.id} style={styles.sistema}>
                    {t(`sysMsg_${m.body}`)}
                  </Text>
                );
              }
              const mine = m.senderId === user?.id;
              return (
                <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('typeMessage')}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={onSend}>
            <Text style={styles.sendText}>{t('send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ladoEsquerdo: { flex: 1, alignItems: 'flex-start' },
  ladoDireito: { flex: 1 },
  centro: { flexShrink: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  back: { color: colors.teal, fontSize: fontSize.md, fontWeight: '700' },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  list: { padding: spacing.md, flexGrow: 1 },
  sistema: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xxl,
    fontSize: fontSize.md,
  },
  bubbleRow: { marginVertical: 4, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: fontSize.md, color: colors.text },
  bubbleTextMine: { color: colors.onTeal },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
