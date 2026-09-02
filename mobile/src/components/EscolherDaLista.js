import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, spacing, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';

// Escolher um de muitos, com um campo de pesquisa por cima.
//
// Nasceu para os sucos: são 442, e uma lista de 442 sem pesquisa não é uma
// lista, é um castigo. Serve na mesma para os 14 municípios, porque ter dois
// selectores diferentes no mesmo formulário confunde mais do que ajuda.
//
// A COMPARAÇÃO IGNORA ACENTOS de propósito. Quem procura "liquica" tem de
// encontrar "Liquiçá", e quem escreve num teclado de telemóvel em Díli
// raramente vai buscar o ç. Um filtro que exige o acento certo é um filtro
// que devolve vazio a quem sabe o nome.
function semAcentos(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function EscolherDaLista({
  visivel,
  titulo,
  opcoes,
  valor,
  t,
  onEscolher,
  onFechar,
}) {
  const [procura, setProcura] = useState('');

  const filtradas = useMemo(() => {
    const q = semAcentos(procura).trim();
    if (!q) return opcoes;
    return opcoes.filter((o) => semAcentos(o.nome).includes(q));
  }, [opcoes, procura]);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={onFechar}
      onShow={() => setProcura('')}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={estilos.fundo} onPress={onFechar} />
        <View style={estilos.folha}>
          <View style={estilos.pega} />
          <Text style={estilos.titulo}>{titulo}</Text>

          <TextInput
            style={estilos.procura}
            value={procura}
            onChangeText={setProcura}
            placeholder={t('lugarProcurar')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {/* Altura fixa e não `flex: 1`.
              Com flex, a folha crescia até tapar o ecrã inteiro quando a
              lista era grande, e desaparecia quando era pequena — a mesma
              coisa mudava de tamanho conforme o município. Assim é sempre
              a mesma folha, e a lista rola lá dentro. */}
          <FlatList
            style={{ height: 320 }}
            data={filtradas}
            keyExtractor={(o) => String(o.id ?? o.nome)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={estilos.vazio}>{t('lugarSemResultados')}</Text>}
            renderItem={({ item }) => {
              const activo = valor === item.nome;
              return (
                <Pressable
                  style={[estilos.linha, activo && estilos.linhaActiva]}
                  onPress={() => onEscolher(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                >
                  <Text style={[estilos.linhaTexto, activo && estilos.linhaTextoActivo]}>
                    {item.nome}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    folha: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    pega: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    titulo: { ...tipo.subtitulo, color: colors.text },
    procura: {
      ...tipo.corpo,
      color: colors.text,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    linha: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    linhaActiva: { backgroundColor: colors.teal },
    linhaTexto: { ...tipo.corpo, color: colors.text },
    linhaTextoActivo: { color: colors.onTeal },
    vazio: { ...tipo.pequeno, color: colors.textMuted, paddingVertical: spacing.lg },
  });

let estilos = criarEstilos();
registarEstilos(() => {
  estilos = criarEstilos();
});
