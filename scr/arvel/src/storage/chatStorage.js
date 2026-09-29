import AsyncStorage from '@react-native-async-storage/async-storage';

// Переписка пока живёт только на устройстве: у бэкенда нет эндпоинтов чата,
// поэтому сообщения никуда не уходят. Но раньше они лежали в состоянии
// экрана и исчезали при выходе из диалога — теперь хотя бы переживают выход
// и перезапуск приложения. Когда появится API, останется заменить чтение и
// запись здесь, экраны трогать не придётся.

const THREADS_KEY = 'arvell.chats';
const MESSAGES_PREFIX = 'arvell.chat.';

// Устойчивый ключ диалога: идентификатор магазина, когда он известен, иначе
// имя собеседника — других постоянных полей навигация пока не передаёт.
export function chatIdFor({ chatId, name } = {}) {
  if (chatId != null && chatId !== '') return String(chatId);
  return 'name:' + String(name || '').trim().toLowerCase();
}

export async function loadThreads() {
  try {
    const raw = await AsyncStorage.getItem(THREADS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveThreads(list) {
  try {
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(list));
  } catch {
    // хранилище недоступно — список чатов не переживёт перезапуск
  }
}

export async function loadMessages(chatId) {
  try {
    const raw = await AsyncStorage.getItem(MESSAGES_PREFIX + chatId);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveMessages(chatId, messages) {
  try {
    await AsyncStorage.setItem(MESSAGES_PREFIX + chatId, JSON.stringify(messages));
  } catch {
    // переписка не сохранится, но экран продолжит работать
  }
}

// Обновляет строку диалога в списке (или заводит новую) и поднимает её наверх.
export async function upsertThread({ id, name, rating, phone, last, at }) {
  const threads = await loadThreads();
  const rest = threads.filter((t) => t.id !== id);
  const prev = threads.find((t) => t.id === id);
  const next = {
    id,
    name,
    rating: rating ?? prev?.rating,
    phone: phone ?? prev?.phone,
    last: last ?? prev?.last ?? '',
    at: at ?? Date.now(),
    unread: 0,
    dot: false,
  };
  await saveThreads([next, ...rest]);
  return next;
}

export async function deleteThreads(ids) {
  const threads = await loadThreads();
  await saveThreads(threads.filter((t) => !ids.includes(t.id)));
  try {
    await AsyncStorage.multiRemove(ids.map((id) => MESSAGES_PREFIX + id));
  } catch {
    // сам диалог из списка уже убран
  }
}

// «сейчас» в первую минуту, затем время, для прошлых дней — дата.
export function formatTime(at) {
  if (!at) return '';
  const d = new Date(at);
  const now = new Date();
  if (now - d < 60 * 1000) return 'сейчас';
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
