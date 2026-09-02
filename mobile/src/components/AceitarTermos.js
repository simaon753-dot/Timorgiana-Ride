import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, radius, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { textoTermos } from '../termos/index.js';
import { textoPrivacidade } from '../termos/privacidade.js';

// Caixa de aceitação com o texto clicável a abrir o documento.
//
// A caixa e o link são alvos SEPARADOS: tocar no texto abre o documento,
// tocar na caixa aceita. Se fossem o mesmo alvo, quem quisesse ler acabava
// a aceitar sem querer, ou o contrário.
//
// SERVE OS DOIS DOCUMENTOS, e passou a servir por uma razão jurídica e não
// de arrumação: os termos e a privacidade são consentimentos DISTINTOS.
// Antes havia uma caixa para os termos e a privacidade era só uma ligação ao
// lado — quem se registava aceitava os termos e nunca dizia nada sobre o
// tratamento dos seus dados. Agora são duas caixas, e cada uma guarda a sua
// própria versão.
export default function AceitarTermos({ aceite, onMudar, onAbrir, quem, documento }) {
  const { t, lang } = useI18n();
  const doc =
    documento === 'privacidade'
      ? textoPrivacidade(lang)
      : textoTermos(lang, quem === 'driver' ? 'driver' : 'passenger');
  // Se a frase faltar, o título do documento serve de rótulo: a ligação
  // continua a abrir os termos e o registo continua a funcionar.
  const [antes, destaque, depois] = partir(doc.aceitarCurto, doc.titulo);

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

// Parte o texto em três: o que vem antes do **, o que fica clicável, e o
// que vem depois.
//
// O `?? ''` não é zelo a mais. Este campo já desapareceu uma vez — foi
// perdido ao regenerar os termos a partir do documento revisto — e o
// `.split` de `undefined` matava a aplicação inteira no ecrã de registo.
// Uma frase em falta tem de degradar a interface, nunca fechá-la.
function partir(s, alternativa) {
  const texto = typeof s === 'string' && s ? s : `**${alternativa || ''}**`;
  const p = texto.split('**');
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
    texto: { ...tipo.pequeno, flex: 1, color: colors.text, lineHeight: 20 },
    link: { color: colors.teal, fontWeight: '800', textDecorationLine: 'underline' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
