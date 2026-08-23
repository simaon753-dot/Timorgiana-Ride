import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './src/i18n/index.js';
import { AuthProvider } from './src/context/AuthContext.js';
import { TemaProvider } from './src/context/TemaContext.js';
import { useTipografia } from './src/design/tipografia.js';
import LoadingScreen from './src/screens/LoadingScreen.js';
import SlowBanner from './src/components/SlowBanner.js';
import RootNavigator from './src/navigation/RootNavigator.js';

export default function App() {
  // Os tipos de letra carregam-se antes de desenhar seja o que for. Se se
  // desenhasse primeiro e trocasse a letra depois, o texto saltava e
  // reposicionava-se à vista — que é pior do que meio segundo de espera.
  const letraPronta = useTipografia();

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <I18nProvider>
        <AuthProvider>
          {/* A faixa fica por cima de tudo: avisa que o servidor está a
              acordar, em qualquer ecrã onde o utilizador esteja. */}
          <View style={{ flex: 1 }}>
            <SlowBanner />
            <View style={{ flex: 1 }}>
              {letraPronta ? <RootNavigator /> : <LoadingScreen />}
            </View>
          </View>
        </AuthProvider>
        </I18nProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
