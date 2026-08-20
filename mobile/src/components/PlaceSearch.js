import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { pesquisarLugares } from '../lib/geocode.js';
import { useI18n } from '../i18n/index.js';
import { colors, spacing, fontSize, radius } from '../theme.js';

// Caixa de pesquisa com resultados. A consulta só parte quando a pessoa
// pára de escrever — o Nominatim pede no máximo cerca de um pedido por
// segundo, e disparar a cada tecla seria abusivo e mais lento.
export default function PlaceSearch({ placeholder, onEscolher, onFechar, onUsarLocalizacao }) {
  const { t } = useI18n();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [procurou, setProcurou] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (termo.trim().length < 3) {
      setResultados([]);
      setProcurou(false);
      return;
    }
    setAProcurar(true);
    const temporizador = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const rs = await pesquisarLugares(termo, ctrl.signal);
      setResultados(rs);
      setProcurou(true);
      setAProcurar(false);
    }, 600);

    return () => clearTimeout(temporizador);
  }, [termo]);

  return (
    <View style={styles.wrap}>
      <View style={styles.barra}>
        <Text style={styles.lupa}>🔎</Text>
        <TextInput
          style={styles.input}
          value={termo}
          onChangeText={setTermo}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
        />
        <Pressable onPress={onFechar} hitSlop={10}>
          <Text style={styles.fechar}>✕</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.lista}>
        {/* Primeira opção, sempre visível: a maioria das recolhas é onde a
            pessoa está, e escondê-la atrás de um gesto seria escondê-la. */}
        {onUsarLocalizacao && termo.trim().length < 3 ? (
          <Pressable style={[styles.item, styles.itemGps]} onPress={onUsarLocalizacao}>
            <Text style={styles.itemIcone}>🎯</Text>
            <Text style={styles.itemNome}>{t('useMyLocation')}</Text>
          </Pressable>
        ) : null}
        {aProcurar ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
        ) : resultados.length > 0 ? (
          resultados.map((r) => (
            <Pressable key={r.id} style={styles.item} onPress={() => onEscolher(r)}>
              <Text style={styles.itemIcone}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNome} numberOfLines={1}>{r.label}</Text>
                {r.detalhe ? (
                  <Text style={styles.itemDetalhe} numberOfLines={1}>{r.detalhe}</Text>
                ) : null}
              </View>
            </Pressable>
          ))
        ) : procurou ? (
          <Text style={styles.vazio}>{t('searchNothing')}</Text>
        ) : (
          <Text style={styles.vazio}>{t('searchHint')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.teal,
    paddingHorizontal: spacing.md,
    margin: spacing.md,
  },
  lupa: { fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 13, fontSize: fontSize.md, color: colors.text },
  fechar: { fontSize: 18, color: colors.textMuted, paddingLeft: spacing.sm },
  lista: { flex: 1, paddingHorizontal: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemGps: { borderColor: colors.teal, backgroundColor: '#F0F5F4' },
  itemIcone: { fontSize: 18, marginRight: spacing.md },
  itemNome: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  itemDetalhe: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  vazio: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
});
