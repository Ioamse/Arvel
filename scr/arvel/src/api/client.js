import { getTokens, setTokens, clearTokens } from '../storage/tokenStorage';

export const API_BASE_URL = 'http://176.123.162.135:8081';

// RFC 9457 problem-detail error, thrown for every non-2xx response.
export class ApiError extends Error {
  constructor({ status, code, title, detail, fields }) {
    super(detail || title || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || null;
    this.fields = fields || null;
  }
}

// In-memory session cache, mirrored to AsyncStorage. Kept module-level (not
// in React state) so `request()` can read/refresh it outside of any component.
let accessToken = null;
let refreshToken = null;
let hydrated = false;
let onSessionExpired = null;

export function setOnSessionExpired(fn) {
  onSessionExpired = fn;
}

export async function hydrateSession() {
  if (hydrated) return { accessToken, refreshToken };
  const tokens = await getTokens();
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  hydrated = true;
  return { accessToken, refreshToken };
}

// Растёт при любом явном изменении сессии (вход/выход) — им refreshSession
// ниже помечает свою попытку рефреша устаревшей, если сессия сменилась,
// пока запрос на /auth/refresh ещё летел по сети.
let sessionEpoch = 0;

export async function setSession(tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  hydrated = true;
  sessionEpoch++;
  await setTokens(tokens);
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  hydrated = true;
  sessionEpoch++;
  await clearTokens();
}

async function parseError(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body (e.g. plain-text 404 from an unimplemented route)
  }
  return new ApiError({
    status: res.status,
    code: body?.code,
    title: body?.title,
    detail: body?.detail,
    fields: body?.fields,
  });
}

// Raw refresh call, deliberately not going through auth.js — auth.js calls
// request() below, and request() calls this on 401, so importing auth.js
// here would create a cycle.
async function rawRefresh() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
  } catch (e) {
    // Сетевой сбой/таймаут — не значит, что refresh-токен невалиден (см.
    // refreshSession ниже, где эта разница и учитывается).
    if (e.name === 'AbortError') {
      throw new ApiError({ status: 0, code: 'TIMEOUT', detail: 'Сервер не отвечает: /auth/refresh' });
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', detail: `Не удалось подключиться к ${API_BASE_URL}: ${e.message}` });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// В момент логина/открытия приложения обычно параллельно уходит несколько
// авторизованных запросов (push-токен, список чатов, товары продавца и т.д.).
// Если все они словят 401 разом, каждый по отдельности дёргал бы свой
// rawRefresh() с одним и тем же refresh-токеном — а если бэкенд ротирует
// refresh-токен при каждом использовании, только первый вызов выигрывает, а
// остальные получат "уже использованный" токен и разлогинят пользователя,
// хотя сессия только что была успешно обновлена. Общий промис на все
// одновременные 401 гарантирует один физический вызов /auth/refresh.
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    // Снимок эпохи на момент запуска рефреша — если пользователь успеет
    // выйти (или войти заново) до того, как придёт ответ /auth/refresh, эта
    // попытка больше не имеет права трогать сессию: иначе рефреш, стартовавший
    // ДО signOut(), допишет свежие токены обратно в AsyncStorage уже ПОСЛЕ
    // clearSession() и молча воскресит вышедшего пользователя при следующем
    // холодном старте.
    const epoch = sessionEpoch;
    refreshPromise = rawRefresh()
      .then((pair) => {
        if (epoch !== sessionEpoch) return;
        return setSession({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
      })
      .catch((e) => {
        // Разлогиниваем только если сервер реально отверг refresh-токен
        // (сам ответил ошибкой). Сетевой обрыв/таймаут (status 0) — не повод
        // чистить рабочие токены, иначе слабая сеть на телефоне выглядит как
        // случайный выход из аккаунта.
        if (epoch === sessionEpoch && e.status !== 0) {
          clearSession();
          onSessionExpired?.();
        }
        throw e;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function buildQuery(params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

export async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  if (!hydrated) await hydrateSession();

  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // Без таймаута недоступный/заблокированный хост (например ATS на iOS или
  // сервер за NAT в другой сети) подвешивал fetch на неопределённое время —
  // экран так и оставался в состоянии "загрузка" без единой подсказки, что
  // пошло не так.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError({ status: 0, code: 'TIMEOUT', detail: `Сервер не отвечает: ${API_BASE_URL}${path}` });
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', detail: `Не удалось подключиться к ${API_BASE_URL}: ${e.message}` });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 && auth && retry && refreshToken) {
    await refreshSession();
    return request(path, { method, body, auth, retry: false });
  }

  if (res.status === 401 && auth) {
    await clearSession();
    onSessionExpired?.();
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return null;
  return res.json();
}
