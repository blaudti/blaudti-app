import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { authService } from './auth';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://blaudti.com.br';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificacaoService = {
  async registrar(): Promise<void> {
    if (!Device.isDevice) return;

    const { status: existente } = await Notifications.getPermissionsAsync();
    let status = existente;

    if (existente !== 'granted') {
      const { status: novo } = await Notifications.requestPermissionsAsync();
      status = novo;
    }

    if (status !== 'granted') {
      console.warn('Permissão de notificação negada');
      return;
    }

    // Expo Push Token (funciona sem Firebase direto — Expo roteia pelo FCM)
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    await notificacaoService.enviarTokenParaServidor(token.data);
  },

  async enviarTokenParaServidor(token: string): Promise<void> {
    const jwt = await authService.getToken();
    if (!jwt) return;

    await axios.post(
      `${API_URL}/api/fcm/register`,
      {
        token,
        device: Device.modelName || 'Android',
      },
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
  },

  async removerToken(): Promise<void> {
    const jwt = await authService.getToken();
    if (!jwt) return;

    const tokenObj = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    await axios.delete(`${API_URL}/api/fcm/unregister`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { token: tokenObj.data },
    });
  },
};
