import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n, LANGUAGES } from '../i18n/index.js';
import { colors, radius, spacing, fontSize } from '../theme.js';

// Selector de língua. `onTeal` para fundos escuros; `compacto` para os
// sítios apertados.
//
// Com três línguas os nomes completos ocupam 259 px — cabem no ecrã de
// entrada, onde só dividem espaço com um ícone, mas não numa linha do
// perfil que já tem uma etiqueta à esquerda. Aí usam-se as formas curtas,
// que toda a gente reconhece.
export default function LanguageToggle({ onTeal = false, compacto = false }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={[styles.row, onTeal ? styles.rowOnTeal : styles.rowOnPaper]}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLang(l.code)}
            style={[styles.chip, compacto && styles.chipCompacto, active && styles.chipActive]}
          >
            <Text
              style={[
                styles.text,
                onTeal ? styles.textOnTeal : styles.textOnPaper,
                active && styles.textActive,
              ]}
            >
              {compacto ? l.curto : l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  rowOnPaper: { backgroundColor: colors.border },
  rowOnTeal: { backgroundColor: 'rgba(255,255,255,0.18)' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipCompacto: { paddingHorizontal: spacing.sm + 2 },
  chipActive: { backgroundColor: colors.white },
  text: { fontSize: fontSize.sm, fontWeight: '600' },
  textOnPaper: { color: colors.textMuted },
  textOnTeal: { color: colors.onTeal },
  textActive: { color: colors.teal },
});
