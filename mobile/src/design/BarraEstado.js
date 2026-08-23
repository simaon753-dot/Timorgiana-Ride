import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useTema } from '../context/TemaContext.js';

// Barra de estado do sistema (relógio, bateria, rede).
//
// Cada ecrã escrevia `<StatusBar style="dark" />` à mão. Funcionava com um
// tema só; com dois, os ecrãs de fundo claro ficaram com os ícones do
// sistema pretos sobre preto no tema escuro — invisíveis, e sem nenhum
// aviso, porque não é um erro de código, é um erro de cor.
//
// `sobreEscuro` é para ecrãs que têm SEMPRE fundo escuro seja qual for o
// tema — o de entrada tem fundo teal nos dois.
export default function BarraEstado({ sobreEscuro = false }) {
  const { tema } = useTema();
  if (sobreEscuro) return <StatusBar style="light" />;
  return <StatusBar style={tema === 'escuro' ? 'light' : 'dark'} />;
}
