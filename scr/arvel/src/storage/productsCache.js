import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'arvell.products_cache';

export async function loadCachedProducts() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedProducts(products) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(products));
  } catch {
    // локальное хранилище недоступно — кэш просто не переживёт перезапуск
  }
}
