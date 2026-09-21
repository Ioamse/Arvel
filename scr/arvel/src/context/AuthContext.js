import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authApi from '../api/auth';
import * as meApi from '../api/me';
import { updateMyShop } from '../api/shops';
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

const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');

// Аккаунт, созданный меньше этого времени назад, считаем только что
// зарегистрированным. Запас нужен на расхождение часов телефона и сервера.
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

// Экран «Расскажите о себе» — только для человека, который прямо сейчас
// создал аккаунт: /auth/verify для нового номера создаёт его, а бэкенд
// подставляет вместо имени телефон. Уже зарегистрированному его не показываем
// (PATCH /me затёр бы настоящее имя), даже если имя у него так и не заполнено —
// поправить его можно в «Редактировать профиль».
// В спеке нет флага «аккаунт новый», поэтому смотрим на имя и на created_at.
function needsOnboarding(user) {
  if (!user || user.role === 'seller') return false;
  const name = String(user.display_name ?? '').trim();
  const nameIsDefault = !name || digitsOnly(name) === digitsOnly(user.phone);
  if (!nameIsDefault) return false;
  const createdAt = Date.parse(user.created_at);
  // Нет created_at — не можем доказать, что аккаунт старый: спросим имя.
  if (Number.isNaN(createdAt)) return true;
  return Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS;
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
  // Номер текущей сессии: растёт при каждом входе/выходе. Холодный старт
  // запоминает его до GET /me и выбрасывает ответ, если за это время
  // пользователь уже вошёл под другим аккаунтом (иначе запоздалый /me со
  // старым токеном продавца перезаписывал только что вошедшего покупателя).
  const sessionEpoch = useRef(0);

  useEffect(() => {
    setOnSessionExpired(() => {
      sessionEpoch.current += 1;
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
      const epoch = sessionEpoch.current;
      try {
        const me = await meApi.getMe();
        if (cancelled || epoch !== sessionEpoch.current) return;
        setUser(normalizeUser(me));
        setIsLoggedIn(true);
      } catch {
        // Не трогаем хранилище, если пока шёл запрос, вошёл другой аккаунт.
        if (!cancelled && epoch === sessionEpoch.current) await clearSession();
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

  // Код подтверждён, токены рабочие. Новому покупателю ещё нужно собрать имя,
  // поэтому для него isLoggedIn НЕ включаем (ждём completeOnboarding).
  // Существующий аккаунт (в т.ч. продавец) логиним сразу.
  // Возвращает { user, needsOnboarding } — экран решает, куда идти дальше.
  const verifyCode = useCallback(async (code) => {
    const session = await authApi.verifyCode(pendingPhone, code);
    sessionEpoch.current += 1;
    await setSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    const normalized = normalizeUser(session.user);
    if (needsOnboarding(normalized)) {
      setPendingUser(normalized);
      return { user: normalized, needsOnboarding: true };
    }
    setUser(normalized);
    setPendingUser(null);
    setIsLoggedIn(true);
    return { user: normalized, needsOnboarding: false };
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
  //
  // profilePicUrl — уже загруженная картинка (см. api/media.uploadImage). Бэкенд
  // не принимает фото при регистрации продавца, поэтому ставим его отдельными
  // PATCH /me и PATCH /me/shop сразу после получения токенов. Сбой тут не
  // должен ломать регистрацию: аккаунт уже создан, фото можно поменять позже.
  const sellerComplete = useCallback(async ({
    inviteToken, code, shopName, description, displayName, profilePicUrl,
  }) => {
    const session = await authApi.sellerComplete({
      inviteToken, phone: pendingPhone, code, shopName, description, displayName,
    });
    sessionEpoch.current += 1;
    await setSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    let me = session.user;
    if (profilePicUrl) {
      try {
        me = await meApi.updateMe({ profile_pic_url: profilePicUrl });
        await updateMyShop({ profile_pic_url: profilePicUrl });
      } catch (e) {
        console.warn('sellerComplete: не удалось сохранить фото профиля/магазина', e);
      }
    }
    setUser(normalizeUser(me));
    setPendingUser(null);
    setIsLoggedIn(true);
    return me;
  }, [pendingPhone]);

  // Общее редактирование профиля уже залогиненным пользователем (EditProfileScreen, Phase 2+).
  const updateProfile = useCallback(async (patch) => {
    const me = await meApi.updateMe(patch);
    setUser(normalizeUser(me));
    return me;
  }, []);

  const signOut = useCallback(async () => {
    const { refreshToken } = await hydrateSession();
    sessionEpoch.current += 1;
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
