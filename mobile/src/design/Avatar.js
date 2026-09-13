import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, registarEstilos } from '../theme.js';
import ImagemProtegida from './ImagemProtegida.js';
import { tipo } from './tipografia.js';

// O AVATAR — sistema de design TGA. A fotografia quando há uma que se possa
// mostrar (`caminho`, pedida com a sessão); sem ela, as iniciais sobre tinta
// teal — "AS" diz mais do que uma silhueta igual para toda a gente, e numa
// lista de cem contas é por elas que o olho separa as pessoas.
//
// O ponto verde de "online" só aparece quando o servidor diz que está: um
// ponto cinzento em cada linha seria ruído a dizer "não sei".
export default function Avatar({ nome, tamanho = 52, online = false, caminho }) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const iniciais =
    (
      (partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')
    ).toUpperCase() || '?';
  const lado = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  const ponto = Math.max(12, Math.round(tamanho * 0.26));
  return (
    <View style={lado}>
      {caminho ? (
        <ImagemProtegida caminho={caminho} style={[styles.foto, lado]} />
      ) : (
        <View style={[styles.iniciaisCaixa, lado]}>
          <Text
            style={[
              styles.iniciais,
              { fontSize: tamanho * 0.36, lineHeight: Math.round(tamanho * 0.46) },
            ]}
          >
            {iniciais}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={[styles.ponto, { width: ponto, height: ponto, borderRadius: ponto / 2 }]}
          accessibilityLabel="online"
        />
      ) : null}
    </View>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    foto: { backgroundColor: colors.tintaTeal },
    iniciaisCaixa: {
      backgroundColor: colors.tintaTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iniciais: { ...tipo.corpoForte, color: colors.teal },
    ponto: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.white,
    },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
