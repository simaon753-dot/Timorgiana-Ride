import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

// DEGRADÉ, sem obrigar a um APK novo.
//
// As maquetas do Simão usam degradé em três sítios que contam: o botão de
// ligar ao motorista, o cartão do código de recolha e a faixa da assinatura.
// Um verde chapado no lugar deles fica visivelmente mais pobre — é o que dá
// profundidade aos blocos escuros.
//
// A biblioteca habitual para isto (`expo-linear-gradient`) é um MÓDULO
// NATIVO, e nesta app isso tem um custo concreto que aprendemos hoje: uma
// dependência nativa não sai por `npm run publicar`, obriga a compilar um APK
// e a instalá-lo à mão em cada telemóvel.
//
// O `react-native-svg` já cá estava — é o que desenha os ícones — e também
// sabe fazer degradés. Mesmo resultado, entregue pelo ar.
//
// COMO SE USA. O degradé é o FUNDO, desenhado por baixo, e o conteúdo vai por
// cima em posição normal:
//
//     <Degrade de="#05604A" para="#04543F" raio={16} estilo={estilos.cartao}>
//       <Text>…</Text>
//     </Degrade>
//
// O SVG está em `position: absolute` a preencher tudo, por isso não empurra
// nada nem interfere com o espaçamento do que está dentro.
export default function Degrade({
  de,
  para,
  // Na diagonal por omissão, como nas maquetas. Na horizontal a faixa da
  // assinatura perdia o brilho do canto superior direito.
  diagonal = true,
  raio = 0,
  estilo,
  children,
}) {
  return (
    <View style={[estilo, raio ? { borderRadius: raio, overflow: 'hidden' } : null]}>
      <Svg
        style={StyleSheet.absoluteFill}
        // Sem `preserveAspectRatio="none"` o rectângulo de 0..1 não se estica
        // para os lados da caixa e o degradé sai encolhido num canto.
        preserveAspectRatio="none"
        viewBox="0 0 1 1"
      >
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2={diagonal ? '1' : '1'} y2={diagonal ? '1' : '0'}>
            <Stop offset="0" stopColor={de} />
            <Stop offset="1" stopColor={para} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#g)" />
      </Svg>
      {children}
    </View>
  );
}
