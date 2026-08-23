import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './src/i18n/index.js';
import { AuthProvider } from './src/context/AuthContext.js';
import { TemaProvider } from './src/context/TemaContext.js';
import SlowBanner from './src/components/SlowBanner.js';
import RootNavigator from './src/navigation/RootNavigator.js';

export default function App() {
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
              <RootNavigator />
            </View>
          </View>
        </AuthProvider>
        </I18nProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
