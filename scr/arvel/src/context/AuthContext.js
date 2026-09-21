import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authApi from '../api/auth';
import * as meApi from '../api/me';
import { hydrateSession, setSession, clearSession, setOnSessionExpired } from '../api/client';
import { getCachedUser, setCachedUser, clearCachedUser } from '../storage/tokenStorage';
import { registerPushToken, unregisterPushToken } from '../utils/push';

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

  // Актуальный user для колбэков с пустым списком зависимостей — замыкание на
  // сам user в них протухает уже после первого изменения профиля.
  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    setOnSessionExpired(() => {
      setIsLoggedIn(false);
      setUser(null);
      setPendingUser(null);
      clearCachedUser();
    });
  }, []);

  // Регистрируем push-токен при каждом входе (в т.ч. восстановленном из
  // кэша при холодном старте) — PUT /me/devices/{token} идемпотентен, так
  // что повторная регистрация того же токена ничего не ломает.
  useEffect(() => {
    if (isLoggedIn) {
      registerPushToken().catch(() => {});
    }
  }, [isLoggedIn]);

  // При старте приложения: если в хранилище есть токены — подтягиваем
  // текущего пользователя, иначе сразу показываем экраны входа.
  //
  // GET /me уходит на удалённый сервер и может идти секундами (или вовсе не
  // отвечать — сеть в самолёте, сервер прилёг и т.п.). Раньше любая ошибка
  // этого запроса на старте (включая сетевой таймаут, а не только протухший
  // токен) безусловно чистила токены — из-за этого разлогинивало при
  // перезаходе, хотя refresh-токен был совершенно рабочий. Теперь при
  // наличии сохранённого токена сессия восстанавливается мгновенно из
  // локального кэша профиля, а GET /me лишь обновляет его в фоне; настоящий
  // разлог остаётся только за onSessionExpired выше — он срабатывает из
  // request() при реально невалидном/отозванном refresh-токене (401 +
  // неудачный refresh), а не при сетевой ошибке.
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

      const cachedUser = await getCachedUser();
      if (cachedUser && !cancelled) {
        setUser(cachedUser);
        setIsLoggedIn(true);
        clearTimeout(timer);
        setBootstrapping(false);
      }

      try {
        const me = await meApi.getMe();
        if (cancelled) return;
        const normalized = normalizeUser(me);
        setUser(normalized);
        setIsLoggedIn(true);
        setCachedUser(normalized);
      } catch {
        // Сетевая ошибка или таймаут — не трогаем токены и не разлогиниваем.
        // Если токен и правда невалиден, request() уже вызвал onSessionExpired.
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
    const normalized = normalizeUser(me);
    setUser(normalized);
    setPendingUser(null);
    setIsLoggedIn(true);
    setCachedUser(normalized);
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
    const normalized = normalizeUser(session.user);
    setUser(normalized);
    setPendingUser(null);
    setIsLoggedIn(true);
    setCachedUser(normalized);
    return session.user;
  }, [pendingPhone]);

  // Общее редактирование профиля уже залогиненным пользователем (EditProfileScreen, Phase 2+).
  //
  // Ответ PATCH /me НЕ замещает пользователя целиком, а докладывается поверх
  // текущего. Если бэкенд вернёт на патч урезанное представление (без role,
  // is_admin и т.п.), полная замена молча роняла бы эти поля в undefined — а
  // на role держится вся ролевая развилка интерфейса (isSeller в
  // AccountScreen/ProductScreen/ChatScreen/OrdersScreen). Выглядело это так:
  // продавец после сохранения профиля превращался в покупателя, видел на
  // своём же товаре кнопки «Купить»/«Чат», жал — и получал с сервера 403,
  // потому что там он по-прежнему продавец.
  const updateProfile = useCallback(async (patch) => {
    const me = await meApi.updateMe(patch);
    const merged = normalizeUser({ ...(userRef.current || {}), ...me });
    setUser(merged);
    setCachedUser(merged);
    return me;
  }, []);

  const signOut = useCallback(async () => {
    const { refreshToken } = await hydrateSession();
    // DELETE /me/devices/{token} требует авторизации — снимаем регистрацию
    // push-токена ДО очистки сессии, иначе запрос уйдёт без Bearer.
    await unregisterPushToken().catch(() => {});
    setIsLoggedIn(false);
    setUser(null);
    setPendingUser(null);
    setPendingPhone(null);
    await clearSession();
    await clearCachedUser();
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
