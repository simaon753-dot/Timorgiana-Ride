import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './src/i18n/index.js';
import { AuthProvider } from './src/context/AuthContext.js';
import RootNavigator from './src/navigation/RootNavigator.js';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
