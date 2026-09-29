import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import { listConversations } from '../api/chat';
import { loadHiddenChats } from '../storage/chatStorage';
import { useAuth } from './AuthContext';

// Счётчик непрочитанных на вкладке «Чат». Раньше там стояла константа «3»:
// бейдж показывал тройку всегда, сколько бы сообщений ни пришло и сколько бы
// их ни прочитали. Теперь число складывается из unread_count по диалогам,
// которые отдаёт GET /conversations.

const ChatUnreadContext = createContext({ unread: 0, refresh: () => {} });

// Пуш-канала у приложения нет, поэтому счётчик обновляется по таймеру и
// при возврате приложения из фона — этого хватает для бейджа.
const REFRESH_MS = 30000;

export function ChatUnreadProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setUnread(0);
      return;
    }
    try {
      const [res, hidden] = await Promise.all([
        listConversations({ limit: 50 }),
        loadHiddenChats(),
      ]);
      const total = (res?.data ?? [])
        .filter((c) => !hidden.includes(c.id))
        .reduce((n, c) => n + (c.unread_count || 0), 0);
      setUnread(total);
    } catch {
      // Бейдж не критичен: при сетевой ошибке оставляем прежнее число,
      // а не пугаем пользователя нулём или чужой цифрой.
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
    if (!isLoggedIn) return undefined;
    const timer = setInterval(refresh, REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, isLoggedIn]);

  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);
  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
