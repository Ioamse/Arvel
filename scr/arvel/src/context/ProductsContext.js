import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { listProducts } from '../api/products';
import { loadCachedProducts, saveCachedProducts } from '../storage/productsCache';
import { useAuth } from './AuthContext';

// Насколько лента считается «свежей»: при возврате на экран в пределах этого
// окна повторный запрос не уходит.
const STALE_AFTER_MS = 30 * 1000;

const ProductsContext = createContext({
  products: [],
  loading: true,
  error: null,
  hasMore: false,
  refresh: () => {},
  refreshIfStale: () => {},
  loadMore: () => {},
});

export function ProductsProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const gotFreshDataRef = useRef(false);
  const loadedAtRef = useRef(0);
  const inFlightRef = useRef(false);

  // silent: не трогаем loading — для фонового обновления при возврате на
  // экран, чтобы не мигал спиннер pull-to-refresh поверх уже готового списка.
  const refresh = useCallback(async ({ silent = false } = {}) => {
    // Явный refresh (pull-to-refresh, публикация, смена аккаунта) должен
    // уходить всегда; пропускаем только фоновый, если запрос уже в пути.
    if (silent && inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const page = await listProducts({});
      gotFreshDataRef.current = true;
      loadedAtRef.current = Date.now();
      setProducts(page.data || []);
      setCursor(page.page?.next_cursor || null);
      setHasMore(!!page.page?.has_more);
      saveCachedProducts(page.data || []);
    } catch (e) {
      setError(e);
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  // Вызывается при возврате на экран ленты/каталога. Новое объявление,
  // выложенное с другого аккаунта (или на другом устройстве), иначе не
  // появится до перезапуска приложения или pull-to-refresh.
  const refreshIfStale = useCallback(() => {
    if (Date.now() - loadedAtRef.current < STALE_AFTER_MS) return;
    refresh({ silent: true });
  }, [refresh]);

  // Последний закэшированный список показываем сразу при старте, не дожидаясь
  // сети — на Android первый сетевой запрос после холодного старта заметно
  // медленнее, и без кэша лента первые секунды пустая/со спиннером. Настоящие
  // данные всё равно подтягиваются следом через refresh() ниже и подменяют
  // кэш, как только придут.
  useEffect(() => {
    let cancelled = false;
    loadCachedProducts().then((cached) => {
      if (!cancelled && cached?.length && !gotFreshDataRef.current) {
        setProducts(cached);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loading) return;
    setLoading(true);
    try {
      const page = await listProducts({ cursor });
      setProducts((prev) => [...prev, ...(page.data || [])]);
      setCursor(page.page?.next_cursor || null);
      setHasMore(!!page.page?.has_more);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  // Первая загрузка + перечитывание при смене аккаунта. Провайдер живёт выше
  // навигатора и при выходе/входе не размонтируется, поэтому без этого после
  // «продавец вышел → зашёл покупатель» на экране оставался список,
  // загруженный на старте приложения, — без только что выложенных
  // объявлений. userId — примитив, так что обновление объекта user
  // (кэш → GET /me) лишнего запроса не вызывает.
  const userId = isLoggedIn ? user?.id ?? null : null;
  useEffect(() => {
    refresh();
  }, [userId, refresh]);

  const value = useMemo(
    () => ({ products, loading, error, hasMore, refresh, refreshIfStale, loadMore }),
    [products, loading, error, hasMore, refresh, refreshIfStale, loadMore]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
