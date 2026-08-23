import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme.js';

// Indicador de carregamento com o motivo do tais.
//
// Três listas de larguras diferentes que deslizam. Substitui o círculo a
// girar do sistema, que é o mesmo em todas as apps do mundo — e o momento
// de espera é, ironicamente, aquele em que a pessoa olha para o ecrã com
// mais atenção.
//
// Usa a API de animação que já vem no React Native, com `useNativeDriver`:
// corre no lado nativo e não trava quando o JavaScript está ocupado a
// carregar o que estamos à espera.
export default function Carregando({ tamanho = 44, sobreEscuro = false }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ciclo = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [v]);

  // Cada lista arranca com atraso diferente, para o conjunto ondular em
  // vez de pulsar em bloco.
  const listas = [
    // Sobre fundo escuro/teal a lista teal seria invisível (1.00:1 contra
    // o próprio fundo) e sobravam duas de três listas.
    { cor: sobreEscuro ? colors.onTeal : colors.teal, atraso: 0, largura: 0.28 },
    { cor: colors.coral, atraso: 0.18, largura: 0.44 },
    { cor: sobreEscuro ? colors.onTeal : colors.teal, atraso: 0.36, largura: 0.2 },
  ];

  return (
    <View style={{ width: tamanho, height: tamanho * 0.42, justifyContent: 'space-between' }}>
      {listas.map((l, i) => {
        const desloc = v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-tamanho * 0.3, tamanho * 0.3, -tamanho * 0.3],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.lista,
              {
                width: tamanho * l.largura,
                backgroundColor: l.cor,
                opacity: sobreEscuro ? 0.95 : 0.85,
                transform: [{ translateX: Animated.multiply(desloc, 1 - l.atraso) }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { height: 4, borderRadius: radius.xs },
});
