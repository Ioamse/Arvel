import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerDevice, deleteDevice } from '../api/devices';

// Показывать пуш баннером/звуком, даже когда приложение открыто — иначе на
// iOS/Android входящее уведомление в foreground молча проглатывается.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Держим последний токен в памяти, чтобы signOut() мог снять регистрацию
// (DELETE /me/devices/{token}) тем же значением, которым регистрировались.
let currentToken = null;

// DevicePlatform из спеки — строго ios|android|web.
function currentPlatform() {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

// Запрашивает разрешение и регистрирует push-токен на бэкенде
// (PUT /me/devices/{token}). Вызывается при входе в аккаунт — эндпоинт
// требует авторизации. На симуляторе/эмуляторе push недоступен вовсе —
// тихо выходим, не показывая пользователю системный запрос разрешения
// впустую.
export async function registerPushToken() {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  await registerDevice(token, currentPlatform());
  currentToken = token;
  return token;
}

// Снимает регистрацию последнего известного токена (вызывается из signOut).
export async function unregisterPushToken() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await deleteDevice(token);
}
