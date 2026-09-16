import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
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
// O COMANDO DE CADA VEÍCULO (16/09/2026, desenhos do Simão): o guiador da
// scooter, o volante do carro, o volante da pickup. Guardados em branco, com a
// transparência a guardar a forma, e pintados aqui conforme o estado.
const VOLANTE = {
  motorbike: require('../../assets/volante/volante-motorbike.png'),
  car: require('../../assets/volante/volante-car.png'),
  carry: require('../../assets/volante/volante-carry.png'),
};

export default function BotaoPower({ ligado, aMudar, onPress, veiculo }) {
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
            <Image
              source={VOLANTE[veiculo] || VOLANTE.car}
              style={[styles.volante, { tintColor: cor }]}
              resizeMode="contain"
            />
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
    // O ANEL VEIO PARA DENTRO DO DESENHO (16/09/2026). O desenho do Simão já
    // traz o seu anel; somar-lhe o anel do botão dava três círculos à volta do
    // mesmo símbolo. Fica o desenho, pintado com a cor do estado, e o halo.
    botao: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premido: { opacity: 0.6 },
    volante: { width: 104, height: 104 },
    estado: { ...tipo.titulo, marginTop: spacing.sm, letterSpacing: 1 },
    sub: { ...tipo.pequeno, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
