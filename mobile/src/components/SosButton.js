import React, { useState, useEffect } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { colors, radius, spacing, registarEstilos } from '../theme.js';
import { FAMILIAS } from '../design/tipografia.js';
import Icone from '../design/Icone.js';
import { useI18n } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import EscolherEmergencia, { NUMEROS_RESERVA } from './EscolherEmergencia.js';

// Botão de emergência. Duas coisas acontecem quando se carrega, por esta
// ordem: o alerta é registado no servidor (para ficar prova de que houve
// pedido de ajuda, com hora e sítio), e só depois se oferece a chamada.
//
// `empilhado` (16/09/2026): na linha de três do motorista, ao lado do Telefone
// e da Mensagem, com a mesma altura e o ícone por cima do texto. O fluxo é o
// mesmo em todas as formas.
export default function SosButton({ rideId, compact, empilhado }) {
  const { t } = useI18n();
  const { token } = useAuth();
  const [aEnviar, setAEnviar] = useState(false);
  const [aEscolher, setAEscolher] = useState(false);
  const [numeros, setNumeros] = useState(NUMEROS_RESERVA);

  // Vai buscar os números ao servidor uma vez. Se algum estiver errado,
  // corrige-se lá e chega aos telemóveis sem novo APK.
  useEffect(() => {
    api
      .numerosEmergencia()
      .then((r) => r?.numeros && setNumeros({ ...NUMEROS_RESERVA, ...r.numeros }))
      .catch(() => {});
  }, []);

  async function enviar(tipo) {
    setAEnviar(true);
    let lat = null;
    let lng = null;

    // A posição é um extra. Se o GPS demorar, seguimos sem ela — o alerta
    // vale mais depressa e vazio do que tarde e completo.
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Promise.race([
          Location.getLastKnownPositionAsync(),
          new Promise((r) => setTimeout(() => r(null), 3000)),
        ]);
        if (pos?.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }
    } catch {
      /* sem posição, seguimos na mesma */
    }

    let numero = numeros[tipo] || numeros.policia;
    // Só a ambulância tem segunda linha. Acrescentar um botão a mais nas
    // outras seria uma escolha extra num ecrã onde já se decide com medo.
    const alternativo = tipo === 'medica' ? numeros.medicaAlternativa : null;
    const botaoAlternativo = alternativo
      ? [
          {
            text: t('sosCall', { n: alternativo }),
            onPress: () => Linking.openURL(`tel:${alternativo}`),
          },
        ]
      : [];
    try {
      const r = await api.sos(token, rideId, { lat, lng, tipo });
      // O servidor é a autoridade sobre os números.
      if (r?.numeros?.[tipo]) numero = r.numeros[tipo];
    } catch {
      // Nem o servidor pode travar isto: se a rede falhar, a pessoa tem de
      // conseguir ligar à polícia à mesma.
      Alert.alert(t('sosOffline'), t('sosOfflineExplain'), [
        { text: t('cancel'), style: 'cancel' },
        ...botaoAlternativo,
        {
          text: t('sosCall', { n: numero }),
          onPress: () => Linking.openURL(`tel:${numero}`),
        },
      ]);
      setAEnviar(false);
      return;
    }

    setAEnviar(false);
    Alert.alert(t('sosSentTitle'), t('sosSentExplain'), [
      { text: t('sosOnlyAlert'), style: 'cancel' },
      ...botaoAlternativo,
      {
        text: t('sosCall', { n: numero }),
        onPress: () => Linking.openURL(`tel:${numero}`),
      },
    ]);
  }

  // Sem confirmação genérica: escolher o TIPO já é o acto deliberado que
  // evita um toque acidental, e poupa um passo a quem está com pressa.
  function abrirEscolha() {
    setAEscolher(true);
  }

  function escolhido(tipo) {
    setAEscolher(false);
    enviar(tipo);
  }

  return (
    <>
      <EscolherEmergencia
        visivel={aEscolher}
        numeros={numeros}
        onFechar={() => setAEscolher(false)}
        onEscolher={escolhido}
      />
      <TouchableOpacity
        style={[styles.botao, compact && styles.compacto, empilhado && styles.empilhado]}
        onPress={abrirEscolha}
        disabled={aEnviar}
        accessibilityRole="button"
        accessibilityLabel={t('sos')}
      >
        {/* ÍCONE E TEXTO SEPARADOS, e não uma cadeia com o emoji lá dentro.
            No telemóvel do Simão este botão apareceu vermelho com o 🚨
            sozinho: o "Emergência" não se via. Num botão de emergência.
            Não consegui reproduzir nem explicar a causa — a minha primeira
            teoria (o peso 800 sem família de letra) foi desmentida pela
            fotografia dele, onde o código de recolha usa o mesmo peso e
            aparece bem.
            Por isso mudei de abordagem em vez de continuar a adivinhar: o
            emoji sai, entra o ícone desenhado, e o texto passa a ser um
            elemento com vida própria. Deixa de haver uma cadeia onde um
            caractere pode levar o resto atrás — se o ícone falhar, o texto
            aparece na mesma, e ao contrário também. */}
        {aEnviar ? (
          <Text style={[styles.texto, compact && styles.textoCompacto]}>…</Text>
        ) : compact ? (
          <Text style={[styles.texto, styles.textoCompacto]}>SOS</Text>
        ) : (
          <View style={[styles.linha, empilhado && styles.linhaEmpilhada]}>
            <Icone nome="sirene" tamanho={empilhado ? 22 : 20} cor="#fff" traco={2.4} />
            <Text
              style={[styles.texto, empilhado && styles.textoEmpilhado]}
              numberOfLines={empilhado ? 1 : undefined}
              adjustsFontSizeToFit={!!empilhado}
              minimumFontScale={0.8}
            >
              {t('sos')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    botao: {
      backgroundColor: colors.danger,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compacto: {
      width: 48,
      height: 48,
      borderRadius: 24,
      paddingVertical: 0,
      borderWidth: 2,
      borderColor: colors.white,
    },
    // Branco fixo, e certo: assenta sobre uma superfície que é escura
    // nos dois temas. Um token de tema aqui trocaria o texto por laranja
    // sobre vermelho.
    //
    // A FAMÍLIA É NOMEADA, e não pedida por peso.
    //
    // Estava `fontWeight: '800'` sem `fontFamily`. Isso não pede a fonte da
    // app — pede ao Android que fabrique um peso 800 a partir da fonte do
    // SISTEMA, e o resultado depende do telemóvel. No do Simão o texto
    // deixou de aparecer: ficava o 🚨 sozinho num botão vermelho, sem dizer
    // o que fazia. Num botão de emergência.
    //
    // A app carrega a Plus Jakarta Sans com as variantes de peso já
    // desenhadas, e todos os outros botões nomeiam a família. Este era o
    // único que não o fazia, e por isso era o único que dependia da sorte.
    texto: {
      fontFamily: FAMILIAS.extra,
      color: colors.onDanger,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0.5,
    },
    textoCompacto: { fontSize: 13, letterSpacing: 0 },
    // Na linha de três do motorista: a mesma altura e os mesmos cantos do
    // BotaoAccao empilhado, e ocupa a caixa inteira.
    empilhado: {
      flex: 1,
      minHeight: 64,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    linhaEmpilhada: { flexDirection: 'column', gap: 4 },
    textoEmpilhado: { fontSize: 14, lineHeight: 18, letterSpacing: 0 },
    linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
