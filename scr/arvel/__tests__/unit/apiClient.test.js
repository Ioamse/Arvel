// api/client: заголовки, ошибки, таймауты и обновление токенов.
// У клиента модульное состояние (кэш токенов), поэтому каждый тест берёт
// свежую копию модуля.
let client;
// Берётся заново после resetModules — иначе тест и клиент смотрели бы в
// разные копии мока хранилища.
let AsyncStorage;
const BASE = 'http://176.123.162.135:8081';

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('no body');
    return body;
  },
});

beforeEach(async () => {
  jest.resetModules();
  AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  client = require('../../src/api/client');
  global.fetch = jest.fn();
});

const withTokens = (accessToken = 'access-1', refreshToken = 'refresh-1') =>
  AsyncStorage.multiSet([['arvell.access_token', accessToken], ['arvell.refresh_token', refreshToken]]);

const authHeader = (call) => fetch.mock.calls[call][1].headers.Authorization;

describe('buildQuery', () => {
  it('пропускает пустые значения и кодирует остальные', () => {
    expect(client.buildQuery({ q: 'air max', a: undefined, b: null, c: '', limit: 0 })).toBe('?q=air%20max&limit=0');
    expect(client.buildQuery({})).toBe('');
    expect(client.buildQuery()).toBe('');
  });
});

