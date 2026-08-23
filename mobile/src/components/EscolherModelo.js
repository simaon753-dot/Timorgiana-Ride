import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listaPlana } from '../dados/veiculos.js';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Escolher o modelo de uma lista em vez de escrever.
//
// Escrever à mão dá "avanza", "Avansa", "AVANZA 2015", "toyota avanza" —
// quatro grafias do mesmo carro, que depois não se conseguem contar nem
// mostrar de forma coerente ao passageiro. Uma lista resolve isso.
//
// Mas a lista NÃO é oficial e certamente falta lá algum modelo, por isso
// há sempre "Outro" com escrita livre. Preferir uma lista incompleta a um
// campo livre é razoável; obrigar a ela não é.
export default function EscolherModelo({ tipo, valor, onEscolher }) {
  const { t } = useI18n();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [livre, setLivre] = useState('');

  const todos = useMemo(() => listaPlana(tipo), [tipo]);
  const filtrados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return todos;
    // Procura na etiqueta completa: escrever "toyota" ou "avanza" tem de
    // encontrar o mesmo carro.
    return todos.filter((v) => v.etiqueta.toLowerCase().includes(q));
  }, [todos, termo]);

  function escolher(v) {
    onEscolher(v.etiqueta);
    setAberto(false);
    setTermo('');
  }

  function escolherLivre() {
    if (!livre.trim()) return;
    onEscolher(livre.trim());
    setAberto(false);
    setLivre('');
    setTermo('');
  }

  return (
    <>
      <Pressable style={styles.campo} onPress={() => setAberto(true)}>
        <Text style={[styles.campoTexto, !valor && styles.campoVazio]}>
          {valor || t('vehiclePickModel')}
        </Text>
        <Text style={styles.seta}>▾</Text>
      </Pressable>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <SafeAreaView style={styles.ecra} edges={['top', 'bottom']}>
          <View style={styles.topo}>
            <Pressable onPress={() => setAberto(false)} hitSlop={10}>
              <Text style={styles.fechar}>✕</Text>
            </Pressable>
            <Text style={styles.titulo}>{t('vehiclePickModel')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <TextInput
            style={styles.procurar}
            value={termo}
            onChangeText={setTermo}
            placeholder={t('vehicleSearchModel')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
          />

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.lista}>
            {filtrados.map((v) => (
              <Pressable key={v.etiqueta} style={styles.opcao} onPress={() => escolher(v)}>
                <Text style={styles.opcaoNome}>{v.etiqueta}</Text>
              </Pressable>
            ))}

            <Text style={styles.outroRotulo}>{t('vehicleNotListed')}</Text>
            <View style={styles.outroLinha}>
              <TextInput
                style={styles.outroCampo}
                value={livre}
                onChangeText={setLivre}
                placeholder={t('vehicleTypeItYourself')}
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
              <Pressable
                style={[styles.outroBotao, !livre.trim() && styles.outroBotaoInativo]}
                onPress={escolherLivre}
                disabled={!livre.trim()}
              >
                <Text style={styles.outroBotaoTexto}>✓</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    campoTexto: { ...tipo.corpo, flex: 1, color: colors.text },
    campoVazio: { color: colors.textMuted },
    seta: { fontSize: 14, color: colors.textMuted },

    ecra: { flex: 1, backgroundColor: colors.paper },
    topo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    fechar: { fontSize: 20, color: colors.text, width: 24 },
    titulo: { ...tipo.subtitulo, color: colors.text },
    procurar: {
      ...tipo.corpo,
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.teal,
      borderRadius: radius.md,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: colors.text,
    },
    lista: { padding: spacing.lg },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    opcaoNome: { ...tipo.subtitulo, color: colors.text },
    outroRotulo: {
      ...tipo.pequeno,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    outroLinha: { flexDirection: 'row', gap: spacing.sm },
    outroCampo: {
      ...tipo.corpo,
      flex: 1,
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: colors.text,
    },
    outroBotao: {
      width: 52,
      borderRadius: radius.md,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outroBotaoInativo: { backgroundColor: colors.border },
    outroBotaoTexto: { color: colors.white, fontSize: 20, fontWeight: '800' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
