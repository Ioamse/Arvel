import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth, isPlaceholderName } from '../../src/context/AuthContext';

jest.mock('../../src/api/auth', () => ({
  registerPhone: jest.fn(),
  verifyCode: jest.fn(),
  sellerAcceptInvite: jest.fn(),
  sellerComplete: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('../../src/api/me', () => ({ getMe: jest.fn(), updateMe: jest.fn() }));
jest.mock('../../src/api/shops', () => ({ updateMyShop: jest.fn() }));

const authApi = require('../../src/api/auth');
const meApi = require('../../src/api/me');
const shopsApi = require('../../src/api/shops');
const client = require('../../src/api/client');

beforeEach(async () => {
  // У api/client модульный кэш токенов — сбрасываем его вместе с хранилищем.
  await client.clearSession();
  await AsyncStorage.clear();
  authApi.registerPhone.mockReset().mockResolvedValue(null);
  authApi.logout.mockReset().mockResolvedValue(null);
  authApi.verifyCode.mockReset();
  authApi.sellerAcceptInvite.mockReset().mockResolvedValue(null);
  authApi.sellerComplete.mockReset();
  meApi.getMe.mockReset();
  meApi.updateMe.mockReset();
  shopsApi.updateMyShop.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.useRealTimers());

const now = () => new Date().toISOString();
const oldDate = '2020-01-01T00:00:00Z';
const session = (user) => ({ access_token: 'acc', refresh_token: 'ref', user });

const renderAuth = () => renderHook(() => useAuth(), {
  wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
});
const storedAccess = () => AsyncStorage.getItem('arvell.access_token');
const withTokens = () => client.setSession({ accessToken: 'acc', refreshToken: 'ref' });

describe('isPlaceholderName', () => {
  it('пустое имя или имя = номер телефона — заглушка', () => {
    expect(isPlaceholderName({ display_name: '', phone: '+7999' })).toBe(true);
    expect(isPlaceholderName({ display_name: '+7 (999) 000-11-22', phone: '+79990001122' })).toBe(true);
    expect(isPlaceholderName({ display_name: 'Иван', phone: '+79990001122' })).toBe(false);
    expect(isPlaceholderName(null)).toBe(true);
  });
});

describe('холодный старт', () => {
  it('без токенов — гость', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.bootstrapping).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(meApi.getMe).not.toHaveBeenCalled();
  });

  it('с токенами — GET /me и вход; display_name доступно как name', async () => {
    await withTokens();
    meApi.getMe.mockResolvedValue({ id: 'u1', display_name: 'Иван', phone: '+7999', created_at: oldDate });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));
    expect(result.current.user.name).toBe('Иван');
    expect(result.current.bootstrapping).toBe(false);
  });

  it('сервер отверг токен (401) — токены стёрты', async () => {
    await withTokens();
    meApi.getMe.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.bootstrapping).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(await storedAccess()).toBeNull();
  });

  it('обрыв сети на /me — токены НЕ стираются', async () => {
    await withTokens();
    meApi.getMe.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.bootstrapping).toBe(false));
    expect(await storedAccess()).toBe('acc');
  });

  it('аккаунт создан, но имя не заполнено — возвращаем на ProfileSetup', async () => {
    await withTokens();
    meApi.getMe.mockResolvedValue({ id: 'u1', display_name: '+79990001122', phone: '+79990001122', created_at: now() });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.bootstrapping).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.pendingUser).toMatchObject({ id: 'u1' });
  });

  it('медленный /me: заставка не ждёт дольше 4 секунд, вход происходит позже', async () => {
    jest.useFakeTimers();
    await withTokens();
    let resolveMe;
    meApi.getMe.mockImplementation(() => new Promise((r) => { resolveMe = r; }));
    const { result } = renderAuth();
    await act(async () => { await jest.advanceTimersByTimeAsync(4000); });
    expect(result.current.bootstrapping).toBe(false);
    expect(result.current.isLoggedIn).toBe(false);
    await act(async () => { resolveMe({ id: 'u1', display_name: 'Иван', created_at: oldDate }); });
    expect(result.current.isLoggedIn).toBe(true);
  });
});

