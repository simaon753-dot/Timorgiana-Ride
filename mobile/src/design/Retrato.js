import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, registarEstilos } from "../theme.js";
import { getApiUrl } from "../serverUrl.js";
import { useAuth } from "../context/AuthContext.js";

// Retrato do motorista.
//
// A fotografia que se envia no registo ficava fechada no servidor: só a
// administração a via. Quem a enviou não tinha maneira nenhuma de a rever
// — nem de perceber se tinha enviado a certa.
//
// Cai para o 👤 em três casos, todos silenciosos de propósito: quem não é
// motorista, quem ainda não enviou, e quem enviou mas a imagem falhou a
// carregar. Um erro de rede não deve deixar um buraco no perfil.
export default function Retrato({ tamanho = 78, mostrarFoto = true }) {
  const { token } = useAuth();
  const [falhou, setFalhou] = useState(false);

  const lado = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  const temFoto = mostrarFoto && !!token && !falhou;

  if (!temFoto) {
    return (
      <View style={[styles.caixa, lado]}>
        <Text style={{ fontSize: tamanho * 0.55 }}>👤</Text>
      </View>
    );
  }

  return (
    <View style={[styles.caixa, styles.comFoto, lado]}>
      <Image
        source={{
          uri: `${getApiUrl()}/driver/documents/photo/imagem`,
          headers: { Authorization: `Bearer ${token}` },
        }}
        style={lado}
        // `cover` e não `contain`: um retrato de identificação vem em
        // proporções imprevisíveis, e `contain` deixava barras vazias
        // dentro do círculo.
        resizeMode="cover"
        onError={() => setFalhou(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    caixa: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    // O anel só existe quando há fotografia: serve para separar a imagem
    // do fundo. À volta do 👤 seria o círculo que já foi pedido para sair.
    comFoto: {
      borderWidth: 2,
      borderColor: colors.teal,
      borderRadius: radius.pill,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
