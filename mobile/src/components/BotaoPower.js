import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSize, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';

// Ligar e desligar o trabalho.
//
// Era um cartão com um interruptor e duas linhas de texto. Um motorista faz
// isto dezenas de vezes por dia, muitas com o carro a andar ou parado num
// semáforo — precisa de um alvo grande, redondo, que se acerta sem olhar.
//
// A cor está no CONTORNO e não no preenchimento: um botão inteiramente
// vermelho lê-se como "carrega aqui, é urgente", quando o que ele quer
// dizer é "estás parado". O contorno informa sem dar ordens.
export default function BotaoPower({ ligado, aMudar, onPress }) {
  const { t } = useI18n();
  const cor = ligado ? colors.success : colors.danger;

  return (
    <View style={styles.caixa}>
      <Pressable
        onPress={onPress}
        disabled={aMudar}
        style={({ pressed }) => [styles.botao, { borderColor: cor }, pressed && styles.premido]}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!ligado, disabled: !!aMudar }}
        accessibilityLabel={t(ligado ? 'ready' : 'notReady')}
      >
        {aMudar ? (
          <ActivityIndicator color={cor} />
        ) : (
          <Text style={[styles.simbolo, { color: cor }]}>⏻</Text>
        )}
      </Pressable>

      {/* Pequeno de propósito: o estado já se lê pela cor do contorno, à
          distância de um relance. A palavra é a confirmação, não a
          informação principal. */}
      <Text style={[styles.estado, { color: cor }]}>{t(ligado ? 'ready' : 'notReady')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: { alignItems: 'center', paddingVertical: spacing.sm },
    botao: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 5,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premido: { opacity: 0.6 },
    simbolo: { fontSize: 42, lineHeight: 50, fontWeight: '300' },
    estado: { ...tipo.etiqueta, marginTop: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
