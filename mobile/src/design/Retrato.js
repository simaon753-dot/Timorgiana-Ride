import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, registarEstilos } from '../theme.js';
import ImagemProtegida from './ImagemProtegida.js';

// Retrato do motorista.
//
// Pede um retrato e não uma fotografia concreta: qual delas mostrar é
// decisão do servidor, que responde com a do turno mais recente e, se
// ainda não houver nenhuma, com a do registo. A app não tem de saber que
// existem dois sítios onde vive uma fotografia.
//
// Cai para o 👤 sem barulho em três casos: quem não é motorista, quem
// ainda não enviou nenhuma, e quem não tem rede. Nenhum deles merece um
// ecrã de erro no perfil.
export default function Retrato({ tamanho = 78, versao }) {
  // A data faz parte da chave: quando muda, a imagem é procurada de novo.
  // É isto que faz a fotografia de hoje substituir a de ontem, em vez de
  // ficar a anterior agarrada ao ecrã.
  const dia = versao || new Date().toISOString().slice(0, 10);
  const lado = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  const semFoto = (
    <View style={[styles.caixa, lado]}>
      <Text style={{ fontSize: tamanho * 0.55 }}>👤</Text>
    </View>
  );

  return (
    <View style={[styles.caixa, lado]}>
      <ImagemProtegida
        caminho={`/driver/retrato?dia=${dia}`}
        chave={dia}
        style={[lado, styles.comFoto]}
        reserva={semFoto}
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    // O anel só existe quando há fotografia: serve para separar a imagem do
    // fundo. À volta do 👤 seria o círculo que já foi pedido para sair.
    comFoto: { borderWidth: 2, borderColor: colors.teal, borderRadius: radius.pill },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
