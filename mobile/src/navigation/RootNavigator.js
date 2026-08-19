import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext.js';
import { RideProvider } from '../context/RideContext.js';
import WelcomeScreen from '../screens/WelcomeScreen.js';
import LoginScreen from '../screens/LoginScreen.js';
import RegisterScreen from '../screens/RegisterScreen.js';
import PassengerHomeScreen from '../screens/PassengerHomeScreen.js';
import RequestRideScreen from '../screens/RequestRideScreen.js';
import DriverHomeScreen from '../screens/DriverHomeScreen.js';
import ChatScreen from '../screens/ChatScreen.js';
import HistoryScreen from '../screens/HistoryScreen.js';
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

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        // Área autenticada (com estado de viagens em tempo real)
        <RideProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user.role === 'passenger' ? (
              <>
                <Stack.Screen name="PassengerHome" component={PassengerHomeScreen} />
                <Stack.Screen name="RequestRide" component={RequestRideScreen} />
              </>
            ) : (
              <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
            )}
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </Stack.Navigator>
        </RideProvider>
      ) : (
        // Área pública
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
