import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PassengerHomeScreen from '../screens/PassengerHomeScreen.js';
import DriverHomeScreen from '../screens/DriverHomeScreen.js';
import HistoryScreen from '../screens/HistoryScreen.js';
import GanhosScreen from '../screens/GanhosScreen.js';
import PerfilScreen from '../screens/PerfilScreen.js';
import { colors, fontSize } from '../theme.js';
import { useI18n } from '../i18n/index.js';
import { useModo } from '../context/ModoContext.js';
import { useRides } from '../context/RideContext.js';
import { useAuth } from '../context/AuthContext.js';

const Tab = createBottomTabNavigator();

// Ícones em texto e não uma biblioteca de ícones: poupa uma dependência e
// um tipo de letra inteiro no APK, e nestes tamanhos lê-se igual.
const icone = (glifo) => ({ color }) => (
  <Text style={{ fontSize: 20, color, lineHeight: 24 }}>{glifo}</Text>
);

export default function Tabuladores() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { modo, setModo, podeConduzir } = useModo();
  const { activeRide } = useRides();

  // Se estou a conduzir uma viagem AGORA, o modo não é uma preferência —
  // é um facto. Deixar alguém ver o ecrã de pedir viagens enquanto tem um
  // passageiro no carro seria esconder-lhe o botão de concluir.
  const aConduzirAgora = !!activeRide && activeRide.driver?.id === user?.id;
  useEffect(() => {
    if (aConduzirAgora && modo !== 'motorista') setModo('motorista');
  }, [aConduzirAgora, modo, setModo]);

  const motorista = podeConduzir && (modo === 'motorista' || aConduzirAgora);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={motorista ? DriverHomeScreen : PassengerHomeScreen}
        options={{ title: t('tabHome'), tabBarIcon: icone('🏠') }}
      />
      {/* Os ganhos só existem para quem os tem. Um separador vazio na app
          do passageiro seria ruído. */}
      {motorista ? (
        <Tab.Screen
          name="Ganhos"
          component={GanhosScreen}
          options={{ title: t('tabEarnings'), tabBarIcon: icone('💵') }}
        />
      ) : null}
      <Tab.Screen
        name="Viagens"
        component={HistoryScreen}
        options={{ title: t('tabTrips'), tabBarIcon: icone('🕘') }}
      />
      {/* O perfil também na barra: chegar lá por um avatar pequeno no
          canto obriga a saber que ele é tocável. Um separador não obriga
          a saber nada. */}
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ title: t('tabProfile'), tabBarIcon: icone('👤') }}
      />
    </Tab.Navigator>
  );
}
