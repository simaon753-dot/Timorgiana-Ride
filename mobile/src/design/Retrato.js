import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, registarEstilos } from '../theme.js';
import { getApiUrl } from '../serverUrl.js';
import { useAuth } from '../context/AuthContext.js';

// Retrato do motorista.
//
// Pede um retrato e não uma fotografia concreta: qual delas mostrar é
// decisão do servidor, que responde com a do turno mais recente e, se
// ainda não houver nenhuma, com a do registo. A app não tem de saber que
// existem dois sítios onde vive uma fotografia.
//
// Cai para o 👤 em três casos, todos silenciosos de propósito: quem não é
// motorista, quem ainda não enviou, e quem enviou mas a imagem falhou a
// carregar. Um erro de rede não deve deixar um buraco no perfil.
export default function Retrato({ tamanho = 78, mostrarFoto = true, versao }) {
  const { token } = useAuth();
  const [falhou, setFalhou] = useState(false);

  // A data entra no endereço. Sem ela, o `Image` guardava a imagem em
  // cache pelo endereço e amanhã continuava a mostrar a fotografia de
  // hoje — pareceria que a substituição não funcionou, quando o servidor
  // até estaria a devolver a nova.
  //
  // A data local do telemóvel serve: em Díli é a mesma que o servidor usa
  // para decidir de que dia é o turno, e muda no mesmo instante.
  const dia = versao || new Date().toISOString().slice(0, 10);

  // Uma falha de ontem não deve condenar a fotografia de hoje: quando o
  // dia muda, é outra imagem e merece nova tentativa.
  useEffect(() => setFalhou(false), [dia]);

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
          uri: `${getApiUrl()}/driver/retrato?dia=${dia}`,
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
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
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
