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

export async function setSession(tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  hydrated = true;
  await setTokens(tokens);
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  hydrated = true;
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
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    if (!res.ok) throw await parseError(res);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Одно обновление токенов на всех одновременных запросов. Refresh-токен по
// спеке одноразовый: когда при истёкшем access-токене стартуют сразу
// несколько запросов (лента, /me, избранное), каждый шёл в /auth/refresh со
// старым токеном — второй и следующие получали «повторное использование»,
// сервер отзывал сессию и человека выкидывало на экран входа.
let refreshInFlight = null;

function refreshSession() {
  if (!refreshInFlight) {
    const usedRefreshToken = refreshToken;
    refreshInFlight = (async () => {
      const pair = await rawRefresh();
      // Пока шёл запрос, пользователь мог выйти или войти под другим
      // аккаунтом — тогда чужие токены поверх новой сессии не пишем.
      if (refreshToken !== usedRefreshToken) return;
      await setSession({ accessToken: pair.access_token, refreshToken: pair.refresh_token });
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
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
  const usedToken = auth ? accessToken : null;
  if (usedToken) headers.Authorization = `Bearer ${usedToken}`;

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

  // Пока запрос был в полёте, пользователь мог войти под другим аккаунтом.
  // 401 относится к старому токену — не рефрешим и не сбрасываем новую
  // сессию: повторяем запрос с актуальным токеном (или отдаём ошибку).
  if (res.status === 401 && auth && usedToken && accessToken && accessToken !== usedToken) {
    if (retry) return request(path, { method, body, auth, retry: false });
    throw await parseError(res);
  }

  if (res.status === 401 && auth && retry && refreshToken) {
    try {
      await refreshSession();
    } catch (e) {
      // Выходим, только если сервер сам отверг refresh-токен. Обрыв сети,
      // таймаут или 5xx — не повод разлогинивать: токены целы, запрос можно
      // повторить позже.
      if (e.status === 400 || e.status === 401 || e.status === 403) {
        await clearSession();
        onSessionExpired?.();
      }
      throw e;
    }
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
