import React, { useEffect } from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PassengerHomeScreen from '../screens/PassengerHomeScreen.js';
import DriverHomeScreen from '../screens/DriverHomeScreen.js';
import HistoryScreen from '../screens/HistoryScreen.js';
import GanhosScreen from '../screens/GanhosScreen.js';
import { colors, fontSize, elevacao } from '../theme.js';
import { FAMILIAS } from '../design/tipografia.js';
import { useI18n } from '../i18n/index.js';
import { useModo } from '../context/ModoContext.js';
import { useRides } from '../context/RideContext.js';
import { useAuth } from '../context/AuthContext.js';

const Tab = createBottomTabNavigator();

// AS ILUSTRAÇÕES DO SIMÃO, e não emojis (16/09/2026). Os emojis eram
// desenhados pelo sistema: mudavam de forma conforme o telemóvel e não eram
// da app. Estas são dele, iguais em todo o lado, e ficam a cores — o separador
// escolhido distingue-se por ficar opaco, e os outros esbatidos.
const ILUSTRACAO = {
  inicio: require('../../assets/ilustracoes/inicio.png'),
  ganhos: require('../../assets/ilustracoes/rendimento.png'),
  viagens: require('../../assets/ilustracoes/viagens.png'),
};
const icone =
  (qual) =>
  ({ focused }) => (
    <Image
      source={ILUSTRACAO[qual]}
      style={{ width: 26, height: 26, opacity: focused ? 1 : 0.55 }}
      resizeMode="contain"
    />
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
        // A BARRA DE BAIXO DO SISTEMA TGA: branca, sem o traço duro por cima,
        // com uma sombra suave a separá-la do conteúdo — como nas referências.
        // A ALTURA NÃO SE FIXA: a biblioteca soma sozinha a margem do
        // indicador de início (iPhone) e da barra de gestos (Android), e uma
        // altura escrita à mão cortava-a.
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          paddingTop: 6,
          ...elevacao.painel,
        },
        tabBarLabelStyle: { fontFamily: FAMILIAS.forte, fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={motorista ? DriverHomeScreen : PassengerHomeScreen}
        options={{ title: t('tabHome'), tabBarIcon: icone('inicio') }}
      />
      {/* Os ganhos só existem para quem os tem. Um separador vazio na app
          do passageiro seria ruído. */}
      {motorista ? (
        <Tab.Screen
          name="Ganhos"
          component={GanhosScreen}
          options={{ title: t('tabEarnings'), tabBarIcon: icone('ganhos') }}
        />
      ) : null}
      <Tab.Screen
        name="Viagens"
        component={HistoryScreen}
        options={{ title: t('tabTrips'), tabBarIcon: icone('viagens') }}
      />
    </Tab.Navigator>
  );
}
