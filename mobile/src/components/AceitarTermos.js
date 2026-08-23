import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { textoTermos } from '../termos/index.js';

// Caixa de aceitação com o texto clicável a abrir os termos.
//
// A caixa e o link são alvos SEPARADOS: tocar no texto abre os termos,
// tocar na caixa aceita. Se fossem o mesmo alvo, quem quisesse ler acabava
// a aceitar sem querer, ou o contrário.
export default function AceitarTermos({ aceite, onMudar, onAbrir, quem }) {
  const { t, lang } = useI18n();
  const doc = textoTermos(lang, quem === 'driver' ? 'driver' : 'passenger');
  const [antes, destaque, depois] = partir(doc.aceitarCurto);

  return (
    <View style={styles.linha}>
      <Pressable
        onPress={() => onMudar(!aceite)}
        style={[styles.caixa, aceite && styles.caixaMarcada]}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceite }}
      >
        {aceite ? <Text style={styles.visto}>✓</Text> : null}
      </Pressable>
      <Text style={styles.texto}>
        {antes}
        <Text style={styles.link} onPress={onAbrir}>
          {destaque}
        </Text>
        {depois}
      </Text>
    </View>
  );
}

function partir(s) {
  const p = s.split('**');
  return [p[0] || '', p[1] || '', p[2] || ''];
}

const criarEstilos = () =>
  StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: colors.teal },
  visto: { color: colors.white, fontWeight: '900', fontSize: 14, lineHeight: 16 },
  texto: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  link: { color: colors.teal, fontWeight: '800', textDecorationLine: 'underline' },
});

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
