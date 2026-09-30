import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

// UM TEXTO QUE NÃO PARTE PALAVRAS A MEIO (30/09/2026).
//
// No Samsung do Simão o cartão do ecrã inicial dizia «Motoriza / da»: o
// telemóvel é uns 16 pontos mais estreito do que o iPhone, e uma palavra que
// não cabe numa linha é partida a meio — duas linhas só partem ENTRE palavras
// quando cada palavra cabe numa. Ele pediu que fique como no iPhone.
//
// Por isso o desenho não muda: o texto sai no tamanho do estilo, e só se a
// medida da linha mostrar uma palavra partida a meio (uma linha que acaba sem
// espaço e a seguinte que começa sem espaço) é que a letra desce um ponto, e
// outra vez, até a palavra caber — nunca abaixo de `minimo`. Onde cabe, fica
// igual ao que era. A altura da linha desce na mesma proporção.
export default function TextoSemPartir({ style, children, minimo = 13, ...props }) {
  const base = StyleSheet.flatten(style) || {};
  const [tamanho, setTamanho] = useState(base.fontSize || 17);

  // Outro texto (outra língua) ou outro estilo: volta-se ao tamanho do estilo.
  useEffect(() => {
    setTamanho(base.fontSize || 17);
  }, [children, base.fontSize]);

  const medir = (e) => {
    const linhas = e?.nativeEvent?.lines || [];
    for (let i = 0; i < linhas.length - 1; i++) {
      const esta = linhas[i]?.text || '';
      const seguinte = linhas[i + 1]?.text || '';
      const partida = esta && seguinte && !/\s$/.test(esta) && !/^\s/.test(seguinte);
      if (partida) {
        if (tamanho > minimo) setTamanho((t) => Math.max(minimo, t - 1));
        return;
      }
    }
  };

  const proporcao = base.fontSize ? tamanho / base.fontSize : 1;
  return (
    <Text
      {...props}
      style={[
        style,
        {
          fontSize: tamanho,
          ...(base.lineHeight ? { lineHeight: Math.round(base.lineHeight * proporcao) } : null),
        },
      ]}
      onTextLayout={medir}
    >
      {children}
    </Text>
  );
}
