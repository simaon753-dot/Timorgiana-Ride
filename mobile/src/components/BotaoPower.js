import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';

// Ligar e desligar o trabalho — sistema de design TGA (14/09/26).
//
// Um motorista faz isto dezenas de vezes por dia, muitas com o carro parado
// num semáforo: precisa de um alvo GRANDE e redondo, que se acerta sem olhar.
//
// Da referência veio o volante desenhado dentro de um anel, com um halo à
// volta — o volante diz "estou a conduzir" melhor do que o símbolo ⏻, que é
// de electrodoméstico.
//
// A cor está no ANEL e não no preenchimento: um botão inteiramente vermelho
// lê-se como "carrega aqui, é urgente", quando o que ele quer dizer é "estás
// parado". O anel informa sem dar ordens.
export default function BotaoPower({ ligado, aMudar, onPress }) {
  const { t } = useI18n();
  const cor = ligado ? colors.success : colors.danger;
  const halo = ligado ? colors.tintaTeal : colors.tintaPerigo;

  return (
    <View style={styles.caixa}>
      <View style={[styles.halo, { backgroundColor: halo }]}>
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
            <Icone nome="volante" tamanho={52} cor={ligado ? colors.teal : colors.textMuted} />
          )}
        </Pressable>
      </View>
      <Text style={[styles.estado, { color: ligado ? colors.teal : colors.danger }]}>
        {t(ligado ? 'ready' : 'notReady')}
      </Text>
      <Text style={styles.sub}>{t(ligado ? 'prontoSub' : 'offlineSub')}</Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: { alignItems: 'center', paddingVertical: spacing.md },
    halo: {
      width: 156,
      height: 156,
      borderRadius: 78,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botao: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 7,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premido: { opacity: 0.6 },
    estado: { ...tipo.titulo, marginTop: spacing.sm, letterSpacing: 1 },
    sub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
