import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme.js';

// Motivo inspirado no tais.
//
// O tais é o tecido tradicional timorense e o objecto visual mais
// reconhecível do país. Aqui não é reproduzido — é ABSTRAÍDO: fica a
// estrutura de listas paralelas de larguras desiguais, que é o que o olho
// reconhece, sem os padrões figurativos, que pertencem a comunidades
// concretas e não a uma app.
//
// Aparece em três ou quatro sítios apenas. Um motivo cultural repetido em
// todo o lado deixa de ser identidade e passa a papel de parede — e é
// exactamente assim que uma marca internacional parece turística.
//
// Larguras irregulares de propósito: um tais tecido à mão não tem listas
// iguais, e a irregularidade é o que o distingue de uma barra de progresso.
const LISTAS = [
  { largura: 3, cor: 'coral', opacidade: 1 },
  { largura: 1, cor: 'teal', opacidade: 0.5 },
  { largura: 8, cor: 'teal', opacidade: 1 },
  { largura: 1, cor: 'coral', opacidade: 0.6 },
  { largura: 2, cor: 'teal', opacidade: 0.35 },
  { largura: 5, cor: 'coral', opacidade: 0.9 },
  { largura: 1, cor: 'teal', opacidade: 0.5 },
  { largura: 12, cor: 'teal', opacidade: 1 },
  { largura: 2, cor: 'coral', opacidade: 0.7 },
  { largura: 1, cor: 'teal', opacidade: 0.4 },
];

export default function Tais({ altura = 3, sobreEscuro = false, style }) {
  // Sobre um fundo teal, a lista teal tem 1.00:1 de contraste — ou seja,
  // não existe. Metade do motivo desaparecia e ficavam traços de coral
  // soltos. Sobre escuro, a lista calma passa a ser o creme, que é
  // também o que um tais verdadeiro tem: algodão por tingir e vermelho.
  const calma = sobreEscuro ? colors.onTeal : colors.teal;
  return (
    <View style={[styles.faixa, { height: altura }, style]} pointerEvents="none">
      {LISTAS.map((l, i) => (
        <View
          key={i}
          style={{
            flex: l.largura,
            backgroundColor: l.cor === 'coral' ? colors.coral : calma,
            opacity: sobreEscuro ? Math.min(1, l.opacidade + 0.15) : l.opacidade,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { flexDirection: 'row', width: '100%', overflow: 'hidden' },
});
