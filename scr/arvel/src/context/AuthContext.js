import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import * as meApi from '../api/me';
import { hydrateSession, setSession, clearSession, setOnSessionExpired } from '../api/client';

// Дольше этого холодный старт не ждёт ответа GET /me (см. useEffect ниже).
const BOOTSTRAP_TIMEOUT_MS = 4000;

const AuthContext = createContext({
  isLoggedIn: false,
  bootstrapping: true,
  user: null,
  pendingPhone: null,
  pendingUser: null,
  registerPhone: async () => {},
  verifyCode: async () => {},
  completeOnboarding: async () => {},
  sellerAcceptInvite: async () => {},
  sellerComplete: async () => {},
  updateProfile: async () => {},
  signOut: async () => {},
});

// API возвращает display_name, а почти весь остальной интерфейс уже читает
// user.name — алиасим здесь один раз, а не в каждом экране.
function normalizeUser(apiUser, extra = {}) {
  if (!apiUser) return null;
  return { ...apiUser, name: apiUser.display_name, ...extra };
}

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  // Телефон текущей попытки входа/регистрации — общий между Phone -> Verify
  // -> ProfileSetup, чтобы не протаскивать его через navigation params.
  const [pendingPhone, setPendingPhone] = useState(null);
  // Покупатель: сессия уже выдана верификацией кода (токены рабочие), но
  // isLoggedIn ещё false — ждём, пока ProfileSetupScreen соберёт имя и
  // вызовет completeOnboarding. Это нужно, чтобы RootNavigator не переключил
  // стек на MainTabs раньше, чем ProfileSetup успеет отрисоваться (он висит
  // на условии isLoggedIn и размонтировал бы AuthNavigator целиком).
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    setOnSessionExpired(() => {
      setIsLoggedIn(false);
      setUser(null);
      setPendingUser(null);
    });
  }, []);

  // При старте приложения: если в хранилище есть токены — подтягиваем
  // текущего пользователя, иначе сразу показываем экраны входа.
  //
  // GET /me уходит на удалённый сервер и может идти секундами — без верхней
  // границы заставка держала холодный старт заложником этого запроса (на
  // Android и iOS одинаково, код общий). Поэтому не ждём дольше
  // BOOTSTRAP_TIMEOUT_MS: приложение открывается как для гостя, а если
  // ответ всё же придёт позже — залогиниваем реактивно, без перезагрузки
  // экрана (bootstrapping к этому моменту уже false, второй раз его не трогаем).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setBootstrapping(false);
    }, BOOTSTRAP_TIMEOUT_MS);
    (async () => {
      const { accessToken } = await hydrateSession();
      if (!accessToken) {
        clearTimeout(timer);
        if (!cancelled) setBootstrapping(false);
        return;
      }
      try {
        const me = await meApi.getMe();
        if (cancelled) return;
        setUser(normalizeUser(me));
        setIsLoggedIn(true);
      } catch {
        if (!cancelled) await clearSession();
      } finally {
        clearTimeout(timer);
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const registerPhone = useCallback(async (phone) => {
    await authApi.registerPhone(phone);
    setPendingPhone(phone);
  }, []);

  // Покупатель: код подтверждён, токены рабочие — но профиль (имя) ещё не
  // собран, поэтому НЕ включаем isLoggedIn здесь.
  const verifyCode = useCallback(async (code) => {
    const session = await authApi.verifyCode(pendingPhone, code);
    await setSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    const normalized = normalizeUser(session.user);
    setPendingUser(normalized);
    return normalized;
  }, [pendingPhone]);

  // ProfileSetupScreen (покупатель): дособирает display_name и завершает вход.
  const completeOnboarding = useCallback(async (patch) => {
    const me = await meApi.updateMe(patch);
    setUser(normalizeUser(me));
    setPendingUser(null);
    setIsLoggedIn(true);
    return me;
  }, []);

  const sellerAcceptInvite = useCallback(async (inviteToken, phone) => {
    await authApi.sellerAcceptInvite(inviteToken, phone);
    setPendingPhone(phone);
  }, []);

  // Продавец: /auth/seller/complete уже получает имя+магазин+инвайт разом,
  // так что дополнительный шаг онбординга не нужен — сразу логиним.
  const sellerComplete = useCallback(async ({ inviteToken, code, shopName, description, displayName }) => {
    const session = await authApi.sellerComplete({
      inviteToken, phone: pendingPhone, code, shopName, description, displayName,
    });
    await setSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    setUser(normalizeUser(session.user));
    setPendingUser(null);
    setIsLoggedIn(true);
    return session.user;
  }, [pendingPhone]);

  // Общее редактирование профиля уже залогиненным пользователем (EditProfileScreen, Phase 2+).
  const updateProfile = useCallback(async (patch) => {
    const me = await meApi.updateMe(patch);
    setUser(normalizeUser(me));
    return me;
  }, []);

  const signOut = useCallback(async () => {
    const { refreshToken } = await hydrateSession();
    setIsLoggedIn(false);
    setUser(null);
    setPendingUser(null);
    setPendingPhone(null);
    await clearSession();
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {});
    }
  }, []);

  const value = {
    isLoggedIn, bootstrapping, user, pendingPhone, pendingUser,
    registerPhone, verifyCode, completeOnboarding,
    sellerAcceptInvite, sellerComplete,
    updateProfile, signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