describe('вход по телефону', () => {
  const login = async (user) => {
    authApi.verifyCode.mockResolvedValue(session(user));
    const hook = renderAuth();
    await waitFor(() => expect(hook.result.current.bootstrapping).toBe(false));
    await act(async () => { await hook.result.current.registerPhone('+79990001122'); });
    let res;
    await act(async () => { res = await hook.result.current.verifyCode('1234'); });
    return { ...hook, res };
  };

  it('registerPhone запоминает телефон для следующих шагов', async () => {
    const { result } = renderAuth();
    await act(async () => { await result.current.registerPhone('+79990001122'); });
    expect(authApi.registerPhone).toHaveBeenCalledWith('+79990001122');
    expect(result.current.pendingPhone).toBe('+79990001122');
  });

  it('новый покупатель: токены сохранены, но вход ждёт имени', async () => {
    const { result, res } = await login({ id: 'u1', display_name: '+79990001122', phone: '+79990001122', role: 'user', created_at: now() });
    expect(authApi.verifyCode).toHaveBeenCalledWith('+79990001122', '1234');
    expect(res.needsOnboarding).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.pendingUser).toBeTruthy();
    expect(await storedAccess()).toBe('acc');
  });

  it('существующий аккаунт — сразу вход', async () => {
    const { result, res } = await login({ id: 'u1', display_name: 'Иван', phone: '+79990001122', role: 'user', created_at: oldDate });
    expect(res.needsOnboarding).toBe(false);
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('старый аккаунт без имени не отправляется на онбординг (не затираем профиль)', async () => {
    const { result, res } = await login({ id: 'u1', display_name: '+79990001122', phone: '+79990001122', role: 'user', created_at: oldDate });
    expect(res.needsOnboarding).toBe(false);
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('продавец никогда не попадает на онбординг покупателя', async () => {
    const { res } = await login({ id: 's1', display_name: '+79990001122', phone: '+79990001122', role: 'seller', created_at: now() });
    expect(res.needsOnboarding).toBe(false);
  });

  it('completeOnboarding сохраняет имя и завершает вход', async () => {
    const { result } = await login({ id: 'u1', display_name: '+79990001122', phone: '+79990001122', created_at: now() });
    meApi.updateMe.mockResolvedValue({ id: 'u1', display_name: 'Анна' });
    await act(async () => { await result.current.completeOnboarding({ display_name: 'Анна' }); });
    expect(meApi.updateMe).toHaveBeenCalledWith({ display_name: 'Анна' });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user.name).toBe('Анна');
    expect(result.current.pendingUser).toBeNull();
  });
});

describe('регистрация продавца', () => {
  const setup = async () => {
    const hook = renderAuth();
    await waitFor(() => expect(hook.result.current.bootstrapping).toBe(false));
    await act(async () => { await hook.result.current.sellerAcceptInvite('INV', '+79995550000'); });
    return hook;
  };

  it('accept-invite запоминает телефон, complete логинит', async () => {
    const { result } = await setup();
    expect(authApi.sellerAcceptInvite).toHaveBeenCalledWith('INV', '+79995550000');
    authApi.sellerComplete.mockResolvedValue(session({ id: 's1', display_name: 'Алекс', role: 'seller' }));
    await act(async () => {
      await result.current.sellerComplete({ inviteToken: 'INV', code: '1234', shopName: 'Shop', displayName: 'Алекс' });
    });
    expect(authApi.sellerComplete).toHaveBeenCalledWith(expect.objectContaining({ phone: '+79995550000', shopName: 'Shop' }));
    expect(result.current.isLoggedIn).toBe(true);
    expect(meApi.updateMe).not.toHaveBeenCalled();
  });

  it('фото ставится в профиль и магазин', async () => {
    const { result } = await setup();
    authApi.sellerComplete.mockResolvedValue(session({ id: 's1', display_name: 'Алекс', role: 'seller' }));
    meApi.updateMe.mockResolvedValue({ id: 's1', display_name: 'Алекс', role: 'seller', profile_pic_url: '/p.jpg' });
    shopsApi.updateMyShop.mockResolvedValue({});
    await act(async () => {
      await result.current.sellerComplete({ inviteToken: 'INV', code: '1', shopName: 'S', profilePicUrl: '/p.jpg' });
    });
    expect(meApi.updateMe).toHaveBeenCalledWith({ profile_pic_url: '/p.jpg' });
    expect(shopsApi.updateMyShop).toHaveBeenCalledWith({ profile_pic_url: '/p.jpg' });
    expect(result.current.user.profile_pic_url).toBe('/p.jpg');
  });

  it('сбой сохранения фото не ломает регистрацию', async () => {
    const { result } = await setup();
    authApi.sellerComplete.mockResolvedValue(session({ id: 's1', display_name: 'Алекс', role: 'seller' }));
    meApi.updateMe.mockRejectedValue(new Error('storage down'));
    await act(async () => {
      await result.current.sellerComplete({ inviteToken: 'INV', code: '1', shopName: 'S', profilePicUrl: '/p.jpg' });
    });
    expect(result.current.isLoggedIn).toBe(true);
  });
});

describe('выход и истечение сессии', () => {
  const loggedIn = async () => {
    await withTokens();
    meApi.getMe.mockResolvedValue({ id: 'u1', display_name: 'Иван', created_at: oldDate });
    const hook = renderAuth();
    await waitFor(() => expect(hook.result.current.isLoggedIn).toBe(true));
    return hook;
  };

  it('signOut стирает сессию и отзывает refresh-токен на сервере', async () => {
    const { result } = await loggedIn();
    await act(async () => { await result.current.signOut(); });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(await storedAccess()).toBeNull();
    expect(authApi.logout).toHaveBeenCalledWith('ref');
  });

  it('signOut не падает, если сервер не ответил на logout', async () => {
    authApi.logout.mockRejectedValue(new Error('offline'));
    const { result } = await loggedIn();
    await act(async () => { await result.current.signOut(); });
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('истёкшая сессия (из api/client) разлогинивает', async () => {
    const { result } = await loggedIn();
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await act(async () => { await client.request('/me').catch(() => {}); });
    expect(result.current.isLoggedIn).toBe(false);
  });
});
