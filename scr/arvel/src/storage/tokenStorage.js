import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'arvell.access_token';
const REFRESH_KEY = 'arvell.refresh_token';
const USER_KEY = 'arvell.cached_user';

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_KEY),
    AsyncStorage.getItem(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function setTokens({ accessToken, refreshToken }) {
  await Promise.all([
    AsyncStorage.setItem(ACCESS_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_KEY),
    AsyncStorage.removeItem(REFRESH_KEY),
  ]);
}

// Кэш профиля для мгновенного восстановления сессии на холодном старте, не
// дожидаясь ответа GET /me (см. AuthContext) — сеть подтверждает/обновляет
// его в фоне, а не решает, показывать ли пользователя залогиненным.
export async function getCachedUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user) {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // некритично — просто не переживёт перезапуск
  }
}

export async function clearCachedUser() {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // нечего чистить
  }
}
