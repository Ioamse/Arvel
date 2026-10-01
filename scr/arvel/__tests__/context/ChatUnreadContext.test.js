// Счётчик непрочитанных на вкладке «Чат» (замена захардкоженной «3»).
import React from 'react';
import { AppState, Text } from 'react-native';
import { renderHook, render, screen, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../src/context/AuthContext', () => require('../helpers/mockContexts').authModule);
jest.mock('../../src/api/chat', () => ({ listConversations: jest.fn() }));

const { setAuth, resetContexts } = require('../helpers/mockContexts');
const { listConversations } = require('../../src/api/chat');
import { ChatUnreadProvider, useChatUnread } from '../../src/context/ChatUnreadContext';

const conv = (id, unread) => ({ id, unread_count: unread });
const renderUnread = () => renderHook(() => useChatUnread(), {
  wrapper: ({ children }) => <ChatUnreadProvider>{children}</ChatUnreadProvider>,
});

beforeEach(async () => {
  resetContexts();
  await AsyncStorage.clear();
  listConversations.mockReset().mockResolvedValue({ data: [conv('c1', 2), conv('c2', 0), conv('c3', 5)] });
});
afterEach(() => jest.useRealTimers());

describe('ChatUnreadContext', () => {
  it('складывает unread_count по всем диалогам', async () => {
    const { result } = renderUnread();
    await waitFor(() => expect(result.current.unread).toBe(7));
  });

  it('скрытые на устройстве чаты не считаются', async () => {
    await AsyncStorage.setItem('arvell.chats.hidden', JSON.stringify(['c3']));
    const { result } = renderUnread();
    await waitFor(() => expect(result.current.unread).toBe(2));
  });

  it('гость — 0, сервер не опрашивается', async () => {
    setAuth({ isLoggedIn: false, user: null });
    const { result } = renderUnread();
    await act(async () => {});
    expect(result.current.unread).toBe(0);
    expect(listConversations).not.toHaveBeenCalled();
  });

  it('ошибка сети не сбрасывает прежнее число', async () => {
    const { result } = renderUnread();
    await waitFor(() => expect(result.current.unread).toBe(7));
    listConversations.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.unread).toBe(7);
  });

  it('обновляется раз в 30 секунд', async () => {
    jest.useFakeTimers();
    const { result } = renderUnread();
    await act(async () => {});
    expect(listConversations).toHaveBeenCalledTimes(1);
    listConversations.mockResolvedValue({ data: [conv('c1', 1)] });
    await act(async () => { await jest.advanceTimersByTimeAsync(30000); });
    expect(listConversations).toHaveBeenCalledTimes(2);
    expect(result.current.unread).toBe(1);
  });

  it('обновляется при возврате приложения из фона', async () => {
    const listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((event, cb) => {
      listeners.push(cb);
      return { remove: jest.fn() };
    });
    renderUnread();
    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(1));
    await act(async () => { listeners.forEach((cb) => cb('active')); });
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('выход из аккаунта обнуляет счётчик', async () => {
    const { result } = renderUnread();
    await waitFor(() => expect(result.current.unread).toBe(7));
    act(() => { setAuth({ isLoggedIn: false, user: null }); });
    await waitFor(() => expect(result.current.unread).toBe(0));
  });

  it('значение доступно компонентам внутри провайдера', async () => {
    function Badge() {
      const { unread } = useChatUnread();
      return <Text>{`badge:${unread}`}</Text>;
    }
    render(<ChatUnreadProvider><Badge /></ChatUnreadProvider>);
    expect(await screen.findByText('badge:7')).toBeTruthy();
  });
});
