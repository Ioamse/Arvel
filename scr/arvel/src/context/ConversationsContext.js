import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { listConversations } from '../api/conversations';
import { useAuth } from './AuthContext';

const ConversationsContext = createContext({
  conversations: [],
  loading: false,
  error: null,
  unreadCount: 0,
  refresh: () => {},
});

// Общий источник списка переписок: ChatScreen показывает сам список,
// MainTabs берёт отсюда же счётчик непрочитанных для бейджа вкладки «Чат» —
// чтобы оба места не гоняли GET /conversations отдельно и не расходились
// в счётчике после прочтения/нового сообщения.
export function ConversationsProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setConversations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await listConversations({ limit: 50 });
      setConversations(page.data || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  const value = useMemo(
    () => ({ conversations, loading, error, unreadCount, refresh }),
    [conversations, loading, error, unreadCount, refresh]
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  return useContext(ConversationsContext);
}
