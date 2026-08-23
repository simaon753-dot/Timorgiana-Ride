import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext.js';
import { RideProvider } from '../context/RideContext.js';
import { ModoProvider } from '../context/ModoContext.js';
import WelcomeScreen from '../screens/WelcomeScreen.js';
import LoginScreen from '../screens/LoginScreen.js';
import RegisterScreen from '../screens/RegisterScreen.js';
import RequestRideScreen from '../screens/RequestRideScreen.js';
import DriverPendingScreen from '../screens/DriverPendingScreen.js';
import ChatScreen from '../screens/ChatScreen.js';
import ServerScreen from '../screens/ServerScreen.js';
import AdminScreen from '../screens/AdminScreen.js';
import TermosScreen from '../screens/TermosScreen.js';
import OpcoesScreen from '../screens/OpcoesScreen.js';
import PerfilScreen from '../screens/PerfilScreen.js';
import Tabuladores from './Tabuladores.js';
import LoadingScreen from '../screens/LoadingScreen.js';
import { colors } from '../theme.js';
import { useTema } from '../context/TemaContext.js';

const Stack = createNativeStackNavigator();

// IMPORTANTE: partir do DefaultTheme. O React Navigation 7 exige campos como
// `fonts` — um tema só com `colors` faz a app rebentar no Android com
// "Cannot read property 'regular' of undefined".
// Calculado a cada desenho, não uma vez no arranque: com as cores
// capturadas ao carregar o módulo, o fundo da navegação ficava claro
// debaixo de ecrãs escuros.
const criarNavTheme = () => ({
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
});

export default function RootNavigator() {
  const { user, restoring } = useAuth();
  // `geracao` sobe a cada troca de paleta. Serve de chave à árvore toda:
  // as folhas de estilo já foram reconstruídas, falta obrigar os ecrãs a
  // voltar a desenhar com elas.
  const { geracao } = useTema();

  if (restoring) return <LoadingScreen />;

  return (
    <NavigationContainer theme={criarNavTheme()} key={geracao}>
      {user ? (
        // Área autenticada (com estado de viagens em tempo real)
        <ModoProvider>
        <RideProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Os tabuladores são o ecrã de base; tudo o resto abre por
                cima deles, para a barra não aparecer onde estorva — num
                mapa a ocupar o ecrã, numa conversa, nos termos. */}
            <Stack.Screen name="Tabs" component={Tabuladores} />
            {/* Sem condição de papel: qualquer conta pode pedir uma
                viagem, incluindo quem também conduz. */}
            <Stack.Screen name="RequestRide" component={RequestRideScreen} />
            {/* O registo de motorista deixou de ser uma prisão: quem
                espera aprovação continua a poder pedir viagens, e chega
                aqui pelo perfil quando quiser ver como está. */}
            <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Opcoes" component={OpcoesScreen} />
            <Stack.Screen name="Server" component={ServerScreen} />
            <Stack.Screen name="Termos" component={TermosScreen} />
            {/* Só existe para administradores. Não estar registado é a
                melhor protecção: não há ecrã para navegar até ele. */}
            {user.isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}
          </Stack.Navigator>
        </RideProvider>
        </ModoProvider>
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
          <Stack.Screen name="Opcoes" component={OpcoesScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
