import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

// UM TEXTO QUE NÃO PARTE PALAVRAS A MEIO (30/09/2026).
//
// No Samsung do Simão o cartão do ecrã inicial dizia «Motoriza / da». Uma
// palavra que não cabe numa linha é partida a meio; duas linhas só partem
// ENTRE palavras quando cada palavra cabe numa. Com a letra do sistema acima
// do normal (o mais provável no Samsung) ou num ecrã estreito, «Motorizada»
// deixa de caber. Ele pediu que fique como no iPhone.
//
// Por isso o desenho não muda. O texto sai no tamanho do estilo, e só desce
// se a medida das linhas mostrar uma palavra partida a meio (uma linha que
// acaba sem espaço e a seguinte que começa sem espaço). Desce um ponto de
// cada vez, até a palavra caber, e nunca abaixo de `minimo`. Onde cabe, fica
// igual ao que era. A altura da linha desce na mesma proporção.
//
// UM TAMANHO PARA VÁRIOS TEXTOS. Com `tamanho` e `aoPartir`, quem manda no
// tamanho é o ecrã, e não o texto. Foi o Simão que o pediu: no Android
// «Motorizada» ficava mais pequena do que «Carro» ao lado, e os nomes dos
// cartões devem ser todos iguais. Então cada texto só avisa que partiu
// (`aoPartir(tamanhoAtual)`), e o ecrã desce o tamanho de todos.
export default function TextoSemPartir({
  style,
  children,
  minimo = 13,
  tamanho: comum,
  aoPartir,
  ...props
}) {
  const base = StyleSheet.flatten(style) || {};
  const [proprio, setProprio] = useState(base.fontSize || 17);
  const tamanho = comum ?? proprio;

  // Outro texto (outra língua) ou outro estilo: volta-se ao tamanho do estilo.
  useEffect(() => {
    setProprio(base.fontSize || 17);
  }, [children, base.fontSize]);

  const medir = (e) => {
    const linhas = e?.nativeEvent?.lines || [];
    for (let i = 0; i < linhas.length - 1; i++) {
      const esta = linhas[i]?.text || '';
      const seguinte = linhas[i + 1]?.text || '';
      const partida = esta && seguinte && !/\s$/.test(esta) && !/^\s/.test(seguinte);
      if (partida) {
        if (tamanho > minimo) {
          if (aoPartir) aoPartir(tamanho);
          else setProprio((t) => Math.max(minimo, t - 1));
        }
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
