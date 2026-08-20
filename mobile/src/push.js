import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Mostrar a notificação mesmo com a app aberta: um motorista com a app
// aberta noutro ecrã continua a precisar de ver que entrou um pedido.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pede autorização e devolve o token de notificações deste telemóvel.
// Devolve null se não for possível — a app funciona à mesma, só sem avisos.
export async function registarParaNotificacoes() {
  if (!Device.isDevice) return null; // não funciona em emulador

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name: 'Pedidos de viagem',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const { status: atual } = await Notifications.getPermissionsAsync();
  let status = atual;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return data;
  } catch (e) {
    console.warn('[push] não foi possível obter o token:', e?.message);
    return null;
  }
}
