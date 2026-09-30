import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, registarEstilos } from '../theme.js';
import { tipo } from './tipografia.js';
import { useI18n } from '../i18n/index.js';

// QUANTOS MOTORISTAS LIVRES HÁ PERTO (30/09/2026, desenho do Simão).
//
// Um círculo com duas pessoas e o número: teal quando há motoristas livres
// perto, vermelho com «0» quando não há nenhum. O desenho é o dele (as imagens
// de 30/09 em Descargas), feito aqui em código e não copiado dos ficheiros:
// assim serve para qualquer número, fica nítido em qualquer ecrã, e segue o
// tema escuro.
//
// AS CORES SÃO AS DO TEMA, e não as das imagens. O vermelho é o `danger` e
// não o coral: branco sobre coral dá 2,8:1, e o SISTEMA.md proíbe-o. No
// escuro o teal é o verde vivo, e por cima vai o `onTeal`, que lá é escuro.
//
// O disco colorido é EXCEPÇÃO à regra de 23/08 (ícones sem círculo): aqui a
// cor É a informação — verde há, vermelho não há — e foi o Simão que o
// desenhou assim. O anel da cor da superfície separa-o da fotografia do
// veículo, que é onde ele fica pousado.
//
// `n`: o número, ou `null` para não mostrar nada — sem posição ou sem rede
// não se sabe, e um «0» que não se sabe se é verdade assusta sem razão.
export default function MotoristasPerto({ n, tamanho = 34, style }) {
  const { t } = useI18n();
  if (n == null) return null;
  const nenhum = n <= 0;
  const frente = nenhum ? '#FFFFFF' : colors.onTeal;
  const numero = n > 9 ? '9+' : String(Math.max(0, n));
  const glifo = Math.round(tamanho * 0.46);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        nenhum ? t('motoristasPertoNenhum') : t('motoristasPertoN', { n: numero })
      }
      style={[
        styles.disco,
        {
          minWidth: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          paddingHorizontal: Math.round(tamanho * 0.14),
          backgroundColor: nenhum ? colors.danger : colors.teal,
        },
        style,
      ]}
    >
      {/* As duas pessoas, CHEIAS como no desenho dele: a maior à frente, a
          mais pequena atrás, à direita. */}
      <Svg width={glifo} height={glifo} viewBox="0 0 24 24">
        <Circle cx="9" cy="7.4" r="3.6" fill={frente} />
        <Path d="M2.4 20.4v-2.3c0-3.3 3-5.5 6.6-5.5s6.6 2.2 6.6 5.5v2.3z" fill={frente} />
        <Circle cx="17.4" cy="9.5" r="2.6" fill={frente} />
        <Path
          d="M16.8 20.4v-2.5c0-1.7-.5-3.1-1.4-4.1.6-.3 1.3-.4 2-.4 2.7 0 4.8 1.7 4.8 4.3v2.7z"
          fill={frente}
        />
      </Svg>
      <Text
        style={[
          styles.numero,
          {
            color: frente,
            fontSize: Math.round(tamanho * 0.48),
            lineHeight: Math.round(tamanho * 0.6),
          },
        ]}
      >
        {numero}
      </Text>
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    disco: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      borderWidth: 2,
      borderColor: colors.white,
    },
    numero: { ...tipo.numero },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
