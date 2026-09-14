import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import CabecalhoEcra from '../design/CabecalhoEcra.js';
import SeccaoTitulo from '../design/SeccaoTitulo.js';
import Cartao from '../design/Cartao.js';
import { LinhaMenu } from '../design/LinhaMenu.js';
import SeletorSegmentado from '../design/SeletorSegmentado.js';
import RodapeMarca from '../design/RodapeMarca.js';
import { colors, spacing, registarEstilos } from '../theme.js';
import { tipo } from '../design/tipografia.js';
import BarraEstado from '../design/BarraEstado.js';
import { useI18n, LANGUAGES } from '../i18n/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useTema } from '../context/TemaContext.js';
import EscolherEmergencia, { NUMEROS_RESERVA } from '../components/EscolherEmergencia.js';
import { api } from '../api/client.js';
import { getBaseUrl } from '../serverUrl.js';

// Opções: como a aplicação se comporta.
//
// Separado do perfil porque são coisas de natureza diferente. O perfil
// responde a "quem sou e o que conduzo"; isto responde a "como quero que
// a app funcione". Juntá-los obrigava a passar por cima de definições
// para chegar aos dados, e vice-versa.
export default function OpcoesScreen({ navigation }) {
  const { t, lang, setLang, reporLingua } = useI18n();
  const { user } = useAuth();
  const { tema, setTema } = useTema();

  // Números de emergência.
  //
  // Esta linha marcava 112 e mais nada — ignorava os três serviços e a
  // segunda linha da ambulância que o servidor já devolve. Alguém em
  // pânico a precisar de uma ambulância ligava à polícia.
  //
  // Embutidos como reserva: numa emergência sem rede, um ecrã vazio é
  // pior do que um número desactualizado.
  const [numeros, setNumeros] = useState(NUMEROS_RESERVA);
  const [aEscolher, setAEscolher] = useState(false);

  useEffect(() => {
    api
      .numerosEmergencia()
      .then((r) => r?.numeros && setNumeros({ ...NUMEROS_RESERVA, ...r.numeros }))
      .catch(() => {});
  }, []);

  // REPOR AS PREFERÊNCIAS — e só as preferências.
  //
  // A aplicação guarda oito coisas no telemóvel, e três delas NÃO são
  // preferências: a casa e o trabalho (moradas que a pessoa escreveu), a
  // sessão (apagá-la punha-a fora da conta) e o endereço do servidor (apagá-lo
  // podia deixar a app a falar com o sítio errado). Um botão que limpasse
  // tudo era um botão que destrói dados por trazer um nome inofensivo.
  //
  // Fica-se pelas quatro que se podem repor sem perder nada: a língua, o
  // tema, o modo e os recentes escondidos.
  //
  // A LÍNGUA é a única que muda à vista no mesmo instante, porque tem um
  // `reporLingua` que também acerta o que está em memória. O tema e o modo
  // ficam apagados no disco e aplicam-se ao reabrir — dizê-lo é mais honesto
  // do que fingir que tudo muda já.
  async function reporPreferencias() {
    Alert.alert(t('reporPrefsPergunta'), t('reporPrefsDetalhe'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('reporPrefs'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['tgr.tema', 'tgr.modo', 'tgr.recentesEscondidos']).catch(
            () => {}
          );
          await reporLingua();
          Alert.alert(t('reporPrefsFeito'));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BarraEstado />
      <CabecalhoEcra
        navigation={navigation}
        titulo={t('settingsTitle')}
        subtitulo={t('opcoesSub')}
        centrado={false}
      />
      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* A LÍNGUA PRIMEIRO, e as três à vista. Um selector que abre uma
            lista esconde que há três; e quem abre as definições por não
            perceber o que lê procura exactamente isto. */}
        <SeccaoTitulo icone="globo" titulo={t('language')} nota={t('opcoesLinguaNota')} />
        <Cartao>
          <SeletorSegmentado
            opcoes={LANGUAGES.map((l) => ({ id: l.code, rotulo: l.label }))}
            valor={lang}
            onMudar={setLang}
          />
        </Cartao>

        {/* O tema fica, embora a referência não o mostre: é uma função que já
            existe, e as referências pedem para as preservar todas. */}
        <SeccaoTitulo icone="lua" titulo={t('themeTitle')} />
        <Cartao>
          <SeletorSegmentado
            opcoes={[
              { id: 'claro', rotulo: t('themeLight') },
              { id: 'escuro', rotulo: t('themeDark') },
            ]}
            valor={tema}
            onMudar={setTema}
          />
        </Cartao>

        <SeccaoTitulo icone="grelha" titulo={t('profileApp')} nota={t('opcoesAppNota')} />
        <Cartao lista>
          <LinhaMenu
            icone="documento"
            titulo={t('termsTitle')}
            subtitulo={t('opcoesTermosSub')}
            onPress={() => navigation.navigate('Termos', { quem: user?.role })}
          />
          <LinhaMenu
            icone="escudo"
            titulo={t('privacyTitle')}
            subtitulo={t('opcoesPrivSub')}
            onPress={() => navigation.navigate('Termos', { documento: 'privacidade' })}
          />
          {/* A Política de Segurança não vive na app: é a página pública
              gerada do mesmo ficheiro que faz o Word (juridico/d5-seguranca.js).
              Abre-se no navegador, no servidor que a app está a usar. */}
          <LinhaMenu
            icone="boia"
            titulo={t('opcoesSeguranca')}
            subtitulo={t('opcoesSegurancaSub')}
            onPress={() => Linking.openURL(`${getBaseUrl()}/seguranca`)}
          />
          <LinhaMenu
            icone="servidor"
            titulo={t('serverSettings')}
            subtitulo={t('opcoesServidorSub')}
            onPress={() => navigation.navigate('Server')}
          />
          <LinhaMenu
            icone="atualizar"
            titulo={t('reporPrefs')}
            subtitulo={t('opcoesReporSub')}
            onPress={reporPreferencias}
            ultimo
          />
        </Cartao>

        <SeccaoTitulo icone="boia" titulo={t('profileHelp')} nota={t('opcoesAjudaNota')} />
        <Cartao lista>
          <LinhaMenu
            icone="telefone"
            titulo={t('opcoesApoio')}
            subtitulo={t('opcoesApoioSub')}
            onPress={() => Linking.openURL('tel:+67074192857')}
          />
          <LinhaMenu
            icone="sirene"
            titulo={t('sos')}
            subtitulo={t('opcoesEmergSub')}
            perigo
            onPress={() => setAEscolher(true)}
            ultimo
          />
        </Cartao>

        {user?.isAdmin ? (
          <>
            <SeccaoTitulo icone="coroa" titulo={t('admin')} nota={t('opcoesAdminNota')} />
            <Cartao lista>
              <LinhaMenu
                icone="grafico"
                titulo={t('adminTitle')}
                subtitulo={t('opcoesPainelSub')}
                onPress={() => navigation.navigate('Admin')}
                ultimo
              />
            </Cartao>
          </>
        ) : null}

        <RodapeMarca />
      </ScrollView>

      {/* O mesmo selector do botão SOS, mas sem enviar alerta nenhum:
          aqui não há viagem a decorrer nem ninguém a quem avisar. Serve
          para consultar e para ligar. */}
      <EscolherEmergencia
        visivel={aEscolher}
        numeros={numeros}
        onFechar={() => setAEscolher(false)}
        onEscolher={(tipo) => {
          setAEscolher(false);
          const n = numeros[tipo] || numeros.policia;
          Linking.openURL(`tel:${n}`);
        }}
      />
    </SafeAreaView>
  );
}

const criarEstilos = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    conteudo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  });

let styles = criarEstilos();
registarEstilos(() => {
  styles = criarEstilos();
});
