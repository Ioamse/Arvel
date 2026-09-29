import AsyncStorage from '@react-native-async-storage/async-storage';

// Переписка живёт на бэкенде. Локально держим только список диалогов,
// которые человек убрал из списка: удаления диалога в API нет
// (/conversations отдаёт все ветки), поэтому «скрыть» — операция на стороне
// устройства и на собеседника не влияет.

const HIDDEN_KEY = 'arvell.chats.hidden';

export async function loadHiddenChats() {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function hideChats(ids) {
  try {
    const hidden = await loadHiddenChats();
    const next = [...new Set([...hidden, ...ids])];
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  } catch {
    // хранилище недоступно — диалоги вернутся в список после перезапуска
  }
}

export async function unhideChats(ids) {
  try {
    const hidden = await loadHiddenChats();
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden.filter((id) => !ids.includes(id))));
  } catch {
    // нечего восстанавливать
  }
}