describe('request', () => {
  it('подставляет токен из хранилища и JSON-тело', async () => {
    await withTokens();
    fetch.mockResolvedValueOnce(json(200, { ok: 1 }));
    const res = await client.request('/me', { method: 'PATCH', body: { a: 1 } });
    expect(res).toEqual({ ok: 1 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/me`);
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer access-1' });
    expect(init.body).toBe('{"a":1}');
  });

  it('auth: false — без заголовка Authorization', async () => {
    await withTokens();
    fetch.mockResolvedValueOnce(json(200, {}));
    await client.request('/config', { auth: false });
    expect(authHeader(0)).toBeUndefined();
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });

  it('204 -> null', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    expect(await client.request('/x', { method: 'DELETE' })).toBeNull();
  });

  it('не-2xx -> ApiError с полями problem-detail', async () => {
    fetch.mockResolvedValueOnce(json(422, { code: 'VALIDATION', title: 'Invalid', detail: 'Название слишком длинное', fields: [{ field: 'title' }] }));
    const err = await client.request('/products', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(client.ApiError);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION', message: 'Название слишком длинное', fields: [{ field: 'title' }] });
  });

  it('не-JSON тело ошибки не ломает разбор', async () => {
    fetch.mockResolvedValueOnce(json(404, undefined));
    const err = await client.request('/nope').catch((e) => e);
    expect(err).toMatchObject({ status: 404, code: null, message: 'Request failed (404)' });
  });

  it('обрыв сети -> NETWORK_ERROR', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    const err = await client.request('/me').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  const hang = (url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });

  it('таймаут 15 секунд -> один повтор GET -> TIMEOUT без адреса сервера', async () => {
    jest.useFakeTimers();
    try {
      fetch.mockImplementationOnce(hang).mockImplementationOnce(hang);
      const pending = client.request('/me', { auth: false }).catch((e) => e);
      await jest.advanceTimersByTimeAsync(30000);
      const err = await pending;
      expect(err).toMatchObject({ status: 0, code: 'TIMEOUT', message: 'Сервер не отвечает, попробуйте позже' });
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('таймаут GET, повтор успешен -> данные', async () => {
    jest.useFakeTimers();
    try {
      fetch.mockImplementationOnce(hang).mockResolvedValueOnce(json(200, { ok: true }));
      const pending = client.request('/me', { auth: false });
      await jest.advanceTimersByTimeAsync(15000);
      expect(await pending).toEqual({ ok: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('таймаут POST не повторяется (повтор создал бы дубль)', async () => {
    jest.useFakeTimers();
    try {
      fetch.mockImplementationOnce(hang);
      const pending = client.request('/products', { method: 'POST', body: {}, auth: false }).catch((e) => e);
      await jest.advanceTimersByTimeAsync(15000);
      expect(await pending).toMatchObject({ code: 'TIMEOUT' });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('обновление токенов', () => {
  it('401 -> refresh -> повтор запроса с новым токеном', async () => {
    await withTokens();
    fetch
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { access_token: 'access-2', refresh_token: 'refresh-2' }))
      .mockResolvedValueOnce(json(200, { id: 'u1' }));
    expect(await client.request('/me')).toEqual({ id: 'u1' });
    expect(fetch.mock.calls[1][0]).toBe(`${BASE}/auth/refresh`);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ refresh_token: 'refresh-1' });
    expect(authHeader(2)).toBe('Bearer access-2');
    expect(await AsyncStorage.getItem('arvell.refresh_token')).toBe('refresh-2');
  });

  it('параллельные запросы с истёкшим токеном делают ОДИН refresh', async () => {
    await withTokens();
    let refreshCalls = 0;
    fetch.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return json(200, { access_token: 'access-2', refresh_token: 'refresh-2' });
      }
      return init.headers.Authorization === 'Bearer access-2' ? json(200, { url }) : json(401, {});
    });
    const results = await Promise.all([client.request('/products'), client.request('/me'), client.request('/me/favorites')]);
    expect(results.map((r) => r.url)).toEqual([`${BASE}/products`, `${BASE}/me`, `${BASE}/me/favorites`]);
    expect(refreshCalls).toBe(1);
  });

  it('сервер отверг refresh-токен -> сессия стёрта, onSessionExpired', async () => {
    await withTokens();
    const expired = jest.fn();
    client.setOnSessionExpired(expired);
    fetch.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, { detail: 'refresh reused' }));
    await expect(client.request('/me')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('arvell.access_token')).toBeNull();
  });

  it('5xx на refresh не разлогинивает — токены остаются', async () => {
    await withTokens();
    const expired = jest.fn();
    client.setOnSessionExpired(expired);
    fetch.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(503, {}));
    await expect(client.request('/me')).rejects.toMatchObject({ status: 503 });
    expect(expired).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('arvell.refresh_token')).toBe('refresh-1');
  });

  it('401 без refresh-токена -> выход', async () => {
    await AsyncStorage.setItem('arvell.access_token', 'access-1');
    const expired = jest.fn();
    client.setOnSessionExpired(expired);
    fetch.mockResolvedValueOnce(json(401, {}));
    await expect(client.request('/me')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalled();
  });

  it('повторный 401 после успешного refresh не зацикливается', async () => {
    await withTokens();
    fetch
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { access_token: 'access-2', refresh_token: 'refresh-2' }))
      .mockResolvedValueOnce(json(401, {}));
    await expect(client.request('/me')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('401 на старый токен после входа под другим аккаунтом: повтор без refresh и без выхода', async () => {
    await withTokens('old-access', 'old-refresh');
    const expired = jest.fn();
    client.setOnSessionExpired(expired);
    let resolveFirst;
    fetch
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const pending = client.request('/me');
    // Дожидаемся, пока запрос со старым токеном реально уйдёт в сеть.
    while (!fetch.mock.calls.length) await new Promise((r) => setTimeout(r, 0));
    await client.setSession({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    resolveFirst(json(401, {}));
    expect(await pending).toEqual({ ok: true });
    expect(authHeader(1)).toBe('Bearer new-access');
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/auth/refresh'))).toBe(false);
    expect(expired).not.toHaveBeenCalled();
  });

  it('refresh, завершившийся после выхода, не воскрешает сессию', async () => {
    await withTokens();
    let resolveRefresh;
    fetch
      .mockResolvedValueOnce(json(401, {}))
      .mockImplementationOnce(() => new Promise((r) => { resolveRefresh = r; }))
      .mockResolvedValue(json(401, {}));
    const pending = client.request('/me').catch((e) => e);
    while (fetch.mock.calls.length < 2) await new Promise((r) => setTimeout(r, 0));
    await client.clearSession();
    resolveRefresh(json(200, { access_token: 'ghost', refresh_token: 'ghost-r' }));
    await pending;
    expect(await AsyncStorage.getItem('arvell.access_token')).toBeNull();
  });
});

describe('сессия', () => {
  it('hydrateSession читает хранилище один раз', async () => {
    await withTokens('a', 'r');
    const spy = jest.spyOn(AsyncStorage, 'getItem');
    expect(await client.hydrateSession()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    await client.hydrateSession();
    expect(spy).toHaveBeenCalledTimes(2); // два ключа, одно чтение
  });

  it('setSession / clearSession пишут в хранилище', async () => {
    await client.setSession({ accessToken: 'a2', refreshToken: 'r2' });
    expect(await AsyncStorage.getItem('arvell.access_token')).toBe('a2');
    await client.clearSession();
    expect(await AsyncStorage.getItem('arvell.access_token')).toBeNull();
    expect(await client.hydrateSession()).toEqual({ accessToken: null, refreshToken: null });
  });
});
