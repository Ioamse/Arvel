import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'arvell.favorites';

export async function loadFavorites() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(items) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // локальное хранилище недоступно — избранное просто не переживёт перезапуск
  }
}

export async function clearFavorites() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // нечего чистить
  }
}
