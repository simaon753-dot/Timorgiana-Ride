import React from 'react';
import * as Sentry from '@sentry/react-native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './src/i18n/index.js';
import { AuthProvider } from './src/context/AuthContext.js';
import { TemaProvider } from './src/context/TemaContext.js';
import { useTipografia } from './src/design/tipografia.js';
import LoadingScreen from './src/screens/LoadingScreen.js';
import SlowBanner from './src/components/SlowBanner.js';
import AvisoSessao from './src/components/AvisoSessao.js';
import RootNavigator from './src/navigation/RootNavigator.js';
import Barreira from './src/design/Barreira.js';
// A TAREFA DE LOCALIZAÇÃO DEFINE-SE À ENTRADA, e não onde é usada.
//
// O sistema pode ACORDAR a app só para entregar uma posição, com tudo o resto
// por carregar. Se a tarefa só fosse definida dentro do ecrã do motorista,
// nesse arranque ela não existiria e o Android registava um erro de «tarefa
// desconhecida». Importar aqui garante que está definida antes de qualquer
// coisa correr.
import './src/lib/servicoLocalizacao.js';

// OS ERROS QUE ACONTECEM NO TELEMÓVEL DE OUTRA PESSOA (21/09/2026).
//
// A barreira de erro mostra a falha a quem a apanhou e pede-lhe uma
// fotografia do ecrã. Funcionou enquanto quem usava a app era o Simão. Com
// motoristas a sério isso deixa de servir: a maior parte das pessoas não
// fotografa nada, fecha a app e não volta — e nós nunca saberíamos que
// aconteceu, quanto mais em que telemóvel ou em que ecrã.
//
// O DSN VEM DO AMBIENTE e pode não existir: sem ele isto fica desligado e a
// app funciona exactamente como antes. É de propósito — a conta do Sentry é
// do Simão e cria-se quando ele quiser, sem ter de mexer no código nem
// compilar outra vez.
//
// `sendDefaultPii: false`: os erros não levam nome, telefone nem email. O que
// precisamos de saber é O QUE rebentou e em que aparelho; quem estava a usar
// a app nessa altura não acrescenta nada à correcção e é dado de uma pessoa.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (DSN) {
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    // Uma amostra de um em cada dez percursos chega para ver o que é lento
    // sem encher o plano gratuito.
    tracesSampleRate: 0.1,
    environment: __DEV__ ? 'desenvolvimento' : 'producao',
  });
}

function App() {
  // Os tipos de letra carregam-se antes de desenhar seja o que for. Se se
  // desenhasse primeiro e trocasse a letra depois, o texto saltava e
  // reposicionava-se à vista — que é pior do que meio segundo de espera.
  const letraPronta = useTipografia();

  return (
    <Barreira>
      <SafeAreaProvider>
        <TemaProvider>
          <I18nProvider>
            <AuthProvider>
              {/* A faixa fica por cima de tudo: avisa que o servidor está a
              acordar, em qualquer ecrã onde o utilizador esteja. */}
              <View style={{ flex: 1 }}>
                <SlowBanner />
                {/* Acima do SlowBanner em gravidade, abaixo em altura: o
                    servidor a acordar passa em segundos, isto fica. */}
                <AvisoSessao />
                <View style={{ flex: 1 }}>
                  {letraPronta ? <RootNavigator /> : <LoadingScreen />}
                </View>
              </View>
            </AuthProvider>
          </I18nProvider>
        </TemaProvider>
      </SafeAreaProvider>
    </Barreira>
  );
}

// Envolvido pelo Sentry: é assim que ele apanha os erros de desenho e junta
// ao relatório o ecrã onde a pessoa estava. Sem DSN, `wrap` não faz nada.
export default Sentry.wrap(App);
