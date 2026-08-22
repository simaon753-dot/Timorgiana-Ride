import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PassengerHomeScreen from '../screens/PassengerHomeScreen.js';
import DriverHomeScreen from '../screens/DriverHomeScreen.js';
import HistoryScreen from '../screens/HistoryScreen.js';
import GanhosScreen from '../screens/GanhosScreen.js';
import { colors, fontSize } from '../theme.js';
import { useI18n } from '../i18n/index.js';
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
  const motorista = user?.role === 'driver';

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
    </Tab.Navigator>
  );
}
