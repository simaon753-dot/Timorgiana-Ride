import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext.js';
import { RideProvider } from '../context/RideContext.js';
import WelcomeScreen from '../screens/WelcomeScreen.js';
import LoginScreen from '../screens/LoginScreen.js';
import RegisterScreen from '../screens/RegisterScreen.js';
import RequestRideScreen from '../screens/RequestRideScreen.js';
import DriverPendingScreen from '../screens/DriverPendingScreen.js';
import ChatScreen from '../screens/ChatScreen.js';
import ServerScreen from '../screens/ServerScreen.js';
import AdminScreen from '../screens/AdminScreen.js';
import TermosScreen from '../screens/TermosScreen.js';
import PerfilScreen from '../screens/PerfilScreen.js';
import Tabuladores from './Tabuladores.js';
import LoadingScreen from '../screens/LoadingScreen.js';
import { colors } from '../theme.js';

const Stack = createNativeStackNavigator();

// IMPORTANTE: partir do DefaultTheme. O React Navigation 7 exige campos como
// `fonts` — um tema só com `colors` faz a app rebentar no Android com
// "Cannot read property 'regular' of undefined".
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.teal,
    background: colors.paper,
    card: colors.paper,
    text: colors.text,
    border: colors.border,
    notification: colors.coral,
  },
};

export default function RootNavigator() {
  const { user, restoring } = useAuth();

  if (restoring) return <LoadingScreen />;

  // Motorista por aprovar não entra na área de viagens: não tem nada
  // para fazer lá, e o backend recusaria tudo à mesma.
  const motoristaPorAprovar =
    user?.role === 'driver' && (user.driverStatus || 'pending') !== 'approved';

  if (motoristaPorAprovar) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
          <Stack.Screen name="Termos" component={TermosScreen} />
          {/* Quem gere o serviço pode também querer conduzir. Sem isto,
              a conta ficaria presa no ecrã de espera — à espera de uma
              aprovação que só ela própria pode dar. */}
          {user.isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        // Área autenticada (com estado de viagens em tempo real)
        <RideProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Os tabuladores são o ecrã de base; tudo o resto abre por
                cima deles, para a barra não aparecer onde estorva — num
                mapa a ocupar o ecrã, numa conversa, nos termos. */}
            <Stack.Screen name="Tabs" component={Tabuladores} />
            {user.role === 'passenger' ? (
              <Stack.Screen name="RequestRide" component={RequestRideScreen} />
            ) : null}
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Server" component={ServerScreen} />
            <Stack.Screen name="Termos" component={TermosScreen} />
            {/* Só existe para administradores. Não estar registado é a
                melhor protecção: não há ecrã para navegar até ele. */}
            {user.isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}
          </Stack.Navigator>
        </RideProvider>
      ) : (
        // Área pública
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          {/* Tem de existir na área pública: se o endereço do servidor
              estiver errado, não é possível chegar ao login */}
          <Stack.Screen name="Server" component={ServerScreen} />
          <Stack.Screen name="Termos" component={TermosScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
